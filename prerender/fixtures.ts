import type { SubscriptionPlanConfig } from '@/types';

// Local test data only; production builds always read the public plans API.
export const TEST_PLANS: SubscriptionPlanConfig[] = [
  { id: 'free', name: 'Free', display_name: 'Free', price: 0, quota: 5, bonus_quota: 0, quality: '1K', has_watermark: true, features: ['With watermark'], is_active: true, sort_order: 1 },
  { id: 'professional', name: 'Professional', display_name: 'Professional (Most Popular)', price: 25, quota: 30, bonus_quota: 0, quality: '1K', has_watermark: false, features: ['No watermark'], is_active: true, sort_order: 2 },
  { id: 'executive', name: 'Executive', display_name: 'Executive', price: 45, quota: 60, bonus_quota: 10, quality: '2K', has_watermark: false, features: ['10 bonus images'], is_active: true, sort_order: 3 },
];
