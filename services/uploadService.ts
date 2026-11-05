import type { ReferenceImage, GeneratedImage } from '@/types';
import { api } from './apiClient';

export async function uploadReferenceImage(file: File, _userId: string): Promise<ReferenceImage> {
  const response = await fetch('/api/uploads', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': file.type || 'application/octet-stream' }, body: file });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(typeof body.error === 'string' ? body.error : 'Your photo could not be uploaded.');
  }
  return response.json();
}
export const downloadAndUploadGeneratedImage = async (taskId: string, sessionId: string, index: number): Promise<GeneratedImage> =>
  api('/api/save-generated-image', { method: 'POST', body: JSON.stringify({ taskId, sessionId, index }) });
