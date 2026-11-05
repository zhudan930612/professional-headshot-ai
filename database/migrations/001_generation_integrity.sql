-- Existing headshot_ai tables must already exist. Rehearse on a backup first.
-- Additive task ledger; no customer rows are deleted or balances reset.
BEGIN;

CREATE TABLE IF NOT EXISTS headshot_ai.generation_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  request_id uuid NOT NULL,
  subscription_id uuid NOT NULL REFERENCES headshot_ai.user_subscriptions(id),
  retry_of uuid REFERENCES headshot_ai.generation_tasks(id),
  reference_url text NOT NULL,
  template_url text NOT NULL,
  quality text NOT NULL CHECK (quality IN ('1K', '2K', '4K')),
  charged_quota integer NOT NULL CHECK (charged_quota IN (0, 1)),
  status text NOT NULL DEFAULT 'submitting' CHECK (status IN ('submitting', 'processing', 'completed', 'failed', 'unknown')),
  provider_task_id text UNIQUE,
  result_url text,
  saved_image jsonb,
  refunded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, request_id),
  UNIQUE(retry_of)
);
CREATE INDEX IF NOT EXISTS generation_tasks_user_status ON headshot_ai.generation_tasks(user_id, status);
ALTER TABLE headshot_ai.generation_tasks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON headshot_ai.generation_tasks FROM PUBLIC, anon, authenticated;
GRANT ALL ON headshot_ai.generation_tasks TO service_role;
REVOKE INSERT, UPDATE, DELETE ON headshot_ai.user_subscriptions FROM anon, authenticated;

-- Read only one's own credits. Retains the frontend's existing parameter.
CREATE OR REPLACE FUNCTION headshot_ai.get_user_quota_info(p_user_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  s headshot_ai.user_subscriptions%ROWTYPE;
  p headshot_ai.subscription_plans%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR auth.uid()::text <> p_user_id THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  SELECT * INTO s FROM headshot_ai.user_subscriptions
    WHERE user_id::text = p_user_id AND status = 'active' AND (expires_at IS NULL OR expires_at > now())
    ORDER BY CASE plan_type WHEN 'executive' THEN 2 WHEN 'professional' THEN 1 ELSE 0 END DESC, created_at DESC LIMIT 1;
  SELECT * INTO p FROM headshot_ai.subscription_plans WHERE id = coalesce(s.plan_type, 'free') AND is_active;
  IF s.id IS NULL THEN
    RETURN jsonb_build_object('plan_type', 'free', 'total_quota', CASE
      WHEN EXISTS (SELECT 1 FROM headshot_ai.user_subscriptions WHERE user_id::text = p_user_id) THEN 0 ELSE coalesce(p.quota, 0) END,
      'used_quota', 0, 'remaining_quota', CASE
      WHEN EXISTS (SELECT 1 FROM headshot_ai.user_subscriptions WHERE user_id::text = p_user_id) THEN 0 ELSE coalesce(p.quota, 0) END,
      'is_paid', false, 'quality', coalesce(p.quality, '1K'), 'has_watermark', true);
  END IF;
  RETURN jsonb_build_object('plan_type', s.plan_type, 'total_quota', s.purchased_quota + s.bonus_quota,
    'used_quota', s.used_quota, 'remaining_quota', greatest(0, s.purchased_quota + s.bonus_quota - s.used_quota),
    'is_paid', s.plan_type <> 'free', 'quality', coalesce(p.quality, '1K'), 'has_watermark', coalesce(p.has_watermark, true));
END $$;

CREATE OR REPLACE FUNCTION headshot_ai.reserve_generation(
  p_user_id uuid, p_request_id uuid, p_reference_url text, p_template_url text, p_retry_of uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  t headshot_ai.generation_tasks%ROWTYPE;
  original headshot_ai.generation_tasks%ROWTYPE;
  s headshot_ai.user_subscriptions%ROWTYPE;
  p headshot_ai.subscription_plans%ROWTYPE;
  charge integer := 1;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));
  SELECT * INTO t FROM headshot_ai.generation_tasks WHERE user_id = p_user_id AND request_id = p_request_id;
  IF FOUND THEN
    IF t.reference_url <> p_reference_url OR t.template_url <> p_template_url OR t.retry_of IS DISTINCT FROM p_retry_of THEN
      RAISE EXCEPTION 'Request mismatch';
    END IF;
    RETURN jsonb_build_object('created', false, 'task', to_jsonb(t));
  END IF;
  IF (SELECT count(*) FROM headshot_ai.generation_tasks WHERE user_id = p_user_id AND status IN ('submitting','processing','unknown')) >= 4 THEN
    RAISE EXCEPTION 'Too many active generations';
  END IF;
  IF p_retry_of IS NOT NULL THEN
    SELECT * INTO original FROM headshot_ai.generation_tasks WHERE id = p_retry_of AND user_id = p_user_id;
    IF NOT FOUND OR original.status <> 'completed' OR original.charged_quota <> 1 OR original.retry_of IS NOT NULL
      OR original.template_url <> p_template_url OR EXISTS (SELECT 1 FROM headshot_ai.generation_tasks WHERE retry_of = p_retry_of) THEN
      RAISE EXCEPTION 'Retry unavailable';
    END IF;
    SELECT * INTO s FROM headshot_ai.user_subscriptions WHERE id = original.subscription_id
      AND status = 'active' AND (expires_at IS NULL OR expires_at > now())
      AND purchased_quota + bonus_quota > 0 FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Retry unavailable'; END IF;
    charge := 0;
  ELSE
    SELECT * INTO s FROM headshot_ai.user_subscriptions WHERE user_id = p_user_id
      AND status = 'active' AND (expires_at IS NULL OR expires_at > now())
      AND purchased_quota + bonus_quota > used_quota
      ORDER BY CASE plan_type WHEN 'executive' THEN 2 WHEN 'professional' THEN 1 ELSE 0 END DESC, created_at DESC LIMIT 1 FOR UPDATE;
    IF NOT FOUND THEN
      IF EXISTS (SELECT 1 FROM headshot_ai.user_subscriptions WHERE user_id = p_user_id) THEN RAISE EXCEPTION 'Insufficient quota'; END IF;
      SELECT * INTO p FROM headshot_ai.subscription_plans WHERE id = 'free' AND is_active;
      IF NOT FOUND OR p.quota <= 0 THEN RAISE EXCEPTION 'Insufficient quota'; END IF;
      INSERT INTO headshot_ai.user_subscriptions(user_id, plan_type, status, purchased_quota, bonus_quota, used_quota)
        VALUES(p_user_id, 'free', 'active', p.quota, 0, 0) RETURNING * INTO s;
    END IF;
  END IF;
  SELECT * INTO p FROM headshot_ai.subscription_plans WHERE id = s.plan_type AND is_active;
  IF NOT FOUND THEN RAISE EXCEPTION 'Plan unavailable'; END IF;
  UPDATE headshot_ai.user_subscriptions SET used_quota = used_quota + charge, updated_at = now() WHERE id = s.id;
  INSERT INTO headshot_ai.generation_tasks(id, user_id, request_id, subscription_id, retry_of, reference_url, template_url, quality, charged_quota)
    VALUES(p_request_id, p_user_id, p_request_id, s.id, p_retry_of, p_reference_url, p_template_url,
      CASE WHEN p_retry_of IS NULL THEN p.quality ELSE original.quality END, charge) RETURNING * INTO t;
  RETURN jsonb_build_object('created', true, 'task', to_jsonb(t));
