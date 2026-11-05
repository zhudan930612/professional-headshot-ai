import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { CloudflareEnv, AccountUser } from './env';
import { ApiError, json, readJson, sameOrigin, sha256, randomToken, string } from './http';

const googleKeys = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
const cookieName = (request: Request, kind: string) => new URL(request.url).protocol === 'https:' ? `__Host-headshot_${kind}` : `headshot_${kind}`;
const cookie = (request: Request, kind: string, value: string, seconds: number) =>
  `${cookieName(request, kind)}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${seconds}${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}`;
export const readCookie = (request: Request, kind: string): string | undefined => {
  const name = cookieName(request, kind) + '=';
  return request.headers.get('cookie')?.split(';').map(part => part.trim()).find(part => part.startsWith(name))?.slice(name.length);
};

interface UserRow { id: string; email: string | null; name: string | null; avatar_url: string | null }
const publicUser = (row: UserRow): AccountUser => ({ id: row.id, email: row.email, user_metadata: { name: row.name ?? undefined, avatar_url: row.avatar_url ?? undefined } });
export async function getUser(request: Request, env: CloudflareEnv): Promise<AccountUser | null> {
  const token = readCookie(request, 'session');
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const user = await env.DB.prepare('SELECT u.id,u.email,u.name,u.avatar_url FROM auth_sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?')
    .bind(await sha256(token), Date.now()).first<UserRow>();
  return user ? publicUser(user) : null;
}
export async function requireUser(request: Request, env: CloudflareEnv): Promise<AccountUser> {
  const user = await getUser(request, env);
  if (!user) throw new ApiError(401, 'Please sign in.', 'UNAUTHORIZED');
  return user;
}
export async function loginChallenge(request: Request, env: CloudflareEnv): Promise<Response> {
  sameOrigin(request);
  if (!env.GOOGLE_CLIENT_ID) throw new ApiError(503, 'Sign in is temporarily unavailable.');
  const nonce = randomToken();
  await env.DB.batch([
    env.DB.prepare('DELETE FROM auth_challenges WHERE expires_at<?').bind(Date.now()),
    env.DB.prepare('INSERT INTO auth_challenges(token_hash,expires_at) VALUES (?,?)').bind(await sha256(nonce), Date.now() + 600_000),
  ]);
  return json({ nonce, clientId: env.GOOGLE_CLIENT_ID }, 200, { 'Set-Cookie': cookie(request, 'login', nonce, 600) });
}
export async function googleLogin(request: Request, env: CloudflareEnv): Promise<Response> {
  sameOrigin(request);
  const body = await readJson(request);
  const nonce = readCookie(request, 'login');
  if (!nonce || !/^[a-f0-9]{64}$/.test(nonce)) throw new ApiError(401, 'Please restart sign in.');
  let claims;
  try {
    const verified = await jwtVerify(string(body.credential, 12_000), googleKeys, {
      audience: env.GOOGLE_CLIENT_ID, issuer: ['https://accounts.google.com', 'accounts.google.com'], algorithms: ['RS256'],
    });
    claims = verified.payload;
  } catch { throw new ApiError(401, 'Google sign in could not be verified.'); }
  if (claims.nonce !== nonce || !claims.sub || claims.sub.length > 255 || claims.email_verified !== true || typeof claims.email !== 'string') throw new ApiError(401, 'Google sign in could not be verified.');
  const consumed = await env.DB.prepare('DELETE FROM auth_challenges WHERE token_hash=? AND expires_at>? RETURNING token_hash')
    .bind(await sha256(nonce), Date.now()).first();
  if (!consumed) throw new ApiError(401, 'This sign in has expired. Please try again.');
  const old = await env.DB.prepare('SELECT user_id FROM identities WHERE provider=? AND subject=?').bind('google', claims.sub).first<{ user_id: string }>();
  if (!old && env.ALLOW_NEW_ACCOUNTS === 'false') throw new ApiError(403, 'New account registration is temporarily unavailable.');
  const now = new Date().toISOString();
  const userId = old?.user_id ?? crypto.randomUUID();
  const name = typeof claims.name === 'string' ? claims.name.slice(0, 200) : null;
  const avatar = typeof claims.picture === 'string' && claims.picture.startsWith('https://') ? claims.picture.slice(0, 2048) : null;
  // Unique provider+subject prevents concurrent first logins from splitting an account.
  if (!old) {
    try {
      await env.DB.batch([
        env.DB.prepare('INSERT INTO users(id,email,name,avatar_url,created_at,updated_at) VALUES (?,?,?,?,?,?)').bind(userId, claims.email, name, avatar, now, now),
        env.DB.prepare('INSERT INTO identities(provider,subject,user_id) VALUES (?,?,?)').bind('google', claims.sub, userId),
      ]);
    } catch {
      const concurrent = await env.DB.prepare('SELECT user_id FROM identities WHERE provider=? AND subject=?').bind('google', claims.sub).first();
      if (!concurrent) throw new ApiError(503, 'Unable to create your account.');
    }
  }
  const identity = await env.DB.prepare('SELECT user_id FROM identities WHERE provider=? AND subject=?').bind('google', claims.sub).first<{ user_id: string }>();
  if (!identity) throw new ApiError(503, 'Unable to load your account.');
  const token = randomToken();
  const previousToken = readCookie(request, 'session');
  const statements = [
    env.DB.prepare('UPDATE users SET email=?,name=?,avatar_url=?,updated_at=? WHERE id=?').bind(claims.email, name, avatar, now, identity.user_id),
    env.DB.prepare('INSERT INTO auth_sessions(token_hash,user_id,expires_at,created_at) VALUES (?,?,?,?)').bind(await sha256(token), identity.user_id, Date.now() + 7 * 86400_000, Date.now()),
    env.DB.prepare('DELETE FROM auth_sessions WHERE expires_at<?').bind(Date.now()),
  ];
  if (previousToken) statements.push(env.DB.prepare('DELETE FROM auth_sessions WHERE token_hash=?').bind(await sha256(previousToken)));
  await env.DB.batch(statements);
  const response = json({ user: publicUser({ id: identity.user_id, email: claims.email, name, avatar_url: avatar }) });
  response.headers.append('Set-Cookie', cookie(request, 'session', token, 7 * 86400));
  response.headers.append('Set-Cookie', cookie(request, 'login', '', 0));
  return response;
}
export async function logout(request: Request, env: CloudflareEnv): Promise<Response> {
  sameOrigin(request);
  const token = readCookie(request, 'session');
  if (token) await env.DB.prepare('DELETE FROM auth_sessions WHERE token_hash=?').bind(await sha256(token)).run();
  return json({ ok: true }, 200, { 'Set-Cookie': cookie(request, 'session', '', 0) });
}
