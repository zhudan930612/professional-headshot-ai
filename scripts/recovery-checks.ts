import { config } from 'dotenv';

config({ path: '.env.local', quiet: true });
const env = process.env;
let failures = 0;
const report = (name: string, ok: boolean, detail?: unknown) => {
  console.log(JSON.stringify({ check: name, ok, ...(detail === undefined ? {} : { detail }) }));
  if (!ok) failures += 1;
};
const configured = (names: string[]) => {
  const missing = names.filter(name => !env[name] || /your_.*(key|here)|xxxxxxxx/.test(env[name]!));
  if (missing.length) report('configuration', false, { missing });
  return missing.length === 0;
};
const request = async (url: string, headers: Record<string, string>) => {
  try {
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
    const data: unknown = response.headers.get('content-type')?.includes('json') ? await response.json() : null;
    return { status: response.status, ok: response.ok, data };
  } catch {
    return { status: 0, ok: false, data: null };
  }
};
const record = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};

export async function checkAuth() {
  if (!configured(['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'])) return;
  const result = await request(`${env.VITE_SUPABASE_URL}/auth/v1/settings`, { apikey: env.VITE_SUPABASE_ANON_KEY! });
  report('auth-service', result.ok, { status: result.status });
  if (result.ok) report('google-provider-enabled', record(record(result.data).external).google === true);
  console.log('OAuth redirect allowlist and a real browser login still require verification.');
}

export async function checkDatabase() {
  if (!configured(['VITE_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'])) return;
  const headers = { apikey: env.SUPABASE_SERVICE_ROLE_KEY!, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, 'Accept-Profile': 'headshot_ai' };
  const tables: Record<string, string> = {
    subscription_plans: 'id,price,quota,bonus_quota,quality,is_active',
    user_subscriptions: 'id,user_id,plan_type,purchased_quota,bonus_quota,used_quota',
    generation_sessions: 'id,user_id,session_id',
    generated_images: 'id,session_id,image_id,url,jpg_url',
    generation_tasks: 'id,user_id,request_id,status,saved_image',
    payment_transactions: 'id,creem_checkout_id,creem_product_id,granted_quota,paid_amount_minor',
    payment_webhook_events: 'event_id,event_type,resource_id',
  };
  await Promise.all(Object.entries(tables).map(async ([table, columns]) => {
    const result = await request(`${env.VITE_SUPABASE_URL}/rest/v1/${table}?select=${columns}&limit=0`, headers);
    report(`schema:${table}`, result.ok, { status: result.status, code: record(result.data).code });
  }));
  const schema = await request(`${env.VITE_SUPABASE_URL}/rest/v1/`, headers);
  const paths = record(record(schema.data).paths);
  for (const name of ['get_user_quota_info', 'reserve_generation', 'fail_generation', 'apply_creem_checkout', 'apply_creem_refund']) {
    report(`rpc:${name}`, schema.ok && `/rpc/${name}` in paths);
  }
  const buckets = await request(`${env.VITE_SUPABASE_URL}/storage/v1/bucket`, headers);
  for (const name of ['user-uploads', 'generated-headshots', 'template-images']) {
    const bucket = Array.isArray(buckets.data) ? buckets.data.find(value => record(value).name === name) : undefined;
    report(`storage:${name}`, !!bucket, bucket ? { public: record(bucket).public, sizeLimit: record(bucket).file_size_limit } : undefined);
  }
  console.log('Database checks are read-only; schema presence does not prove RLS or transaction behavior.');
}

export async function checkPayments() {
  if (!configured(['CREEM_API_KEY', 'CREEM_WEBHOOK_SECRET', 'CREEM_PROFESSIONAL_PRODUCT_ID', 'CREEM_EXECUTIVE_PRODUCT_ID',
    'VITE_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'VITE_APP_URL'])) return;
  const headers = { apikey: env.SUPABASE_SERVICE_ROLE_KEY!, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, 'Accept-Profile': 'headshot_ai' };
  const plans = await request(`${env.VITE_SUPABASE_URL}/rest/v1/subscription_plans?select=id,price,quota,bonus_quota,is_active`, headers);
  const base = env.CREEM_TEST_MODE === 'true' ? 'https://test-api.creem.io' : 'https://api.creem.io';
  for (const plan of ['professional', 'executive']) {
    const productId = env[`CREEM_${plan.toUpperCase()}_PRODUCT_ID`]!;
    const result = await request(`${base}/v1/products?product_id=${encodeURIComponent(productId)}`, { 'x-api-key': env.CREEM_API_KEY! });
    const product = record(result.data);
    const localPlan = record(Array.isArray(plans.data) ? plans.data.find(value => record(value).id === plan) : null);
    const ok = result.ok && localPlan.is_active === true && product.price === Math.round(Number(localPlan.price) * 100)
      && product.currency === 'USD' && product.billing_type === 'onetime' && product.status === 'active'
      && (env.CREEM_TEST_MODE === 'true' ? ['test', 'sandbox'] : ['prod']).includes(String(product.mode));
    report(`creem:${plan}`, ok, { status: result.status, priceMinor: product.price, currency: product.currency,
      mode: product.mode, quota: localPlan.quota, bonusQuota: localPlan.bonus_quota });
  }
  const hooks = await request(`${base}/v1/webhooks`, { 'x-api-key': env.CREEM_API_KEY! });
  const items = record(hooks.data).items;
  const endpoint = `${new URL(env.VITE_APP_URL!).origin}/api/auth/creem/webhook`;
  const hook = record(Array.isArray(items) ? items.find(value => record(value).url === endpoint && record(value).status === 'enabled') : null);
  const events = hook.events;
  report('creem:webhook-events', hooks.ok && Array.isArray(events)
    && (events.length === 0 || ['checkout.completed', 'refund.created'].every(event => events.includes(event))));
  if (typeof hook.id === 'string') {
    const secret = await request(`${base}/v1/webhooks/${encodeURIComponent(hook.id)}/secret`, { 'x-api-key': env.CREEM_API_KEY! });
    report('creem:webhook-secret-match', secret.ok && record(secret.data).secret === env.CREEM_WEBHOOK_SECRET);
  }
  console.log('No checkout was created. Payment, signed webhook delivery, credit issuance and refund still need an end-to-end test.');
}

export async function checkGeneration() {
  if (!configured(['NANO_BANANA_API_KEY'])) return;
  const response = await request('https://api.evolink.ai/v1/models', { Authorization: `Bearer ${env.NANO_BANANA_API_KEY}` });
  const models = record(response.data).data;
  for (const model of [env.NANO_BANANA_MODEL_1K || 'nano-banana-2-lite', env.NANO_BANANA_MODEL_2K || 'gemini-3.1-flash-image-preview']) {
    report(`ai-model:${model}`, response.ok && Array.isArray(models) && models.some(value => record(value).id === model));
  }
  console.log('Model listing does not verify generation quality, account balance, or final per-image costs. No image was generated.');
}

export async function runChecks(mode: 'auth' | 'database' | 'payments' | 'all') {
  const unsafe = Object.keys(env).filter(name => /^VITE_.*(SECRET|PRIVATE|SERVICE_ROLE)/.test(name));
  report('frontend-secret-names', unsafe.length === 0, unsafe.length ? unsafe : undefined);
  if (mode === 'auth' || mode === 'all') await checkAuth();
  if (mode === 'database' || mode === 'all') await checkDatabase();
  if (mode === 'payments' || mode === 'all') await checkPayments();
  if (mode === 'all') await checkGeneration();
  process.exitCode = failures ? 1 : 0;
}
