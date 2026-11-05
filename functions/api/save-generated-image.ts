import { HttpError, handleError, json, readJson, requireUser, type RequestContext } from '@/server/http';
import { getTask } from '@/server/generation';
import { fetchImage } from '@/server/images';

export async function onRequestPost({ request, env }: RequestContext): Promise<Response> {
  try {
    if (request.method !== 'POST') throw new HttpError(405, 'Method not allowed.');
    const { db, user } = await requireUser(request, env);
    const body = await readJson(request);
    const task = await getTask(db, user.id, body.taskId);
    if (task.saved_image) return json(task.saved_image);
    if (task.status !== 'completed' || !task.result_url) throw new HttpError(409, 'Your image is not ready yet.');
    const image = await fetchImage(task.result_url, env);
    const storagePath = `${user.id}/${task.id}.${image.extension}`;
    const { error: uploadError } = await db.storage.from('generated-headshots').upload(storagePath, image.bytes, {
      upsert: true, contentType: image.mime, cacheControl: '3600',
    });
    if (uploadError) throw new HttpError(503, 'Your image could not be saved. Please try again.');
    const { data: { publicUrl } } = db.storage.from('generated-headshots').getPublicUrl(storagePath);
    const saved = { id: task.id, taskId: task.id, url: publicUrl, jpgUrl: publicUrl, storagePath,
      mimeType: image.mime, fileSize: image.bytes.length, createdAt: Date.parse(task.updated_at) };
    const { error } = await db.from('generation_tasks').update({ saved_image: saved }).eq('id', task.id).eq('user_id', user.id);
    if (error) throw new HttpError(503, 'Your image could not be saved. Please try again.');
    return json(saved);
  } catch (error) { return handleError(error); }
}
