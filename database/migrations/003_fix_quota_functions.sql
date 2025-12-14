-- ========================================
-- Fix Quota Management Functions
-- Purpose: 修复配额扣减逻辑，确保 Free 用户正确扣减每日配额
-- Date: 2025-12-15
-- ========================================

-- 1. 先删除旧函数
DROP FUNCTION IF EXISTS increment_quota_safe(TEXT, DATE, INTEGER, INTEGER);

-- 2. 重新创建 increment_quota_safe，返回类型为 JSONB
CREATE OR REPLACE FUNCTION increment_quota_safe(
  p_user_id TEXT,
  p_date DATE,
  p_amount INTEGER,
  p_limit INTEGER
)
RETURNS JSONB AS $$
DECLARE
  v_current_count INTEGER;
  v_new_count INTEGER;
BEGIN
  SELECT count INTO v_current_count
  FROM user_quotas
  WHERE user_id = p_user_id AND date = p_date
  FOR UPDATE;

  IF v_current_count IS NULL THEN
    v_current_count := 0;
  END IF;

  IF v_current_count + p_amount > p_limit THEN
    RETURN jsonb_build_object(
      'success', false, 
      'reason', 'limit_exceeded',
      'remaining', p_limit - v_current_count
    );
  END IF;

  v_new_count := v_current_count + p_amount;

  INSERT INTO user_quotas (user_id, date, count)
  VALUES (p_user_id, p_date, v_new_count)
  ON CONFLICT (user_id, date)
  DO UPDATE SET count = v_new_count, updated_at = NOW();

  RETURN jsonb_build_object(
    'success', true, 
    'new_count', v_new_count,
    'remaining', p_limit - v_new_count
  );
END;
$$ LANGUAGE plpgsql;

-- 3. 重写 decrement_subscription_quota_safe，修复 Free 用户逻辑
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
  v_quota_result JSONB;
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

  -- 如果没有订阅记录，返回错误
  IF v_subscription IS NULL THEN
    RAISE EXCEPTION 'No active subscription found for user %', p_user_id;
  END IF;

  -- Free 用户：使用每日配额系统
  IF v_subscription.plan_type = 'free' THEN
    v_quota_result := increment_quota_safe(
      p_user_id::TEXT,
      CURRENT_DATE,
      p_amount,
      5  -- Free 用户每日 5 张
    );
    
    RETURN v_quota_result;
  END IF;

  -- 付费用户：使用永久配额系统
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
-- Migration completed
-- ========================================

