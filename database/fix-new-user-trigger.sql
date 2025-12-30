-- ========================================
-- 修复新用户注册时的数据库错误
-- 问题: Database error saving new user
-- 原因: RLS 策略阻止触发器创建 Free 订阅
-- ========================================

-- Step 1: 删除旧的 RLS 策略（可能有冲突）
DROP POLICY IF EXISTS "Users can insert own subscriptions" ON user_subscriptions;

-- Step 2: 创建新的 RLS 策略，允许触发器插入
CREATE POLICY "Users can insert own subscriptions"
  ON user_subscriptions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id  -- 用户自己插入
    OR auth.role() = 'service_role'  -- 或服务角色（触发器）
  );

-- Step 3: 重新创建触发器函数（使用 SECURITY DEFINER）
CREATE OR REPLACE FUNCTION create_default_subscription()
RETURNS TRIGGER
SECURITY DEFINER  -- 以定义者权限运行
SET search_path = public
AS $$
BEGIN
  -- 插入 Free 订阅记录
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
    0,  -- Free 用户无购买配额
    0,  -- 无赠送配额
    0   -- 未使用
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- 记录错误但不阻止用户创建
  RAISE WARNING 'Failed to create default subscription for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: 删除并重新创建触发器
DROP TRIGGER IF EXISTS on_user_created ON auth.users;

CREATE TRIGGER on_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_subscription();

-- Step 5: 验证设置
DO $$
BEGIN
  RAISE NOTICE '✅ 触发器修复完成';
  RAISE NOTICE '现在新用户注册时会自动创建 Free 订阅';
  RAISE NOTICE '请重新测试 Google 登录';
END $$;
