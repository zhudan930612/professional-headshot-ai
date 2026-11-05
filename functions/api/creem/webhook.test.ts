import { createHmac } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { onRequestPost, verifyCreemSignature } from './webhook';

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@/server/http', async importOriginal => ({
  ...await importOriginal<typeof import('@/server/http')>(),
  getAdmin: () => ({ rpc }),
}));

const secret = 'local-test-webhook-secret';
const event = {
  id: 'evt_test', eventType: 'checkout.completed',
  object: { id: 'ch_test', request_id: '11111111-1111-4111-8111-111111111111', status: 'completed',
    order: { id: 'ord_test', product: 'prod_test', amount: 999, amount_paid: 1199, currency: 'usd', status: 'paid', transaction: 'tran_test' } },
};
const signedRequest = (body: unknown) => {
  const raw = JSON.stringify(body);
  return new Request('https://app.test/api/creem/webhook', { method: 'POST', body: raw,
    headers: { 'creem-signature': createHmac('sha256', secret).update(raw).digest('hex') } });
};

describe('Creem webhook boundary', () => {
  beforeEach(() => { vi.resetAllMocks(); vi.unstubAllGlobals(); rpc.mockResolvedValue({ error: null, data: { duplicate: false } }); });

  it('verifies the exact raw body and rejects malformed or modified signatures', async () => {
    const raw = JSON.stringify(event);
    const signature = createHmac('sha256', secret).update(raw).digest('hex');
    expect(await verifyCreemSignature(raw, signature, secret)).toBe(true);
    expect(await verifyCreemSignature(`${raw} `, signature, secret)).toBe(false);
    expect(await verifyCreemSignature(raw, '0'.repeat(64), secret)).toBe(false);
    expect(await verifyCreemSignature(raw, 'invalid', secret)).toBe(false);
  });

  it('rejects unsigned requests before any database work', async () => {
    const response = await onRequestPost({ request: new Request('https://app.test', { method: 'POST', body: '{}' }), env: { CREEM_WEBHOOK_SECRET: secret } });
    expect(response.status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('passes checkout and order identifiers separately into one atomic transaction', async () => {
    const response = await onRequestPost({ request: signedRequest(event), env: { CREEM_WEBHOOK_SECRET: secret } });
    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledExactlyOnceWith('apply_creem_checkout', {
      p_event_id: 'evt_test', p_checkout_id: 'ch_test', p_order_id: 'ord_test',
      p_request_id: '11111111-1111-4111-8111-111111111111', p_product_id: 'prod_test',
      p_amount_minor: 999, p_paid_minor: 1199, p_currency: 'USD', p_transaction_id: 'tran_test',
    });
  });

  it('returns a retryable error when the transaction fails, without leaking database details', async () => {
    rpc.mockResolvedValue({ error: { message: 'secret database internals' } });
    const response = await onRequestPost({ request: signedRequest(event), env: { CREEM_WEBHOOK_SECRET: secret } });
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain('secret database internals');
  });

  it('acknowledges a safely deduplicated callback', async () => {
    rpc.mockResolvedValue({ error: null, data: { duplicate: true } });
    const response = await onRequestPost({ request: signedRequest(event), env: { CREEM_WEBHOOK_SECRET: secret } });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ received: true });
  });

  it('never grants quota for an unpaid order', async () => {
    const unpaid = structuredClone(event);
    unpaid.object.order.status = 'pending';
    const response = await onRequestPost({ request: signedRequest(unpaid), env: { CREEM_WEBHOOK_SECRET: secret } });
    expect(response.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('rejects a signed test checkout in production before granting quota', async () => {
    const response = await onRequestPost({
      request: signedRequest({ ...event, object: { ...event.object, mode: 'test' } }),
      env: { CREEM_WEBHOOK_SECRET: secret, CREEM_TEST_MODE: 'false' },
    });
    expect(response.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('accepts the documented sandbox mode only in the test environment', async () => {
    const response = await onRequestPost({
      request: signedRequest({ ...event, object: { ...event.object, mode: 'sandbox' } }),
      env: { CREEM_WEBHOOK_SECRET: secret, CREEM_TEST_MODE: 'true' },
    });
    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledOnce();
  });

  it('rejects an oversized signed payload before database work', async () => {
    const response = await onRequestPost({
      request: signedRequest({ ...event, padding: 'x'.repeat(256_000) }),
      env: { CREEM_WEBHOOK_SECRET: secret },
    });
    expect(response.status).toBe(413);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('resolves the documented refund transaction to its order before applying refund', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ id: 'tran_test', order: 'ord_test' }));
    vi.stubGlobal('fetch', fetchMock);
    const refund = { id: 'evt_refund', eventType: 'refund.created', object: {
      id: 'ref_test', status: 'succeeded', refund_amount: 1199, refund_currency: 'usd', transaction: { id: 'tran_test' },
    } };
    const response = await onRequestPost({ request: signedRequest(refund), env: { CREEM_WEBHOOK_SECRET: secret, CREEM_API_KEY: 'test-key', CREEM_TEST_MODE: 'true' } });
    expect(response.status).toBe(200);
    expect(fetchMock.mock.calls[0][0]).toBe('https://test-api.creem.io/v1/transactions?transaction_id=tran_test');
    expect(rpc).toHaveBeenCalledExactlyOnceWith('apply_creem_refund', {
      p_event_id: 'evt_refund', p_refund_id: 'ref_test', p_order_id: 'ord_test', p_amount_minor: 1199, p_currency: 'USD',
    });
  });
});
