-- ========================================
-- Supabase 配置验证脚本
-- ========================================
-- 用途: 检查 RLS 策略、Buckets、表结构是否正确配置
-- 运行: Supabase Dashboard > SQL Editor
-- ========================================

-- 1. 检查所有表是否存在
SELECT
  table_name,
  CASE
    WHEN table_name IN ('user_quotas', 'generation_sessions', 'generated_images', 'uploaded_files')
    THEN '✅ 存在'
    ELSE '❌ 缺失'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('user_quotas', 'generation_sessions', 'generated_images', 'uploaded_files')
ORDER BY table_name;

-- 2. 检查 RLS 是否启用
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled,
  CASE
    WHEN rowsecurity THEN '✅ RLS 已启用'
    ELSE '❌ RLS 未启用'
  END as status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('user_quotas', 'generation_sessions', 'generated_images', 'uploaded_files')
ORDER BY tablename;

-- 3. 检查每个表的 RLS 策略数量
SELECT
  tablename,
  COUNT(*) as policy_count,
  CASE
    WHEN COUNT(*) >= 2 THEN '✅ 策略充足'
    WHEN COUNT(*) = 1 THEN '⚠️  策略不足'
    ELSE '❌ 无策略'
  END as status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('user_quotas', 'generation_sessions', 'generated_images', 'uploaded_files')
GROUP BY tablename
ORDER BY tablename;

-- 4. 查看所有 RLS 策略详情
SELECT
  tablename,
  policyname,
  cmd as operation,
  permissive,
  CASE
    WHEN qual IS NOT NULL OR with_check IS NOT NULL THEN '✅ 已配置'
    ELSE '❌ 未配置'
  END as status
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 5. 检查 Storage Buckets
SELECT
  id,
  name,
  public,
  CASE
    WHEN public THEN '✅ Public'
    ELSE '❌ Private (需改为 Public)'
  END as status,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE id IN ('user-uploads', 'generated-headshots')
ORDER BY name;

-- 6. 检查 Storage 策略
SELECT
  bucket_id,
  name as policy_name,
  CASE
    WHEN definition IS NOT NULL THEN '✅ 已配置'
    ELSE '❌ 未配置'
  END as status
FROM storage.policies
WHERE bucket_id IN ('user-uploads', 'generated-headshots')
ORDER BY bucket_id, name;

-- 7. 检查必要的列是否存在
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable,
  '✅ 存在' as status
FROM information_schema.columns
WHERE table_name = 'generation_sessions'
  AND column_name IN ('reference_image_url', 'reference_image_storage_path', 'reference_image_file_name')
ORDER BY column_name;

-- 8. 检查 increment_quota_safe 函数
SELECT
  routine_name,
  routine_type,
  CASE
    WHEN routine_type = 'FUNCTION' THEN '✅ 函数存在'
    ELSE '❌ 函数缺失'
  END as status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'increment_quota_safe';

-- ========================================
-- 预期结果检查表
-- ========================================

/*
✅ 全部通过的配置:

1. 所有表存在:
   - user_quotas ✅
   - generation_sessions ✅
   - generated_images ✅
   - uploaded_files ✅

2. RLS 已启用 (4 个表)

3. 每个表至少 2-3 个策略:
   - user_quotas: 3 个策略
   - generation_sessions: 3 个策略
   - generated_images: 2 个策略
   - uploaded_files: 3 个策略

4. Storage Buckets:
   - user-uploads (Public: ✅)
   - generated-headshots (Public: ✅)

5. Storage 策略:
   - user-uploads: 3 个策略
   - generated-headshots: 3 个策略

6. generation_sessions 新增列:
   - reference_image_url ✅
   - reference_image_storage_path ✅
   - reference_image_file_name ✅

7. increment_quota_safe 函数存在 ✅
*/

-- ========================================
-- 如果任何检查失败:
-- ========================================

/*
1. 如果表不存在 → 运行 database/schema.sql
2. 如果 RLS 未启用或策略缺失 → 运行 database/rls-policies.sql
3. 如果 Buckets 缺失 → 在 Supabase Dashboard > Storage 手动创建
4. 如果列缺失 → 运行 schema.sql 中的 ALTER TABLE 语句
*/
