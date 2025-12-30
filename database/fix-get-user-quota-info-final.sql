-- ========================================
-- 最终修复：get_user_quota_info 函数
-- 问题：函数找不到订阅记录，返回默认值
-- 原因：可能是 RLS 策略或查询逻辑问题
-- ========================================

-- 删除旧版本
DROP FUNCTION IF EXISTS get_user_quota_info(TEXT);
DROP FUNCTION IF EXISTS get_user_quota_info(UUID);

-- 创建新版本（直接使用 UUID 参数，避免转换问题）
CREATE OR REPLACE FUNCTION get_user_quota_info(p_user_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER  -- 使用函数定义者权限
SET search_path = public
AS $$
DECLARE
  v_user_uuid UUID;
  v_purchased_quota INT;
  v_bonus_quota INT;
  v_used_quota INT;
  v_plan_type TEXT;
BEGIN
  -- 转换 TEXT 到 UUID
  BEGIN
    v_user_uuid := p_user_id::UUID;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Invalid user_id format: %', p_user_id;
  END;

  -- ⭐ 直接查询字段，避免 SELECT * INTO 可能的问题
  SELECT
    plan_type,
    purchased_quota,
    bonus_quota,
    used_quota
  INTO
    v_plan_type,
    v_purchased_quota,
    v_bonus_quota,
    v_used_quota
  FROM user_subscriptions
  WHERE user_id = v_user_uuid
    AND status = 'active'
  ORDER BY created_at DESC  -- 如果有多条，取最新的
  LIMIT 1;

  -- 如果找到订阅记录
  IF v_plan_type IS NOT NULL THEN
    RETURN jsonb_build_object(
      'plan_type', v_plan_type,
      'total_quota', v_purchased_quota + v_bonus_quota,
      'used_quota', v_used_quota,
      'remaining_quota', v_purchased_quota + v_bonus_quota - v_used_quota,
      'is_paid', v_plan_type != 'free',
      'quality', CASE
        WHEN v_plan_type IN ('executive', 'professional') THEN '2K'
        ELSE '1K'
      END,
      'has_watermark', v_plan_type = 'free'
    );
  ELSE
    -- 如果没有订阅记录，返回默认 free 配额
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

-- 测试函数
SELECT '✅ 函数创建成功' as status;

-- 立即测试（替换为你的 user_id）
SELECT 'get_user_quota_info 测试结果:' as test,
       get_user_quota_info('2d3c1522-4149-4d31-9131-3888338fe038') as result;
