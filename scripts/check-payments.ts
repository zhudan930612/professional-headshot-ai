import { config } from 'dotenv';

config({ path: '.env.local', quiet: true });
const env = process.env;
const creemBase = 'https://api.creem.io';
const paidPlans = ['professional', 'executive'] as const;
let failures = 0;

const report = (name: string, ok: boolean, detail?: Record<string, unknown>) => {
  console.log(JSON.stringify({ check: name, ok, ...(detail ? { detail } : {}) }));
  if (!ok) failures += 1;
};
const record = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const request = async (url: string, headers: Record<string, string> = {}) => {
  try {
    const response = await fetch(url, { method: 'GET', headers, redirect: 'manual', signal: AbortSignal.timeout(15_000) });
    const data: unknown = response.headers.get('content-type')?.includes('json') ? await response.json() : null;
    return { status: response.status, ok: response.ok, data };
  } catch {
    // Do not log request errors or response bodies: they may contain credentials.
    return { status: 0, ok: false, data: null };
  }
};

async function checkPayments() {
  const required = ['CREEM_API_KEY', 'CREEM_WEBHOOK_SECRET', 'CREEM_PROFESSIONAL_PRODUCT_ID', 'CREEM_EXECUTIVE_PRODUCT_ID', 'VITE_APP_URL'];
  const missing = required.filter(name => !env[name]?.trim() || /your_.*(key|here)|xxxxxxxx/i.test(env[name]!));
  report('configuration', missing.length === 0, missing.length ? { missing } : undefined);
  if (missing.length) return;
  report('creem:production-mode', env.CREEM_TEST_MODE !== 'true');
  if (env.CREEM_TEST_MODE === 'true') return;

  let app: URL;
  try {
    app = new URL(env.VITE_APP_URL!);
    if (app.protocol !== 'https:' || app.username || app.password) throw new Error('Invalid app URL');
  } catch {
    report('application-url', false);
    return;
  }
  const headers = { 'x-api-key': env.CREEM_API_KEY! };
  const [plans, hooks, ...products] = await Promise.all([
    request(new URL('/api/plans', app).href),
    request(`${creemBase}/v1/webhooks`, headers),
    ...paidPlans.map(plan => request(`${creemBase}/v1/products?product_id=${encodeURIComponent(env[`CREEM_${plan.toUpperCase()}_PRODUCT_ID`]!)}`, headers)),
  ]);
  report('cloudflare:plans', plans.ok && Array.isArray(plans.data), { status: plans.status });
  for (const [index, plan] of paidPlans.entries()) {
    const product = record(products[index].data);
    const localPlan = record(Array.isArray(plans.data) ? plans.data.find(value => record(value).id === plan) : null);
    const price = localPlan.price;
    const quota = localPlan.quota;
    const bonus = localPlan.bonus_quota;
    const validPlan = plans.ok && localPlan.is_active === true && typeof price === 'number' && Number.isFinite(price) && price > 0
      && typeof quota === 'number' && Number.isSafeInteger(quota) && quota >= 0
      && typeof bonus === 'number' && Number.isSafeInteger(bonus) && bonus >= 0;
    const ok = validPlan && products[index].ok && product.id === env[`CREEM_${plan.toUpperCase()}_PRODUCT_ID`]
      && product.price === Math.round(price * 100) && product.currency === 'USD'
      && product.billing_type === 'onetime' && product.status === 'active' && product.mode === 'prod';
    report(`creem:${plan}`, ok, {
      status: products[index].status, sitePlanValid: validPlan,
      active: product.status === 'active', onetime: product.billing_type === 'onetime', production: product.mode === 'prod',
      priceMatches: typeof price === 'number' && product.price === Math.round(price * 100), currencyMatches: product.currency === 'USD',
    });
  }

  const items = record(hooks.data).items;
  const endpoint = new URL('/api/auth/creem/webhook', app).href;
  const hook = record(Array.isArray(items) ? items.find(value => record(value).url === endpoint && record(value).status === 'enabled') : null);
  report('creem:webhook-enabled', hooks.ok && typeof hook.id === 'string' && hook.mode === 'prod' && hook.delivery_mode === 'http', {
    status: hooks.status, production: hook.mode === 'prod', httpDelivery: hook.delivery_mode === 'http',
  });
  const events = hook.events;
  report('creem:webhook-events', hooks.ok && Array.isArray(events)
    && ['checkout.completed', 'refund.created'].every(event => events.includes(event)));
  if (typeof hook.id === 'string') {
    const secret = await request(`${creemBase}/v1/webhooks/${encodeURIComponent(hook.id)}/secret`, headers);
    report('creem:webhook-secret-match', secret.ok && record(secret.data).secret === env.CREEM_WEBHOOK_SECRET);
  } else {
    report('creem:webhook-secret-match', false);
  }
  console.log('Read-only configuration check. No checkout, payment or refund was created; real payment acceptance is recorded separately.');
}

await checkPayments();
process.exitCode = failures ? 1 : 0;
