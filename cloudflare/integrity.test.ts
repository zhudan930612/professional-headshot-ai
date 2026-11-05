import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import { getPlatformProxy } from 'wrangler';
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from 'jose';
import type { CloudflareEnv } from './env';
import { reserveGeneration, submitGeneration, queryGeneration, saveGenerated } from './generation';
import { applyEvent, createPayment, webhook } from './payments';
import { googleLogin, loginChallenge, getUser, logout } from './auth';
import { readMedia, signedMediaUrl, mediaPath } from './media';
import { getQuota } from './account';
import { saveHistory, history } from './history';
import { sha256 } from './http';
import { HEADSHOT_TEMPLATES } from '@/constants';
import worker from './worker';

const { keyResolver } = vi.hoisted(() => ({ keyResolver: vi.fn() }));
vi.mock('jose', async original => ({ ...await original<typeof import('jose')>(), createRemoteJWKSet: () => keyResolver }));
const firstUser = '11111111-1111-4111-8111-111111111111';
const secondUser = '22222222-2222-4222-8222-222222222222';
const subscription = '33333333-3333-4333-8333-333333333333';
const origin = 'https://app.test';
const refKey = `user-uploads/${firstUser}/reference.png`;
const now = () => new Date().toISOString();
let platform: Awaited<ReturnType<typeof getPlatformProxy<CloudflareEnv>>>;
let env: CloudflareEnv;
let privateKey: Awaited<ReturnType<typeof generateKeyPair>>['privateKey'];
const request = (path: string, body?: unknown, cookie?: string) => new Request(origin + path, {
  method: body === undefined ? 'GET' : 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
  ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
});
const reserve = (id = crypto.randomUUID(), extra = {}) => reserveGeneration(firstUser, {
  requestId: id, referenceImageUrl: origin + mediaPath(refKey), templateImageUrl: new URL(HEADSHOT_TEMPLATES[0].imageUrl, origin).href, ...extra,
}, origin, env);
const cookieFor = async (userId: string) => {
  const token = 'a'.repeat(32) + userId.replaceAll('-', '');
  await env.DB.prepare('INSERT OR REPLACE INTO auth_sessions(token_hash,user_id,expires_at,created_at) VALUES (?,?,?,?)').bind(await sha256(token), userId, Date.now() + 60_000, Date.now()).run();
  return `__Host-headshot_session=${token}`;
};

beforeAll(async () => {
  platform = await getPlatformProxy<CloudflareEnv>({ configPath: 'wrangler.toml', envFiles: [], remoteBindings: false, persist: false });
  env = { DB: platform.env.DB, PHOTOS: platform.env.PHOTOS, APP_URL: origin, GOOGLE_CLIENT_ID: 'google-client', MEDIA_SIGNING_SECRET: 's'.repeat(64), CREEM_WEBHOOK_SECRET: 'webhook-test' } as unknown as CloudflareEnv;
  await env.DB.exec((await readFile('database/d1/0001_core.sql', 'utf8')).replaceAll('\n', ' '));
  const entitlementMigration = (await readFile('database/d1/0003_payment_entitlements.sql', 'utf8')).replace(/^--.*$/gm, '');
  await env.DB.exec(entitlementMigration.replaceAll('\n', ' '));
  const amountMigration = (await readFile('database/d1/0004_checkout_amounts.sql','utf8')).replace(/^\s*--.*$/gm,'');
  await env.DB.exec(amountMigration.replaceAll('\n',' '));
  const keys = await generateKeyPair('RS256'); privateKey = keys.privateKey;
  keyResolver.mockImplementation(createLocalJWKSet({ keys: [{ ...await exportJWK(keys.publicKey), kid: 'test', alg: 'RS256' }] }));
}, 30_000);
afterAll(async () => { await platform?.dispose(); });
beforeEach(async () => {
  vi.unstubAllGlobals();
  for (const table of ['payment_events','generation_tasks','generated_images','generation_sessions','uploaded_files','storage_objects','payment_transactions','user_subscriptions','identities','auth_sessions','auth_challenges','users','subscription_plans']) await env.DB.prepare(`DELETE FROM ${table}`).run();
  for (const id of [firstUser, secondUser]) await env.DB.prepare('INSERT INTO users(id,email,name,created_at,updated_at) VALUES (?,?,?,?,?)').bind(id, id + '@test.invalid', 'Test', now(), now()).run();
  await env.DB.prepare('INSERT INTO identities(provider,subject,user_id) VALUES (?,?,?)').bind('google', 'original-google-subject', firstUser).run();
  for (const [id, price, quota, bonus, quality] of [['free',0,5,0,'1K'],['professional',25,30,0,'1K'],['executive',45,60,10,'2K']] as const) {
    await env.DB.prepare("INSERT INTO subscription_plans(id,name,display_name,price,quota,bonus_quota,quality,has_watermark,features,is_active,sort_order) VALUES (?,?,?,?,?,?,?,?,'[]',1,0)").bind(id,id,id,price,quota,bonus,quality,id==='free'?1:0).run();
  }
  await env.DB.prepare("INSERT INTO user_subscriptions(id,user_id,plan_type,base_plan_type,status,purchased_quota,bonus_quota,used_quota,subscribed_at,created_at,updated_at) VALUES (?,?,'professional','professional','active',2,0,0,?,?,?)").bind(subscription,firstUser,now(),now(),now()).run();
  await env.DB.prepare("INSERT INTO storage_objects(object_key,bucket,source_key,user_id,bytes,mime_type,sha256,created_at) VALUES (?,'user-uploads',?,?,8,'image/png','test',?)").bind(refKey, `${firstUser}/reference.png`, firstUser, now()).run();
  await env.PHOTOS.put(refKey, new Uint8Array([137,80,78,71,13,10,26,10]), { httpMetadata: { contentType: 'image/png' } });
});

