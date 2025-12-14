-- ========================================
-- Subscription System Database Migration
-- Purpose: Add subscription management, payment tracking, and quota system
-- Date: 2025-12-14
-- ========================================

-- ========================================
-- 1. Create subscription_plans table (套餐配置表)
-- ========================================
CREATE TABLE IF NOT EXISTS subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  quota INT NOT NULL,
  bonus_quota INT NOT NULL DEFAULT 0,
  quality TEXT NOT NULL CHECK (quality IN ('1K', '2K')),
  has_watermark BOOLEAN NOT NULL DEFAULT true,
  features JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_popular BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert initial subscription plans
INSERT INTO subscription_plans (id, name, display_name, price, quota, bonus_quota, quality, has_watermark, features, sort_order) VALUES
('free', 'Free', 'Free', 0, 5, 0, '1K', true,
  '["Rich template library", "Standard quality (1K)", "With watermark", "Retry without quota cost"]'::jsonb, 1),
('professional', 'Professional', 'Professional (Most Popular)', 14.9, 30, 0, '1K', false,
  '["Rich template library", "No watermark", "Standard quality (1K 896x1200)", "Never expires", "Retry without quota cost"]'::jsonb, 2),
('executive', 'Executive', 'Executive', 29.9, 70, 10, '2K', false,
  '["Continuously updated templates", "No watermark", "High quality (2K 1792x2400)", "Never expires", "Priority queue", "10 bonus images", "Retry without quota cost"]'::jsonb, 3)
ON CONFLICT (id) DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_subscription_plans_is_active ON subscription_plans(is_active);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_sort_order ON subscription_plans(sort_order);

-- ========================================
-- 2. Create user_subscriptions table (用户订阅表)
-- ========================================
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 套餐信息
  plan_type TEXT NOT NULL CHECK (plan_type IN ('free', 'professional', 'executive')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),

  -- 配额管理
  purchased_quota INT NOT NULL DEFAULT 0,
  bonus_quota INT NOT NULL DEFAULT 0,
  used_quota INT NOT NULL DEFAULT 0,

  -- 时间戳
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,

  -- 支付信息
  payment_id TEXT,
  amount DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 约束：每个用户只能有一个激活订阅（使用唯一索引代替 GIST）
CREATE UNIQUE INDEX unique_active_subscription
ON user_subscriptions(user_id)
WHERE status = 'active';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_plan_type ON user_subscriptions(plan_type);

-- ========================================
-- 3. Create payment_transactions table (支付记录表)
-- ========================================
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES user_subscriptions(id) ON DELETE SET NULL,

  -- Creem 支付信息
  creem_order_id TEXT UNIQUE NOT NULL,
  creem_transaction_id TEXT,

  -- 订单信息
  plan_type TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',

  -- 状态
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),

  -- 元数据
  metadata JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_creem_order_id ON payment_transactions(creem_order_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_created_at ON payment_transactions(created_at);

-- ========================================
-- 4. Modify existing tables (修改现有表)
-- ========================================

-- Add columns to generation_sessions table
ALTER TABLE generation_sessions
  ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS image_quality TEXT DEFAULT '1K',
  ADD COLUMN IF NOT EXISTS has_watermark BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_retry BOOLEAN DEFAULT false;

-- Create indexes on new columns
CREATE INDEX IF NOT EXISTS idx_generation_sessions_subscription_plan
  ON generation_sessions(subscription_plan);
CREATE INDEX IF NOT EXISTS idx_generation_sessions_is_retry
  ON generation_sessions(is_retry);

-- ========================================
-- 5. Enable RLS (行级安全)
-- ========================================

ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 6. RLS Policies (行级安全策略)
-- ========================================

-- subscription_plans: 公开只读
CREATE POLICY "Subscription plans are viewable by everyone"
  ON subscription_plans FOR SELECT
  USING (is_active = true);

-- user_subscriptions: 用户查看自己的订阅
CREATE POLICY "Users can view own subscriptions"
  ON user_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions"
  ON user_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions"
  ON user_subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

-- payment_transactions: 用户查看自己的支付记录
CREATE POLICY "Users can view own payment transactions"
  ON payment_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- ========================================
-- 7. Database Functions (数据库函数)
-- ========================================

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_transactions_updated_at
  BEFORE UPDATE ON payment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 8. Quota Management Functions (配额管理函数)
-- ========================================

-- Decrement subscription quota (safely, with locks)
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

  -- 如果没有付费订阅，回退到 Free 每日配额逻辑
  IF v_subscription IS NULL THEN
    -- 调用原有的每日配额函数
    RETURN increment_quota_safe(
      p_user_id::TEXT,
      CURRENT_DATE,
      p_amount,
      5  -- Free 用户每日 5 张
    );
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

-- Get user quota info (统一接口获取配额信息)
CREATE OR REPLACE FUNCTION get_user_quota_info(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_subscription RECORD;
  v_daily_quota RECORD;
BEGIN
  -- 检查是否有付费订阅
  SELECT * INTO v_subscription
  FROM user_subscriptions
  WHERE user_id = p_user_id
    AND status = 'active'
  LIMIT 1;

  IF v_subscription IS NOT NULL THEN
    -- 付费用户：返回订阅配额信息
    RETURN jsonb_build_object(
      'plan_type', v_subscription.plan_type,
      'total_quota', v_subscription.purchased_quota + v_subscription.bonus_quota,
      'used_quota', v_subscription.used_quota,
      'remaining_quota', v_subscription.purchased_quota + v_subscription.bonus_quota - v_subscription.used_quota,
      'is_paid', true,
      'quality', CASE
        WHEN v_subscription.plan_type = 'executive' THEN '2K'
        ELSE '1K'
      END,
      'has_watermark', false
    );
  ELSE
    -- Free 用户：返回每日配额信息
    SELECT * INTO v_daily_quota
    FROM user_quotas
    WHERE user_id = p_user_id::TEXT
      AND date = CURRENT_DATE;

    RETURN jsonb_build_object(
      'plan_type', 'free',
      'total_quota', 5,
      'used_quota', COALESCE(v_daily_quota.count, 0),
      'remaining_quota', 5 - COALESCE(v_daily_quota.count, 0),
      'is_paid', false,
      'quality', '1K',
      'has_watermark', true,
      'resets_at', (CURRENT_DATE + INTERVAL '1 day')::TEXT
    );
  END IF;
END;
$$;

-- ========================================
-- 9. Auto-create Free subscription for new users (新用户自动创建 Free 订阅)
-- ========================================

CREATE OR REPLACE FUNCTION create_default_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_subscriptions (user_id, plan_type, status, purchased_quota, bonus_quota, used_quota)
  VALUES (NEW.id, 'free', 'active', 0, 0, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_user_created ON auth.users;

-- Create trigger
CREATE TRIGGER on_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_subscription();

-- ========================================
-- 10. Backfill existing users with Free subscriptions (为现有用户创建 Free 订阅)
-- ========================================

INSERT INTO user_subscriptions (user_id, plan_type, status, purchased_quota, bonus_quota, used_quota)
SELECT id, 'free', 'active', 0, 0, 0
FROM auth.users
WHERE id NOT IN (SELECT DISTINCT user_id FROM user_subscriptions)
ON CONFLICT DO NOTHING;

-- ========================================
-- Migration completed successfully
-- ========================================
