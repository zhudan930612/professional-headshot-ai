import type { GeneratedImage, HeadshotStyle, HeadshotTemplate } from '@/types';
import { getCurrentUser } from '@/services/authService';
import { downloadAndUploadGeneratedImage, uploadReferenceImage } from '@/services/uploadService';
import { generateHeadshotWithNanoBanana, GenerationRecoveryError, waitForTaskCompletion } from '@/services/nanoBananaAPI.secure';

export const recoverGeneration = async (
  taskId: string,
  sessionId: string,
  onProgress?: (progress: number) => void
): Promise<GeneratedImage[]> => {
  try {
    await waitForTaskCompletion(taskId, onProgress);
    return [await downloadAndUploadGeneratedImage(taskId, sessionId, 0)];
  } catch (error) {
    if (error instanceof Error && error.message.includes('credit has been returned')) throw error;
    throw new GenerationRecoveryError(taskId);
  }
};

/** The server determines quality, reserves quota and authorizes free retries. */
export const generateHeadshots = async (
  referenceImage: File,
  templates: HeadshotTemplate[],
  style: HeadshotStyle,
  userId: string,
  sessionId: string,
  referenceImageUrl?: string,
  onProgress?: (progress: number) => void,
  retryOfTaskId?: string
): Promise<GeneratedImage[]> => {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.id !== userId) {
    throw new Error('Please sign in to generate your headshots.');
  }
  const referenceUrl = referenceImageUrl ?? (await uploadReferenceImage(referenceImage, userId)).url;
  const images: GeneratedImage[] = [];
  for (const [index, template] of templates.entries()) {
    const result = await generateHeadshotWithNanoBanana({
      referenceImageUrl: referenceUrl,
      templateImageUrl: new URL(template.imageUrl, window.location.origin).href,
      retryOfTaskId,
    }, progress => onProgress?.((index * 100 + progress) / templates.length));
    try {
      images.push(await downloadAndUploadGeneratedImage(result.taskId, sessionId, index));
    } catch {
      throw new GenerationRecoveryError(result.taskId);
    }
  }
  return images;
};

export const generateSingleHeadshot = async (
  referenceImage: File,
  template: HeadshotTemplate,
  style: HeadshotStyle,
  userId: string,
  sessionId: string
): Promise<GeneratedImage> => {
  const results = await generateHeadshots(referenceImage, [template], style, userId, sessionId);
  if (!results[0]) throw new Error('No image was returned. Please try again.');
  return results[0];
};

export const generateHeadshotsBatch = async (
  referenceImage: File,
  templates: HeadshotTemplate[],
  style: HeadshotStyle,
  userId: string,
  sessionId: string,
  onProgress?: (completed: number, total: number) => void
): Promise<GeneratedImage[]> => {
  const results: GeneratedImage[] = [];
  for (const [index, template] of templates.entries()) {
    results.push(await generateSingleHeadshot(referenceImage, template, style, userId, `${sessionId}_${index}`));
    onProgress?.(index + 1, templates.length);
  }
  return results;
};
