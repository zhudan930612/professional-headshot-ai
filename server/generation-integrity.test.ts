import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const user = '11111111-1111-4111-8111-111111111111';
const other = '99999999-9999-4999-8999-999999999999';
const subscriptionId = '33333333-3333-4333-8333-333333333333';
let db: PGlite;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA headshot_ai; CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$
      SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    CREATE TABLE headshot_ai.subscription_plans (
      id text PRIMARY KEY, quota integer, bonus_quota integer, quality text, has_watermark boolean, is_active boolean
    );
    INSERT INTO headshot_ai.subscription_plans VALUES
      ('free',5,0,'1K',true,true), ('professional',30,0,'1K',false,true), ('executive',60,10,'2K',false,true);
    CREATE TABLE headshot_ai.user_subscriptions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, plan_type text NOT NULL,
      status text NOT NULL, purchased_quota integer NOT NULL, bonus_quota integer NOT NULL, used_quota integer NOT NULL,
      payment_id text, expires_at timestamptz, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
    );
    GRANT ALL ON headshot_ai.user_subscriptions TO authenticated;
    CREATE FUNCTION public.decrement_subscription_quota_safe(text,integer,boolean) RETURNS void LANGUAGE sql AS $$ SELECT $$;
    CREATE TABLE headshot_ai.payment_transactions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, subscription_id uuid,
      creem_order_id text NOT NULL UNIQUE, creem_transaction_id text, plan_type text, amount numeric,
      currency text, status text, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
    );
  `);
  for (const filename of ['001_generation_integrity.sql', '002_payment_integrity.sql']) {
    const migration = readFileSync(new URL(`../database/migrations/${filename}`, import.meta.url), 'utf8');
    await db.exec(migration);
    await db.exec(migration); // Applying an already-deployed migration is safe.
  }
}, 30_000);
afterAll(async () => { await db?.close(); });
beforeEach(async () => {
  await db.exec('TRUNCATE headshot_ai.generation_tasks, headshot_ai.user_subscriptions, headshot_ai.payment_transactions, headshot_ai.payment_webhook_events CASCADE');
  await db.query(`INSERT INTO headshot_ai.user_subscriptions
    (id,user_id,plan_type,status,purchased_quota,bonus_quota,used_quota)
    VALUES($1,$2,'executive','active',2,0,0)`, [subscriptionId,user]);
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [user]);
});
const reserve = (requestId = crypto.randomUUID(), retry: string | null = null, template = 'https://template.test/one.jpg') =>
  db.query<{ result: { created: boolean; task: { id: string; quality: string; charged_quota: number } } }>(
    'SELECT headshot_ai.reserve_generation($1,$2,$3,$4,$5) result',
    [user,requestId,'https://reference.test/me.jpg',template,retry]);
const balance = async () => (await db.query<{ used_quota: number; purchased_quota: number }>(
  'SELECT used_quota,purchased_quota FROM headshot_ai.user_subscriptions WHERE id=$1', [subscriptionId])).rows[0];

describe('generation and payment ledger in PostgreSQL', () => {
  it('reserves exactly once for a repeated request, using the server quality', async () => {
    const key = crypto.randomUUID();
    const first = (await reserve(key)).rows[0].result;
    const second = (await reserve(key)).rows[0].result;
    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(first.task.id).toBe(second.task.id);
    expect(first.task.quality).toBe('2K');
    expect((await balance()).used_quota).toBe(1);
    await expect(reserve(key, null, 'https://template.test/changed.jpg')).rejects.toThrow('Request mismatch');
    expect((await balance()).used_quota).toBe(1);
  });
  it('does not overspend the last credit', async () => {
    await db.query('UPDATE headshot_ai.user_subscriptions SET purchased_quota=1');
    await reserve();
    await expect(reserve()).rejects.toThrow('Insufficient quota');
    expect((await balance()).used_quota).toBe(1);
  });
  it('refunds a failed reservation only once and cannot refund a completed task', async () => {
    const id = (await reserve()).rows[0].result.task.id;
    await db.query('SELECT headshot_ai.fail_generation($1,$2)', [id,user]);
    await db.query('SELECT headshot_ai.fail_generation($1,$2)', [id,user]);
    expect((await balance()).used_quota).toBe(0);
    const done = (await reserve()).rows[0].result.task.id;
    await db.query("UPDATE headshot_ai.generation_tasks SET status='completed' WHERE id=$1", [done]);
    await db.query('SELECT headshot_ai.fail_generation($1,$2)', [done,user]);
    expect((await balance()).used_quota).toBe(1);
  });
  it('limits a successful task to one free retry and rejects retry chains', async () => {
    const id = (await reserve()).rows[0].result.task.id;
    await db.query("UPDATE headshot_ai.generation_tasks SET status='completed' WHERE id=$1", [id]);
    const retried = (await reserve(crypto.randomUUID(),id)).rows[0].result.task;
    expect(retried.charged_quota).toBe(0);
    expect((await balance()).used_quota).toBe(1);
    await expect(reserve(crypto.randomUUID(),id)).rejects.toThrow('Retry unavailable');
    await db.query("UPDATE headshot_ai.generation_tasks SET status='completed' WHERE id=$1", [retried.id]);
    await expect(reserve(crypto.randomUUID(),retried.id)).rejects.toThrow('Retry unavailable');
  });
  it('does not grant repeated free credits to a cancelled account', async () => {
    await db.query("UPDATE headshot_ai.user_subscriptions SET status='cancelled'");
    await expect(reserve()).rejects.toThrow('Insufficient quota');
  });
  it('grants the configured free quota only on the first generation for a new user', async () => {
    const result = await db.query<{ result: { task: { quality: string } } }>(
      "SELECT headshot_ai.reserve_generation($1,$2,'https://ref.test/me','https://template.test/one',NULL) result", [other,crypto.randomUUID()]);
    expect(result.rows[0].result.task.quality).toBe('1K');
    expect((await db.query<{ purchased_quota: number; used_quota: number }>(
      'SELECT purchased_quota,used_quota FROM headshot_ai.user_subscriptions WHERE user_id=$1',[other])).rows[0])
      .toEqual({ purchased_quota: 5, used_quota: 1 });
  });
  it('restricts credit reads to the current user and mutations to the server', async () => {
    await expect(db.query('SELECT headshot_ai.get_user_quota_info($1)', [other])).rejects.toThrow('Unauthorized');
    const privileges = await db.query<{ reserve: boolean; legacy: boolean; subscription_write: boolean }>(`SELECT
      has_function_privilege('authenticated','headshot_ai.reserve_generation(uuid,uuid,text,text,uuid)','EXECUTE') reserve,
      has_function_privilege('anon','public.decrement_subscription_quota_safe(text,integer,boolean)','EXECUTE') legacy,
      has_table_privilege('authenticated','headshot_ai.user_subscriptions','UPDATE') subscription_write`);
    expect(privileges.rows[0]).toEqual({ reserve:false, legacy:false, subscription_write:false });
  });
  it('allows payment credits to be used and a refund to revoke only that order', async () => {
    const paymentId=crypto.randomUUID();
    await db.query(`INSERT INTO headshot_ai.payment_transactions
      (id,user_id,plan_type,amount,currency,status,creem_product_id,granted_quota,granted_bonus_quota)
      VALUES($1,$2,'professional',25,'USD','pending','prod_example',30,0)`, [paymentId,user]);
    await db.query("SELECT headshot_ai.apply_creem_checkout('evt_paid','ch_paid','ord_paid',$1,'prod_example',2500,2500,'USD','tran_paid')",[paymentId]);
    await reserve();
    await db.query("SELECT headshot_ai.apply_creem_refund('evt_refund','ref_paid','ord_paid',2500,'USD')");
    expect(await balance()).toEqual({ purchased_quota:2, used_quota:1 });
  });
});
