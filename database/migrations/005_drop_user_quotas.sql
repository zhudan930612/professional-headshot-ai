-- ==========================================
-- 删除 user_quotas 表及相关对象
-- ==========================================
--
-- 说明: user_quotas 表已被 user_subscriptions 表取代
-- 执行前请确保已备份数据
--
-- 执行方式:
-- 1. 访问 Supabase SQL Editor
--    https://supabase.com/dashboard/project/osxwjhvlntrornibhkfu/sql/new
-- 2. 复制此脚本并执行
--
-- ==========================================

-- 1. 删除 RLS 策略
DROP POLICY IF EXISTS "Users can view their own quota" ON user_quotas;
DROP POLICY IF EXISTS "Users can insert their own quota" ON user_quotas;
DROP POLICY IF EXISTS "Users can update their own quota" ON user_quotas;

-- 2. 删除索引
DROP INDEX IF EXISTS idx_user_quotas_user_id;
DROP INDEX IF EXISTS idx_user_quotas_date;

-- 3. 删除触发器
DROP TRIGGER IF EXISTS update_user_quotas_updated_at ON user_quotas;

-- 4. 删除表（CASCADE 会自动删除依赖对象）
DROP TABLE IF EXISTS user_quotas CASCADE;

-- ==========================================
-- 验证删除
-- ==========================================

-- 查询表是否仍存在（应该返回空结果）
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'user_quotas';

-- 查询 RLS 策略是否已删除（应该返回空结果）
SELECT policyname
FROM pg_policies
WHERE tablename = 'user_quotas';

-- 查询索引是否已删除（应该返回空结果）
SELECT indexname
FROM pg_indexes
WHERE tablename = 'user_quotas';

-- ==========================================
-- 成功提示
-- ==========================================

DO $$
BEGIN
  RAISE NOTICE '✅ user_quotas 表已成功删除';
  RAISE NOTICE '请确认:';
  RAISE NOTICE '  1. 代码中无 user_quotas 引用';
  RAISE NOTICE '  2. 应用功能正常运行';
  RAISE NOTICE '  3. 无控制台错误';
END $$;
