export class ApiError extends Error {
  constructor(public status: number, message: string, public code = 'REQUEST_FAILED') { super(message); }
}
export const json = (value: unknown, status = 200, headers?: HeadersInit): Response => Response.json(value, {
  status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers },
});
export const fail = (error: unknown): Response => error instanceof ApiError
  ? json({ error: error.message, code: error.code }, error.status)
  : json({ error: 'Service temporarily unavailable. Please try again.', code: 'SERVICE_UNAVAILABLE' }, 503);
export async function readBytes(request: Request, max: number): Promise<Uint8Array> {
  if (Number(request.headers.get('content-length')) > max) throw new ApiError(413, 'Request is too large.');
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      length += part.value.length;
      if (length > max) { await reader.cancel(); throw new ApiError(413, 'Request is too large.'); }
      chunks.push(part.value);
    }
  } finally { reader.releaseLock(); }
  const result = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length; }
  return result;
}
export async function readJson(request: Request, max = 16_384): Promise<Record<string, unknown>> {
  if (!request.headers.get('content-type')?.includes('application/json')) throw new ApiError(415, 'JSON is required.');
  const text = new TextDecoder().decode(await readBytes(request, max));
  try { const data: unknown = JSON.parse(text); if (data && typeof data === 'object' && !Array.isArray(data)) return data as Record<string, unknown>; } catch { /* handled below */ }
  throw new ApiError(400, 'Invalid request.');
}
export const string = (value: unknown, max = 2048): string => {
  if (typeof value !== 'string' || !value || value.length > max) throw new ApiError(400, 'Invalid request parameter.');
  return value;
};
export const uuid = (value: unknown): string => {
  const id = string(value, 36);
  if (!/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(id)) throw new ApiError(400, 'Invalid identifier.');
  return id;
};
export const object = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
export function sameOrigin(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin || request.headers.get('sec-fetch-site') === 'cross-site') throw new ApiError(403, 'Request origin is not allowed.');
}
export const sha256 = async (value: string | Uint8Array): Promise<string> => {
  const input = typeof value === 'string' ? new TextEncoder().encode(value) : value;
  const digest = await crypto.subtle.digest('SHA-256', input as BufferSource);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
};
export const randomToken = (): string => Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, '0')).join('');
