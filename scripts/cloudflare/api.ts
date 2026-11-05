import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

export const accountId = 'aa479a48352fb7188db30bf3e50f4ca4';
export const databaseId = 'a3c45b09-7544-4a08-8ec8-7d7b998ba8da';
export const bucketName = 'professional-headshot-ai';
let token: string | undefined;
export async function cf(pathname: string, init: RequestInit = {}) {
  if (!token) {
    token = process.env.CLOUDFLARE_API_TOKEN;
    if (!token) {
      const configPath = path.join(process.env.APPDATA || '', 'xdg.config', '.wrangler', 'config', 'default.toml');
      token = (await readFile(configPath, 'utf8')).match(/oauth_token\s*=\s*"([^"]+)"/)?.[1];
    }
  }
  if (!token) throw new Error('Run wrangler login first.');
  const send = () => fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}${pathname}`, { ...init, headers: { ...init.headers, Authorization: `Bearer ${token}` }, signal: init.signal ?? AbortSignal.timeout(120_000) });
  const response = await send();
  if (response.status === 401 && !process.env.CLOUDFLARE_API_TOKEN) {
    await response.body?.cancel();
    // Use Wrangler's existing refresh credential; never ask for a second login
    // during a long migration or copy a refresh token into this project.
    execFileSync(process.execPath, [path.resolve('node_modules/wrangler/bin/wrangler.js'), 'whoami'], { stdio: 'ignore', timeout: 30_000 });
    const config = await readFile(path.join(process.env.APPDATA || '', 'xdg.config', '.wrangler', 'config', 'default.toml'), 'utf8');
    token = config.match(/oauth_token\s*=\s*"([^"]+)"/)?.[1];
    return send();
  }
  return response;
}
export async function query(sql: string, params: unknown[] = []) {
  const response = await cf(`/d1/database/${databaseId}/query`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sql, params }) });
  const data = await response.json() as { success: boolean; result: { results: Record<string, unknown>[]; meta: Record<string, unknown> }[]; errors?: { code: number }[] };
  if (!response.ok || !data.success) throw new Error(`Cloudflare D1 failed: ${response.status}; codes ${data.errors?.map(e => e.code).join(',')}`);
  return data.result;
}
