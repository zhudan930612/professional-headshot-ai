import type { CloudflareEnv } from './env';
import { ApiError, fail, json, readJson, sameOrigin } from './http';
import { getUser, requireUser, loginChallenge, googleLogin, logout } from './auth';
import { plans, getQuota, activeSubscription } from './account';
import { readMedia, uploadReference } from './media';
import { submitGeneration, queryGeneration, saveGenerated } from './generation';
import { createPayment, paymentStatus, webhook } from './payments';
import { history, saveHistory } from './history';

export default {
  async fetch(request: Request, env: CloudflareEnv): Promise<Response> {
    const url = new URL(request.url);
    const route = `${request.method} ${url.pathname}`;
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request as unknown as Parameters<typeof env.ASSETS.fetch>[0]) as unknown as Promise<Response>;
    try {
      if (route === 'GET /api/health') return json({ backend: 'cloudflare', maintenance: env.MAINTENANCE_MODE === 'true' });
      if (request.method === 'POST' && ['/api/auth/creem/webhook', '/api/creem/webhook'].includes(url.pathname)) return await webhook(request, env);
      if (env.MAINTENANCE_MODE === 'true') throw new ApiError(503, 'We are upgrading the service. Please try again shortly.', 'MAINTENANCE');
      if (['GET', 'HEAD'].includes(request.method) && url.pathname.startsWith('/api/media/')) return await readMedia(request, env);
      if (route === 'POST /api/auth/challenge') return await loginChallenge(request, env);
      if (route === 'POST /api/auth/google') return await googleLogin(request, env);
      if (route === 'GET /api/auth/session') return json({ user: await getUser(request, env) });
      if (route === 'POST /api/auth/logout') return await logout(request, env);
      if (route === 'GET /api/plans') return json(await plans(env));
      const protectedRoutes = ['GET /api/account', 'GET /api/history', 'POST /api/history', 'POST /api/uploads', 'POST /api/nanoBanana', 'POST /api/save-generated-image', 'GET /api/proxy-image', 'POST /api/creem/create-payment', 'GET /api/creem/payment-status', 'GET /api/payments'];
      if (!protectedRoutes.includes(route)) throw new ApiError(404, 'API endpoint not found.');
      if (!['GET', 'HEAD'].includes(request.method)) sameOrigin(request);
      const user = await requireUser(request, env);
      switch (route) {
        case 'GET /api/account': return json({ quota: await getQuota(user.id, env), subscription: await activeSubscription(user.id, env) });
        case 'GET /api/history': return json(await history(user.id, url.searchParams.get('cursor'), env));
        case 'POST /api/history': return json(await saveHistory(user.id, await readJson(request, 65_536), env));
        case 'POST /api/uploads': return await uploadReference(request, env);
        case 'POST /api/nanoBanana': {
          const body = await readJson(request);
          if (body.action === 'submitTask') return json(await submitGeneration(user.id, body, url.origin, env));
          if (body.action === 'queryStatus') return json(await queryGeneration(user.id, body.taskId, env));
          throw new ApiError(400, 'Invalid generation action.');
        }
        case 'POST /api/save-generated-image': return json(await saveGenerated(user.id, (await readJson(request)).taskId, env));
        case 'GET /api/proxy-image': {
          const image = await saveGenerated(user.id, url.searchParams.get('taskId'), env);
          return await readMedia(new Request(new URL(image.url, url.origin), { headers: request.headers }), env);
        }
        case 'POST /api/creem/create-payment': return json(await createPayment(user.id, (await readJson(request)).planType, env));
        case 'GET /api/creem/payment-status': return json(await paymentStatus(user.id, url.searchParams.get('orderId'), env));
        case 'GET /api/payments': return json((await env.DB.prepare('SELECT id,status,plan_type,amount,currency,created_at,completed_at FROM payment_transactions WHERE user_id=? ORDER BY created_at DESC LIMIT 100').bind(user.id).all()).results);
      }
      throw new ApiError(404, 'API endpoint not found.');
    } catch (error) { return fail(error); }
  },
};
