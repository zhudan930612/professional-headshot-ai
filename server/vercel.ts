import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleError, type RequestContext } from './http';

/** All platforms run the same handler; webhooks must disable Vercel body parsing. */
export const adapt = (handler: (context: RequestContext) => Promise<Response>) => async (req: IncomingMessage & { body?: unknown }, res: ServerResponse) => {
  try {
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value !== undefined) headers.set(key, Array.isArray(value) ? value.join(',') : value);
    }
    const method = req.method || 'GET';
    let body: string | undefined;
    if (method !== 'GET' && method !== 'HEAD') {
      if (req.body !== undefined) body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      else {
        const chunks: Buffer[] = [];
        let length = 0;
        for await (const chunk of req) {
          length += Buffer.byteLength(chunk);
          if (length > 256000) { res.statusCode = 413; res.end(); return; }
          chunks.push(Buffer.from(chunk));
        }
        body = Buffer.concat(chunks).toString('utf8');
      }
    }
    const request = new Request(`https://${req.headers.host || 'localhost'}${req.url || '/'}`, { method, headers, body });
    const response = await handler({ request, env: process.env });
    response.headers.forEach((value, key) => res.setHeader(key, value));
    res.statusCode = response.status;
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    const response = handleError(error);
    res.statusCode = response.status;
    res.end(await response.text());
  }
};
