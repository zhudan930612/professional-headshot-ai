-- Preserve the pre-migration tier of existing subscriptions. New subscriptions
-- start with a free base; completed, non-refunded purchases determine upgrades.
-- If real D1 purchases already exist, their original tier must be reconciled
-- first instead of silently freezing a purchased upgrade into the base tier.
CREATE TABLE _entitlement_migration_guard (paid_orders INTEGER CHECK(paid_orders=0));
INSERT INTO _entitlement_migration_guard
  SELECT count(*) FROM payment_transactions WHERE status IN ('completed','refunded') AND paid_amount_minor IS NOT NULL;
DROP TABLE _entitlement_migration_guard;
ALTER TABLE user_subscriptions ADD COLUMN base_plan_type TEXT NOT NULL DEFAULT 'free'
  CHECK(base_plan_type IN ('free','professional','executive'));
UPDATE user_subscriptions SET base_plan_type=plan_type;
CREATE INDEX payment_subscription_entitlements ON payment_transactions(subscription_id,status,plan_type);

DROP TRIGGER checkout_apply;
CREATE TRIGGER checkout_apply AFTER INSERT ON payment_events WHEN NEW.event_type='checkout.completed'
BEGIN
  INSERT INTO user_subscriptions(id,user_id,plan_type,status,purchased_quota,bonus_quota,used_quota,subscribed_at,expires_at,payment_id,amount,currency,created_at,updated_at)
    SELECT NEW.new_subscription_id,p.user_id,p.plan_type,'active',
      CASE WHEN NOT EXISTS(SELECT 1 FROM user_subscriptions WHERE user_id=p.user_id)
        THEN coalesce((SELECT quota FROM subscription_plans WHERE id='free'),0) ELSE 0 END,
      CASE WHEN NOT EXISTS(SELECT 1 FROM user_subscriptions WHERE user_id=p.user_id)
        THEN coalesce((SELECT bonus_quota FROM subscription_plans WHERE id='free'),0) ELSE 0 END,
      0,NEW.created_at,NULL,NEW.order_id,p.amount,p.currency,NEW.created_at,NEW.created_at
    FROM payment_transactions p WHERE p.id=NEW.payment_id AND NOT EXISTS (
      SELECT 1 FROM user_subscriptions s WHERE s.user_id=p.user_id AND s.status='active' AND (s.expires_at IS NULL OR julianday(s.expires_at)>julianday('now'))
    );
  UPDATE payment_transactions SET subscription_id=(
    SELECT id FROM user_subscriptions WHERE user_id=payment_transactions.user_id AND status='active'
      AND (expires_at IS NULL OR julianday(expires_at)>julianday('now'))
    ORDER BY CASE plan_type WHEN 'executive' THEN 2 WHEN 'professional' THEN 1 ELSE 0 END DESC,created_at DESC LIMIT 1
  ) WHERE id=NEW.payment_id;
  UPDATE user_subscriptions SET
    purchased_quota=purchased_quota+(SELECT granted_quota FROM payment_transactions WHERE id=NEW.payment_id),
    bonus_quota=bonus_quota+(SELECT granted_bonus_quota FROM payment_transactions WHERE id=NEW.payment_id),
    plan_type=CASE WHEN plan_type='executive' THEN plan_type ELSE (SELECT plan_type FROM payment_transactions WHERE id=NEW.payment_id) END,
    expires_at=NULL, updated_at=NEW.created_at
  WHERE id=(SELECT subscription_id FROM payment_transactions WHERE id=NEW.payment_id);
  UPDATE payment_transactions SET creem_order_id=NEW.order_id,creem_checkout_id=NEW.checkout_id,
    creem_transaction_id=NEW.transaction_id,paid_amount_minor=NEW.paid_minor,status='completed',completed_at=NEW.created_at,updated_at=NEW.created_at WHERE id=NEW.payment_id;
END;

DROP TRIGGER refund_apply;
CREATE TRIGGER refund_apply AFTER INSERT ON payment_events WHEN NEW.event_type='refund.created'
BEGIN
  UPDATE user_subscriptions SET
    purchased_quota=max(0,purchased_quota-(SELECT ((granted_quota*(refunded_amount_minor+NEW.amount_minor)+paid_amount_minor-1)/paid_amount_minor)-revoked_quota FROM payment_transactions WHERE id=NEW.payment_id)),
    bonus_quota=max(0,bonus_quota-(SELECT ((granted_bonus_quota*(refunded_amount_minor+NEW.amount_minor)+paid_amount_minor-1)/paid_amount_minor)-revoked_bonus_quota FROM payment_transactions WHERE id=NEW.payment_id)),
    updated_at=NEW.created_at WHERE id=(SELECT subscription_id FROM payment_transactions WHERE id=NEW.payment_id);
  UPDATE payment_transactions SET
    revoked_quota=(granted_quota*(refunded_amount_minor+NEW.amount_minor)+paid_amount_minor-1)/paid_amount_minor,
    revoked_bonus_quota=(granted_bonus_quota*(refunded_amount_minor+NEW.amount_minor)+paid_amount_minor-1)/paid_amount_minor,
    refunded_amount_minor=refunded_amount_minor+NEW.amount_minor,
    status=CASE WHEN refunded_amount_minor+NEW.amount_minor=paid_amount_minor THEN 'refunded' ELSE status END,
    updated_at=NEW.created_at WHERE id=NEW.payment_id;
  UPDATE user_subscriptions SET plan_type=CASE
    WHEN base_plan_type='executive' OR EXISTS(
      SELECT 1 FROM payment_transactions p WHERE p.subscription_id=user_subscriptions.id AND p.status='completed' AND p.plan_type='executive'
        AND p.granted_quota+p.granted_bonus_quota>p.revoked_quota+p.revoked_bonus_quota
    ) THEN 'executive'
    WHEN base_plan_type='professional' OR EXISTS(
      SELECT 1 FROM payment_transactions p WHERE p.subscription_id=user_subscriptions.id AND p.status='completed' AND p.plan_type='professional'
        AND p.granted_quota+p.granted_bonus_quota>p.revoked_quota+p.revoked_bonus_quota
    ) THEN 'professional'
    ELSE 'free' END
  WHERE id=(SELECT subscription_id FROM payment_transactions WHERE id=NEW.payment_id);
END;
