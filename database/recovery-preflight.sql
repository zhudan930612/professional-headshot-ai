-- Read-only review before 001/002. Save results outside version control.
BEGIN TRANSACTION READ ONLY;

SELECT n.nspname AS schema_name, c.relname AS table_name, c.relrowsecurity AS rls_enabled
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'headshot_ai' AND c.relkind = 'r'
  AND c.relname IN ('user_subscriptions','payment_transactions','generation_sessions','generated_images','uploaded_files','subscription_plans');

SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'headshot_ai' OR (schemaname = 'storage' AND tablename = 'objects');

SELECT table_schema, table_name, grantee, privilege_type FROM information_schema.role_table_grants
WHERE table_schema = 'headshot_ai' AND grantee IN ('anon','authenticated','service_role')
ORDER BY table_name, grantee, privilege_type;

SELECT n.nspname AS schema_name, p.oid::regprocedure AS function_name, p.prosecdef AS security_definer,
  has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_can_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') AS user_can_execute
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname IN ('headshot_ai','public')
  AND p.proname IN ('get_user_quota_info','decrement_subscription_quota_safe','reserve_generation','fail_generation','apply_creem_checkout','apply_creem_refund');

SELECT conrelid::regclass AS table_name, conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint WHERE conrelid IN ('headshot_ai.user_subscriptions'::regclass, 'headshot_ai.payment_transactions'::regclass);

SELECT count(*) AS users_with_multiple_active_subscriptions FROM (
  SELECT user_id FROM headshot_ai.user_subscriptions
  WHERE status = 'active' AND (expires_at IS NULL OR expires_at > now())
  GROUP BY user_id HAVING count(*) > 1
) duplicated;
SELECT status, count(*) AS payment_count FROM headshot_ai.payment_transactions GROUP BY status;
SELECT count(*) AS legacy_checkout_references FROM headshot_ai.payment_transactions WHERE creem_order_id LIKE 'ch\_%' ESCAPE '\';
COMMIT;
