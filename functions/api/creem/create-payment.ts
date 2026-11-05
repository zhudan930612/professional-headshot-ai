import { HttpError, handleError, json, readJson, requireUser, type Env } from '@/server/http';

export const getCreemBaseUrl = (env: Env): string =>
  env.CREEM_TEST_MODE === 'true' ? 'https://test-api.creem.io' : 'https://api.creem.io';

export async function onRequestPost({ request, env }: { request: Request; env: Env }): Promise<Response> {
  try {
    if (request.method !== 'POST') throw new HttpError(405, 'Method not allowed.');
    const { user, db } = await requireUser(request, env);
    const body = await readJson(request);
    const planType = body.planType;
    if (planType !== 'professional' && planType !== 'executive') throw new HttpError(400, 'Invalid plan.');
    const productId = planType === 'professional' ? env.CREEM_PROFESSIONAL_PRODUCT_ID : env.CREEM_EXECUTIVE_PRODUCT_ID;
    if (!env.CREEM_API_KEY || !productId || !env.VITE_APP_URL) throw new HttpError(503, 'Payments are temporarily unavailable.');
    const appUrl = new URL(env.VITE_APP_URL);
    if (appUrl.protocol !== 'https:' && !(env.CREEM_TEST_MODE === 'true' && ['localhost', '127.0.0.1'].includes(appUrl.hostname))) {
      throw new HttpError(503, 'Payments are temporarily unavailable.');
    }
    const { data: plan, error: planError } = await db.from('subscription_plans')
      .select('id, price, quota, bonus_quota, is_active').eq('id', planType).single();
    if (planError || !plan?.is_active || !Number.isFinite(Number(plan.price)) || Number(plan.price) <= 0
      || !Number.isSafeInteger(plan.quota) || plan.quota < 0
      || !Number.isSafeInteger(plan.bonus_quota ?? 0) || (plan.bonus_quota ?? 0) < 0) {
      throw new HttpError(503, 'This plan is currently unavailable.');
    }
    // Persist before contacting Creem so a fast webhook can resolve the request.
    const paymentId = crypto.randomUUID();
    const { error: insertError } = await db.from('payment_transactions').insert({
      id: paymentId, user_id: user.id, plan_type: planType, amount: plan.price,
      currency: 'USD', status: 'pending', creem_product_id: productId,
      granted_quota: plan.quota, granted_bonus_quota: plan.bonus_quota ?? 0,
    });
    if (insertError) throw new HttpError(503, 'Unable to start checkout. Please try again.');
    const successUrl = new URL('/subscription', appUrl.origin);
    successUrl.searchParams.set('payment', 'success');
    successUrl.searchParams.set('payment_id', paymentId);
    const response = await fetch(`${getCreemBaseUrl(env)}/v1/checkouts`, {
      method: 'POST', headers: { 'x-api-key': env.CREEM_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: productId, request_id: paymentId,
        success_url: successUrl.toString(), metadata: { user_id: user.id, plan_type: planType } }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) throw new HttpError(502, 'Unable to start checkout. Please try again.');
    const checkout = await response.json() as { id?: unknown; checkout_url?: unknown };
    if (typeof checkout.id !== 'string' || !checkout.id.startsWith('ch_') || typeof checkout.checkout_url !== 'string') {
      throw new HttpError(502, 'Invalid checkout response. Please try again.');
    }
    const checkoutUrl = new URL(checkout.checkout_url);
    if (checkoutUrl.protocol !== 'https:' || !(checkoutUrl.hostname === 'creem.io' || checkoutUrl.hostname.endsWith('.creem.io'))) {
      throw new HttpError(502, 'Invalid checkout response. Please try again.');
    }
    const { error: updateError } = await db.from('payment_transactions')
      .update({ creem_checkout_id: checkout.id }).eq('id', paymentId);
    if (updateError) throw new HttpError(503, 'Unable to save checkout. Please try again.');
    return json({ orderId: checkout.id, checkoutId: checkout.id, paymentId, paymentUrl: checkoutUrl.toString() });
  } catch (error) { return handleError(error); }
}
