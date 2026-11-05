const base = process.argv[2] || 'https://www.professionalheadshotai.ink';
let failures = 0;
for (const [path, expected, validate] of [
  ['/api/health',200,(v: Record<string, unknown>) => v.backend === 'cloudflare' && v.maintenance === false],
  ['/api/auth/session',200,(v: Record<string, unknown>) => v.user === null],
  ['/api/plans',200,(v: unknown) => Array.isArray(v) && v.length === 3],
  ['/api/account',401,() => true],
  ['/api/creem/payment-status?orderId=invalid',401,() => true],
  ['/api/media/user-uploads/private-test/photo.png',401,() => true],
  ['/api/no-such-endpoint',404,() => true],
] as const) {
  const response = await fetch(base + path, { redirect: 'manual', signal: AbortSignal.timeout(20_000) });
  const isJson = response.headers.get('content-type')?.includes('application/json') === true;
  const value = isJson ? await response.json() : {};
  const ok = response.status === expected && isJson && validate(value);
  if (!ok) failures++;
  console.log(JSON.stringify({ path, status: response.status, json: isJson, ok }));
}
const image = await fetch(base + '/api/media/template-images/corporate/corporate_01.jpg', { redirect: 'manual', signal: AbortSignal.timeout(20_000) });
const imageOk = image.ok && image.headers.get('content-type')?.startsWith('image/') === true;
await image.body?.cancel();
console.log(JSON.stringify({ check: 'template-image', status: image.status, ok: imageOk }));
if (!imageOk) failures++;
// Check the real login initialization, including its deployed public client ID.
// This creates only an expiring nonce; no user, session, payment or credit is created.
const challenge = await fetch(base + '/api/auth/challenge', { method: 'POST', redirect: 'manual',
  headers: { Origin: new URL(base).origin, 'Content-Type': 'application/json' }, body: '{}', signal: AbortSignal.timeout(20_000) });
const challengeBody = await challenge.json().catch(() => ({})) as { nonce?: string; clientId?: string };
const cookie = challenge.headers.get('set-cookie') || '';
const loginOk = challenge.ok && /^[a-f0-9]{64}$/.test(challengeBody.nonce || '') && challengeBody.clientId?.endsWith('.apps.googleusercontent.com') === true && cookie.includes('HttpOnly') && (base.startsWith('http://localhost') || cookie.includes('Secure'));
console.log(JSON.stringify({check:'google-login-initialization',status:challenge.status,ok:loginOk}));
if (!loginOk) failures++;
process.exitCode = failures ? 1 : 0;
