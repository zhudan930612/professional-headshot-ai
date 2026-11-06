import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchPublicPlans, parsePublicPlans } from '@/prerender/plans';
import { TEST_PLANS } from '@/prerender/fixtures';

afterEach(() => vi.unstubAllGlobals());

describe('public price snapshot', () => {
  it('keeps current prices and removes non-public database fields', () => {
    const input = TEST_PLANS.map(plan => ({ ...plan, price: plan.id === 'professional' ? 29 : plan.price, internal_note: 'private' }));
    const result = parsePublicPlans(input.reverse());
    expect(result.map(plan => plan.id)).toEqual(['free', 'professional', 'executive']);
    expect(result[1].price).toBe(29);
    expect(JSON.stringify(result)).not.toContain('private');
  });

  it.each([
    [], TEST_PLANS.slice(1), [TEST_PLANS[0], TEST_PLANS[0], TEST_PLANS[2]],
    TEST_PLANS.map(plan => ({ ...plan, price: -1 })),
    TEST_PLANS.map(plan => ({ ...plan, quota: 1.5 })),
    TEST_PLANS.map(plan => ({ ...plan, is_active: false })),
  ].map(value => [value]))('rejects incomplete or invalid pricing instead of publishing it', value => {
    expect(() => parsePublicPlans(value)).toThrow();
  });

  it('fails closed when the API is unavailable or returns an HTML login/challenge page', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response('offline', { status: 503 }))
      .mockResolvedValueOnce(new Response('<html>challenge</html>', { headers: { 'content-type': 'text/html' } })));
    await expect(fetchPublicPlans('https://example.com/api/plans')).rejects.toThrow('unavailable');
    await expect(fetchPublicPlans('https://example.com/api/plans')).rejects.toThrow('unavailable');
  });
});