END $$;

-- Only confirmed provider failures release a reservation; timeouts do not.
CREATE OR REPLACE FUNCTION headshot_ai.fail_generation(p_task_id uuid, p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE t headshot_ai.generation_tasks%ROWTYPE;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));
  SELECT * INTO t FROM headshot_ai.generation_tasks WHERE id = p_task_id AND user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Unknown task'; END IF;
  IF t.status IN ('completed', 'failed') THEN RETURN; END IF;
  UPDATE headshot_ai.user_subscriptions SET used_quota = greatest(0, used_quota - t.charged_quota), updated_at = now()
    WHERE id = t.subscription_id;
  UPDATE headshot_ai.generation_tasks SET status = 'failed', refunded_at = now(), updated_at = now() WHERE id = t.id;
END $$;

-- Retire browser-callable quota mutation and old cross-user quota lookup overloads.
DO $$
DECLARE f record;
BEGIN
  FOR f IN SELECT p.oid::regprocedure AS signature FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname IN ('public', 'headshot_ai') AND p.proname IN ('decrement_subscription_quota_safe', 'get_user_quota_info')
  LOOP EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', f.signature); END LOOP;
END $$;
GRANT EXECUTE ON FUNCTION headshot_ai.get_user_quota_info(text) TO authenticated;
REVOKE ALL ON FUNCTION headshot_ai.reserve_generation(uuid,uuid,text,text,uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION headshot_ai.fail_generation(uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION headshot_ai.reserve_generation(uuid,uuid,text,text,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION headshot_ai.fail_generation(uuid,uuid) TO service_role;
COMMIT;
