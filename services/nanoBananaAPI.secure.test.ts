import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { generateHeadshotWithNanoBanana, queryTaskStatus, submitGenerationTask } from './nanoBananaAPI.secure';
import { getAuthorizationHeaders } from './authenticatedApi';

vi.mock('@/services/authenticatedApi', () => ({
  getAuthorizationHeaders: vi.fn(async () => ({ Authorization: 'Bearer test-token', 'Content-Type': 'application/json' })),
}));

describe('authenticated generation client', () => {
  const fetchMock = vi.fn();
  beforeEach(() => { vi.stubGlobal('fetch', fetchMock); fetchMock.mockReset(); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('reuses the request ID after a lost submit response', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('network error'))
      .mockResolvedValueOnce(Response.json({ taskId: 'task-1', estimatedTime: 5 }));
    await submitGenerationTask({ referenceImageUrl: 'https://storage.test/a.jpg', templateImageUrl: 'https://site.test/b.jpg' });
    const [first, second] = fetchMock.mock.calls;
    expect(first[0]).toBe('/api/nanoBanana');
    expect(first[1].headers.Authorization).toBe('Bearer test-token');
    expect(first[1].body).toBe(second[1].body);
    expect(JSON.parse(first[1].body).requestId).toMatch(/^[a-f\d-]{36}$/i);
  });

  it('sends ownership credentials when polling a task', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ id: 'task-1', status: 'processing', progress: 50 }));
    await queryTaskStatus('task-1');
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer test-token');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ action: 'queryStatus', taskId: 'task-1' });
  });

  it('retains the ledger task ID when both submit responses are lost', async () => {
    fetchMock.mockRejectedValue(new TypeError('network error'));
    const requestId = crypto.randomUUID();
    await expect(submitGenerationTask({ requestId, referenceImageUrl: 'https://storage.test/a.jpg', templateImageUrl: 'https://site.test/b.jpg' }))
      .rejects.toMatchObject({ name: 'GenerationRecoveryError', taskId: requestId });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('returns the task ID alongside the completed image for secure persistence and retries', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ taskId: 'task-1', estimatedTime: 5 }))
      .mockResolvedValueOnce(Response.json({ id: 'task-1', status: 'completed', progress: 100, results: ['https://output.test/a.png'] }));
    const result = await generateHeadshotWithNanoBanana({ referenceImageUrl: 'https://storage.test/a.jpg', templateImageUrl: 'https://site.test/b.jpg', retryOfTaskId: 'original-task' });
    expect(result).toEqual({ taskId: 'task-1', imageUrl: 'https://output.test/a.png' });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).retryOfTaskId).toBe('original-task');
  });

  it('does not expose a backend error body to the user', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ error: 'database secret detail' }, { status: 500 }));
    await expect(queryTaskStatus('task-1')).rejects.toThrow('temporarily unavailable');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not submit an anonymous generation request', async () => {
    vi.mocked(getAuthorizationHeaders).mockRejectedValueOnce(new Error('Please sign in to continue.'));
    await expect(submitGenerationTask({ referenceImageUrl: 'https://storage.test/a.jpg', templateImageUrl: 'https://site.test/b.jpg' })).rejects.toThrow('sign in');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
