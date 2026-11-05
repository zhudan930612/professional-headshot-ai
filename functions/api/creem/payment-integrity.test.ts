import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const userId = '11111111-1111-4111-8111-111111111111';
const paymentId = '22222222-2222-4222-8222-222222222222';
const subscriptionId = '33333333-3333-4333-8333-333333333333';
let db: PGlite;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA headshot_ai;
    CREATE TABLE headshot_ai.payment_transactions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL,
      subscription_id uuid, creem_order_id text UNIQUE NOT NULL,
      creem_transaction_id text, plan_type text NOT NULL, amount numeric(10,2) NOT NULL,
      currency text NOT NULL DEFAULT 'USD', status text NOT NULL,
      created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
    );
    CREATE TABLE headshot_ai.user_subscriptions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL,
      plan_type text NOT NULL, status text NOT NULL, purchased_quota integer DEFAULT 0 CHECK (purchased_quota >= 0),
      bonus_quota integer DEFAULT 0 CHECK (bonus_quota >= 0), used_quota integer DEFAULT 0 CHECK (used_quota >= 0),
      payment_id text REFERENCES headshot_ai.payment_transactions(creem_order_id),
      expires_at timestamptz, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
    );
    ALTER TABLE headshot_ai.payment_transactions ADD CONSTRAINT fk_subscription
      FOREIGN KEY (subscription_id) REFERENCES headshot_ai.user_subscriptions(id) ON DELETE SET NULL;
  `);
  await db.exec(readFileSync(new URL('../../../database/migrations/002_payment_integrity.sql', import.meta.url), 'utf8'));
}, 30_000);

afterAll(async () => { await db?.close(); });
beforeEach(async () => {
  await db.exec('TRUNCATE headshot_ai.payment_webhook_events, headshot_ai.payment_transactions, headshot_ai.user_subscriptions CASCADE');
  await db.query(`INSERT INTO headshot_ai.user_subscriptions
    (id,user_id,plan_type,status,purchased_quota,bonus_quota,used_quota)
    VALUES($1,$2,'free','active',5,0,2)`, [subscriptionId, userId]);
  await db.query(`INSERT INTO headshot_ai.payment_transactions
    (id,user_id,plan_type,amount,currency,status,creem_product_id,granted_quota,granted_bonus_quota)
    VALUES($1,$2,'professional',9.99,'USD','pending','prod_test',50,5)`, [paymentId, userId]);
});

const checkout = (eventId = 'evt_test', orderId = 'ord_test', localPaymentId = paymentId) => db.query(
  `SELECT headshot_ai.apply_creem_checkout($1,$2,$3,$4,'prod_test',999,1199,'USD','tran_test') AS result`,
  [eventId, `ch_${localPaymentId}`, orderId, localPaymentId]);
const refund = (eventId = 'evt_refund', refundId = 'ref_test', amount = 1199) => db.query(
  `SELECT headshot_ai.apply_creem_refund($1,$2,'ord_test',$3,'USD') AS result`, [eventId, refundId, amount]);
const subscription = async () => (await db.query<{ id: string; purchased_quota: number; bonus_quota: number; used_quota: number }>(
  'SELECT * FROM headshot_ai.user_subscriptions WHERE id = $1', [subscriptionId])).rows[0];

describe('payment transaction integrity (real PostgreSQL in PGlite)', () => {
  it('grants once for repeated events and different event IDs for the same order', async () => {
    await checkout(); await checkout(); await checkout('evt_redelivery');
    expect(await subscription()).toMatchObject({ id: subscriptionId, purchased_quota: 55, bonus_quota: 5, used_quota: 2 });
    const result = await db.query<{ status: string; creem_order_id: string; subscription_id: string }>('SELECT * FROM headshot_ai.payment_transactions');
    expect(result.rows[0]).toMatchObject({ status: 'completed', creem_order_id: 'ord_test', subscription_id: subscriptionId });
    expect((await db.query('SELECT * FROM headshot_ai.payment_webhook_events')).rows).toHaveLength(1);
  });

  it('rolls all payment writes back if granting quota fails, then permits a retry', async () => {
    await db.exec(`CREATE FUNCTION headshot_ai.reject_quota() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'simulated storage failure'; END $$;
      CREATE TRIGGER test_reject BEFORE UPDATE ON headshot_ai.user_subscriptions FOR EACH ROW EXECUTE FUNCTION headshot_ai.reject_quota();`);
    try { await expect(checkout()).rejects.toThrow('simulated storage failure'); }
    finally { await db.exec('DROP TRIGGER test_reject ON headshot_ai.user_subscriptions; DROP FUNCTION headshot_ai.reject_quota()'); }
    expect(await subscription()).toMatchObject({ purchased_quota: 5, used_quota: 2 });
    expect((await db.query<{ status: string; creem_order_id: string }>('SELECT * FROM headshot_ai.payment_transactions')).rows[0])
      .toMatchObject({ status: 'pending', creem_order_id: null });
    expect((await db.query('SELECT * FROM headshot_ai.payment_webhook_events')).rows).toHaveLength(0);
    await checkout();
    expect((await subscription()).purchased_quota).toBe(55);
  });

  it('rejects a payment with mismatched product or amount before granting', async () => {
    await expect(db.query(`SELECT headshot_ai.apply_creem_checkout('evt','ch_wrong','ord_wrong',$1,'prod_other',999,1199,'USD',NULL)`, [paymentId]))
      .rejects.toThrow('Payment terms mismatch');
    expect((await subscription()).purchased_quota).toBe(5);
  });

  it('never credits the same order into a second local payment', async () => {
    await checkout();
    const second = '44444444-4444-4444-8444-444444444444';
    await db.query(`INSERT INTO headshot_ai.payment_transactions
      (id,user_id,plan_type,amount,currency,status,creem_product_id,granted_quota,granted_bonus_quota)
      VALUES($1,$2,'professional',9.99,'USD','pending','prod_test',50,5)`, [second, userId]);
    await expect(checkout('evt_second', 'ord_test', second)).rejects.toThrow('another payment');
    expect((await subscription()).purchased_quota).toBe(55);
  });

  it('keeps unrelated purchases and used quota intact when refunding one order', async () => {
    await checkout();
    const second = '44444444-4444-4444-8444-444444444444';
    await db.query(`INSERT INTO headshot_ai.payment_transactions
      (id,user_id,plan_type,amount,currency,status,creem_product_id,granted_quota,granted_bonus_quota)
      VALUES($1,$2,'professional',9.99,'USD','pending','prod_test',50,5)`, [second, userId]);
    await checkout('evt_second', 'ord_second', second);
    await refund(); await refund(); await refund('evt_duplicate_refund');
    expect(await subscription()).toMatchObject({ purchased_quota: 55, bonus_quota: 5, used_quota: 2 });
    expect((await db.query<{ status: string }>('SELECT status FROM headshot_ai.payment_transactions WHERE id = $1', [paymentId])).rows[0].status).toBe('refunded');
  });

  it('accumulates partial refunds without subtracting the same entitlement twice', async () => {
    await checkout();
    await refund('evt_part1', 'ref_part1', 599);
    await refund('evt_part2', 'ref_part2', 600);
    expect(await subscription()).toMatchObject({ purchased_quota: 5, bonus_quota: 0, used_quota: 2 });
    await expect(refund('evt_extra', 'ref_extra', 1)).rejects.toThrow('Refund exceeds payment');
  });

  it('requires explicit reconciliation of legacy pending payments', async () => {
    await db.query(`UPDATE headshot_ai.payment_transactions SET creem_product_id = NULL, granted_quota = NULL WHERE id = $1`, [paymentId]);
    await expect(checkout()).rejects.toThrow('Legacy checkout requires reconciliation');
    expect((await subscription()).purchased_quota).toBe(5);
  });

  it('updates an existing checkout foreign-key reference atomically and retains the subscription ID', async () => {
    const oldCheckoutId = `ch_${paymentId}`;
    await db.query('UPDATE headshot_ai.payment_transactions SET creem_order_id = $1, creem_checkout_id = $1 WHERE id = $2', [oldCheckoutId, paymentId]);
    await db.query('UPDATE headshot_ai.user_subscriptions SET payment_id = $1 WHERE id = $2', [oldCheckoutId, subscriptionId]);
    await checkout();
    expect((await db.query<{ id: string; payment_id: string }>('SELECT id,payment_id FROM headshot_ai.user_subscriptions')).rows)
      .toEqual([{ id: subscriptionId, payment_id: 'ord_test' }]);
  });

  it('retains an expired subscription when creating a new active entitlement', async () => {
    await db.query("UPDATE headshot_ai.user_subscriptions SET status = 'expired' WHERE id = $1", [subscriptionId]);
    await checkout();
    const rows = (await db.query<{ id: string; status: string }>('SELECT id,status FROM headshot_ai.user_subscriptions')).rows;
    expect(rows).toHaveLength(2);
    expect(rows).toContainEqual({ id: subscriptionId, status: 'expired' });
    expect(rows.some(row => row.status === 'active' && row.id !== subscriptionId)).toBe(true);
  });

  it('keeps payment mutation functions unavailable to browser roles', async () => {
    const result = await db.query<{ checkout_allowed: boolean; refund_allowed: boolean }>(`SELECT
      has_function_privilege('authenticated', 'headshot_ai.apply_creem_checkout(text,text,text,text,text,bigint,bigint,text,text)', 'EXECUTE') checkout_allowed,
      has_function_privilege('anon', 'headshot_ai.apply_creem_refund(text,text,text,bigint,text)', 'EXECUTE') refund_allowed`);
    expect(result.rows[0]).toEqual({ checkout_allowed: false, refund_allowed: false });
  });
});
