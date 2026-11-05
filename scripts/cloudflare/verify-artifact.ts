import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
const files = await readdir('dist',{recursive:true});
if (!files.includes('_worker.js')) throw new Error('Cloudflare advanced-mode Worker is missing.');
const hashes: Record<string,string> = {};
let bytes = 0;
for (const file of files) {
  const full = path.join('dist',file);
  if (!(await stat(full)).isFile()) continue;
  const data = await readFile(full); bytes += data.length;
  if (/\.(js|html|css)$/.test(file) && /supabase\.co|SUPABASE_SERVICE_ROLE_KEY|VITE_SUPABASE_|@supabase/.test(data.toString('utf8'))) throw new Error(`Supabase runtime dependency remains in ${file}`);
  hashes[file] = createHash('sha256').update(data).digest('hex');
}
await mkdir('.migration', { recursive: true });
await writeFile('.migration/build-manifest.json',JSON.stringify({builtAt:new Date().toISOString(),bytes,hashes},null,2));
console.log(JSON.stringify({files:Object.keys(hashes).length,bytes,workerSha256:hashes['_worker.js'],supabaseRuntimeReferences:0}));
