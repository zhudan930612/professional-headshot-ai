import { HEADSHOT_TEMPLATES } from '@/constants';
import { HttpError, requiredString, type Env, type getAdmin } from './http';
import { validateImageUrl } from './images';

type Database = ReturnType<typeof getAdmin>;

export interface GenerationTask {
  id: string;
  user_id: string;
  provider_task_id: string | null;
  reference_url: string;
  template_url: string;
  quality: '1K' | '2K' | '4K';
  status: 'submitting' | 'processing' | 'completed' | 'failed' | 'unknown';
  result_url: string | null;
  saved_image: Record<string, unknown> | null;
  updated_at: string;
}

const PROVIDER_BASE = 'https://api.evolink.ai/v1';
const templateUrls = new Set(HEADSHOT_TEMPLATES.map(template => template.imageUrl));
export const generationModel = (quality: GenerationTask['quality'], env: Env): string =>
  quality === '1K' ? (env.NANO_BANANA_MODEL_1K || 'nano-banana-2-lite')
    : (env.NANO_BANANA_MODEL_2K || 'gemini-3.1-flash-image-preview');
const object = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};

export const uuid = (value: unknown): string => {
  const result = requiredString(value, 36);
  if (!/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(result)) throw new HttpError(400, 'Invalid task identifier.');
  return result;
};

export function validateGenerationInput(body: Record<string, unknown>, userId: string, env: Env) {
  const referenceUrl = requiredString(body.referenceImageUrl);
  const templateUrl = requiredString(body.templateImageUrl);
  let reference: URL;
  try { reference = new URL(referenceUrl); } catch { throw new HttpError(400, 'Invalid reference image.'); }
  if (!env.VITE_SUPABASE_URL || reference.origin !== new URL(env.VITE_SUPABASE_URL).origin
    || reference.protocol !== 'https:' || reference.username || reference.password || reference.search || reference.hash
    || !reference.pathname.startsWith(`/storage/v1/object/public/user-uploads/${userId}/`)
    || /%2f|%5c|%2e/i.test(reference.pathname)) {
    throw new HttpError(403, 'Please upload your own reference image.');
  }
  if (!templateUrls.has(templateUrl)) throw new HttpError(400, 'Please select an available template.');
  return { referenceUrl, templateUrl, requestId: uuid(body.requestId), retryOf: body.retryOfTaskId == null ? null : uuid(body.retryOfTaskId) };
}

export async function getTask(db: Database, userId: string, taskId: unknown): Promise<GenerationTask> {
  const { data, error } = await db.from('generation_tasks').select('*').eq('id', uuid(taskId)).eq('user_id', userId).maybeSingle();
  if (error) throw new HttpError(503, 'Generation status is temporarily unavailable.');
  if (!data) throw new HttpError(404, 'Generation not found.');
  return data as GenerationTask;
}

const failTask = async (db: Database, userId: string, taskId: string): Promise<void> => {
  const { error } = await db.rpc('fail_generation', { p_task_id: taskId, p_user_id: userId });
  if (error) throw new HttpError(503, 'Unable to update your generation.');
};

