import type { SubscriptionPlanConfig } from '@/types';

const PLAN_NAMES = { free: 'Free', professional: 'Professional', executive: 'Executive' };
const RESOLUTIONS = { '1K': '896 × 1200', '2K': '1792 × 2400' };

// Display supported entitlements, never the database's historical marketing claims.
export const presentPlan = (plan: SubscriptionPlanConfig) => ({
  name: PLAN_NAMES[plan.id],
  credits: plan.quota + plan.bonus_quota,
  resolution: plan.quality in RESOLUTIONS
    ? RESOLUTIONS[plan.quality as keyof typeof RESOLUTIONS]
    : plan.quality,
  watermark: plan.has_watermark ? 'Watermarked downloads' : 'Watermark-free downloads',
});
