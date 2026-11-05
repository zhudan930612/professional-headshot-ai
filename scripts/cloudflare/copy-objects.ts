import { config } from 'dotenv';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { cf, bucketName, query } from './api';
config({ path: '.env.local', quiet: true });
const directory = path.resolve('.migration', process.argv[2] || 'baseline-20261105');
if (!directory.startsWith(path.resolve('.migration') + path.sep)) throw new Error('Invalid source directory.');
const cacheDir = path.join(directory, 'objects');
await mkdir(cacheDir, { recursive: true });
interface SourceObject { bucket: string; key: string; created_at: string; metadata?: { size?: number; mimetype?: string } }
const objects: SourceObject[] = JSON.parse(await readFile(path.join(directory, 'storage_objects.json'), 'utf8'));
const knownUsers = new Set((await query('SELECT id FROM users'))[0].results.map(u => String(u.id)));
const reports: Record<string, { sha256: string; bytes: number; verified: boolean; ownerMapped: boolean }> = {};
let index = 0;
let completed = 0;
const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
async function copy(item: SourceObject) {
  const key = `${item.bucket}/${item.key}`;
  const cacheName = hash(new TextEncoder().encode(key));
  let bytes: Buffer;
  try { bytes = await readFile(path.join(cacheDir, cacheName)); }
  catch {
    const response = await fetch(`${process.env.VITE_SUPABASE_URL}/storage/v1/object/${item.bucket}/${item.key.split('/').map(encodeURIComponent).join('/')}`, {
      headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` }, signal: AbortSignal.timeout(60_000),
    });
    if (!response.ok) throw new Error(`Source object retrieval failed (${response.status}); object digest ${cacheName}`);
    bytes = Buffer.from(await response.arrayBuffer());
    if (item.metadata?.size !== undefined && bytes.length !== item.metadata.size) throw new Error('Source object size changed during export.');
    await writeFile(path.join(cacheDir, cacheName), bytes);
  }
  const digest = hash(bytes);
  const endpoint = `/r2/buckets/${bucketName}/objects/${encodeURIComponent(key)}`;
  const owner = item.bucket === 'template-images' ? null : knownUsers.has(item.key.split('/')[0]) ? item.key.split('/')[0] : null;
  const old = (await query('SELECT sha256,bytes FROM storage_objects WHERE object_key=?', [key]))[0].results[0];
  if (old && (old.sha256 !== digest || old.bytes !== bytes.length)) throw new Error('Existing target object differs; no overwrite performed.');
  if (old) {
    // This row was committed only after a complete R2 download and hash check.
    // Resume failed objects without transferring all previously verified bytes again.
    reports[key] = { sha256: digest, bytes: bytes.length, verified: true, ownerMapped: owner !== null || item.bucket === 'template-images' };
    completed++;
    return;
  }
  if (!old) {
    const uploaded = await cf(endpoint, { method: 'PUT', headers: { 'Content-Type': item.metadata?.mimetype || 'application/octet-stream' }, body: bytes, signal: AbortSignal.timeout(300_000) });
    if (!uploaded.ok) throw new Error(`R2 upload failed (${uploaded.status}); object digest ${cacheName}`);
  }
  const response = await cf(endpoint, { signal: AbortSignal.timeout(300_000) });
  if (!response.ok || hash(new Uint8Array(await response.arrayBuffer())) !== digest) throw new Error(`R2 content verification failed; object digest ${cacheName}`);
  await query('INSERT INTO storage_objects(object_key,bucket,source_key,user_id,bytes,mime_type,sha256,created_at) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT DO NOTHING',
    [key, item.bucket, item.key, owner, bytes.length, item.metadata?.mimetype || 'application/octet-stream', digest, item.created_at || new Date().toISOString()]);
  reports[key] = { sha256: digest, bytes: bytes.length, verified: true, ownerMapped: owner !== null || item.bucket === 'template-images' };
  completed++;
  if (completed % 25 === 0) console.log(JSON.stringify({ verifiedObjects: completed, total: objects.length }));
}
const results = await Promise.allSettled(Array.from({ length: 4 }, async () => {
  while (index < objects.length) { const item = objects[index++]; await copy(item); }
}));
await writeFile(path.join(directory, 'object-verification.json'), JSON.stringify(reports, null, 2));
const errors = results.filter(r => r.status === 'rejected');
console.log(JSON.stringify({ verifiedObjects: completed, total: objects.length, bytes: Object.values(reports).reduce((n, r) => n + r.bytes, 0), unmappedOwners: Object.values(reports).filter(r => !r.ownerMapped).length, failedWorkers: errors.length }));
if (errors.length) throw new Error(errors.map(r => (r as PromiseRejectedResult).reason instanceof Error ? (r as PromiseRejectedResult).reason.message : 'Object migration failed').join('; '));
