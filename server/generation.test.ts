import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HEADSHOT_TEMPLATES } from '@/constants';
import { onRequestPost as generate } from '@/functions/api/nanoBanana';
import { onRequestPost as save } from '@/functions/api/save-generated-image';
import { onRequestGet as proxy } from '@/functions/api/proxy-image';
import { onRequestPost as gemini } from '@/functions/api/gemini';
import { generationModel, submitTask, validateGenerationInput, type GenerationTask } from './generation';
import type { getAdmin } from './http';

const userId = '11111111-1111-4111-8111-111111111111';
const taskId = '22222222-2222-4222-8222-222222222222';
const env = { VITE_SUPABASE_URL: 'https://project.supabase.co', NANO_BANANA_API_KEY: 'test-key' };
const input = { requestId: crypto.randomUUID(),
  referenceImageUrl: `${env.VITE_SUPABASE_URL}/storage/v1/object/public/user-uploads/${userId}/photo.jpg`,
  templateImageUrl: HEADSHOT_TEMPLATES[0].imageUrl };

describe('generation boundary and provider side effects', () => {
  const fetchMock = vi.fn();
  beforeEach(() => { vi.stubGlobal('fetch', fetchMock); fetchMock.mockReset(); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('rejects anonymous access to every paid or image endpoint before any network access', async () => {
    for (const handler of [generate, save, gemini]) {
      const response = await handler({ request: new Request('https://app.test/api/test', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}',
      }), env: {} });
      expect(response.status).toBe(401);
    }
    expect((await proxy({ request: new Request('https://app.test/api/proxy-image?url=https://evil.test'), env: {} })).status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects another user reference, arbitrary templates, and storage URL disguises', () => {
    expect(validateGenerationInput(input, userId, env).referenceUrl).toBe(input.referenceImageUrl);
    for (const referenceImageUrl of [
      input.referenceImageUrl.replace(userId, 'someone-else'),
      input.referenceImageUrl.replace('project.supabase.co', 'project.supabase.co.evil.test'),
      input.referenceImageUrl + '?url=https://evil.test',
      input.referenceImageUrl.replace('/photo.jpg', '/%2e%2e/other.jpg'),
    ]) expect(() => validateGenerationInput({ ...input, referenceImageUrl }, userId, env)).toThrow();
    expect(() => validateGenerationInput({ ...input, templateImageUrl: 'https://evil.test/a.jpg' }, userId, env)).toThrow();
  });

  it('uses a model that supports the purchased resolution', () => {
    expect(generationModel('1K', {})).toBe('nano-banana-2-lite');
    expect(generationModel('2K', {})).toBe('gemini-3.1-flash-image-preview');
  });

  const fixture = (created = true) => {
    const task: GenerationTask = { id: taskId, user_id: userId, provider_task_id: null,
      reference_url: input.referenceImageUrl, template_url: input.templateImageUrl, quality: '2K',
      status: 'submitting', result_url: null, saved_image: null, updated_at: new Date().toISOString() };
    const rpc = vi.fn().mockResolvedValue({ data: { created, task }, error: null });
    const updates: Record<string, unknown>[] = [];
    const chain = { eq: vi.fn(), then: undefined as unknown };
    chain.eq.mockReturnValue(chain);
    chain.then = (resolve: (value: unknown) => void) => resolve({ error: null });
    const db = { rpc, from: () => ({ update: (value: Record<string, unknown>) => { updates.push(value); return chain; } }) };
    return { db: db as unknown as ReturnType<typeof getAdmin>, rpc, updates };
  };

  it('never calls the provider for a repeated reservation', async () => {
    const { db } = fixture(false);
    expect(await submitTask(db, userId, input, env)).toMatchObject({ taskId });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('ignores client-selected quality and persists the provider task', async () => {
    const { db, updates } = fixture();
    fetchMock.mockResolvedValue(Response.json({ id: 'provider-task-1', status: 'pending' }));
    expect(await submitTask(db, userId, { ...input, quality: '4K' }, env)).toMatchObject({ taskId });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toMatchObject({ quality: '2K', model: 'gemini-3.1-flash-image-preview' });
    expect(updates[0]).toMatchObject({ provider_task_id: 'provider-task-1', status: 'processing' });
  });

  it('keeps an ambiguous provider outcome for reconciliation without retrying or refunding', async () => {
    const { db, rpc, updates } = fixture();
    fetchMock.mockRejectedValue(new TypeError('timeout'));
    expect(await submitTask(db, userId, input, env)).toMatchObject({ taskId });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(updates[0]).toMatchObject({ status: 'unknown' });
  });

  it('returns a confirmed rejection through the task and releases its credit once', async () => {
    const { db, rpc } = fixture();
    rpc.mockResolvedValueOnce({ data: { created: true, task: { id:taskId, quality:'2K',reference_url:input.referenceImageUrl,template_url:input.templateImageUrl } }, error:null })
      .mockResolvedValueOnce({ error:null });
    fetchMock.mockResolvedValue(new Response('invalid request', { status:400 }));
    await submitTask(db,userId,input,env);
    expect(rpc).toHaveBeenLastCalledWith('fail_generation',{ p_task_id:taskId,p_user_id:userId });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
