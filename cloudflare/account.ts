import type { CloudflareEnv } from './env';
import type { QuotaInfo, SubscriptionPlanConfig, UserSubscription } from '@/types';

export const subscriptionOrder = "CASE plan_type WHEN 'executive' THEN 2 WHEN 'professional' THEN 1 ELSE 0 END DESC,created_at DESC";
export async function activeSubscription(userId: string, env: CloudflareEnv): Promise<UserSubscription | null> {
  return env.DB.prepare(`SELECT * FROM user_subscriptions WHERE user_id=? AND status='active' AND (expires_at IS NULL OR julianday(expires_at)>julianday('now')) ORDER BY (used_quota<purchased_quota+bonus_quota) DESC,${subscriptionOrder} LIMIT 1`).bind(userId).first<UserSubscription>();
}
export async function getQuota(userId: string, env: CloudflareEnv): Promise<QuotaInfo> {
  const sub = await activeSubscription(userId, env);
  const plan = await env.DB.prepare('SELECT * FROM subscription_plans WHERE id=?').bind(sub?.plan_type ?? 'free').first<SubscriptionPlanConfig>();
  if (!plan) throw new Error('Plan is unavailable');
  const existing = sub ? true : !!await env.DB.prepare('SELECT 1 FROM user_subscriptions WHERE user_id=? LIMIT 1').bind(userId).first();
  const total = sub ? sub.purchased_quota + sub.bonus_quota : existing ? 0 : plan.quota + plan.bonus_quota;
  const used = sub?.used_quota ?? 0;
  return { plan_type: sub?.plan_type ?? 'free', total_quota: total, used_quota: used, remaining_quota: Math.max(0, total - used), is_paid: !!sub && sub.plan_type !== 'free', quality: plan.quality, has_watermark: Boolean(plan.has_watermark) };
}
export async function plans(env: CloudflareEnv) {
  const rows = await env.DB.prepare('SELECT * FROM subscription_plans WHERE is_active=1 ORDER BY sort_order').all<SubscriptionPlanConfig & { features: string }>();
  return rows.results.map(row => ({ ...row, features: JSON.parse(row.features), has_watermark: Boolean(row.has_watermark), is_active: true }));
}
