PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, email TEXT, name TEXT, avatar_url TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, legacy_json TEXT
);
CREATE TABLE IF NOT EXISTS identities (
  provider TEXT NOT NULL, subject TEXT NOT NULL, user_id TEXT NOT NULL REFERENCES users(id),
  PRIMARY KEY(provider, subject)
);
CREATE INDEX IF NOT EXISTS identities_user ON identities(user_id);
CREATE TABLE IF NOT EXISTS auth_sessions (
  token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
  expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS auth_sessions_expiry ON auth_sessions(expires_at);
CREATE TABLE IF NOT EXISTS auth_challenges (token_hash TEXT PRIMARY KEY, expires_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS auth_challenges_expiry ON auth_challenges(expires_at);
CREATE TABLE IF NOT EXISTS subscription_plans (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, display_name TEXT NOT NULL, price REAL NOT NULL,
  quota INTEGER NOT NULL, bonus_quota INTEGER NOT NULL DEFAULT 0, quality TEXT NOT NULL,
  has_watermark INTEGER NOT NULL, features TEXT NOT NULL, is_active INTEGER NOT NULL,
  sort_order INTEGER NOT NULL, created_at TEXT, updated_at TEXT
);
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), plan_type TEXT NOT NULL REFERENCES subscription_plans(id),
  status TEXT NOT NULL, purchased_quota INTEGER NOT NULL CHECK(purchased_quota >= 0),
  bonus_quota INTEGER NOT NULL CHECK(bonus_quota >= 0), used_quota INTEGER NOT NULL CHECK(used_quota >= 0),
  subscribed_at TEXT NOT NULL, expires_at TEXT, cancelled_at TEXT, payment_id TEXT,
  amount REAL, currency TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS subscription_user_active ON user_subscriptions(user_id, status, plan_type);
CREATE TABLE IF NOT EXISTS payment_transactions (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), subscription_id TEXT REFERENCES user_subscriptions(id),
  creem_order_id TEXT UNIQUE, creem_checkout_id TEXT UNIQUE, creem_transaction_id TEXT,
  creem_product_id TEXT, plan_type TEXT NOT NULL, amount REAL NOT NULL, currency TEXT NOT NULL,
  status TEXT NOT NULL, metadata TEXT, created_at TEXT NOT NULL, completed_at TEXT, updated_at TEXT NOT NULL,
  granted_quota INTEGER, granted_bonus_quota INTEGER, paid_amount_minor INTEGER,
  refunded_amount_minor INTEGER NOT NULL DEFAULT 0, revoked_quota INTEGER NOT NULL DEFAULT 0,
  revoked_bonus_quota INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS payment_user_date ON payment_transactions(user_id, created_at);
CREATE TABLE IF NOT EXISTS generation_sessions (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), session_id TEXT NOT NULL UNIQUE,
  date INTEGER NOT NULL, style TEXT NOT NULL, use_case TEXT NOT NULL, created_at TEXT,
  input_file_ids TEXT, reference_template_ids TEXT, processing_status TEXT, error_message TEXT,
  subscription_plan TEXT, image_quality TEXT, has_watermark INTEGER, is_retry INTEGER
);
CREATE INDEX IF NOT EXISTS history_user_date ON generation_sessions(user_id, date DESC, session_id);
CREATE TABLE IF NOT EXISTS generated_images (
  id TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES generation_sessions(session_id), image_id TEXT NOT NULL UNIQUE,
  url TEXT NOT NULL, created_at_timestamp INTEGER NOT NULL, created_at TEXT, storage_path TEXT,
  file_size INTEGER, mime_type TEXT, webp_url TEXT, thumbnail_url TEXT, jpg_url TEXT, task_id TEXT
);
CREATE INDEX IF NOT EXISTS images_session ON generated_images(session_id);
CREATE TABLE IF NOT EXISTS uploaded_files (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL, file_size INTEGER NOT NULL, mime_type TEXT NOT NULL, created_at TEXT
);
CREATE TABLE IF NOT EXISTS storage_objects (
  object_key TEXT PRIMARY KEY, bucket TEXT NOT NULL, source_key TEXT NOT NULL, user_id TEXT REFERENCES users(id),
  bytes INTEGER NOT NULL, mime_type TEXT NOT NULL, sha256 TEXT NOT NULL, created_at TEXT NOT NULL,
  UNIQUE(bucket, source_key)
);
CREATE INDEX IF NOT EXISTS storage_user ON storage_objects(user_id, bucket);
CREATE TABLE IF NOT EXISTS generation_tasks (
  id TEXT PRIMARY KEY, request_id TEXT NOT NULL, user_id TEXT NOT NULL REFERENCES users(id),
  subscription_id TEXT NOT NULL REFERENCES user_subscriptions(id), reference_key TEXT NOT NULL REFERENCES storage_objects(object_key),
  template_key TEXT NOT NULL, quality TEXT NOT NULL, charged INTEGER NOT NULL CHECK(charged IN (0,1)),
  retry_of TEXT UNIQUE REFERENCES generation_tasks(id), status TEXT NOT NULL,
  provider_task_id TEXT, result_url TEXT, saved_image TEXT, refunded_at TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE(user_id, request_id)
);
CREATE INDEX IF NOT EXISTS tasks_user_status ON generation_tasks(user_id, status);
CREATE TRIGGER IF NOT EXISTS generation_reserve_guard BEFORE INSERT ON generation_tasks
BEGIN
  SELECT RAISE(ABORT, 'Too many active generations') WHERE
    (SELECT count(*) FROM generation_tasks WHERE user_id=NEW.user_id AND status IN ('submitting','processing','unknown')) >= 4;
  SELECT RAISE(ABORT, 'Insufficient quota') WHERE NEW.charged=1 AND NOT EXISTS (
    SELECT 1 FROM user_subscriptions WHERE id=NEW.subscription_id AND user_id=NEW.user_id AND status='active'
      AND (expires_at IS NULL OR julianday(expires_at)>julianday('now')) AND used_quota<purchased_quota+bonus_quota
  );
  SELECT RAISE(ABORT, 'Retry unavailable') WHERE NEW.charged=0 AND NOT EXISTS (
    SELECT 1 FROM generation_tasks WHERE id=NEW.retry_of AND user_id=NEW.user_id AND status='completed'
      AND charged=1 AND template_key=NEW.template_key AND subscription_id=NEW.subscription_id AND quality=NEW.quality
  );
  SELECT RAISE(ABORT, 'Invalid charge') WHERE (NEW.charged=1 AND NEW.retry_of IS NOT NULL) OR (NEW.charged=0 AND NEW.retry_of IS NULL);