describe('Cloudflare D1 quota transactions', () => {
  it('reuses a request without charging twice and rejects changed inputs', async () => {
    const id = crypto.randomUUID();
    expect((await reserve(id)).created).toBe(true);
    expect((await reserve(id)).created).toBe(false);
    expect((await getQuota(firstUser, env)).used_quota).toBe(1);
    await expect(reserve(id, { templateImageUrl: new URL(HEADSHOT_TEMPLATES[1].imageUrl, origin).href })).rejects.toMatchObject({ status: 409 });
  });
  it('never overspends when concurrent requests compete for two credits', async () => {
    const results = await Promise.allSettled(Array.from({ length: 8 }, () => reserve()));
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(2);
    expect((await getQuota(firstUser, env)).used_quota).toBe(2);
    expect((await env.DB.prepare('SELECT count(*) AS count FROM generation_tasks').first())?.count).toBe(2);
  });
  it('returns a failed credit once and grants only one non-chainable free retry', async () => {
    const original = await reserve();
    await env.DB.prepare("UPDATE generation_tasks SET status='completed' WHERE id=?").bind(original.task.id).run();
    const retry = await reserve(undefined, { retryOfTaskId: original.task.id });
    expect(retry.task.charged).toBe(0);
    await expect(reserve(undefined, { retryOfTaskId: original.task.id })).rejects.toMatchObject({ status: 409 });
    await env.DB.prepare("UPDATE generation_tasks SET status='completed' WHERE id=?").bind(retry.task.id).run();
    await expect(reserve(undefined, { retryOfTaskId: retry.task.id })).rejects.toMatchObject({ status: 409 });
    const failed = await reserve();
    await env.DB.prepare("UPDATE generation_tasks SET status='failed' WHERE id=?").bind(failed.task.id).run();
    await env.DB.prepare("UPDATE generation_tasks SET status='failed' WHERE id=?").bind(failed.task.id).run();
    expect((await getQuota(firstUser, env)).used_quota).toBe(1);
  });
  it('does not give an expired account another free allowance', async () => {
    await env.DB.prepare("UPDATE user_subscriptions SET status='cancelled' WHERE user_id=?").bind(firstUser).run();
    expect((await getQuota(firstUser, env)).remaining_quota).toBe(0);
    await expect(reserve()).rejects.toMatchObject({ status: 402 });
  });
});

