-- Run after 001 in a transaction. No customer rows are deleted.
BEGIN;

ALTER TABLE headshot_ai.payment_transactions
  ALTER COLUMN creem_order_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS creem_checkout_id text,
  ADD COLUMN IF NOT EXISTS creem_product_id text,
  ADD COLUMN IF NOT EXISTS granted_quota integer,
  ADD COLUMN IF NOT EXISTS granted_bonus_quota integer,
  ADD COLUMN IF NOT EXISTS paid_amount_minor bigint,
  ADD COLUMN IF NOT EXISTS refunded_amount_minor bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS revoked_quota integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS revoked_bonus_quota integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- Old code stored checkout IDs in the order column. Keep the original value
-- until reconciliation so existing foreign keys and audit references survive.
UPDATE headshot_ai.payment_transactions
SET creem_checkout_id = creem_order_id
WHERE creem_checkout_id IS NULL AND creem_order_id LIKE 'ch\_%' ESCAPE '\';
CREATE UNIQUE INDEX IF NOT EXISTS payment_checkout_unique
  ON headshot_ai.payment_transactions (creem_checkout_id) WHERE creem_checkout_id IS NOT NULL;

-- Existing installations may have a FK from user_subscriptions.payment_id.
-- Defer its validation so both checkout-to-order references can change atomically.
DO $$
DECLARE c record;
BEGIN
  FOR c IN SELECT conname FROM pg_constraint
    WHERE conrelid = 'headshot_ai.user_subscriptions'::regclass
      AND confrelid = 'headshot_ai.payment_transactions'::regclass AND contype = 'f'
  LOOP
    EXECUTE format('ALTER TABLE headshot_ai.user_subscriptions ALTER CONSTRAINT %I DEFERRABLE INITIALLY DEFERRED', c.conname);
  END LOOP;
END $$;

CREATE TABLE IF NOT EXISTS headshot_ai.payment_webhook_events (
  event_id text PRIMARY KEY,
  event_type text NOT NULL,
  resource_id text NOT NULL,
  payment_id uuid NOT NULL REFERENCES headshot_ai.payment_transactions(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_type, resource_id)
);
ALTER TABLE headshot_ai.payment_webhook_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON headshot_ai.payment_webhook_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON headshot_ai.payment_webhook_events TO service_role;
REVOKE INSERT, UPDATE, DELETE ON headshot_ai.payment_transactions FROM anon, authenticated;