END;
CREATE TRIGGER IF NOT EXISTS generation_reserve_charge AFTER INSERT ON generation_tasks WHEN NEW.charged=1
BEGIN
  UPDATE user_subscriptions SET used_quota=used_quota+1, updated_at=NEW.updated_at WHERE id=NEW.subscription_id;
END;
CREATE TRIGGER IF NOT EXISTS generation_fail_refund AFTER UPDATE OF status ON generation_tasks
WHEN NEW.status='failed' AND OLD.status IN ('submitting','processing','unknown') AND OLD.refunded_at IS NULL
BEGIN
  UPDATE user_subscriptions SET used_quota=max(0,used_quota-NEW.charged), updated_at=NEW.updated_at WHERE id=NEW.subscription_id;
  UPDATE generation_tasks SET refunded_at=NEW.updated_at WHERE id=NEW.id;
END;

CREATE TABLE IF NOT EXISTS payment_events (
  event_id TEXT PRIMARY KEY, event_type TEXT NOT NULL CHECK(event_type IN ('checkout.completed','refund.created')),
  resource_id TEXT NOT NULL, payment_id TEXT NOT NULL REFERENCES payment_transactions(id),
  checkout_id TEXT, order_id TEXT NOT NULL, product_id TEXT, amount_minor INTEGER NOT NULL,
  paid_minor INTEGER, currency TEXT NOT NULL, transaction_id TEXT, new_subscription_id TEXT NOT NULL,
  created_at TEXT NOT NULL, UNIQUE(event_type, resource_id)
);
CREATE TRIGGER IF NOT EXISTS checkout_guard BEFORE INSERT ON payment_events WHEN NEW.event_type='checkout.completed'
BEGIN
  SELECT RAISE(ABORT, 'Payment terms mismatch') WHERE NOT EXISTS (
    SELECT 1 FROM payment_transactions p WHERE p.id=NEW.payment_id AND p.status='pending'
      AND p.creem_product_id=NEW.product_id AND p.granted_quota>=0 AND p.granted_bonus_quota>=0
      AND upper(p.currency)=upper(NEW.currency) AND round(p.amount*100)=NEW.amount_minor AND NEW.paid_minor>=NEW.amount_minor
      AND (p.creem_checkout_id IS NULL OR p.creem_checkout_id=NEW.checkout_id)
      AND (p.creem_order_id IS NULL OR p.creem_order_id LIKE 'ch_%' OR p.creem_order_id=NEW.order_id)
  );
END;
CREATE TRIGGER IF NOT EXISTS checkout_apply AFTER INSERT ON payment_events WHEN NEW.event_type='checkout.completed'
BEGIN
  INSERT INTO user_subscriptions(id,user_id,plan_type,status,purchased_quota,bonus_quota,used_quota,subscribed_at,expires_at,payment_id,amount,currency,created_at,updated_at)
    SELECT NEW.new_subscription_id,p.user_id,p.plan_type,'active',0,0,0,NEW.created_at,NULL,NEW.order_id,p.amount,p.currency,NEW.created_at,NEW.created_at
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
CREATE TRIGGER IF NOT EXISTS refund_guard BEFORE INSERT ON payment_events WHEN NEW.event_type='refund.created'
BEGIN
  SELECT RAISE(ABORT, 'Invalid refund state') WHERE NOT EXISTS (
    SELECT 1 FROM payment_transactions p JOIN user_subscriptions s ON s.id=p.subscription_id
    WHERE p.id=NEW.payment_id AND p.creem_order_id=NEW.order_id AND p.status IN ('completed','refunded')
      AND p.paid_amount_minor>0 AND p.granted_quota IS NOT NULL AND p.granted_bonus_quota IS NOT NULL
      AND NEW.amount_minor>0 AND p.refunded_amount_minor+NEW.amount_minor<=p.paid_amount_minor AND upper(p.currency)=upper(NEW.currency)
  );
END;
CREATE TRIGGER IF NOT EXISTS refund_apply AFTER INSERT ON payment_events WHEN NEW.event_type='refund.created'
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
END;
