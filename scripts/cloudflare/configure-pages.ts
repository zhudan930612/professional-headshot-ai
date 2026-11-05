import { config } from 'dotenv';
import { randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { cf, databaseId, bucketName } from './api';
config({ path: '.env.local', quiet: true });
const environment = process.argv[2];
if (!['preview', 'production'].includes(environment)) throw new Error('Choose preview or production.');
const secretPath = '.migration/media-signing-secret';
let mediaSecret: string;
try { mediaSecret = await readFile(secretPath, 'utf8'); }
catch { mediaSecret = randomBytes(32).toString('hex'); await writeFile(secretPath, mediaSecret); }
const values: Record<string, string> = {
  NODE_VERSION: '22', PNPM_VERSION: '10.26.1',
  APP_URL: environment === 'production' ? 'https://www.professionalheadshotai.ink' : 'https://cf-migration.professional-headshot-ai.pages.dev',
  GOOGLE_CLIENT_ID: process.env.VITE_GOOGLE_CLIENT_ID || '', MEDIA_SIGNING_SECRET: mediaSecret,
  CREEM_API_KEY: process.env.CREEM_API_KEY || '', CREEM_WEBHOOK_SECRET: process.env.CREEM_WEBHOOK_SECRET || '',
  CREEM_TEST_MODE: environment === 'production' ? 'false' : 'true',
  CREEM_PROFESSIONAL_PRODUCT_ID: process.env.CREEM_PROFESSIONAL_PRODUCT_ID || '', CREEM_EXECUTIVE_PRODUCT_ID: process.env.CREEM_EXECUTIVE_PRODUCT_ID || '',
  NANO_BANANA_API_KEY: environment === 'production' ? process.env.NANO_BANANA_API_KEY || '' : '',
  NANO_BANANA_MODEL_1K: 'nano-banana-2-lite', NANO_BANANA_MODEL_2K: 'gemini-3.1-flash-image-preview',
  ALLOW_NEW_ACCOUNTS: environment === 'production' ? 'true' : 'false',
};
// Preview is read-only for purchases/generation: it does not receive production
// provider credentials or valid test product credentials.
if (environment === 'preview') { values.CREEM_API_KEY = ''; values.CREEM_WEBHOOK_SECRET = ''; }
const existing = await cf('/pages/projects/professional-headshot-ai');
const project = await existing.json() as { result: { deployment_configs: Record<string, { env_vars?: Record<string, unknown> }> } };
if (!existing.ok) throw new Error('Unable to inspect Pages configuration.');
const envVars: Record<string, { type: string; value: string } | null> = {};
for (const name of Object.keys(project.result.deployment_configs[environment]?.env_vars || {})) envVars[name] = null;
for (const [name, value] of Object.entries(values)) envVars[name] = { type: /SECRET|API_KEY/.test(name) ? 'secret_text' : 'plain_text', value };
const response = await cf('/pages/projects/professional-headshot-ai', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deployment_configs: { [environment]: {
  env_vars: envVars, d1_databases: { DB: { id: databaseId } }, r2_buckets: { PHOTOS: { name: bucketName } },
  compatibility_date: '2026-11-05', compatibility_flags: ['nodejs_compat'],
} } }) });
const result = await response.json() as { success: boolean; errors?: { code: number }[] };
if (!response.ok || !result.success) throw new Error(`Pages configuration failed: ${response.status}; codes ${result.errors?.map(e => e.code)}`);
await writeFile('.dev.vars', Object.entries({ ...values, APP_URL: 'http://localhost:3000', CREEM_TEST_MODE: 'true', CREEM_API_KEY: '', NANO_BANANA_API_KEY: '' }).map(([name, value]) => `${name}=${JSON.stringify(value)}`).join('\n')+'\n');
console.log(JSON.stringify({ environment, configuredKeys: Object.keys(values), databaseId, bucket: bucketName, supabaseRuntimeKeysRemoved: true }));