describe('Cloudflare generation and persistence', () => {
  const body = (id: string) => ({ requestId: id, referenceImageUrl: origin + mediaPath(refKey), templateImageUrl: new URL(HEADSHOT_TEMPLATES[0].imageUrl, origin).href });
  it('does not submit again or return credits after an ambiguous provider response', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('network lost'));
    vi.stubGlobal('fetch', fetchMock);
    const id = crypto.randomUUID();
    const settings = { ...env, NANO_BANANA_API_KEY: 'test-key' };
    await submitGeneration(firstUser, body(id), origin, settings);
    await submitGeneration(firstUser, body(id), origin, settings);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect((await env.DB.prepare('SELECT status FROM generation_tasks WHERE id=?').bind(id).first())?.status).toBe('unknown');
    expect((await getQuota(firstUser, env)).used_quota).toBe(1);
  });
  it('returns the reserved credit for an explicit provider rejection', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 429 })));
    const id = crypto.randomUUID();
    await submitGeneration(firstUser, body(id), origin, { ...env, NANO_BANANA_API_KEY: 'test-key' });
    expect((await queryGeneration(firstUser,id,env)).status).toBe('failed');
    expect((await getQuota(firstUser,env)).used_quota).toBe(0);
  });
  it('stores completed output in private R2 once and verifies history ownership', async () => {
    const task = await reserve();
    await env.DB.prepare("UPDATE generation_tasks SET status='completed',result_url='https://output.evolink.ai/result' WHERE id=?").bind(task.task.id).run();
    const bytes = new Uint8Array([137,80,78,71,13,10,26,10]);
    const fetchMock = vi.fn().mockImplementation(() => new Response(bytes, {headers:{'content-type':'image/jpeg'}}));
    vi.stubGlobal('fetch',fetchMock);
    const saved = await saveGenerated(firstUser,task.task.id,env);
    expect(saved.mimeType).toBe('image/png');
    expect(saved.url).toMatch(/^\/api\/media\/generated-headshots\//);
    expect(await saveGenerated(firstUser,task.task.id,env)).toEqual(saved);
    expect(fetchMock).toHaveBeenCalledOnce();
    const record = {id:'saved-session',date:Date.now(),style:'Corporate',useCase:'LinkedIn',images:[saved]};
    await saveHistory(firstUser,record,env);
    await saveHistory(firstUser,record,env);
    expect((await history(firstUser,null,env)).items[0].images).toHaveLength(1);
    await expect(saveHistory(secondUser,record,env)).rejects.toMatchObject({status:404});
    expect((await history(secondUser,null,env)).items).toHaveLength(0);
  });
  it('preserves legacy placeholder records without fetching random replacement photos', async () => {
    await env.DB.prepare('INSERT INTO generation_sessions(id,user_id,session_id,date,style,use_case) VALUES (?,?,?,?,?,?)').bind('legacy',firstUser,'legacy',1,'Corporate','LinkedIn').run();
    await env.DB.prepare('INSERT INTO generated_images(id,session_id,image_id,url,created_at_timestamp) VALUES (?,?,?,?,?)').bind('placeholder','legacy','placeholder','https://picsum.photos/500/500?random=123',1).run();
    const image=(await history(firstUser,null,env)).items[0].images[0];
    expect(image.isPlaceholder).toBe(true); expect(image.url).toBe('');
    expect((await env.DB.prepare('SELECT url FROM generated_images WHERE id=?').bind('placeholder').first())?.url).toContain('picsum.photos');
  });
});

