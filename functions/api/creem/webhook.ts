import { HttpError, getAdmin, handleError, json, readBodyText, type Env } from '@/server/http';
import { getCreemBaseUrl } from './create-payment';

type JsonObject = Record<string, unknown>;
const object = (value: unknown): JsonObject => typeof value === 'object' && value !== null && !Array.isArray(value) ? value as JsonObject : {};
const id = (value: unknown): string | null => typeof value === 'string' && value.length > 0 && value.length < 256 ? value : null;
const entityId = (value: unknown): string | null => id(value) ?? id(object(value).id);

export async function verifyCreemSignature(payload: string, signature: string, secret: string): Promise<boolean> {
  if (!/^[a-f\d]{64}$/i.test(signature)) return false;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  const bytes = Uint8Array.from(signature.match(/.{2}/g)!, byte => parseInt(byte, 16));
  return crypto.subtle.verify('HMAC', key, bytes, encoder.encode(payload));
}

export async function onRequestPost({ request, env }: { request: Request; env: Env }): Promise<Response> {
  try {
    if (request.method !== 'POST') throw new HttpError(405, 'Method not allowed.');
    if (!env.CREEM_WEBHOOK_SECRET) throw new HttpError(503, 'Webhook is not configured.');
    const signature = request.headers.get('creem-signature');
    if (!signature) throw new HttpError(401, 'Invalid webhook signature.');
    const rawBody = await readBodyText(request, 256_000);
    if (!(await verifyCreemSignature(rawBody, signature, env.CREEM_WEBHOOK_SECRET))) throw new HttpError(401, 'Invalid webhook signature.');
    let payload: JsonObject;
    try { payload = object(JSON.parse(rawBody)); } catch { throw new HttpError(400, 'Invalid webhook payload.'); }
    const eventId = id(payload.id);
    const eventType = id(payload.eventType);
    if (!eventId || !eventType) throw new HttpError(400, 'Invalid webhook event.');
    const checkout = object(payload.object);
    const allowedModes = env.CREEM_TEST_MODE === 'true' ? ['test', 'sandbox'] : ['prod'];
    if (checkout.mode !== undefined && !allowedModes.includes(String(checkout.mode))) {
      throw new HttpError(400, 'Webhook environment mismatch.');
    }
    const db = getAdmin(env);
    if (eventType === 'checkout.completed') {
      const order = object(checkout.order);
      const checkoutId = id(checkout.id);
      const orderId = id(order.id);
      const productId = entityId(order.product) ?? entityId(checkout.product);
      if (!checkoutId || !orderId || !productId || checkout.status !== 'completed' || order.status !== 'paid'
        || !Number.isSafeInteger(order.amount) || Number(order.amount) <= 0 || typeof order.currency !== 'string') {
        throw new HttpError(400, 'Invalid completed checkout.');
      }
      const { error } = await db.rpc('apply_creem_checkout', {
        p_event_id: eventId, p_checkout_id: checkoutId, p_order_id: orderId,
        p_request_id: id(checkout.request_id), p_product_id: productId,
        p_amount_minor: order.amount, p_paid_minor: Number.isSafeInteger(order.amount_paid) ? order.amount_paid : order.amount,
        p_currency: order.currency.toUpperCase(), p_transaction_id: entityId(order.transaction),
      });
      if (error) throw new HttpError(503, 'Payment processing is temporarily unavailable.');
    } else if (eventType === 'refund.created') {
      if (checkout.status !== 'succeeded') return json({ received: true, ignored: true });
      const transaction = object(checkout.transaction);
      let orderId = entityId(checkout.order) ?? entityId(transaction.order);
      if (!orderId && id(transaction.id)) {
        if (!env.CREEM_API_KEY) throw new HttpError(503, 'Refund processing is temporarily unavailable.');
        const response = await fetch(`${getCreemBaseUrl(env)}/v1/transactions?transaction_id=${encodeURIComponent(String(transaction.id))}`, {
          headers: { 'x-api-key': env.CREEM_API_KEY }, signal: AbortSignal.timeout(15_000),
        });
        if (!response.ok) throw new HttpError(502, 'Refund lookup failed.');
        orderId = entityId(object(await response.json()).order);
      }
      if (!orderId || !id(checkout.id) || !Number.isSafeInteger(checkout.refund_amount) || Number(checkout.refund_amount) <= 0
        || typeof checkout.refund_currency !== 'string') throw new HttpError(400, 'Invalid refund.');
      const { error } = await db.rpc('apply_creem_refund', { p_event_id: eventId, p_refund_id: checkout.id,
        p_order_id: orderId, p_amount_minor: checkout.refund_amount, p_currency: checkout.refund_currency.toUpperCase() });
      if (error) throw new HttpError(503, 'Refund processing is temporarily unavailable.');
    }
    return json({ received: true });
  } catch (error) { return handleError(error); }
}
