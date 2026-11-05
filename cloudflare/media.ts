import type { CloudflareEnv } from './env';
import { requireUser } from './auth';
import { ApiError, json, readBytes, sameOrigin, sha256 } from './http';

export const mediaPath = (key: string) => `/api/media/${key.split('/').map(encodeURIComponent).join('/')}`;
export const mediaKey = (url: string, origin: string): string => {
  const parsed = new URL(url, origin);
  if (parsed.origin !== origin || !parsed.pathname.startsWith('/api/media/') || parsed.search || parsed.hash || /%2f|%5c|%2e/i.test(parsed.pathname)) throw new ApiError(403, 'Please upload your own reference image.');
  return decodeURIComponent(parsed.pathname.slice('/api/media/'.length));
};
export function imageType(bytes: Uint8Array) {
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((b, i) => bytes[i] === b)) return { mime: 'image/png', extension: 'png' };
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return { mime: 'image/jpeg', extension: 'jpg' };
  if (new TextDecoder().decode(bytes.slice(0, 4)) === 'RIFF' && new TextDecoder().decode(bytes.slice(8, 12)) === 'WEBP') return { mime: 'image/webp', extension: 'webp' };
  throw new ApiError(415, 'Please use a JPEG, PNG or WebP image.');
}
async function signingKey(env: CloudflareEnv) {
  if (!env.MEDIA_SIGNING_SECRET || env.MEDIA_SIGNING_SECRET.length < 32) throw new ApiError(503, 'Image access is temporarily unavailable.');
  return crypto.subtle.importKey('raw', new TextEncoder().encode(env.MEDIA_SIGNING_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
export async function signedMediaUrl(key: string, env: CloudflareEnv): Promise<string> {
  const expiry = Math.floor(Date.now() / 1000) + 3600;
  const bytes = await crypto.subtle.sign('HMAC', await signingKey(env), new TextEncoder().encode(`${key}\n${expiry}`));
  const signature = Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
  const url = new URL(mediaPath(key), env.APP_URL);
  url.searchParams.set('expires', String(expiry)); url.searchParams.set('signature', signature);
  return url.href;
}
export async function readMedia(request: Request, env: CloudflareEnv): Promise<Response> {
  const url = new URL(request.url);
  let key: string;
  try { key = decodeURIComponent(url.pathname.slice('/api/media/'.length)); } catch { throw new ApiError(400, 'Invalid image.'); }
  if (!/^(template-images|user-uploads|generated-headshots)\//.test(key) || key.split('/').some(s => !s || s === '.' || s === '..') || /[\\\u0000-\u001f]/.test(key)) throw new ApiError(404, 'Image not found.');
  const isTemplate = key.startsWith('template-images/');
  if (!isTemplate) {
    let signed = false;
    const expires = Number(url.searchParams.get('expires'));
    const signature = url.searchParams.get('signature') || '';
    if (Number.isSafeInteger(expires) && expires >= Date.now() / 1000 && expires <= Date.now() / 1000 + 3600 && /^[a-f0-9]{64}$/.test(signature)) {
      signed = await crypto.subtle.verify('HMAC', await signingKey(env), Uint8Array.from(signature.match(/../g)!, b => parseInt(b, 16)), new TextEncoder().encode(`${key}\n${expires}`));
    }
    if (!signed) {
      const user = await requireUser(request, env);
      const owned = await env.DB.prepare('SELECT object_key FROM storage_objects WHERE object_key=? AND user_id=?').bind(key, user.id).first();
      if (!owned) throw new ApiError(404, 'Image not found.');
    }
  }
  const object = await env.PHOTOS.get(key);
  if (!object) throw new ApiError(404, 'Image not found.');
  const headers = new Headers({ 'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream', 'Content-Length': String(object.size),
    'Cache-Control': isTemplate ? 'public, max-age=86400' : 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'ETag': object.httpEtag });
  if (!isTemplate) headers.set('Vary', 'Cookie');
  return new Response(request.method === 'HEAD' ? null : object.body as unknown as BodyInit, { headers });
}
export async function uploadReference(request: Request, env: CloudflareEnv): Promise<Response> {
  sameOrigin(request);
  const user = await requireUser(request, env);
  const count = await env.DB.prepare("SELECT count(*) AS count FROM storage_objects WHERE user_id=? AND bucket='user-uploads' AND created_at>?")
    .bind(user.id, new Date(Date.now() - 3600_000).toISOString()).first<{ count: number }>();
  if ((count?.count ?? 0) >= 30) throw new ApiError(429, 'Please wait before uploading more photos.');
  const bytes = await readBytes(request, 10 * 1024 * 1024);
  const type = imageType(bytes);
  const id = crypto.randomUUID();
  const sourceKey = `${user.id}/${id}.${type.extension}`;
  const key = `user-uploads/${sourceKey}`;
  const now = new Date().toISOString();
  await env.PHOTOS.put(key, bytes, { httpMetadata: { contentType: type.mime } });
  await env.DB.batch([
    env.DB.prepare('INSERT INTO storage_objects(object_key,bucket,source_key,user_id,bytes,mime_type,sha256,created_at) VALUES (?,?,?,?,?,?,?,?)').bind(key, 'user-uploads', sourceKey, user.id, bytes.length, type.mime, await sha256(bytes), now),
    env.DB.prepare('INSERT INTO uploaded_files(id,user_id,file_name,storage_path,file_size,mime_type,created_at) VALUES (?,?,?,?,?,?,?)').bind(id, user.id, `reference.${type.extension}`, sourceKey, bytes.length, type.mime, now),
  ]);
  return json({ id, url: mediaPath(key), storagePath: sourceKey, fileName: `reference.${type.extension}`, fileSize: bytes.length, mimeType: type.mime, createdAt: Date.now(), isSelected: true });
}
export function validateResultUrl(value: string, env: CloudflareEnv): URL {
  let url: URL;
  try { url = new URL(value); } catch { throw new ApiError(502, 'Invalid image response.'); }
  const hosts = (env.GENERATED_IMAGE_HOSTS || 'evolink.ai').split(',').map(v => v.trim()).filter(Boolean);
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443') || !hosts.some(host => url.hostname === host || url.hostname.endsWith(`.${host}`))) throw new ApiError(502, 'Invalid image response.');
  return url;
}
export async function fetchResult(value: string, env: CloudflareEnv) {
  let url = validateResultUrl(value, env);
  const signal = AbortSignal.timeout(20_000);
  for (let redirects = 0; redirects <= 3; redirects++) {
    const response = await fetch(url, { redirect: 'manual', signal });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      await response.body?.cancel();
      const location = response.headers.get('location');
      if (!location) break;
      url = validateResultUrl(new URL(location, url).href, env); continue;
    }
    if (!response.ok) throw new ApiError(502, 'Unable to retrieve your image.');
    const bytes = await readBytes(new Request(url, { method: 'POST', headers: response.headers, body: response.body, duplex: 'half' } as RequestInit), 20 * 1024 * 1024);
    return { bytes, ...imageType(bytes) };
  }
  throw new ApiError(502, 'Unable to retrieve your image.');
}
