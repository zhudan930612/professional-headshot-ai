-- ========================================
-- 检查数据库中配额的实际状态
-- ========================================

-- 1. 查看你的用户订阅记录（替换为你的实际 user_id）
SELECT
  '📊 用户订阅信息' as info,
  user_id,
  plan_type,
  status,
  purchased_quota,
  bonus_quota,
  used_quota,
  (purchased_quota + bonus_quota) as total_quota,
  (purchased_quota + bonus_quota - used_quota) as remaining_quota,
  created_at,
  updated_at
FROM user_subscriptions
WHERE user_id = 'YOUR_USER_ID'  -- ⚠️ 替换为你的实际 user_id
ORDER BY created_at DESC;

-- 2. 查看所有活跃订阅（找出你的 user_id）
SELECT
  '🔍 所有活跃订阅' as info,
  user_id,
  plan_type,
  used_quota,
  (purchased_quota + bonus_quota - used_quota) as remaining,
  updated_at
FROM user_subscriptions
WHERE status = 'active'
ORDER BY updated_at DESC
LIMIT 10;

-- 3. 测试 get_user_quota_info 函数
-- SELECT '🧪 测试获取配额' as test, * FROM get_user_quota_info('YOUR_USER_ID');

-- 4. 查看最近的生成会话（验证图片是否保存成功）
SELECT
  '📸 最近的生成会话' as info,
  s.user_id,
  s.session_id,
  s.date,
  s.style,
  COUNT(i.id) as image_count,
  s.created_at
FROM generation_sessions s
LEFT JOIN generated_images i ON s.session_id = i.session_id
WHERE s.user_id = 'YOUR_USER_ID'  -- ⚠️ 替换为你的实际 user_id
GROUP BY s.id, s.user_id, s.session_id, s.date, s.style, s.created_at
ORDER BY s.created_at DESC
LIMIT 5;

-- 5. 查看最近的生成图片
SELECT
  '🖼️ 最近生成的图片' as info,
  session_id,
  image_id,
  created_at,
  LEFT(url, 50) || '...' as url_preview
FROM generated_images
WHERE session_id IN (
  SELECT session_id FROM generation_sessions
  WHERE user_id = 'YOUR_USER_ID'  -- ⚠️ 替换为你的实际 user_id
)
ORDER BY created_at DESC
LIMIT 10;

-- ========================================
-- 如何使用：
-- 1. 找到你的 user_id
--    - 登录前端，打开 Console（F12）
--    - 查看日志中的 userId（例如 [HeroTool] 准备扣减配额... {用户ID: "xxx"}）
--    - 或者在 Supabase Dashboard → Authentication → Users 中找到
-- 2. 替换上面 SQL 中的 'YOUR_USER_ID' 为你的实际 user_id
-- 3. 在 Supabase SQL Editor 中执行
-- 4. 查看结果：
--    - 如果 used_quota 没有增加，说明数据库更新失败
--    - 如果 image_count 为 0，说明图片没有保存到数据库
--    - 如果 remaining_quota 始终是 5，说明配额扣减没有持久化
-- ========================================
