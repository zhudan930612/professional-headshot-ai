-- ========================================
-- Supabase 行级安全策略 (RLS Policies)
-- ========================================
-- 目的: 修复 "new row violates row-level security policy" 错误
-- 运行位置: Supabase Dashboard > SQL Editor
-- ========================================

-- Step 1: 为所有表启用 RLS
ALTER TABLE user_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploaded_files ENABLE ROW LEVEL SECURITY;

-- ========================================
-- Step 2: 创建 user_quotas 表的 RLS 策略
-- ========================================

-- 允许用户查询自己的配额记录
CREATE POLICY "Users can view own quota"
ON user_quotas FOR SELECT
USING (
  user_id = auth.uid()::text
  OR user_id LIKE 'anon_%'  -- 支持匿名用户
);

-- 允许用户插入自己的配额记录
CREATE POLICY "Users can insert own quota"
ON user_quotas FOR INSERT
WITH CHECK (
  user_id = auth.uid()::text
  OR user_id LIKE 'anon_%'
);

-- 允许用户更新自己的配额记录
CREATE POLICY "Users can update own quota"
ON user_quotas FOR UPDATE
USING (
  user_id = auth.uid()::text
  OR user_id LIKE 'anon_%'
);

-- ========================================
-- Step 3: 创建 generation_sessions 表的 RLS 策略
-- ========================================

-- 允许用户查询自己的生成会话
CREATE POLICY "Users can view own sessions"
ON generation_sessions FOR SELECT
USING (
  user_id = auth.uid()::text
  OR user_id LIKE 'anon_%'
);

-- 允许用户创建自己的生成会话
CREATE POLICY "Users can create own sessions"
ON generation_sessions FOR INSERT
WITH CHECK (
  user_id = auth.uid()::text
  OR user_id LIKE 'anon_%'
);

-- 允许用户更新自己的生成会话
CREATE POLICY "Users can update own sessions"
ON generation_sessions FOR UPDATE
USING (
  user_id = auth.uid()::text
  OR user_id LIKE 'anon_%'
);

-- ========================================
-- Step 4: 创建 generated_images 表的 RLS 策略
-- ========================================

-- 允许用户查询自己会话下的生成图片
CREATE POLICY "Users can view own generated images"
ON generated_images FOR SELECT
USING (
  session_id IN (
    SELECT session_id FROM generation_sessions
    WHERE user_id = auth.uid()::text
    OR user_id LIKE 'anon_%'
  )
);

-- 允许用户插入自己会话下的生成图片
CREATE POLICY "Users can insert own generated images"
ON generated_images FOR INSERT
WITH CHECK (
  session_id IN (
    SELECT session_id FROM generation_sessions
    WHERE user_id = auth.uid()::text
    OR user_id LIKE 'anon_%'
  )
);

-- ========================================
-- Step 5: 创建 uploaded_files 表的 RLS 策略
-- ========================================

-- 允许用户查询自己上传的文件
CREATE POLICY "Users can view own uploaded files"
ON uploaded_files FOR SELECT
USING (
  user_id = auth.uid()::text
  OR user_id LIKE 'anon_%'
);

-- 允许用户上传文件记录
CREATE POLICY "Users can insert own uploaded files"
ON uploaded_files FOR INSERT
WITH CHECK (
  user_id = auth.uid()::text
  OR user_id LIKE 'anon_%'
);

-- 允许用户删除自己上传的文件
CREATE POLICY "Users can delete own uploaded files"
ON uploaded_files FOR DELETE
USING (
  user_id = auth.uid()::text
  OR user_id LIKE 'anon_%'
);

-- ========================================
-- Step 6: 创建 Storage Buckets (如果不存在)
-- ========================================

-- 在 Supabase Dashboard > Storage 中手动创建这两个 bucket:
-- 1. user-uploads (用户上传的参考图)
-- 2. generated-headshots (AI 生成的头像)

-- 或者使用 SQL 创建 (需要 storage.buckets 表权限):
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('user-uploads', 'user-uploads', true),
  ('generated-headshots', 'generated-headshots', true)
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- Step 7: 创建 Storage 的 RLS 策略
-- ========================================

-- user-uploads bucket: 允许用户上传自己的文件
CREATE POLICY "Users can upload own files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'user-uploads'
  AND (auth.uid()::text = (storage.foldername(name))[1] OR (storage.foldername(name))[1] LIKE 'anon_%')
);

-- user-uploads bucket: 允许用户查看自己的文件
CREATE POLICY "Users can view own uploads"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'user-uploads'
  AND (auth.uid()::text = (storage.foldername(name))[1] OR (storage.foldername(name))[1] LIKE 'anon_%')
);

-- user-uploads bucket: 允许用户删除自己的文件
CREATE POLICY "Users can delete own uploads"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'user-uploads'
  AND (auth.uid()::text = (storage.foldername(name))[1] OR (storage.foldername(name))[1] LIKE 'anon_%')
);

-- generated-headshots bucket: 允许用户上传生成的图片
CREATE POLICY "Users can upload generated headshots"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'generated-headshots'
  AND (auth.uid()::text = (storage.foldername(name))[1] OR (storage.foldername(name))[1] LIKE 'anon_%')
);

-- generated-headshots bucket: 允许用户查看自己的生成图片
CREATE POLICY "Users can view own generated headshots"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'generated-headshots'
  AND (auth.uid()::text = (storage.foldername(name))[1] OR (storage.foldername(name))[1] LIKE 'anon_%')
);

-- generated-headshots bucket: 允许公开访问所有生成图片 (可选)
CREATE POLICY "Public can view generated headshots"
ON storage.objects FOR SELECT
USING (bucket_id = 'generated-headshots');

-- ========================================
-- Step 8: 验证策略是否生效
-- ========================================

-- 查看所有 RLS 策略
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 查看 Storage 策略
SELECT * FROM storage.policies;

-- ========================================
-- 完成!
-- ========================================
-- 现在你的应用应该可以正常上传和查询数据了。
-- 如果仍有问题,请检查 Supabase Dashboard > Storage 中
-- user-uploads 和 generated-headshots 两个 bucket 是否存在且设置为 Public。