describe('Cloudflare payment transactions', () => {
  it('rejects a checkout in the wrong environment before exposing its payment URL', async () => {
    const fetchMock=vi.fn().mockResolvedValue(Response.json({id:'ch_wrong',mode:'prod',units:1,checkout_url:'https://checkout.creem.io/ch_wrong'}));
    vi.stubGlobal('fetch',fetchMock);
    await expect(createPayment(firstUser,'professional',{...env,CREEM_API_KEY:'test-key',CREEM_TEST_MODE:'true',CREEM_PROFESSIONAL_PRODUCT_ID:'prod_test'})).rejects.toMatchObject({status:502});
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).units).toBe(1);
    expect((await getQuota(firstUser,env)).remaining_quota).toBe(2);
  });
  const checkout = (paymentId: string, eventId = 'evt_checkout') => ({ id: eventId, eventType: 'checkout.completed', object: { id: 'ch_test', request_id: paymentId, status: 'completed', mode: 'prod', order: { id: 'ord_test', product: 'prod_test', amount: 2500, amount_paid: 3000, currency: 'usd', status: 'paid' } } });
  const create = async (userId = firstUser) => {
    const id = crypto.randomUUID();
    await env.DB.prepare("INSERT INTO payment_transactions(id,user_id,plan_type,amount,currency,status,creem_product_id,granted_quota,granted_bonus_quota,created_at,updated_at) VALUES (?,?,'professional',25,'USD','pending','prod_test',30,0,?,?)").bind(id,userId,now(),now()).run();
    return id;
  };
  it('atomically issues credits once despite concurrent duplicate callbacks', async () => {
    const id = await create();
    await Promise.all(Array.from({ length: 6 }, () => applyEvent(checkout(id), env)));
    expect((await getQuota(firstUser, env)).total_quota).toBe(32);
    expect((await env.DB.prepare('SELECT count(*) AS count FROM payment_events').first())?.count).toBe(1);
    await applyEvent(checkout(id, 'different-event-same-order'), env);
    expect((await getQuota(firstUser, env)).total_quota).toBe(32);
  });
  it('rejects mismatched price without recording an event or issuing credits', async () => {
    const id = await create(); const event = checkout(id); event.object.order.amount = 100;
    await expect(applyEvent(event, env)).rejects.toMatchObject({ status: 503 });
    expect((await getQuota(firstUser, env)).total_quota).toBe(2);
    expect((await env.DB.prepare('SELECT status FROM payment_transactions WHERE id=?').bind(id).first())?.status).toBe('pending');
  });
  it('refunds only this order, handles partial refunds, and rejects excess refunds', async () => {
    const id = await create(); await applyEvent(checkout(id), env);
    const refund = (event: string, resource: string, amount: number) => ({ id: event, eventType: 'refund.created', object: { id: resource, order: 'ord_test', status: 'succeeded', refund_amount: amount, refund_currency: 'USD' } });
    await applyEvent(refund('evt_ref1','ref_1',1500),env);
    await applyEvent(refund('evt_ref1','ref_1',1500),env);
    expect((await getQuota(firstUser, env)).total_quota).toBe(17);
    await applyEvent(refund('evt_ref2','ref_2',1500),env);
    expect((await getQuota(firstUser, env)).total_quota).toBe(2);
    await expect(applyEvent(refund('evt_ref3','ref_3',1),env)).rejects.toMatchObject({ status: 503 });
  });
  it('preserves a new account’s displayed free credits across purchase and full refund', async () => {
    expect((await getQuota(secondUser,env)).remaining_quota).toBe(5);
    const id=await create(secondUser);
    await applyEvent(checkout(id),env);
    expect((await getQuota(secondUser,env)).remaining_quota).toBe(35);
    await applyEvent({id:'evt_full',eventType:'refund.created',object:{id:'ref_full',order:'ord_test',status:'succeeded',refund_amount:3000,refund_currency:'USD'}},env);
    expect(await getQuota(secondUser,env)).toMatchObject({remaining_quota:5,plan_type:'free',is_paid:false,has_watermark:true});
  });
  it('removes a refunded upgrade while preserving an existing legacy plan and balance', async () => {
    const id=await create();
    await env.DB.prepare("UPDATE payment_transactions SET plan_type='executive',amount=45,granted_quota=60,granted_bonus_quota=10 WHERE id=?").bind(id).run();
    const event=checkout(id); event.object.order.amount=4500; event.object.order.amount_paid=4500;
    await applyEvent(event,env);
    expect((await getQuota(firstUser,env)).plan_type).toBe('executive');
    await applyEvent({id:'evt_full',eventType:'refund.created',object:{id:'ref_full',order:'ord_test',status:'succeeded',refund_amount:4500,refund_currency:'USD'}},env);
    expect(await getQuota(firstUser,env)).toMatchObject({remaining_quota:2,plan_type:'professional',is_paid:true,quality:'1K'});
  });
  it('settles a legitimate discounted, taxed checkout and refunds against actual money paid', async () => {
    const id=await create(secondUser);
    const baseEvent=checkout(id);
    const event={...baseEvent,object:{...baseEvent.object,order:{...baseEvent.object.order,amount_paid:1500,discount_amount:1250,tax_amount:250,amount_due:1500,discount:'dis_test'}}};
    await applyEvent(event,env);
    expect((await getQuota(secondUser,env)).remaining_quota).toBe(35);
    expect(await env.DB.prepare('SELECT paid_amount_minor,discount_amount_minor,tax_amount_minor FROM payment_transactions WHERE id=?').bind(id).first())
      .toMatchObject({paid_amount_minor:1500,discount_amount_minor:1250,tax_amount_minor:250});
    await applyEvent({id:'evt_partial',eventType:'refund.created',object:{id:'ref_partial',order:'ord_test',status:'succeeded',refund_amount:750,refund_currency:'USD'}},env);
    expect((await getQuota(secondUser,env)).remaining_quota).toBe(20);
    await applyEvent({id:'evt_full',eventType:'refund.created',object:{id:'ref_full',order:'ord_test',status:'succeeded',refund_amount:750,refund_currency:'USD'}},env);
    expect(await getQuota(secondUser,env)).toMatchObject({remaining_quota:5,plan_type:'free'});
  });
  it('fulfills a provider-approved full discount once without inventing a cash payment', async () => {
    const id=await create(secondUser);const baseEvent=checkout(id);
    const event={...baseEvent,object:{...baseEvent.object,order:{...baseEvent.object.order,amount_paid:0,discount_amount:2500,tax_amount:0,amount_due:0,discount:'dis_test'}}};
    await applyEvent(event,env);await applyEvent(event,env);
    expect((await getQuota(secondUser,env)).remaining_quota).toBe(35);
    expect(await env.DB.prepare('SELECT status,paid_amount_minor FROM payment_transactions WHERE id=?').bind(id).first()).toMatchObject({status:'completed',paid_amount_minor:0});
  });
  it('accepts tax-inclusive pricing and rejects a missing tax payment for an explicitly exclusive product', async () => {
    const id=await create(secondUser);const baseEvent=checkout(id);
    const order={...baseEvent.object.order,amount_paid:2250,discount_amount:250,tax_amount:200,amount_due:2250,discount:'dis_test'};
    await expect(applyEvent({...baseEvent,object:{...baseEvent.object,product:{id:'prod_test',tax_mode:'exclusive'},order}},env)).rejects.toMatchObject({status:400});
    await applyEvent({...baseEvent,object:{...baseEvent.object,product:{id:'prod_test',tax_mode:'inclusive'},order}},env);
    expect((await getQuota(secondUser,env)).remaining_quota).toBe(35);
    expect(await env.DB.prepare('SELECT paid_amount_minor,tax_amount_minor,tax_inclusive FROM payment_transactions WHERE id=?').bind(id).first()).toMatchObject({paid_amount_minor:2250,tax_amount_minor:200,tax_inclusive:1});
  });
  it('rejects underpayment, missing discount references, and inconsistent totals', async () => {
    const id=await create();const baseEvent=checkout(id);
    for(const totals of [
      {amount_paid:undefined,amount_due:undefined},
      {amount_paid:1500},
      {amount_paid:0,discount_amount:2500,amount_due:0},
      {amount_paid:1500,discount_amount:1000,tax_amount:0,amount_due:2000,discount:'dis_test'},
      {amount_paid:0,discount_amount:3000,tax_amount:500,amount_due:0,discount:'dis_test'},
    ]) {
      const event={...baseEvent,object:{...baseEvent.object,order:{...baseEvent.object.order,...totals}}};
      await expect(applyEvent(event,env)).rejects.toMatchObject({status:400});
    }
    expect((await getQuota(firstUser,env)).remaining_quota).toBe(2);
  });
  it('rejects unsigned callbacks and cross-origin authenticated mutations', async () => {
    expect(await webhook(request('/api/creem/webhook', {}), env).catch(error => error.status)).toBe(401);
    const response = await worker.fetch(new Request(origin+'/api/creem/create-payment', { method:'POST', headers:{Origin:'https://other.test',Cookie:await cookieFor(firstUser),'Content-Type':'application/json'},body:'{"planType":"professional"}' }),env);
    expect(response.status).toBe(403);
  });
});

