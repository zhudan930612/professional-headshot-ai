import { HttpError, handleError, requireUser, type RequestContext } from '@/server/http';
import { getTask } from '@/server/generation';
import { fetchImage } from '@/server/images';

export async function onRequestGet({ request, env }: RequestContext): Promise<Response> {
  try {
    const { db, user } = await requireUser(request, env);
    const task = await getTask(db, user.id, new URL(request.url).searchParams.get('taskId'));
    if (task.status !== 'completed' || !task.result_url) throw new HttpError(409, 'Your image is not ready yet.');
    const image = await fetchImage(task.result_url, env);
    return new Response(new Blob([image.bytes as BlobPart], { type: image.mime }), {
      headers: { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' },
    });
  } catch (error) { return handleError(error); }
}
