import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { generateHeadshots, recoverGeneration } from './generationService';
import { generateHeadshotWithNanoBanana, waitForTaskCompletion } from './nanoBananaAPI.secure';
import { downloadAndUploadGeneratedImage } from './uploadService';
import { getCurrentUser } from '@/services/authService';
import { HeadshotStyle, type HeadshotTemplate } from '@/types';

vi.mock('@/services/authService', () => ({ getCurrentUser: vi.fn() }));
vi.mock('@/services/uploadService', () => ({
  uploadReferenceImage: vi.fn(async () => ({ url: 'https://storage.test/reference.jpg' })),
  downloadAndUploadGeneratedImage: vi.fn(),
}));
vi.mock('@/services/nanoBananaAPI.secure', async importOriginal => ({
  ...await importOriginal<typeof import('./nanoBananaAPI.secure')>(),
  generateHeadshotWithNanoBanana: vi.fn(),
  waitForTaskCompletion: vi.fn(),
}));

describe('generation persistence and recovery', () => {
  const template = { id: 'template-1', templateId: 'template-1', name: 'Office', label: 'Office', imageUrl: '/office.jpg', category: HeadshotStyle.General } satisfies HeadshotTemplate;
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('window', { location: { origin: 'https://headshots.test' } });
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 'user-1', email: null, user_metadata: {} });
    vi.mocked(generateHeadshotWithNanoBanana).mockResolvedValue({ taskId: 'task-1', imageUrl: 'https://output.test/a.jpg' });
    vi.mocked(downloadAndUploadGeneratedImage).mockResolvedValue({ id: 'image-1', taskId: 'task-1', url: 'https://storage.test/saved.jpg', createdAt: 1 });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('persists using only the server-owned task ID', async () => {
    const images = await generateHeadshots({ name: 'photo.jpg' } as File, [template], HeadshotStyle.General, 'user-1', 'session-1');
    expect(downloadAndUploadGeneratedImage).toHaveBeenCalledWith('task-1', 'session-1', 0);
    expect(images[0].taskId).toBe('task-1');
  });

  it('rejects a mismatched user before creating a billable task', async () => {
    await expect(generateHeadshots({} as File, [template], HeadshotStyle.General, 'other-user', 'session-1')).rejects.toThrow('sign in');
    expect(generateHeadshotWithNanoBanana).not.toHaveBeenCalled();
  });

  it('retains the task ID if durable image saving fails', async () => {
    vi.mocked(downloadAndUploadGeneratedImage).mockRejectedValueOnce(new TypeError('network error'));
    await expect(generateHeadshots({} as File, [template], HeadshotStyle.General, 'user-1', 'session-1')).rejects.toMatchObject({ taskId: 'task-1' });
  });

  it('recovers an existing generation without submitting a new task', async () => {
    vi.mocked(waitForTaskCompletion).mockResolvedValue('https://output.test/a.jpg');
    const images = await recoverGeneration('task-1', 'recovered-session');
    expect(generateHeadshotWithNanoBanana).not.toHaveBeenCalled();
    expect(waitForTaskCompletion).toHaveBeenCalledWith('task-1', undefined);
    expect(images[0].taskId).toBe('task-1');
  });
});