export async function submitTask(db: Database, userId: string, body: Record<string, unknown>, env: Env) {
  if (!env.NANO_BANANA_API_KEY) throw new HttpError(503, 'Image generation is temporarily unavailable.');
  const input = validateGenerationInput(body, userId, env);
  const { data, error } = await db.rpc('reserve_generation', {
    p_user_id: userId, p_request_id: input.requestId, p_reference_url: input.referenceUrl,
    p_template_url: input.templateUrl, p_retry_of: input.retryOf,
  });
  if (error) {
    if (error.message === 'Insufficient quota') throw new HttpError(402, 'You do not have enough credits.', 'INSUFFICIENT_QUOTA');
    if (error.message === 'Retry unavailable') throw new HttpError(409, 'The free retry has already been used.', 'RETRY_UNAVAILABLE');
    if (error.message === 'Too many active generations') throw new HttpError(429, 'Please wait for your current images to finish.');
    if (error.message === 'Request mismatch') throw new HttpError(409, 'This request was already used for another image.');
    throw new HttpError(503, 'Unable to reserve a generation credit.');
  }
  const reservation = data as { created: boolean; task: GenerationTask };
  const task = reservation.task;
  if (!reservation.created) return { taskId: task.id, estimatedTime: 60 };

  // A reservation is submitted exactly once. Ambiguous network failures require
  // reconciliation, never a second provider request or an automatic credit refund.
  let providerId: string | undefined;
  try {
    const response = await fetch(`${PROVIDER_BASE}/images/generations`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.NANO_BANANA_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: generationModel(task.quality, env),
        prompt: "Create a realistic professional headshot. Use the first image as the exclusive source of identity, preserving the person's facial proportions, skin tone, age and gender. Use the second image only for background, clothing, lighting and framing; never transfer its facial features. Apply subtle natural retouching. Prioritize likeness and photographic realism.",
        size: '3:4', quality: task.quality, image_urls: [task.reference_url, task.template_url],
      }),
      signal: AbortSignal.timeout(25000),
    });
    if ([400, 401, 403, 404, 413, 422, 429].includes(response.status)) {
      await failTask(db, userId, task.id);
      return { taskId: task.id, estimatedTime: 60 };
    }
    if (!response.ok) throw new Error('Uncertain provider outcome');
    const provider = object(await response.json());
    if (typeof provider.id !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(provider.id)) throw new Error('Invalid provider response');
    providerId = provider.id;
    const { error: saveError } = await db.from('generation_tasks').update({
      provider_task_id: provider.id, status: 'processing', updated_at: new Date().toISOString(),
    }).eq('id', task.id).eq('user_id', userId);
    if (saveError) throw new Error('Unable to record provider task');
  } catch {
    const { error: markError } = await db.from('generation_tasks').update({
      status: providerId ? 'processing' : 'unknown',
      ...(providerId ? { provider_task_id: providerId } : {}), updated_at: new Date().toISOString(),
    }).eq('id', task.id).eq('user_id', userId).eq('status', 'submitting');
    if (markError) console.error('Generation requires reconciliation', { taskId: task.id, providerTaskId: providerId });
  }
  return { taskId: task.id, estimatedTime: 60 };
}

export async function queryTask(db: Database, userId: string, taskId: unknown, env: Env) {
  let task = await getTask(db, userId, taskId);
  let progress = 0;
  if (task.status === 'processing' && task.provider_task_id && Date.now() - Date.parse(task.updated_at) >= 2000) {
    if (!env.NANO_BANANA_API_KEY) throw new HttpError(503, 'Image generation is temporarily unavailable.');
    const response = await fetch(`${PROVIDER_BASE}/tasks/${encodeURIComponent(task.provider_task_id)}`, {
      headers: { Authorization: `Bearer ${env.NANO_BANANA_API_KEY}` }, signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new HttpError(502, 'Unable to check generation progress.');
    const provider = object(await response.json());
    if (!['pending', 'processing', 'completed', 'failed'].includes(String(provider.status))) throw new HttpError(502, 'Invalid generation response.');
    if (typeof provider.progress === 'number') progress = Math.min(99, Math.max(0, provider.progress));
    if (provider.status === 'failed') {
      await failTask(db, userId, task.id);
    } else {
      const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (provider.status === 'completed') {
        const result = Array.isArray(provider.results) ? provider.results[0] : undefined;
        if (typeof result !== 'string') throw new HttpError(502, 'The completed image is not available yet.');
        update.result_url = validateImageUrl(result, env).href;
        update.status = 'completed';
      }
      const { error } = await db.from('generation_tasks').update(update).eq('id', task.id).eq('status', 'processing');
      if (error) throw new HttpError(503, 'Unable to save generation progress.');
    }
    task = await getTask(db, userId, task.id);
  }
  return { id: task.id, status: task.status === 'completed' || task.status === 'failed' ? task.status : 'processing',
    progress: task.status === 'completed' ? 100 : progress,
    results: task.status === 'completed' && task.result_url ? [task.result_url] : undefined };
}
