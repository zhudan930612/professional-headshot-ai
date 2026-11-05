import type { CloudflareEnv } from './env';
import { ApiError, json, object, readBytes, string } from './http';

const base = (env: CloudflareEnv) => env.CREEM_TEST_MODE === 'true' ? 'https://test-api.creem.io' : 'https://api.creem.io';
type Payment = { id: string; user_id: string; status: string; creem_checkout_id: string | null; creem_order_id: string | null; creem_product_id: string | null; amount: number; currency: string };
const entityId = (v: unknown) => typeof v === 'string' ? v : typeof object(v).id === 'string' ? object(v).id as string : null;
export async function createPayment(userId: string, planType: unknown, env: CloudflareEnv) {
  if (planType !== 'professional' && planType !== 'executive') throw new ApiError(400, 'Invalid plan.');
  const product = planType === 'professional' ? env.CREEM_PROFESSIONAL_PRODUCT_ID : env.CREEM_EXECUTIVE_PRODUCT_ID;
  if (!product || !env.CREEM_API_KEY) throw new ApiError(503, 'Payments are temporarily unavailable.');
  const app = new URL(env.APP_URL);
  if (app.protocol !== 'https:' && !(env.CREEM_TEST_MODE === 'true' && ['localhost', '127.0.0.1'].includes(app.hostname))) throw new ApiError(503, 'Payments are temporarily unavailable.');
  const plan = await env.DB.prepare('SELECT * FROM subscription_plans WHERE id=? AND is_active=1').bind(planType).first<{ price: number; quota: number; bonus_quota: number }>();
  if (!plan || !Number.isFinite(plan.price) || plan.price <= 0 || !Number.isSafeInteger(plan.quota) || plan.quota < 0 || !Number.isSafeInteger(plan.bonus_quota) || plan.bonus_quota < 0) throw new ApiError(503, 'This plan is currently unavailable.');
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await env.DB.prepare("INSERT INTO payment_transactions(id,user_id,plan_type,amount,currency,status,creem_product_id,granted_quota,granted_bonus_quota,created_at,updated_at) VALUES (?,?,?,?,'USD','pending',?,?,?,?,?)")
    .bind(id, userId, planType, plan.price, product, plan.quota, plan.bonus_quota, now, now).run();
  const success = new URL('/subscription', app);
  success.searchParams.set('payment', 'success'); success.searchParams.set('payment_id', id);
  const response = await fetch(`${base(env)}/v1/checkouts`, { method: 'POST', headers: { 'x-api-key': env.CREEM_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ product_id: product, request_id: id, success_url: success.href, metadata: { user_id: userId, plan_type: planType } }), signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new ApiError(502, 'Unable to start checkout. Please try again.');
  const checkout = object(await response.json());
  if (typeof checkout.id !== 'string' || !/^ch_[\w-]+$/.test(checkout.id) || typeof checkout.checkout_url !== 'string') throw new ApiError(502, 'Unable to start checkout.');
  const url = new URL(checkout.checkout_url);
  if (url.protocol !== 'https:' || url.username || url.password || !(url.hostname === 'creem.io' || url.hostname.endsWith('.creem.io'))) throw new ApiError(502, 'Unable to start checkout.');
  await env.DB.prepare('UPDATE payment_transactions SET creem_checkout_id=? WHERE id=? AND (creem_checkout_id IS NULL OR creem_checkout_id=?)').bind(checkout.id, id, checkout.id).run();
  return { orderId: checkout.id, checkoutId: checkout.id, paymentId: id, paymentUrl: url.href };
}
export async function paymentStatus(userId: string, id: unknown, env: CloudflareEnv) {
  const value = string(id, 128);
  if (!/^[a-zA-Z0-9_-]+$/.test(value)) throw new ApiError(400, 'Invalid payment ID.');
  const field = value.startsWith('ch_') ? 'creem_checkout_id' : value.startsWith('ord_') ? 'creem_order_id' : 'id';
  const row = await env.DB.prepare(`SELECT id,status,creem_order_id,creem_checkout_id,creem_transaction_id,amount,currency FROM payment_transactions WHERE ${field}=? AND user_id=?`).bind(value, userId).first();
  if (!row) throw new ApiError(404, 'Payment not found.');
  return { payment_id: row.id, status: row.status, order_id: row.creem_order_id, checkout_id: row.creem_checkout_id, transaction_id: row.creem_transaction_id, amount: row.amount, currency: row.currency };
}
export async function verifySignature(raw: Uint8Array, signature: string, secret: string) {
  if (!/^[a-f0-9]{64}$/i.test(signature)) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  return crypto.subtle.verify('HMAC', key, Uint8Array.from(signature.match(/../g)!, b => parseInt(b, 16)), raw as BufferSource);
}
export async function applyEvent(payload: Record<string, unknown>, env: CloudflareEnv) {
  const eventId = string(payload.id, 255);
  const eventType = string(payload.eventType, 128);
  const resource = object(payload.object);
  if (resource.mode !== undefined && !(env.CREEM_TEST_MODE === 'true' ? ['test', 'sandbox'] : ['prod']).includes(String(resource.mode))) throw new ApiError(400, 'Webhook environment mismatch.');
  if (!['checkout.completed', 'refund.created'].includes(eventType)) return { received: true, ignored: true };
  if (eventType === 'refund.created' && resource.status !== 'succeeded') return { received: true, ignored: true };
  let orderId: string;
  let checkoutId: string | null = null;
  let productId: string | null = null;
  let transactionId: string | null = null;
  let amount: number;
  let paid: number | null = null;
  let currency: string;
  let payment: Payment | null;
  if (eventType === 'checkout.completed') {
    const order = object(resource.order);
    orderId = string(order.id, 255); checkoutId = string(resource.id, 255);
    productId = string(entityId(order.product) ?? entityId(resource.product), 255);
    transactionId = entityId(order.transaction);
    amount = Number(order.amount); paid = order.amount_paid === undefined ? amount : Number(order.amount_paid);
    currency = string(order.currency, 8).toUpperCase();
    if (resource.status !== 'completed' || order.status !== 'paid' || !Number.isSafeInteger(amount) || amount <= 0 || !Number.isSafeInteger(paid) || paid < amount) throw new ApiError(400, 'Invalid completed checkout.');
    payment = await env.DB.prepare('SELECT * FROM payment_transactions WHERE id=? OR creem_checkout_id=? ORDER BY (id=?) DESC LIMIT 1')
      .bind(typeof resource.request_id === 'string' ? resource.request_id : '', checkoutId, typeof resource.request_id === 'string' ? resource.request_id : '').first<Payment>();
    if (payment && ['completed', 'refunded'].includes(payment.status)) {
      if (payment.creem_order_id !== orderId || payment.creem_checkout_id !== checkoutId || (payment.creem_product_id && payment.creem_product_id !== productId) || Math.round(payment.amount * 100) !== amount || payment.currency.toUpperCase() !== currency) throw new ApiError(409, 'Payment references do not match.');
      return { received: true, duplicate: true };
    }
  } else {
    orderId = entityId(resource.order) ?? entityId(object(resource.transaction).order) ?? '';
    if (!orderId && entityId(resource.transaction)) {
      if (!env.CREEM_API_KEY) throw new ApiError(503, 'Refund lookup is unavailable.');
      const response = await fetch(`${base(env)}/v1/transactions?transaction_id=${encodeURIComponent(entityId(resource.transaction)!)}`, { headers: { 'x-api-key': env.CREEM_API_KEY }, signal: AbortSignal.timeout(15_000) });
      if (!response.ok) throw new ApiError(502, 'Refund lookup is unavailable.');
      orderId = entityId(object(await response.json()).order) ?? '';
    }
    if (!orderId) throw new ApiError(400, 'Invalid refund order.');
    amount = Number(resource.refund_amount); currency = string(resource.refund_currency, 8).toUpperCase();
    if (!Number.isSafeInteger(amount) || amount <= 0) throw new ApiError(400, 'Invalid refund amount.');
    payment = await env.DB.prepare('SELECT * FROM payment_transactions WHERE creem_order_id=?').bind(orderId).first<Payment>();
  }
  if (!payment) throw new ApiError(503, 'Payment requires reconciliation.');
  const resourceId = eventType === 'checkout.completed' ? orderId : string(resource.id, 255);
  const existing = () => env.DB.prepare('SELECT payment_id,event_type,resource_id FROM payment_events WHERE event_id=? OR (event_type=? AND resource_id=?)')
    .bind(eventId, eventType, resourceId).all<{ payment_id: string; event_type: string; resource_id: string }>();
  const duplicate = (rows: Awaited<ReturnType<typeof existing>>) => rows.results.length > 0 && rows.results.every(row => row.payment_id === payment!.id && row.event_type === eventType && row.resource_id === resourceId);
  const prior = await existing();
  if (duplicate(prior)) return { received: true, duplicate: true };
  if (prior.results.length) throw new ApiError(409, 'Webhook references do not match.');
  try {
    await env.DB.prepare('INSERT INTO payment_events(event_id,event_type,resource_id,payment_id,checkout_id,order_id,product_id,amount_minor,paid_minor,currency,transaction_id,new_subscription_id,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)')
      .bind(eventId, eventType, resourceId, payment.id, checkoutId, orderId, productId, amount, paid, currency, transactionId, crypto.randomUUID(), new Date().toISOString()).run();
  } catch {
    if (duplicate(await existing())) return { received: true, duplicate: true };
    throw new ApiError(503, 'Payment processing requires reconciliation.');
  }
  return { received: true };
}
export async function webhook(request: Request, env: CloudflareEnv): Promise<Response> {
  if (!env.CREEM_WEBHOOK_SECRET) throw new ApiError(503, 'Webhook is not configured.');
  const signature = request.headers.get('creem-signature') || '';
  if (!signature) throw new ApiError(401, 'Invalid webhook signature.');
  const raw = await readBytes(request, 256_000);
  if (!await verifySignature(raw, signature, env.CREEM_WEBHOOK_SECRET)) throw new ApiError(401, 'Invalid webhook signature.');
  let payload;
  try { payload = object(JSON.parse(new TextDecoder().decode(raw))); } catch { throw new ApiError(400, 'Invalid webhook payload.'); }
  return json(await applyEvent(payload, env));
}
