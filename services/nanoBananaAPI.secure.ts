import { getAuthorizationHeaders } from '@/services/authenticatedApi';

export interface NanoBananaTaskResponse {
  id: string;
  progress: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  results?: string[];
  error?: string;
}

export interface NanoBananaGenerationRequest {
  referenceImageUrl: string;
  templateImageUrl: string;
  quality?: '1K' | '2K' | '4K';
  requestId?: string;
  retryOfTaskId?: string;
}

export class GenerationRecoveryError extends Error {
  constructor(public readonly taskId: string) {
    super('Your generation is still available. Check its progress again without using another credit.');
    this.name = 'GenerationRecoveryError';
  }
}

const responseError = (status: number): Error => new Error(
  status === 401 ? 'Please sign in to continue.'
    : status === 402 ? 'You do not have enough credits. Please choose a plan.'
      : status === 403 ? 'This generation is not available for your account.'
        : 'The image service is temporarily unavailable. Please try again.'
);

export async function submitGenerationTask(
  request: NanoBananaGenerationRequest
): Promise<{ taskId: string; estimatedTime: number }> {
  const headers = await getAuthorizationHeaders();
  const requestId = request.requestId ?? crypto.randomUUID();
  const body = JSON.stringify({
    ...request,
    action: 'submitTask',
    requestId,
  });
  // A lost response must not create a second billable generation.
  let response: Response;
  try {
    response = await fetch('/api/nanoBanana', { method: 'POST', headers, body });
  } catch {
    try {
      response = await fetch('/api/nanoBanana', { method: 'POST', headers, body });
    } catch {
      // The ledger uses this UUID as its task ID, even if both responses are lost.
      throw new GenerationRecoveryError(requestId);
    }
  }
  if (!response.ok) throw responseError(response.status);
  const data = await response.json();
  if (typeof data.taskId !== 'string') throw new Error('Unable to start generation. Please try again.');
  return { taskId: data.taskId, estimatedTime: Number(data.estimatedTime) || 60 };
}

export async function queryTaskStatus(taskId: string): Promise<NanoBananaTaskResponse> {
  const response = await fetch('/api/nanoBanana', {
    method: 'POST',
    headers: await getAuthorizationHeaders(),
    body: JSON.stringify({ action: 'queryStatus', taskId }),
  });
  if (!response.ok) throw responseError(response.status);
  return response.json();
}

export async function waitForTaskCompletion(
  taskId: string,
  onProgress?: (progress: number) => void,
  maxWaitTime = 180000
): Promise<string> {
  const startTime = Date.now();
  while (Date.now() - startTime <= maxWaitTime) {
    const task = await queryTaskStatus(taskId);
    onProgress?.(task.progress);
    if (task.status === 'completed') {
      if (!task.results?.[0]) throw new Error('Generation completed but no image was returned.');
      return task.results[0];
    }
    if (task.status === 'failed') throw new Error('Image generation failed. Your credit has been returned.');
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  throw new Error('Generation is taking longer than expected. Please check again later.');
}

export async function generateHeadshotWithNanoBanana(
  request: NanoBananaGenerationRequest,
  onProgress?: (progress: number) => void
): Promise<{ imageUrl: string; taskId: string }> {
  const { taskId, estimatedTime } = await submitGenerationTask(request);
  try {
    const imageUrl = await waitForTaskCompletion(taskId, onProgress, Math.max(estimatedTime * 2000, 180000));
    return { imageUrl, taskId };
  } catch (error) {
    if (error instanceof Error && error.message.includes('credit has been returned')) throw error;
    throw new GenerationRecoveryError(taskId);
  }
}
