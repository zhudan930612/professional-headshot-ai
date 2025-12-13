/**
 * Nano Banana Pro API 集成
 * 文档：https://api.evolink.ai/v1
 */

const NANO_BANANA_API_BASE = 'https://api.evolink.ai/v1';
const NANO_BANANA_API_KEY = import.meta.env.VITE_NANO_BANANA_API_KEY;

// 验证环境变量（仅在开发环境抛出错误，生产环境给出友好提示）
if (!NANO_BANANA_API_KEY) {
  if (import.meta.env.DEV) {
    throw new Error('❌ 缺少环境变量 VITE_NANO_BANANA_API_KEY，请在 .env.local 文件中配置');
  }
  console.error('❌ 缺少环境变量 VITE_NANO_BANANA_API_KEY');
  console.error('请在 Vercel Dashboard → Settings → Environment Variables 中添加 VITE_NANO_BANANA_API_KEY');
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
 * 验证 API Key 是否有效（通过简单的 API 调用测试）
 * 注意：此函数仅用于诊断，不用于实际生成
 */
export async function verifyAPIKey(): Promise<{ valid: boolean; message: string }> {
  if (!NANO_BANANA_API_KEY) {
    return {
      valid: false,
      message: 'API Key 未配置'
    };
  }

  try {
    // 尝试查询账户信息或任务列表来验证 API Key
    const response = await fetch(`${NANO_BANANA_API_BASE}/tasks`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${NANO_BANANA_API_KEY}`,
      },
    });

    if (response.status === 401 || response.status === 403) {
      return {
        valid: false,
        message: `API Key 无效 (${response.status})`
      };
    }

    if (response.ok) {
      return {
        valid: true,
        message: 'API Key 有效'
      };
    }

    return {
      valid: false,
      message: `API Key 验证失败 (${response.status})`
    };
  } catch (error) {
    return {
      valid: false,
      message: `验证过程出错: ${error instanceof Error ? error.message : '未知错误'}`
    };
  }
}

/**
 * 提交生成任务
 */
export async function submitGenerationTask(
  request: NanoBananaGenerationRequest
): Promise<{ taskId: string; estimatedTime: number }> {
  const defaultPrompt =
    "Generate a realistic professional headshot using the user's uploaded photo as the ONLY and EXCLUSIVE source of identity. " +
    "The final image must clearly depict the same person, strictly preserving facial structure, face shape, facial proportions, eye spacing, jawline softness, nose and lip shape, skin tone, age appearance, and overall facial balance, with no identity averaging, no facial slimming, and no professional smoothing. " +
    "Preserve the user's natural facial tension, expression tendency, and overall personal vibe, and do NOT introduce a forced smile or a standardized professional expression unless it is clearly present in the user's original photo. " +
    "The reference example image must be used ONLY to define non-identity visual style, including background environment, lighting direction and softness, color tone, camera framing, depth of field, and photographic quality. " +
    "Do NOT transfer or imitate any facial traits, proportions, expression style, emotional tone, or age characteristics from the reference image. " +
    "Clothing and hairstyle may follow the reference example's professional level, but must not alter the user's perceived age, personality, or facial impression. " +
    "Render the image in a realistic photography style with natural skin texture, minimal retouching only, no beauty filters, no stylization, and no aesthetic enhancement beyond realism. " +
    "If any conflict arises between professional polish and identity accuracy, identity accuracy must take absolute priority. " +
    "The result must look like the same user photographed in the reference setting, not a refined or idealized version of the person.";

  const requestBody = {
    model: "gemini-3-pro-image-preview",
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

  // 检查 API Key
  if (!NANO_BANANA_API_KEY) {
    const errorMsg = 'API Key 未配置。请在 Vercel Dashboard → Settings → Environment Variables 中添加 VITE_NANO_BANANA_API_KEY';
    console.error('❌', errorMsg);
    throw new Error(errorMsg);
  }

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
      let errorText = '';
      let errorJson: any = null;
      
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          errorJson = await response.json();
          errorText = JSON.stringify(errorJson);
        } else {
          errorText = await response.text();
        }
      } catch (e) {
        errorText = `无法读取错误响应: ${e}`;
      }
      
      // 提供更友好的错误提示
      if (response.status === 403) {
        console.error('❌ API 认证失败 (403 Forbidden)');
        console.error('API 响应:', errorText);
        console.error('可能的原因：');
        console.error('1. API Key 无效或已过期 - 请检查 API Key 是否正确');
        console.error('2. 账户余额不足 - 请检查 Nano Banana 账户余额');
        console.error('3. API Key 权限不足 - 确认 API Key 有生成图片的权限');
        console.error('4. 账户被限制 - 联系 API 提供商确认账户状态');
        console.error('5. API Key 格式错误 - 确认没有多余的空格或换行符');
        
        // 尝试从错误响应中提取更具体的信息
        const errorMessage = errorJson?.error?.message || errorJson?.message || errorText || 'API 认证失败';
        throw new Error(`API 认证失败 (403): ${errorMessage}`);
      }
      
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
