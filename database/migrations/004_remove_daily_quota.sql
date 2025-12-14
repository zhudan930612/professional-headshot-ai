-- ========================================
-- Remove Daily Quota System
-- Purpose: 移除每日配额逻辑，所有用户（包括免费用户）都使用永久配额系统
-- Date: 2025-12-14
-- ========================================

-- ========================================
-- 1. 更新 get_user_quota_info 函数
-- ========================================
-- 移除每日配额逻辑，免费用户也使用 user_subscriptions 表
CREATE OR REPLACE FUNCTION get_user_quota_info(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_subscription RECORD;
BEGIN
  -- 查找用户的激活订阅
  SELECT * INTO v_subscription
  FROM user_subscriptions
  WHERE user_id = p_user_id
    AND status = 'active'
  LIMIT 1;

  IF v_subscription IS NOT NULL THEN
    -- 返回订阅配额信息（包括免费用户）
    RETURN jsonb_build_object(
      'plan_type', v_subscription.plan_type,
      'total_quota', v_subscription.purchased_quota + v_subscription.bonus_quota,
      'used_quota', v_subscription.used_quota,
      'remaining_quota', v_subscription.purchased_quota + v_subscription.bonus_quota - v_subscription.used_quota,
      'is_paid', v_subscription.plan_type != 'free',
      'quality', CASE
        WHEN v_subscription.plan_type = 'executive' THEN '2K'
        ELSE '1K'
      END,
      'has_watermark', v_subscription.plan_type = 'free'
    );
  ELSE
    -- 如果没有订阅记录，返回默认免费配额（首次使用）
    RETURN jsonb_build_object(
      'plan_type', 'free',
      'total_quota', 5,
      'used_quota', 0,
      'remaining_quota', 5,
      'is_paid', false,
      'quality', '1K',
      'has_watermark', true
    );
  END IF;
END;
$$;

-- ========================================
-- 2. 更新 decrement_subscription_quota_safe 函数
-- ========================================
-- 移除每日配额逻辑，所有用户都使用永久配额系统
CREATE OR REPLACE FUNCTION decrement_subscription_quota_safe(
  p_user_id UUID,
  p_amount INT DEFAULT 1,
  p_is_retry BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_subscription RECORD;
  v_remaining INT;
BEGIN
  -- 如果是重新生成，不扣减配额
  IF p_is_retry THEN
    RETURN jsonb_build_object(
      'success', true,
      'is_retry', true,
      'remaining', -1
    );
  END IF;

  -- 获取当前激活订阅（使用行锁防止并发）
  SELECT * INTO v_subscription
  FROM user_subscriptions
  WHERE user_id = p_user_id
    AND status = 'active'
  FOR UPDATE;

  -- 如果没有订阅记录，为用户创建免费订阅
  IF v_subscription IS NULL THEN
    INSERT INTO user_subscriptions (
      user_id,
      plan_type,
      status,
      purchased_quota,
      bonus_quota,
      used_quota
    ) VALUES (
      p_user_id,
      'free',
      'active',
      5,  -- 免费用户永久 5 次配额
      0,
      0
    )
    RETURNING * INTO v_subscription;
  END IF;

  -- 计算剩余配额
  v_remaining := v_subscription.purchased_quota + v_subscription.bonus_quota
                 - v_subscription.used_quota;

  IF v_remaining < p_amount THEN
    RETURN jsonb_build_object(
      'success', false,
      'remaining', v_remaining,
      'error', 'Insufficient quota'
    );
  END IF;

  -- 原子性更新已使用配额
  UPDATE user_subscriptions
  SET used_quota = used_quota + p_amount,
      updated_at = now()
  WHERE id = v_subscription.id;

  RETURN jsonb_build_object(
    'success', true,
    'remaining', v_remaining - p_amount,
    'plan_type', v_subscription.plan_type
  );
END;
$$;

-- ========================================
-- 3. 为现有免费用户创建订阅记录（如果不存在）
-- ========================================
-- 这个操作是幂等的，不会影响已有订阅的用户
INSERT INTO user_subscriptions (
  user_id,
  plan_type,
  status,
  purchased_quota,
  bonus_quota,
  used_quota
)
SELECT 
  id as user_id,
  'free' as plan_type,
  'active' as status,
  5 as purchased_quota,
  0 as bonus_quota,
  0 as used_quota
FROM auth.users
WHERE id NOT IN (
  SELECT user_id 
  FROM user_subscriptions 
  WHERE status = 'active'
)
ON CONFLICT DO NOTHING;

-- ========================================
-- 4. 注释：user_quotas 表保留但不再使用
-- ========================================
-- user_quotas 表保留以备将来可能的需求
-- 但新的配额系统不再使用每日重置逻辑

-- ========================================
-- Migration completed
-- ========================================

COMMENT ON FUNCTION get_user_quota_info(UUID) IS '获取用户配额信息（永久配额系统，无每日重置）';
COMMENT ON FUNCTION decrement_subscription_quota_safe(UUID, INT, BOOLEAN) IS '扣减用户配额（永久配额系统，所有用户统一处理）';

