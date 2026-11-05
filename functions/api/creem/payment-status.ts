import { HttpError, handleError, json, requireUser, type Env } from '@/server/http';

export async function onRequestGet({ request, env }: { request: Request; env: Env }): Promise<Response> {
  try {
    if (request.method !== 'GET') throw new HttpError(405, 'Method not allowed.');
    const { user, db } = await requireUser(request, env);
    const paymentId = new URL(request.url).searchParams.get('orderId');
    if (!paymentId || !/^[a-zA-Z0-9_-]{1,128}$/.test(paymentId)) throw new HttpError(400, 'Invalid payment ID.');
    const field = paymentId.startsWith('ch_') ? 'creem_checkout_id' : paymentId.startsWith('ord_') ? 'creem_order_id' : 'id';
    if (field === 'id' && !/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(paymentId)) throw new HttpError(400, 'Invalid payment ID.');
    const { data, error } = await db.from('payment_transactions')
      .select('id, status, creem_order_id, creem_checkout_id, creem_transaction_id, amount, currency')
      .eq('user_id', user.id).eq(field, paymentId).maybeSingle();
    if (error) throw new HttpError(503, 'Payment status is temporarily unavailable.');
    if (!data) throw new HttpError(404, 'Payment not found.');
    return json({ status: data.status, payment_id: data.id, order_id: data.creem_order_id,
      checkout_id: data.creem_checkout_id, transaction_id: data.creem_transaction_id, amount: data.amount, currency: data.currency });
  } catch (error) { return handleError(error); }
}
