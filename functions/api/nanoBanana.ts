import { HttpError, handleError, json, readJson, requireUser, type RequestContext } from '@/server/http';
import { queryTask, submitTask } from '@/server/generation';

export async function onRequestPost({ request, env }: RequestContext): Promise<Response> {
  try {
    if (request.method !== 'POST') throw new HttpError(405, 'Method not allowed.');
    const { db, user } = await requireUser(request, env);
    const body = await readJson(request);
    if (body.action === 'submitTask') return json(await submitTask(db, user.id, body, env));
    if (body.action === 'queryStatus') return json(await queryTask(db, user.id, body.taskId, env));
    throw new HttpError(400, 'Invalid generation action.');
  } catch (error) { return handleError(error); }
}
