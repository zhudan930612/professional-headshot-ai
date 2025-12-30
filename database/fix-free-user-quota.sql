-- ========================================
-- 修复 Free 用户配额问题
-- 问题: Free 用户显示 "0 uses left"
-- 原因: 触发器创建的订阅记录中 quota = 0
-- 解决: 为 Free 用户设置 5 次免费使用配额
-- ========================================

-- Step 1: 更新现有 Free 用户的配额
UPDATE user_subscriptions
SET
  purchased_quota = 5,  -- Free 用户有 5 次免费使用
  bonus_quota = 0,
  updated_at = NOW()
WHERE
  plan_type = 'free'
  AND status = 'active'
  AND purchased_quota = 0
  AND bonus_quota = 0;

-- Step 2: 修改触发器函数，为新 Free 用户分配 5 次配额
CREATE OR REPLACE FUNCTION create_default_subscription()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 插入 Free 订阅记录，包含 5 次免费配额
  INSERT INTO user_subscriptions (
    user_id,
    plan_type,
    status,
    purchased_quota,
    bonus_quota,
    used_quota
  )
  VALUES (
    NEW.id,
    'free',
    'active',
    5,   -- Free 用户有 5 次免费使用
    0,   -- 无赠送配额
    0    -- 未使用
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- 记录错误但不阻止用户创建
  RAISE WARNING 'Failed to create default subscription for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: 验证更新
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  -- 统计更新的用户数
  SELECT COUNT(*) INTO v_count
  FROM user_subscriptions
  WHERE plan_type = 'free' AND status = 'active' AND purchased_quota = 5;

  RAISE NOTICE '✅ Free 用户配额修复完成';
  RAISE NOTICE '已更新 % 个 Free 用户，现在每人有 5 次免费使用', v_count;
  RAISE NOTICE '请刷新页面查看配额更新';
END $$;
