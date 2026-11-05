import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { query } from './api';

const directory = path.resolve('.migration', process.argv[2] || 'baseline-20261105');
if (!directory.startsWith(path.resolve('.migration') + path.sep)) throw new Error('Invalid source directory.');
type Row = Record<string, unknown>;
const read = async (name: string): Promise<Row[]> => JSON.parse(await readFile(path.join(directory, `${name}.json`), 'utf8'));
const source: Record<string, Row[]> = Object.fromEntries(await Promise.all(['subscription_plans', 'user_subscriptions', 'payment_transactions', 'generation_sessions', 'generated_images', 'uploaded_files'].map(async name => [name, await read(name)])));
let users = await read('auth_users');
if (users.some(u => !Array.isArray(u.identities))) {
  // A previous export obtained details separately; never infer a subject from email.
  users = await read('auth_users_details');
}
const normalize = (value: unknown): string | number | null => value == null ? null : typeof value === 'boolean' ? Number(value) : typeof value === 'object' ? JSON.stringify(value) : value as string | number;
async function insertVerified(table: string, key: string, row: Row) {
  const columns = Object.keys(row);
  if (![table, key, ...columns].every(name => /^[a-z_]+$/.test(name))) throw new Error('Invalid SQL identifier.');
  const values = columns.map(c => normalize(row[c]));
  await query(`INSERT INTO ${table}(${columns.join(',')}) VALUES (${columns.map(() => '?').join(',')}) ON CONFLICT DO NOTHING`, values);
  const result = (await query(`SELECT * FROM ${table} WHERE ${key}=?`, [normalize(row[key])]))[0].results[0];
  if (!result || columns.some((c, i) => normalize(result[c]) !== values[i])) throw new Error(`Target ${table} row differs; no existing data was overwritten.`);
}
const knownUsers = new Set(users.map(u => String(u.id)));
for (const user of users) {
  const metadata = user.user_metadata as Row || {};
  await insertVerified('users', 'id', { id: user.id, email: user.email, name: metadata.name ?? metadata.full_name ?? null, avatar_url: metadata.avatar_url ?? metadata.picture ?? null,
    created_at: user.created_at, updated_at: user.updated_at, legacy_json: JSON.stringify(user) });
  for (const identity of user.identities as Row[] || []) {
    const details = identity.identity_data as Row || {};
    if (identity.provider !== 'google' || typeof details.sub !== 'string') throw new Error('Unsupported legacy identity; migration must be reviewed.');
    await query('INSERT INTO identities(provider,subject,user_id) VALUES (?,?,?) ON CONFLICT DO NOTHING', ['google', details.sub, user.id]);
    const target = (await query('SELECT user_id FROM identities WHERE provider=? AND subject=?', ['google', details.sub]))[0].results[0];
    if (target?.user_id !== user.id) throw new Error('Identity mapping mismatch.');
  }
}
const referenced = new Set(Object.values(source).flatMap(rows => rows.map(r => r.user_id).filter(Boolean) as string[]));
let anonymous = 0;
for (const id of referenced) if (!knownUsers.has(id)) {
  await insertVerified('users', 'id', { id, email: null, name: null, avatar_url: null, created_at: '1970-01-01T00:00:00.000Z', updated_at: '1970-01-01T00:00:00.000Z', legacy_json: JSON.stringify({ archivedAnonymousOwner: true }) });
  knownUsers.add(id); anonymous++;
}
function rewrite(value: unknown): unknown {
  if (typeof value !== 'string' || !value.startsWith('https://osxwjhvlntrornibhkfu.supabase.co/storage/v1/object/public/')) return value;
  return '/api/media/' + value.slice('https://osxwjhvlntrornibhkfu.supabase.co/storage/v1/object/public/'.length);
}
for (const table of ['subscription_plans', 'user_subscriptions', 'payment_transactions', 'generation_sessions', 'generated_images', 'uploaded_files']) {
  for (const sourceRow of source[table]) {
    const row = { ...sourceRow };
    if (table === 'payment_transactions' && typeof row.creem_order_id === 'string' && row.creem_order_id.startsWith('ch_')) row.creem_checkout_id = row.creem_order_id;
    if (table === 'generated_images') for (const field of ['url', 'jpg_url', 'webp_url', 'thumbnail_url']) if (field in row) row[field] = rewrite(row[field]);
    await insertVerified(table, 'id', row);
  }
  console.log(JSON.stringify({ table, verifiedRows: source[table].length }));
}
const quota = (await query('SELECT count(*) AS rows,sum(purchased_quota) AS purchased,sum(bonus_quota) AS bonus,sum(used_quota) AS used FROM user_subscriptions'))[0].results[0];
const report = { verifiedAt: new Date().toISOString(), users: users.length, archivedAnonymousOwners: anonymous, quota, rows: Object.fromEntries(Object.entries(source).map(([k, rows]) => [k, rows.length])) };
await writeFile(path.join(directory, 'd1-verification.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
