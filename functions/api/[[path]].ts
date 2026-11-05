import { json } from '@/server/http';

// Unknown API routes must not fall through to the SPA and return HTML with 200.
export const onRequest = async (): Promise<Response> => json({ error: 'API endpoint not found.', code: 'NOT_FOUND' }, 404);
