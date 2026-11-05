import type { CloudflareEnv } from './env';
import { HEADSHOT_TEMPLATES } from '@/constants';
import { ApiError, object, string, uuid, sha256 } from './http';
import { fetchResult, mediaKey, mediaPath, signedMediaUrl, validateResultUrl } from './media';
import { subscriptionOrder } from './account';

interface Task {
  id: string; user_id: string; subscription_id: string; request_id: string;
  reference_key: string; template_key: string; quality: string; charged: number;
  retry_of: string | null; status: string; provider_task_id: string | null;
  result_url: string | null; saved_image: string | null; created_at: string; updated_at: string;
}
const providerBase = 'https://api.evolink.ai/v1';
export async function taskFor(userId: string, taskId: unknown, env: CloudflareEnv): Promise<Task> {
  const task = await env.DB.prepare('SELECT * FROM generation_tasks WHERE id=? AND user_id=?').bind(uuid(taskId), userId).first<Task>();
  if (!task) throw new ApiError(404, 'Generation not found.');
  return task;
}
export async function reserveGeneration(userId: string, body: Record<string, unknown>, origin: string, env: CloudflareEnv) {
  const id = uuid(body.requestId);
  const referenceKey = mediaKey(string(body.referenceImageUrl), origin);
  const templateKey = mediaKey(string(body.templateImageUrl), origin);
  if (!referenceKey.startsWith(`user-uploads/${userId}/`)) throw new ApiError(403, 'Please upload your own reference image.');
  const allowed = new Set(HEADSHOT_TEMPLATES.map(t => mediaKey(t.imageUrl, origin)));
  if (!allowed.has(templateKey)) throw new ApiError(400, 'Please select an available template.');
  const owned = await env.DB.prepare('SELECT 1 FROM storage_objects WHERE object_key=? AND user_id=?').bind(referenceKey, userId).first();
  if (!owned) throw new ApiError(403, 'Please upload your own reference image.');
  const retryOf = body.retryOfTaskId == null ? null : uuid(body.retryOfTaskId);
  const matchExisting = async () => {
    const old = await env.DB.prepare('SELECT * FROM generation_tasks WHERE id=?').bind(id).first<Task>();
    if (!old) return null;
    if (old.user_id !== userId || old.reference_key !== referenceKey || old.template_key !== templateKey || old.retry_of !== retryOf) throw new ApiError(409, 'This request was used for another image.');
    return { task: old, created: false };
  };
  const existing = await matchExisting();
  if (existing) return existing;
  const now = new Date().toISOString();
  try {
    const insert = retryOf
      ? env.DB.prepare(`INSERT INTO generation_tasks(id,request_id,user_id,subscription_id,reference_key,template_key,quality,charged,retry_of,status,created_at,updated_at)
          SELECT ?,?,?,subscription_id,?,?,quality,0,?,'submitting',?,? FROM generation_tasks WHERE id=? AND user_id=? AND charged=1 AND status='completed' AND template_key=?`)
        .bind(id, id, userId, referenceKey, templateKey, retryOf, now, now, retryOf, userId, templateKey)
      : env.DB.prepare(`INSERT INTO generation_tasks(id,request_id,user_id,subscription_id,reference_key,template_key,quality,charged,retry_of,status,created_at,updated_at)
          SELECT ?,?,?,s.id,?,?,p.quality,1,NULL,'submitting',?,? FROM user_subscriptions s JOIN subscription_plans p ON p.id=s.plan_type
          WHERE s.user_id=? AND s.status='active' AND (s.expires_at IS NULL OR julianday(s.expires_at)>julianday('now')) AND s.used_quota<s.purchased_quota+s.bonus_quota
          ORDER BY ${subscriptionOrder.replaceAll('created_at', 's.created_at')} LIMIT 1`)
        .bind(id, id, userId, referenceKey, templateKey, now, now, userId);
    const results = await env.DB.batch([
      env.DB.prepare(`INSERT INTO user_subscriptions(id,user_id,plan_type,status,purchased_quota,bonus_quota,used_quota,subscribed_at,created_at,updated_at,currency)
        SELECT ?,?,'free','active',quota,bonus_quota,0,?,?,?,'USD' FROM subscription_plans WHERE id='free' AND NOT EXISTS(SELECT 1 FROM user_subscriptions WHERE user_id=?)`)
        .bind(crypto.randomUUID(), userId, now, now, now, userId),
      insert,
    ]);
    if (!results[1].meta.changes) throw new ApiError(retryOf ? 409 : 402, retryOf ? 'The free retry is unavailable.' : 'You do not have enough credits.');
  } catch (error) {
    const raced = await matchExisting();
    if (raced) return raced;
    if (error instanceof ApiError) throw error;
    const message = error instanceof Error ? error.message : '';
    if (message.includes('Too many active')) throw new ApiError(429, 'Please wait for your current images to finish.');
    if (retryOf) throw new ApiError(409, 'The free retry is unavailable.');
    if (message.includes('Insufficient quota')) throw new ApiError(402, 'You do not have enough credits.');
    throw error;
  }
  return { task: await taskFor(userId, id, env), created: true };
}
async function failTask(task: Task, env: CloudflareEnv) {
  await env.DB.prepare("UPDATE generation_tasks SET status='failed',updated_at=? WHERE id=? AND user_id=? AND status IN ('submitting','processing','unknown')")
    .bind(new Date().toISOString(), task.id, task.user_id).run();
}
export async function submitGeneration(userId: string, body: Record<string, unknown>, origin: string, env: CloudflareEnv) {
  if (!env.NANO_BANANA_API_KEY) throw new ApiError(503, 'Image generation is temporarily unavailable.');
  // Prepare the provider input before reserving a credit; no outbound paid call here.
  const referenceKey = mediaKey(string(body.referenceImageUrl), origin);
  const referenceUrl = await signedMediaUrl(referenceKey, env);
  const reservation = await reserveGeneration(userId, body, origin, env);
  const task = reservation.task;
  if (!reservation.created) return { taskId: task.id, estimatedTime: 60 };
  let providerId: string | undefined;
  try {
    const response = await fetch(`${providerBase}/images/generations`, {
      method: 'POST', headers: { Authorization: `Bearer ${env.NANO_BANANA_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: task.quality === '1K' ? (env.NANO_BANANA_MODEL_1K || 'nano-banana-2-lite') : (env.NANO_BANANA_MODEL_2K || 'gemini-3.1-flash-image-preview'),
        prompt: "Create a realistic professional headshot. Use the first image as the exclusive source of identity, preserving facial proportions, skin tone, age and gender. Use the second image only for clothing, background, lighting and framing; never transfer its facial features. Prioritize likeness and photographic realism.",
        size: '3:4', quality: task.quality, image_urls: [referenceUrl, new URL(mediaPath(task.template_key), env.APP_URL).href] }), signal: AbortSignal.timeout(25_000),
    });
    if ([400, 401, 403, 404, 413, 422, 429].includes(response.status)) { await failTask(task, env); return { taskId: task.id, estimatedTime: 60 }; }
    if (!response.ok) throw new Error('Uncertain provider outcome');
    const data = object(await response.json());
    if (typeof data.id !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(data.id)) throw new Error('Invalid task response');
    providerId = data.id;
    await env.DB.prepare("UPDATE generation_tasks SET status='processing',provider_task_id=?,updated_at=? WHERE id=? AND status='submitting'")
      .bind(providerId, new Date().toISOString(), task.id).run();
  } catch {
    try {
      await env.DB.prepare("UPDATE generation_tasks SET status=?,provider_task_id=?,updated_at=? WHERE id=? AND status='submitting'")
        .bind(providerId ? 'processing' : 'unknown', providerId ?? null, new Date().toISOString(), task.id).run();
    } catch { console.error('Generation requires reconciliation', { taskId: task.id, providerTaskId: providerId }); }
  }
  return { taskId: task.id, estimatedTime: 60 };
}
export async function queryGeneration(userId: string, taskId: unknown, env: CloudflareEnv) {
  let task = await taskFor(userId, taskId, env);
  let progress = 0;
  if (task.status === 'processing' && task.provider_task_id && Date.now() - Date.parse(task.updated_at) >= 2000) {
    // Claim a short polling slot so concurrent browser requests do not amplify provider calls.
    const claimed = await env.DB.prepare("UPDATE generation_tasks SET updated_at=? WHERE id=? AND status='processing' AND updated_at=? RETURNING id")
      .bind(new Date().toISOString(), task.id, task.updated_at).first();
    if (claimed) {
      const response = await fetch(`${providerBase}/tasks/${encodeURIComponent(task.provider_task_id)}`, { headers: { Authorization: `Bearer ${env.NANO_BANANA_API_KEY}` }, signal: AbortSignal.timeout(15_000) });
      if (!response.ok) throw new ApiError(502, 'Unable to check generation progress.');
      const result = object(await response.json());
      if (typeof result.progress === 'number') progress = Math.max(0, Math.min(99, result.progress));
      if (result.status === 'failed') await failTask(task, env);
      else if (result.status === 'completed') {
        const url = Array.isArray(result.results) ? result.results[0] : null;
        if (typeof url !== 'string') throw new ApiError(502, 'Your image is not available yet.');
        await env.DB.prepare("UPDATE generation_tasks SET status='completed',result_url=?,updated_at=? WHERE id=? AND status='processing'")
          .bind(validateResultUrl(url, env).href, new Date().toISOString(), task.id).run();
      } else if (!['pending', 'processing'].includes(String(result.status))) throw new ApiError(502, 'Unable to check generation progress.');
      task = await taskFor(userId, task.id, env);
    }
  }
  return { id: task.id, status: ['completed', 'failed'].includes(task.status) ? task.status : 'processing', progress: task.status === 'completed' ? 100 : progress,
    results: task.status === 'completed' ? [`/api/proxy-image?taskId=${task.id}`] : undefined };
}
export async function saveGenerated(userId: string, taskId: unknown, env: CloudflareEnv) {
  const task = await taskFor(userId, taskId, env);
  if (task.saved_image) return JSON.parse(task.saved_image);
  if (task.status !== 'completed' || !task.result_url) throw new ApiError(409, 'Your image is not ready yet.');
  const image = await fetchResult(task.result_url, env);
  const sourceKey = `${userId}/${task.id}.${image.extension}`;
  const key = `generated-headshots/${sourceKey}`;
  const now = new Date().toISOString();
  await env.PHOTOS.put(key, image.bytes, { httpMetadata: { contentType: image.mime } });
  const saved = { id: task.id, taskId: task.id, url: mediaPath(key), jpgUrl: mediaPath(key), storagePath: sourceKey, mimeType: image.mime, fileSize: image.bytes.length, createdAt: Date.parse(task.updated_at) };
  await env.DB.batch([
    env.DB.prepare('INSERT INTO storage_objects(object_key,bucket,source_key,user_id,bytes,mime_type,sha256,created_at) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(object_key) DO NOTHING')
      .bind(key, 'generated-headshots', sourceKey, userId, image.bytes.length, image.mime, await sha256(image.bytes), now),
    env.DB.prepare('UPDATE generation_tasks SET saved_image=? WHERE id=? AND user_id=?').bind(JSON.stringify(saved), task.id, userId),
  ]);
  return saved;
}
