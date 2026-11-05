import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
const left = path.resolve('.migration', process.argv[2] || 'baseline-20261105');
const right = path.resolve('.migration', process.argv[3] || 'before-cutover-20261105');
if (![left,right].every(p => p.startsWith(path.resolve('.migration') + path.sep))) throw new Error('Invalid snapshot path.');
const canonical = (value: unknown): string => {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.entries(value).sort(([a],[b]) => a.localeCompare(b)).map(([key,v]) => JSON.stringify(key)+':'+canonical(v)).join(',') + '}';
  return JSON.stringify(value);
};
const hash = (data: unknown) => createHash('sha256').update(canonical(data)).digest('hex');
const results = [];
for (const name of ['subscription_plans','user_subscriptions','payment_transactions','generation_sessions','generated_images','uploaded_files','auth_users','storage_objects']) {
  let a = JSON.parse(await readFile(path.join(left,name+'.json'),'utf8'));
  if (name === 'auth_users' && a.some((u: { identities?: unknown }) => !u.identities)) a = JSON.parse(await readFile(path.join(left,'auth_users_details.json'),'utf8'));
  const b = JSON.parse(await readFile(path.join(right,name+'.json'),'utf8'));
  results.push({ table: name, before: a.length, after: b.length, unchanged: hash(a) === hash(b) });
}
await writeFile(path.join(right,'source-comparison.json'),JSON.stringify({ checkedAt: new Date().toISOString(), results },null,2));
console.log(JSON.stringify(results));
process.exitCode = results.every(r => r.unchanged) ? 0 : 1;
