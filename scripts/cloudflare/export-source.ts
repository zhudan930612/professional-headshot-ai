import { config } from 'dotenv';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

config({ path: '.env.local', quiet: true });
const root = process.env.VITE_SUPABASE_URL;
const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!root || !secret) throw new Error('Source environment is missing.');
const destination = path.resolve('.migration', process.argv[2] || `source-${new Date().toISOString().replace(/[:.]/g, '-')}`);
if (!destination.startsWith(path.resolve('.migration') + path.sep)) throw new Error('Invalid export destination.');
await mkdir(destination, { recursive: true });
const headers = { apikey: secret, Authorization: `Bearer ${secret}` };
async function source(url: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(root + url, { ...init, headers: { ...headers, ...init?.headers }, signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`Source request failed: ${response.status} (${url.split('?')[0]})`);
  return response.json();
}
const tables = ['subscription_plans', 'user_subscriptions', 'payment_transactions', 'generation_sessions', 'generated_images', 'uploaded_files'];
const hashes: Record<string, { rows: number; sha256: string }> = {};
const data: Record<string, Record<string, unknown>[]> = {};
async function save(name: string, rows: Record<string, unknown>[]) {
  const text = JSON.stringify(rows, null, 2);
  await writeFile(path.join(destination, `${name}.json`), text);
  hashes[name] = { rows: rows.length, sha256: createHash('sha256').update(text).digest('hex') };
  data[name] = rows;
}
for (const table of tables) {
  const rows: Record<string, unknown>[] = [];
  for (let offset = 0; ; offset += 500) {
    const page = await source(`/rest/v1/${table}?select=*&order=id&limit=500&offset=${offset}`, { headers: { 'Accept-Profile': 'headshot_ai' } }) as Record<string, unknown>[];
    if (!Array.isArray(page)) throw new Error('Invalid source rows.');
    rows.push(...page);
    if (page.length < 500) break;
  }
  await save(table, rows);
}
const users: Record<string, unknown>[] = [];
for (let page = 1; ; page++) {
  const response = await source(`/auth/v1/admin/users?page=${page}&per_page=500`) as { users: Record<string, unknown>[] };
  if (!Array.isArray(response.users)) throw new Error('Invalid user export.');
  users.push(...response.users);
  if (response.users.length < 500) break;
}
// The admin list endpoint omits identities; individual records are required to
// preserve Google's immutable subject rather than linking by mutable email.
const detailedUsers: Record<string, unknown>[] = [];
for (const user of users) detailedUsers.push(await source(`/auth/v1/admin/users/${user.id}`) as Record<string, unknown>);
await save('auth_users', detailedUsers);
const objects: Record<string, unknown>[] = [];
for (const bucket of ['user-uploads', 'generated-headshots', 'template-images']) {
  const pending = [''];
  while (pending.length) {
    const prefix = pending.shift()!;
    for (let offset = 0; ; offset += 500) {
      const page = await source(`/storage/v1/object/list/${bucket}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prefix, limit: 500, offset, sortBy: { column: 'name', order: 'asc' } }) }) as Record<string, unknown>[];
      if (!Array.isArray(page)) throw new Error('Invalid storage export.');
      for (const item of page) {
        const key = prefix ? `${prefix}/${item.name}` : String(item.name);
        if (item.id == null) pending.push(key);
        else objects.push({ ...item, bucket, key });
      }
      if (page.length < 500) break;
    }
  }
}
await save('storage_objects', objects);
const providerCounts: Record<string, number> = {};
for (const user of detailedUsers) for (const identity of user.identities as { provider: string }[] || []) providerCounts[identity.provider] = (providerCounts[identity.provider] || 0) + 1;
const referencedUsers = new Set(tables.flatMap(t => data[t].map(r => r.user_id).filter(Boolean)));
const quota = data.user_subscriptions.reduce<{ purchased: number; bonus: number; used: number }>((sum, r) => ({ purchased: sum.purchased + Number(r.purchased_quota), bonus: sum.bonus + Number(r.bonus_quota), used: sum.used + Number(r.used_quota) }), { purchased: 0, bonus: 0, used: 0 });
const summary = { source: root, capturedAt: new Date().toISOString(), tables: hashes, providers: providerCounts, referencedUsers: referencedUsers.size, quota, objects: objects.length, objectBytes: objects.reduce((n, o) => n + Number((o.metadata as { size?: number })?.size || 0), 0) };
await writeFile(path.join(destination, 'manifest.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify({ destination, ...summary }));
