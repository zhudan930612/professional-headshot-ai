-- ========================================
-- 迁移脚本: 添加 jpg_url 字段
-- ========================================
-- 目的: 将展示格式从 WebP 改为 JPG（更好的兼容性）
-- 运行位置: Supabase Dashboard > SQL Editor
-- 创建时间: 2025-12-17
-- ========================================

-- 添加 jpg_url 字段到 generated_images 表
ALTER TABLE generated_images
ADD COLUMN IF NOT EXISTS jpg_url TEXT;

-- 添加注释
COMMENT ON COLUMN generated_images.jpg_url IS 'JPG 格式的展示 URL（替代 WebP，更好的兼容性）';

-- 如果之前有 webp_url 字段，可以选择删除（可选）
-- ALTER TABLE generated_images DROP COLUMN IF EXISTS webp_url;
