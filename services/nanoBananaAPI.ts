/**
 * Nano Banana Pro API 集成
 * 文档：https://api.evolink.ai/v1
 */

const NANO_BANANA_API_BASE = 'https://api.evolink.ai/v1';
const NANO_BANANA_API_KEY = import.meta.env.VITE_NANO_BANANA_API_KEY;

// 验证环境变量
if (!NANO_BANANA_API_KEY) {
  throw new Error('❌ 缺少环境变量 VITE_NANO_BANANA_API_KEY，请在 .env.local 文件中配置');
}

/**
 * Nano Banana API 生成任务响应
 */
export interface NanoBananaTaskResponse {
  created: number;
  id: string;
  model: string;
  object: string;
  progress: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  results?: string[];
  error?: string;
  task_info: {
    can_cancel: boolean;
    estimated_time?: number;
  };
  type: string;
  usage?: {
    billing_rule: string;
    credits_reserved: number;
    user_group: string;
  };
}

/**
 * 生成请求参数
 */
export interface NanoBananaGenerationRequest {
  referenceImageUrl: string;  // 用户参考图 URL (Image 1)
  templateImageUrl: string;   // 模板图 URL (Image 2)
  prompt?: string;            // 可选的自定义 prompt
}

/**
 * 提交生成任务
 */
export async function submitGenerationTask(
  request: NanoBananaGenerationRequest
): Promise<{ taskId: string; estimatedTime: number }> {
  const defaultPrompt =
    "Generate a realistic professional headshot using the user's uploaded photos as the only source of identity. " +
    "Preserve the user's gender, facial features, face shape, skin tone, and overall likeness exactly, with no gender change or identity drift. " +
    "Use the selected reference example to define all non-identity elements, including background, lighting, color tone, composition, camera framing, depth of field, and overall photo style. " +
    "Adapt clothing, hairstyle, and grooming to match the reference example's professional look while remaining consistent with the user's preserved gender and facial identity. " +
    "Render in a realistic, high-quality photography style with natural skin texture, light retouching only, and no artistic filters. " +
    "The result should look like the same user photographed in the reference example's style, suitable for LinkedIn, resumes, and professional websites.";

  const requestBody = {
    model: "nano-banana-2-lite",
    prompt: request.prompt || defaultPrompt,
    size: "3:4",
    quality: "2K",
    image_urls: [
      request.referenceImageUrl,  // Image 1: 用户参考图
      request.templateImageUrl,   // Image 2: 模板图
    ],
  };

  console.log('🚀 提交 Nano Banana 生成任务:', {
    referenceImage: request.referenceImageUrl,
    templateImage: request.templateImageUrl,
  });

  try {
    const response = await fetch(`${NANO_BANANA_API_BASE}/images/generations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NANO_BANANA_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API 请求失败 (${response.status}): ${errorText}`);
    }

    const data: NanoBananaTaskResponse = await response.json();

    console.log('✅ 任务已提交:', {
      taskId: data.id,
      estimatedTime: data.task_info.estimated_time,
      status: data.status,
    });

    return {
      taskId: data.id,
      estimatedTime: data.task_info.estimated_time || 30,
    };
  } catch (error) {
    console.error('❌ 提交任务失败:', error);
    throw error;
  }
}

/**
 * 查询任务状态
 */
export async function queryTaskStatus(taskId: string): Promise<NanoBananaTaskResponse> {
  try {
    const response = await fetch(`${NANO_BANANA_API_BASE}/tasks/${taskId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${NANO_BANANA_API_KEY}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`查询任务失败 (${response.status}): ${errorText}`);
    }

    const data: NanoBananaTaskResponse = await response.json();
    return data;
  } catch (error) {
    console.error('❌ 查询任务失败:', error);
    throw error;
  }
}

/**
 * 轮询等待任务完成
 *
 * @param taskId 任务 ID
 * @param onProgress 进度回调（可选）
 * @param maxWaitTime 最大等待时间（毫秒），默认 120 秒
 * @returns 生成的图片 URL
 */
export async function waitForTaskCompletion(
  taskId: string,
  onProgress?: (progress: number) => void,
  maxWaitTime: number = 120000
): Promise<string> {
  const startTime = Date.now();
  const pollInterval = 2000; // 每 2 秒轮询一次

  console.log('⏳ 开始轮询任务状态:', taskId);

  while (true) {
    // 检查是否超时
    if (Date.now() - startTime > maxWaitTime) {
      throw new Error('Generation timeout, please try again later');
    }

    // 查询任务状态
    const taskStatus = await queryTaskStatus(taskId);

    console.log(`📊 任务进度: ${taskStatus.progress}% - 状态: ${taskStatus.status}`);

    // 调用进度回调
    if (onProgress) {
      onProgress(taskStatus.progress);
    }

    // 检查任务状态
    if (taskStatus.status === 'completed' && taskStatus.progress === 100) {
      if (!taskStatus.results || taskStatus.results.length === 0) {
        throw new Error('Generation completed but no image returned');
      }

      const imageUrl = taskStatus.results[0];
      console.log('✅ 生成完成:', imageUrl);
      return imageUrl;
    }

    if (taskStatus.status === 'failed') {
      // 统一使用通用错误消息，避免 [object Object] 问题
      const errorMessage = 'Image generation failed, please retry';

      // 在控制台记录详细错误供调试
      console.error('❌ Nano Banana 任务失败:', {
        taskId,
        error: taskStatus.error,
        errorType: typeof taskStatus.error
      });

      throw new Error(errorMessage);
    }

    // 等待后继续轮询
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }
}

/**
 * 一键生成（提交 + 等待完成）
 *
 * @param request 生成请求
 * @param onProgress 进度回调（可选）
 * @returns 生成的图片 URL
 */
export async function generateHeadshotWithNanoBanana(
  request: NanoBananaGenerationRequest,
  onProgress?: (progress: number) => void
): Promise<string> {
  // 1. 提交任务
  const { taskId, estimatedTime } = await submitGenerationTask(request);

  console.log(`⏱️ 预计等待时间: ${estimatedTime} 秒`);

  // 2. 等待完成
  const imageUrl = await waitForTaskCompletion(
    taskId,
    onProgress,
    Math.max(estimatedTime * 1000 * 2, 120000) // 最大等待时间为预估时间的2倍或120秒
  );

  return imageUrl;
}
