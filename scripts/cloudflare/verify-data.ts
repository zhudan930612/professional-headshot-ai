import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { query } from './api';
const directory = path.resolve('.migration', process.argv[2] || 'baseline-20261105');
if (!directory.startsWith(path.resolve('.migration') + path.sep)) throw new Error('Invalid snapshot path.');
type Row = Record<string, unknown>;
const read = async (name: string): Promise<Row[]> => JSON.parse(await readFile(path.join(directory, name+'.json'), 'utf8'));
const norm = (v: unknown) => v == null ? null : typeof v === 'object' ? JSON.stringify(v) : typeof v === 'boolean' ? Number(v) : v;
const results: Record<string, unknown>[] = [];
let failures = 0;
const tables = ['subscription_plans','user_subscriptions','payment_transactions','generation_sessions','generated_images','uploaded_files'];
const target: Record<string, Row[]> = {};
for (const table of tables) {
  const expected = await read(table);
  target[table] = (await query(`SELECT * FROM ${table}`))[0].results;
  const byId = new Map(target[table].map(row => [row.id,row]));
  const exact = expected.every(row => Object.entries(row).every(([key,value]) => {
    const adjusted = table === 'generated_images' && typeof value === 'string' ? value.replace('https://osxwjhvlntrornibhkfu.supabase.co/storage/v1/object/public/','/api/media/') : value;
    return norm(byId.get(row.id)?.[key]) === norm(adjusted);
  }));
  const ok = exact && expected.length === byId.size;
  results.push({table,sourceRows:expected.length,targetRows:byId.size,allFieldsMatch:ok});
  if (!ok) failures++;
}
let users = await read('auth_users');
if (users.some(u => !u.identities)) users = await read('auth_users_details');
const identities = (await query('SELECT provider,subject,user_id FROM identities'))[0].results;
const identityMatch = users.every(u => (u.identities as Row[]).every(i => identities.some(row => row.provider === i.provider && row.subject === (i.identity_data as Row).sub && row.user_id === u.id)));
if (!identityMatch || identities.length !== users.length) failures++;
results.push({table:'identities',sourceUsers:users.length,targetIdentities:identities.length,originalUserIdsMatch:identityMatch});
const objects = (await query('SELECT object_key,bytes,sha256,user_id,bucket FROM storage_objects'))[0].results;
const verified = JSON.parse(await readFile(path.join(directory,'object-verification.json'),'utf8')) as Record<string,{sha256:string;bytes:number;verified:boolean}>;
const sourceObjects = await read('storage_objects');
const objectMap = new Map(objects.map(o => [o.object_key,o]));
const objectsMatch = sourceObjects.length === objects.length && sourceObjects.every(o => {
  const key = `${o.bucket}/${o.key}`; const entry = verified[key]; const stored = objectMap.get(key);
  return entry?.verified && stored?.sha256 === entry.sha256 && stored?.bytes === entry.bytes;
});
if (!objectsMatch) failures++;
const sessions = new Map(target.generation_sessions.map(s => [s.session_id,s]));
let realImages = 0, placeholders = 0, missing = 0, mismatchedOwners = 0;
for (const image of target.generated_images) {
  const url = String(image.url);
  if (url.startsWith('https://picsum.photos/')) { placeholders++; continue; }
  realImages++;
  for (const field of ['url','jpg_url','webp_url','thumbnail_url']) {
    if (!image[field]) continue;
    const location=String(image[field]);
    const stored=location.startsWith('/api/media/') ? objectMap.get(decodeURIComponent(location.slice(11))) : null;
    if (!stored) missing++;
    else if (stored.user_id !== sessions.get(image.session_id)?.user_id) mismatchedOwners++;
  }
}
if (missing || mismatchedOwners) failures++;
const report = { verifiedAt:new Date().toISOString(),ok:failures===0,results,objects:{count:objects.length,bytes:objects.reduce((n,o)=>n+Number(o.bytes),0),hashesMatch:objectsMatch,unclaimedPrivateFiles:objects.filter(o=>o.bucket!=='template-images'&&o.user_id===null).length},history:{realImages,placeholders,missing,mismatchedOwners},quota:target.user_subscriptions.reduce<{total:number;used:number}>((r,s)=>({total:r.total+Number(s.purchased_quota)+Number(s.bonus_quota),used:r.used+Number(s.used_quota)}),{total:0,used:0}) };
await writeFile(path.join(directory,'final-verification.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report));
process.exitCode=failures?1:0;
