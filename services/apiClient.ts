export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, { ...init, credentials: 'same-origin', headers: { ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers } });
  if (!response.ok) {
    let message = response.status === 401 ? 'Please sign in to continue.' : 'The service is temporarily unavailable. Please try again.';
    try { const body = await response.json(); if (typeof body.error === 'string') message = body.error; } catch { /* retain the safe default */ }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}
