import { createClient } from '@supabase/supabase-js';

export interface Env { [key: string]: string | undefined }
export interface RequestContext { request: Request; env: Env }
export class HttpError extends Error {
  constructor(public status: number, message: string, public code = 'REQUEST_FAILED') { super(message); }
}
export const json = (body: unknown, status = 200): Response => Response.json(body, {
  status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
});
export const handleError = (error: unknown): Response => {
  if (error instanceof HttpError) return json({ error: error.message, code: error.code }, error.status);
  // Do not send provider responses, credentials or database details to clients.
  console.error('API operation failed', error instanceof Error ? error.name : 'UnknownError');
  return json({ error: 'Service temporarily unavailable. Please try again.', code: 'SERVICE_UNAVAILABLE' }, 503);
};
export const getAdmin = (env: Env) => {
  if (!env.VITE_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) throw new HttpError(503, 'Service is not configured.');
  return createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    db: { schema: 'headshot_ai' }, auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, signal: init?.signal ?? AbortSignal.timeout(15000) }) },
  });
};
export const requireUser = async (request: Request, env: Env) => {
  const match = /^Bearer (\S+)$/i.exec(request.headers.get('authorization') || '');
  if (!match) throw new HttpError(401, 'Please sign in.', 'UNAUTHORIZED');
  const db = getAdmin(env);
  const { data, error } = await db.auth.getUser(match[1]);
  if (error || !data.user) throw new HttpError(401, 'Your session has expired. Please sign in.', 'UNAUTHORIZED');
  return { db, user: data.user };
};
export const readBodyText = async (request: Request, maxBytes: number): Promise<string> => {
  if (Number(request.headers.get('content-length')) > maxBytes) throw new HttpError(413, 'Request is too large.');
  if (!request.body) return '';
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = '';
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) return text + decoder.decode();
      bytes += part.value.byteLength;
      if (bytes > maxBytes) { await reader.cancel(); throw new HttpError(413, 'Request is too large.'); }
      text += decoder.decode(part.value, { stream: true });
    }
  } finally { reader.releaseLock(); }
};
export const readJson = async (request: Request): Promise<Record<string, unknown>> => {
  if (!request.headers.get('content-type')?.includes('application/json')) throw new HttpError(415, 'JSON is required.');
  const text = await readBodyText(request, 16384);
  try {
    const data: unknown = JSON.parse(text);
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error();
    return data as Record<string, unknown>;
  } catch { throw new HttpError(400, 'Invalid request.'); }
};
export const requiredString = (value: unknown, max = 2048): string => {
  if (typeof value !== 'string' || !value || value.length > max) throw new HttpError(400, 'Invalid request parameter.');
  return value;
};