CREATE OR REPLACE FUNCTION headshot_ai.apply_creem_checkout(
  p_event_id text, p_checkout_id text, p_order_id text, p_request_id text,
  p_product_id text, p_amount_minor bigint, p_paid_minor bigint,
  p_currency text, p_transaction_id text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_payment headshot_ai.payment_transactions%ROWTYPE;
  v_subscription headshot_ai.user_subscriptions%ROWTYPE;
  v_old_order text;
BEGIN
  SELECT * INTO v_payment FROM headshot_ai.payment_transactions
    WHERE (p_request_id IS NOT NULL AND id::text = p_request_id)
      OR creem_checkout_id = p_checkout_id
    ORDER BY (id::text = p_request_id) DESC NULLS LAST LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'Unknown checkout'; END IF;
  -- Same lock is used by generation quota reservation and refund operations.
  PERFORM pg_advisory_xact_lock(hashtextextended(v_payment.user_id::text, 0));
  SELECT * INTO v_payment FROM headshot_ai.payment_transactions WHERE id = v_payment.id FOR UPDATE;
  IF v_payment.creem_checkout_id IS NOT NULL AND v_payment.creem_checkout_id <> p_checkout_id THEN
    RAISE EXCEPTION 'Checkout mismatch';
  END IF;
  IF v_payment.creem_order_id IS NOT NULL AND v_payment.creem_order_id NOT LIKE 'ch\_%' ESCAPE '\'
      AND v_payment.creem_order_id <> p_order_id THEN RAISE EXCEPTION 'Order mismatch'; END IF;
  IF v_payment.status IN ('completed', 'refunded') THEN
    RETURN jsonb_build_object('duplicate', true, 'payment_id', v_payment.id);
  END IF;
  -- Legacy pending checkouts need explicit reconciliation: their old handler may
  -- already have granted quota without marking the payment completed.
  IF v_payment.creem_product_id IS NULL OR v_payment.granted_quota IS NULL THEN
    RAISE EXCEPTION 'Legacy checkout requires reconciliation';
  END IF;
  IF v_payment.creem_product_id <> p_product_id OR upper(v_payment.currency) <> upper(p_currency)
      OR round(v_payment.amount * 100) <> p_amount_minor OR p_paid_minor < p_amount_minor
      OR v_payment.granted_quota < 0 OR coalesce(v_payment.granted_bonus_quota, 0) < 0 THEN
    RAISE EXCEPTION 'Payment terms mismatch';
  END IF;
  IF EXISTS (SELECT 1 FROM headshot_ai.payment_webhook_events
      WHERE event_id = p_event_id OR (event_type = 'checkout.completed' AND resource_id = p_order_id)) THEN
    RAISE EXCEPTION 'Event or order belongs to another payment';
  END IF;

  v_old_order := v_payment.creem_order_id;
  UPDATE headshot_ai.payment_transactions SET creem_order_id = p_order_id,
    creem_checkout_id = p_checkout_id, creem_transaction_id = p_transaction_id,
    paid_amount_minor = p_paid_minor WHERE id = v_payment.id;
  IF v_old_order IS NOT NULL AND v_old_order <> p_order_id THEN
    UPDATE headshot_ai.user_subscriptions SET payment_id = p_order_id WHERE payment_id = v_old_order;
  END IF;
  SELECT * INTO v_subscription FROM headshot_ai.user_subscriptions
    WHERE user_id::text = v_payment.user_id::text AND status = 'active'
      AND (expires_at IS NULL OR expires_at > now())
    ORDER BY CASE plan_type WHEN 'executive' THEN 2 WHEN 'professional' THEN 1 ELSE 0 END DESC, created_at DESC
    LIMIT 1 FOR UPDATE;
  IF FOUND THEN
    UPDATE headshot_ai.user_subscriptions SET
      purchased_quota = coalesce(purchased_quota, 0) + v_payment.granted_quota,
      bonus_quota = coalesce(bonus_quota, 0) + coalesce(v_payment.granted_bonus_quota, 0),
      plan_type = CASE WHEN plan_type = 'executive' THEN plan_type ELSE v_payment.plan_type END,
      expires_at = NULL, updated_at = now()
      WHERE id = v_subscription.id;
  ELSE
    INSERT INTO headshot_ai.user_subscriptions
      (user_id, plan_type, status, purchased_quota, bonus_quota, used_quota, payment_id, expires_at)
      VALUES (v_payment.user_id, v_payment.plan_type, 'active', v_payment.granted_quota,
        coalesce(v_payment.granted_bonus_quota, 0), 0, p_order_id, NULL)
      RETURNING * INTO v_subscription;
  END IF;
  UPDATE headshot_ai.payment_transactions SET status = 'completed', subscription_id = v_subscription.id,
    completed_at = now(), updated_at = now() WHERE id = v_payment.id;
  INSERT INTO headshot_ai.payment_webhook_events(event_id, event_type, resource_id, payment_id)
    VALUES(p_event_id, 'checkout.completed', p_order_id, v_payment.id);
  RETURN jsonb_build_object('duplicate', false, 'payment_id', v_payment.id);
END $$;

CREATE OR REPLACE FUNCTION headshot_ai.apply_creem_refund(
  p_event_id text, p_refund_id text, p_order_id text, p_amount_minor bigint, p_currency text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_payment headshot_ai.payment_transactions%ROWTYPE;
  v_total bigint;
  v_quota integer;
  v_bonus integer;
BEGIN
  SELECT * INTO v_payment FROM headshot_ai.payment_transactions WHERE creem_order_id = p_order_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Unknown refund order'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_payment.user_id::text, 0));
  SELECT * INTO v_payment FROM headshot_ai.payment_transactions WHERE id = v_payment.id FOR UPDATE;
  IF EXISTS (SELECT 1 FROM headshot_ai.payment_webhook_events WHERE event_id = p_event_id
      OR (event_type = 'refund.created' AND resource_id = p_refund_id)) THEN
    RETURN jsonb_build_object('duplicate', true);
  END IF;
  IF v_payment.status NOT IN ('completed', 'refunded') OR v_payment.paid_amount_minor IS NULL
      OR v_payment.paid_amount_minor <= 0 OR p_amount_minor <= 0
      OR upper(v_payment.currency) <> upper(p_currency) OR v_payment.subscription_id IS NULL THEN
    RAISE EXCEPTION 'Invalid refund state';
  END IF;
  v_total := v_payment.refunded_amount_minor + p_amount_minor;
  IF v_total > v_payment.paid_amount_minor THEN RAISE EXCEPTION 'Refund exceeds payment'; END IF;
  -- Revoke this order's entitlement proportionally; unrelated purchases survive.
  v_quota := ceil(v_payment.granted_quota::numeric * v_total / v_payment.paid_amount_minor);
  v_bonus := ceil(coalesce(v_payment.granted_bonus_quota, 0)::numeric * v_total / v_payment.paid_amount_minor);
  UPDATE headshot_ai.user_subscriptions SET
    purchased_quota = greatest(0, purchased_quota - (v_quota - v_payment.revoked_quota)),
    bonus_quota = greatest(0, bonus_quota - (v_bonus - v_payment.revoked_bonus_quota)),
    updated_at = now() WHERE id = v_payment.subscription_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Refund subscription missing'; END IF;
  UPDATE headshot_ai.payment_transactions SET refunded_amount_minor = v_total,
    revoked_quota = v_quota, revoked_bonus_quota = v_bonus,
    status = CASE WHEN v_total = paid_amount_minor THEN 'refunded' ELSE status END,
    updated_at = now() WHERE id = v_payment.id;
  INSERT INTO headshot_ai.payment_webhook_events(event_id, event_type, resource_id, payment_id)
    VALUES(p_event_id, 'refund.created', p_refund_id, v_payment.id);
  RETURN jsonb_build_object('duplicate', false);
END $$;

REVOKE ALL ON FUNCTION headshot_ai.apply_creem_checkout(text,text,text,text,text,bigint,bigint,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION headshot_ai.apply_creem_refund(text,text,text,bigint,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION headshot_ai.apply_creem_checkout(text,text,text,text,text,bigint,bigint,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION headshot_ai.apply_creem_refund(text,text,text,bigint,text) TO service_role;
COMMIT;
