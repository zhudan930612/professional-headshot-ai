import type { SubscriptionPlanConfig } from '@/types';

// A whitelist keeps database-only fields out of the public hydration payload.
export function parsePublicPlans(value: unknown): SubscriptionPlanConfig[] {
  if (!Array.isArray(value) || value.length !== 3) throw new Error('Expected the three active public headshot plans.');
  const ids = new Set<string>();
  const plans = value.map((item: unknown): SubscriptionPlanConfig => {
    if (!item || typeof item !== 'object') throw new Error('Invalid public plan.');
    const plan = item as Record<string, unknown>;
    if (!['free', 'professional', 'executive'].includes(String(plan.id)) || ids.has(String(plan.id))) throw new Error('Invalid or duplicate plan ID.');
    ids.add(String(plan.id));
    for (const key of ['name', 'display_name']) {
      if (typeof plan[key] !== 'string' || !plan[key].trim()) throw new Error(`Invalid plan ${key}.`);
    }
    for (const key of ['price', 'quota', 'bonus_quota', 'sort_order']) {
      if (typeof plan[key] !== 'number' || !Number.isFinite(plan[key]) || plan[key] < 0) throw new Error(`Invalid plan ${key}.`);
    }
    if (!Number.isInteger(plan.quota) || !Number.isInteger(plan.bonus_quota) || (plan.quota as number) <= 0) throw new Error('Invalid plan credits.');
    if ((plan.id === 'free' && plan.price !== 0) || (plan.id !== 'free' && (plan.price as number) <= 0)) throw new Error('Invalid plan price.');
    if (!['1K', '2K', '4K'].includes(String(plan.quality)) || typeof plan.has_watermark !== 'boolean' || plan.is_active !== true) throw new Error('Invalid plan entitlement.');
    if (!Array.isArray(plan.features) || !plan.features.every(feature => typeof feature === 'string')) throw new Error('Invalid plan features.');
    return {
      id: plan.id as SubscriptionPlanConfig['id'], name: plan.name as string, display_name: plan.display_name as string,
      price: plan.price as number, quota: plan.quota as number, bonus_quota: plan.bonus_quota as number,
      quality: plan.quality as SubscriptionPlanConfig['quality'], has_watermark: plan.has_watermark,
      features: plan.features as string[], is_active: true, sort_order: plan.sort_order as number,
    };
  });
  return plans.sort((left, right) => left.sort_order - right.sort_order);
}

export async function fetchPublicPlans(source: string): Promise<SubscriptionPlanConfig[]> {
  const url = new URL(source);
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if ((url.protocol !== 'https:' && !(local && url.protocol === 'http:')) || url.username || url.password || url.search || url.hash) {
    throw new Error('The public plans URL must use HTTPS (or local HTTP), without credentials or query parameters.');
  }
  const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(20_000) });
  if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) throw new Error(`Public pricing is unavailable (HTTP ${response.status}); prerendering stopped.`);
  return parsePublicPlans(await response.json());
}
