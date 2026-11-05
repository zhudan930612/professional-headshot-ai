import { beforeEach, describe, expect, it, vi } from 'vitest';
import { onRequestPost } from './create-payment';

const mocks = vi.hoisted(() => ({ requireUser: vi.fn(), insert: vi.fn(), update: vi.fn(), single: vi.fn(), eq: vi.fn() }));
vi.mock('@/server/http', async importOriginal => ({
  ...await importOriginal<typeof import('@/server/http')>(), requireUser: mocks.requireUser,
}));
const env = { CREEM_API_KEY: 'test-key', CREEM_PROFESSIONAL_PRODUCT_ID: 'prod_test', CREEM_TEST_MODE: 'true', VITE_APP_URL: 'https://app.test' };
const request = () => new Request('https://app.test/api/creem/create-payment', {
  method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer test-token' }, body: '{"planType":"professional"}',
});

describe('checkout creation', () => {
  beforeEach(() => {
    vi.resetAllMocks(); vi.unstubAllGlobals();
    mocks.single.mockResolvedValue({ data: { id: 'professional', price: 9.99, quota: 50, bonus_quota: 5, is_active: true }, error: null });
    mocks.insert.mockResolvedValue({ error: null }); mocks.eq.mockResolvedValue({ error: null });
    mocks.update.mockReturnValue({ eq: mocks.eq });
    mocks.requireUser.mockResolvedValue({ user: { id: 'user-test' }, db: { from: (table: string) => table === 'subscription_plans'
      ? { select: () => ({ eq: () => ({ single: mocks.single }) }) }
      : { insert: mocks.insert, update: mocks.update } } });
  });

  it('creates a trusted local payment before checkout and returns to BrowserRouter path', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ id: 'ch_test', checkout_url: 'https://checkout.creem.io/ch_test' }));
    vi.stubGlobal('fetch', fetchMock);
    const response = await onRequestPost({ request: request(), env });
    expect(response.status).toBe(200);
    const saved = mocks.insert.mock.calls[0][0];
    const checkoutRequest = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(mocks.insert.mock.invocationCallOrder[0]).toBeLessThan(fetchMock.mock.invocationCallOrder[0]);
    expect(saved).toMatchObject({ user_id: 'user-test', creem_product_id: 'prod_test', granted_quota: 50, granted_bonus_quota: 5 });
    expect(saved.creem_order_id).toBeUndefined();
    expect(checkoutRequest.request_id).toBe(saved.id);
    expect(checkoutRequest.success_url).toBe(`https://app.test/subscription?payment=success&payment_id=${saved.id}`);
    expect(await response.json()).toMatchObject({ checkoutId: 'ch_test', paymentId: saved.id });
  });

  it('never contacts the payment provider if local persistence fails', async () => {
    mocks.insert.mockResolvedValue({ error: { message: 'db failure' } });
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
    expect((await onRequestPost({ request: request(), env })).status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not expose provider error details', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('provider sensitive error', { status: 500 })));
    const response = await onRequestPost({ request: request(), env });
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain('provider sensitive');
  });

  it('requires explicit product configuration', async () => {
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
    expect((await onRequestPost({ request: request(), env: { ...env, CREEM_PROFESSIONAL_PRODUCT_ID: undefined } })).status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
