import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { config } from 'dotenv';

config({ path: '.env.local', quiet: true });
config({ path: '.dev.vars', quiet: true });
const secrets = Object.entries(process.env).filter(([name, value]) =>
  !name.startsWith('VITE_') && /KEY|TOKEN|SECRET/.test(name) && value && value.length > 12);
const files = new Set(execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean));
if (existsSync('dist')) {
  for (const path of readdirSync('dist', { recursive: true, encoding: 'utf8' })) files.add(join('dist', path));
}
const findings: { file: string; name: string }[] = [];
for (const file of files) {
  if (!existsSync(file) || !statSync(file).isFile()) continue;
  const bytes = readFileSync(file);
  for (const [name, value] of secrets) if (bytes.includes(Buffer.from(value!))) findings.push({ file, name });
  // Detect hardcoded legacy Supabase admin JWTs even after local key rotation.
  if (/\.(?:ts|tsx|js|mjs|json|md|html|ya?ml|sql)$/.test(file)) {
    const matches = bytes.toString('utf8').matchAll(/eyJ[A-Za-z0-9_-]+\.([A-Za-z0-9_-]+)\.[A-Za-z0-9_-]+/g);
    for (const match of matches) {
      try {
        const claims = JSON.parse(Buffer.from(match[1], 'base64url').toString('utf8')) as { role?: string };
        if (claims.role === 'service_role') findings.push({ file, name: 'hardcoded-service-role-jwt' });
      } catch { /* Not a JWT payload. */ }
    }
  }
}
console.log(JSON.stringify({ check: 'working-tree-and-build-secrets', ok: findings.length === 0, findings }));
console.log('This checks current files, not historical exposure or key revocation.');
process.exitCode = findings.length ? 1 : 0;
