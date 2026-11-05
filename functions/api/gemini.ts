import { handleError, json, requireUser, type RequestContext } from '@/server/http';

// No UI currently consumes this optional text feature. Leave it disabled until
// a product flow, supported model and per-user request budget are configured.
export async function onRequestPost({ request, env }: RequestContext): Promise<Response> {
  try {
    await requireUser(request, env);
    return json({ error: 'This feature is currently unavailable.', code: 'FEATURE_UNAVAILABLE' }, 503);
  } catch (error) { return handleError(error); }
}