describe('Google identity and private R2 access', () => {
  it('maps a verified Google subject back to the original user ID and consumes the nonce once', async () => {
    const challenge = await loginChallenge(request('/api/auth/challenge', {}), env);
    const nonce = (await challenge.json()).nonce;
    const cookie = challenge.headers.get('set-cookie')!.split(';')[0];
    const token = await new SignJWT({ email:'updated@test.invalid',email_verified:true,nonce,name:'Updated name' }).setProtectedHeader({alg:'RS256',kid:'test'}).setSubject('original-google-subject').setIssuer('https://accounts.google.com').setAudience('google-client').setExpirationTime('5m').sign(privateKey);
    const response = await googleLogin(request('/api/auth/google',{credential:token},cookie),env);
    expect((await response.json()).user.id).toBe(firstUser);
    expect((await env.DB.prepare('SELECT count(*) AS count FROM users').first())?.count).toBe(2);
    const sessionCookie = response.headers.getSetCookie().find(c=>c.startsWith('__Host-headshot_session='))!;
    expect(sessionCookie).toContain('HttpOnly'); expect(sessionCookie).toContain('Secure');
    expect((await getUser(request('/api/auth/session',undefined,sessionCookie.split(';')[0]),env))?.id).toBe(firstUser);
    await expect(googleLogin(request('/api/auth/google',{credential:token},cookie),env)).rejects.toMatchObject({status:401});
    await logout(request('/api/auth/logout',{},sessionCookie.split(';')[0]),env);
    expect(await getUser(request('/api/auth/session',undefined,sessionCookie.split(';')[0]),env)).toBeNull();
  });
  it('does not authenticate a wrong-audience ID token', async () => {
    const challenge = await loginChallenge(request('/api/auth/challenge', {}),env);
    const nonce=(await challenge.json()).nonce;
    const token=await new SignJWT({email:'a@test.invalid',email_verified:true,nonce}).setProtectedHeader({alg:'RS256',kid:'test'}).setSubject('original-google-subject').setIssuer('https://accounts.google.com').setAudience('wrong-client').setExpirationTime('5m').sign(privateKey);
    await expect(googleLogin(request('/api/auth/google',{credential:token},challenge.headers.get('set-cookie')!.split(';')[0]),env)).rejects.toMatchObject({status:401});
  });
  it('blocks anonymous and other users from photos but accepts a scoped signed link', async () => {
    await expect(readMedia(request(mediaPath(refKey)),env)).rejects.toMatchObject({status:401});
    await expect(readMedia(request(mediaPath(refKey),undefined,await cookieFor(secondUser)),env)).rejects.toMatchObject({status:404});
    expect((await readMedia(request(mediaPath(refKey),undefined,await cookieFor(firstUser)),env)).status).toBe(200);
    const url=await signedMediaUrl(refKey,env);
    const result=await readMedia(new Request(url),env);
    expect(result.headers.get('cache-control')).toBe('private, no-store');
    const changed=new URL(url); changed.searchParams.set('expires',String(Math.floor(Date.now()/1000)-1));
    await expect(readMedia(new Request(changed),env)).rejects.toMatchObject({status:401});
    await expect(readMedia(new Request(url.replace('reference.png','another.png')),env)).rejects.toMatchObject({status:401});
  });
  it('blocks cross-user tasks and returns explicit API errors', async () => {
    const task=await reserve();
    await expect(queryGeneration(secondUser,task.task.id,env)).rejects.toMatchObject({status:404});
    await expect(saveGenerated(secondUser,task.task.id,env)).rejects.toMatchObject({status:404});
    expect((await worker.fetch(request('/api/no-such-route'),env)).status).toBe(404);
    expect((await worker.fetch(request('/api/account'),env)).status).toBe(401);
  });
});
