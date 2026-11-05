import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpError } from '@/server/http';
import { onRequestGet } from './payment-status';

const mocks = vi.hoisted(() => ({ requireUser: vi.fn(), select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn() }));
vi.mock('@/server/http', async importOriginal => ({
  ...await importOriginal<typeof import('@/server/http')>(), requireUser: mocks.requireUser,
}));

describe('payment status ownership', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    const query = { select: mocks.select, eq: mocks.eq, maybeSingle: mocks.maybeSingle };
    mocks.select.mockReturnValue(query); mocks.eq.mockReturnValue(query);
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
    mocks.requireUser.mockResolvedValue({ user: { id: 'current-user' }, db: { from: () => query } });
  });

  it('does not reveal another user payment', async () => {
    const response = await onRequestGet({ request: new Request('https://app.test/api/creem/payment-status?orderId=ch_other'), env: {} });
    expect(response.status).toBe(404);
    expect(mocks.eq).toHaveBeenCalledWith('user_id', 'current-user');
    expect(mocks.eq).toHaveBeenCalledWith('creem_checkout_id', 'ch_other');
  });

  it('supports local payment UUIDs used in the return URL', async () => {
    const paymentId = '11111111-1111-4111-8111-111111111111';
    mocks.maybeSingle.mockResolvedValue({ data: { id: paymentId, status: 'completed', creem_order_id: 'ord_test', creem_checkout_id: 'ch_test', amount: 9.99, currency: 'USD' }, error: null });
    const response = await onRequestGet({ request: new Request(`https://app.test/api/creem/payment-status?orderId=${paymentId}`), env: {} });
    expect(response.status).toBe(200);
    expect(mocks.eq).toHaveBeenCalledWith('id', paymentId);
    expect(await response.json()).toMatchObject({ payment_id: paymentId, status: 'completed' });
  });

  it('requires authentication', async () => {
    mocks.requireUser.mockRejectedValue(new HttpError(401, 'Please sign in.'));
    const response = await onRequestGet({ request: new Request('https://app.test/api/creem/payment-status?orderId=ch_test'), env: {} });
    expect(response.status).toBe(401);
    expect(mocks.select).not.toHaveBeenCalled();
  });
});
