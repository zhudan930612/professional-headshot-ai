-- ========================================
-- 增强版配额扣减函数（添加验证和日志）
-- ========================================

CREATE OR REPLACE FUNCTION decrement_subscription_quota_safe(
  p_user_id TEXT,
  p_amount INT DEFAULT 1,
  p_is_retry BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subscription RECORD;
  v_remaining INT;
  v_user_uuid UUID;
  v_rows_updated INT;
  v_old_used_quota INT;
  v_new_used_quota INT;
BEGIN
  -- 转换 TEXT 到 UUID
  v_user_uuid := p_user_id::UUID;

  RAISE NOTICE '🎯 开始扣减配额: user_id=%, amount=%, is_retry=%', p_user_id, p_amount, p_is_retry;

  -- 如果是重试，不扣减配额
  IF p_is_retry THEN
    RAISE NOTICE '⏭️ 重试请求，不扣减配额';
    RETURN jsonb_build_object(
      'success', true,
      'is_retry', true,
      'remaining', -1
    );
  END IF;

  -- 获取当前活跃订阅（加行锁防止并发）
  SELECT * INTO v_subscription
  FROM user_subscriptions
  WHERE user_id = v_user_uuid
    AND status = 'active'
  FOR UPDATE;

  -- 如果没有订阅记录，创建 free 订阅
  IF v_subscription IS NULL THEN
    RAISE NOTICE '📝 用户无订阅记录，创建 free 订阅';
    INSERT INTO user_subscriptions (
      user_id,
      plan_type,
      status,
      purchased_quota,
      bonus_quota,
      used_quota
    ) VALUES (
      v_user_uuid,
      'free',
      'active',
      5,
      0,
      0
    )
    RETURNING * INTO v_subscription;
    RAISE NOTICE '✅ 创建订阅成功: id=%', v_subscription.id;
  ELSE
    RAISE NOTICE '📊 找到现有订阅: id=%, plan=%, used=%', v_subscription.id, v_subscription.plan_type, v_subscription.used_quota;
  END IF;

  -- 保存旧值用于验证
  v_old_used_quota := v_subscription.used_quota;

  -- 计算剩余配额
  v_remaining := v_subscription.purchased_quota + v_subscription.bonus_quota - v_subscription.used_quota;
  RAISE NOTICE '📊 剩余配额计算: purchased=% + bonus=% - used=% = %',
    v_subscription.purchased_quota, v_subscription.bonus_quota, v_subscription.used_quota, v_remaining;

  -- 检查配额是否足够
  IF v_remaining < p_amount THEN
    RAISE NOTICE '❌ 配额不足: remaining=%, required=%', v_remaining, p_amount;
    RETURN jsonb_build_object(
      'success', false,
      'remaining', v_remaining,
      'error', 'Insufficient quota'
    );
  END IF;

  -- 原子性更新已使用配额
  RAISE NOTICE '💾 更新 used_quota: % -> %', v_old_used_quota, v_old_used_quota + p_amount;
  UPDATE user_subscriptions
  SET used_quota = used_quota + p_amount,
      updated_at = now()
  WHERE id = v_subscription.id;

  -- 检查是否真的更新了
  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
  RAISE NOTICE '✅ UPDATE 影响行数: %', v_rows_updated;

  IF v_rows_updated = 0 THEN
    RAISE EXCEPTION '❌ UPDATE 失败：未找到订阅记录 id=%', v_subscription.id;
  END IF;

  -- 验证更新结果
  SELECT used_quota INTO v_new_used_quota
  FROM user_subscriptions
  WHERE id = v_subscription.id;

  RAISE NOTICE '🔍 验证更新结果: old_used=%, new_used=%', v_old_used_quota, v_new_used_quota;

  IF v_new_used_quota != v_old_used_quota + p_amount THEN
    RAISE WARNING '⚠️ 配额更新不一致: expected=%, actual=%',
      v_old_used_quota + p_amount, v_new_used_quota;
  END IF;

  -- 返回成功结果
  RETURN jsonb_build_object(
    'success', true,
    'remaining', v_remaining - p_amount,
    'plan_type', v_subscription.plan_type,
    'old_used', v_old_used_quota,
    'new_used', v_new_used_quota,
    'rows_updated', v_rows_updated
  );
END;
$$;

-- 测试提示
COMMENT ON FUNCTION decrement_subscription_quota_safe(TEXT, INT, BOOLEAN) IS
'扣减用户配额（增强版，包含详细日志）。查看日志: SELECT * FROM pg_stat_statements;';

-- ========================================
-- 使用说明
-- ========================================
-- 1. 在 Supabase SQL Editor 中执行此脚本
-- 2. 测试调用（不会真正扣减，因为 is_retry=true）:
--    SELECT * FROM decrement_subscription_quota_safe('YOUR_USER_ID', 1, true);
-- 3. 真实扣减测试:
--    SELECT * FROM decrement_subscription_quota_safe('YOUR_USER_ID', 1, false);
-- 4. 查看数据库日志（在 Supabase Dashboard → Logs → Postgres Logs）
-- ========================================
