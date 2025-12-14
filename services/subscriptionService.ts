import { supabase } from '../lib/supabase';
import type { UserSubscription, SubscriptionPlanConfig } from '../types';

/**
 * 获取所有可用的订阅套餐
 */
export async function getSubscriptionPlans(): Promise<SubscriptionPlanConfig[]> {
  try {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('获取订阅套餐失败:', error);
    throw error;
  }
}

/**
 * 获取用户当前激活的订阅
 */
export async function getUserActiveSubscription(): Promise<UserSubscription | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) {
      return null;
    }

    const { data, error } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('status', 'active')
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data || null;
  } catch (error) {
    console.error('获取用户订阅失败:', error);
    throw error;
  }
}

/**
 * 创建订阅（支付成功后调用）
 */
export async function createSubscription(
  userId: string,
  planType: string,
  paymentId: string,
  amount: number
): Promise<UserSubscription> {
  try {
    // 获取套餐配置
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', planType)
      .single();

    if (planError || !plan) {
      throw new Error('Invalid plan type');
    }

    // 创建订阅
    const { data, error } = await supabase
      .from('user_subscriptions')
      .insert({
        user_id: userId,
        plan_type: planType,
        status: 'active',
        purchased_quota: plan.quota,
        bonus_quota: plan.bonus_quota,
        used_quota: 0,
        payment_id: paymentId,
        amount: amount,
        currency: 'USD',
        expires_at: null  // 永不过期
      })
      .select()
      .single();

    if (error) throw error;

    console.log(`✅ 为用户 ${userId} 创建了 ${planType} 订阅`);
    return data;
  } catch (error) {
    console.error('创建订阅失败:', error);
    throw error;
  }
}

/**
 * 获取订阅详细信息
 */
export async function getSubscriptionDetails(subscriptionId: string): Promise<UserSubscription | null> {
  try {
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data || null;
  } catch (error) {
    console.error('获取订阅详情失败:', error);
    throw error;
  }
}

/**
 * 取消订阅
 */
export async function cancelSubscription(subscriptionId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('user_subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString()
      })
      .eq('id', subscriptionId);

    if (error) throw error;

    console.log(`✅ 订阅 ${subscriptionId} 已取消`);
  } catch (error) {
    console.error('取消订阅失败:', error);
    throw error;
  }
}
