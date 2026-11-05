import type { CloudflareEnv } from './env';
import { ApiError, object, string } from './http';
import { mediaPath } from './media';
interface SessionRow { session_id: string; date: number; style: string; use_case: string }
interface ImageRow { session_id: string; image_id: string; url: string; jpg_url: string | null; storage_path: string | null; file_size: number | null; mime_type: string | null; created_at_timestamp: number; task_id: string | null }
export async function history(userId: string, cursor: string | null, env: CloudflareEnv) {
  const offset = cursor ? Number(cursor) : 0;
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > 100_000) throw new ApiError(400, 'Invalid history page.');
  const sessions = await env.DB.prepare('SELECT session_id,date,style,use_case FROM generation_sessions WHERE user_id=? ORDER BY date DESC,session_id LIMIT 50 OFFSET ?').bind(userId, offset).all<SessionRow>();
  const ids = sessions.results.map(s => s.session_id);
  const images = ids.length ? await env.DB.prepare(`SELECT i.* FROM generated_images i JOIN generation_sessions s ON s.session_id=i.session_id WHERE s.user_id=? AND i.session_id IN (${ids.map(() => '?').join(',')}) ORDER BY i.created_at_timestamp,i.image_id`).bind(userId, ...ids).all<ImageRow>() : { results: [] };
  return { items: sessions.results.map(s => ({ id: s.session_id, date: s.date, style: s.style, useCase: s.use_case,
    images: images.results.filter(i => i.session_id === s.session_id).map(i => {
      const isPlaceholder = /^https:\/\/picsum\.photos\//.test(i.url);
      return { id: i.image_id, url: isPlaceholder ? '' : i.url, jpgUrl: isPlaceholder ? undefined : i.jpg_url ?? undefined, isPlaceholder,
        storagePath: i.storage_path ?? undefined, fileSize: i.file_size ?? undefined, mimeType: i.mime_type ?? undefined, taskId: i.task_id ?? undefined, createdAt: i.created_at_timestamp };
    }) })), nextCursor: ids.length === 50 ? String(offset + 50) : null };
}
export async function saveHistory(userId: string, body: Record<string, unknown>, env: CloudflareEnv) {
  const id = string(body.id, 128);
  if (!/^[\w-]+$/.test(id) || !Number.isSafeInteger(body.date) || !Array.isArray(body.images) || body.images.length > 20) throw new ApiError(400, 'Invalid history record.');
  const owner = await env.DB.prepare('SELECT user_id FROM generation_sessions WHERE session_id=?').bind(id).first<{ user_id: string }>();
  if (owner && owner.user_id !== userId) throw new ApiError(404, 'History not found.');
  const now = new Date().toISOString();
  const statements = [env.DB.prepare('INSERT INTO generation_sessions(id,user_id,session_id,date,style,use_case,created_at) VALUES (?,?,?,?,?,?,?) ON CONFLICT(session_id) DO NOTHING')
    .bind(crypto.randomUUID(), userId, id, Number(body.date), string(body.style, 100), string(body.useCase, 100), now)];
  for (const value of body.images) {
    const image = object(value);
    const imageId = string(image.id, 128);
    const path = string(image.storagePath, 1024);
    const stored = await env.DB.prepare("SELECT * FROM storage_objects WHERE bucket='generated-headshots' AND source_key=? AND user_id=?").bind(path, userId).first<{ object_key: string; bytes: number; mime_type: string }>();
    if (!stored) throw new ApiError(404, 'Image not found.');
    const old = await env.DB.prepare('SELECT i.session_id,s.user_id FROM generated_images i JOIN generation_sessions s ON s.session_id=i.session_id WHERE i.image_id=?').bind(imageId).first<{ user_id: string; session_id: string }>();
    if (old && (old.user_id !== userId || old.session_id !== id)) throw new ApiError(409, 'Image already belongs to another history record.');
    statements.push(env.DB.prepare(`INSERT INTO generated_images(id,session_id,image_id,url,jpg_url,created_at_timestamp,created_at,storage_path,file_size,mime_type,task_id)
      SELECT ?,?,?,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM generation_sessions WHERE session_id=? AND user_id=?) ON CONFLICT(image_id) DO NOTHING`)
      .bind(crypto.randomUUID(), id, imageId, mediaPath(stored.object_key), mediaPath(stored.object_key), Number.isSafeInteger(image.createdAt) ? Number(image.createdAt) : Number(body.date), now, path, stored.bytes, stored.mime_type, typeof image.taskId === 'string' ? image.taskId : null, id, userId));
  }
  await env.DB.batch(statements);
  const owned = await env.DB.prepare('SELECT user_id FROM generation_sessions WHERE session_id=?').bind(id).first<{ user_id: string }>();
  if (owned?.user_id !== userId) throw new ApiError(409, 'History could not be saved.');
  if (body.images.length) {
    const imageIds = body.images.map(value => string(object(value).id, 128));
    const saved = await env.DB.prepare(`SELECT image_id FROM generated_images WHERE session_id=? AND image_id IN (${imageIds.map(() => '?').join(',')})`).bind(id, ...imageIds).all();
    if (saved.results.length !== new Set(imageIds).size) throw new ApiError(409, 'Some images could not be added to this history record.');
  }
  return { ok: true };
}
