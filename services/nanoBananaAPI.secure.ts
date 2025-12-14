/**
 * Nano Banana Pro API 安全集成（通过 Serverless Function 调用）
 *
 * 此版本不直接暴露 API Key，而是通过 Vercel Serverless Function 调用 Nano Banana API。
 * 所有 API Key 都存储在服务器端环境变量中，不会被前端访问到。
 * 
 * 文档：https://api.evolink.ai/v1
 */

const getApiBaseUrl = (): string => {
  // 优先使用 window.location.origin（运行时动态获取，确保正确）
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    // 验证 origin 是否有效（包含协议和主机名）
    if (origin && origin !== 'null' && origin.includes('://')) {
      return origin;
    }
    // 如果 origin 无效，从 window.location.href 解析
    try {
      const url = new URL(window.location.href);
      return `${url.protocol}//${url.host}`;
    } catch (e) {
      console.warn('Failed to parse window.location.href:', e);
    }
  }

  // 回退到环境变量（仅用于 SSR 或特殊情况）
  if (import.meta.env.VITE_APP_URL) {
    const envUrl = import.meta.env.VITE_APP_URL;
    if (envUrl.startsWith('http://') || envUrl.startsWith('https://')) {
      return envUrl;
    }
  }

  // 最终回退
  return 'http://localhost:3000';
};

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
  quality?: '1K' | '2K';      // 图片质量（新增）
}

/**
 * 提交生成任务
 */
export async function submitGenerationTask(
  request: NanoBananaGenerationRequest
): Promise<{ taskId: string; estimatedTime: number }> {
  const baseUrl = getApiBaseUrl();

  console.log('🚀 提交 Nano Banana 生成任务:', {
    referenceImage: request.referenceImageUrl,
    templateImage: request.templateImageUrl,
  });

  try {
    const response = await fetch(`${baseUrl}/api/nanoBanana`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'submitTask',
        referenceImageUrl: request.referenceImageUrl,
        templateImageUrl: request.templateImageUrl,
        quality: request.quality || '2K',  // 传递质量参数
      }),
    });

    if (!response.ok) {
      let errorText = '';
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorJson = await response.json();
          errorText = JSON.stringify(errorJson);
        } else {
          errorText = await response.text();
        }
      } catch (e) {
        errorText = `无法读取错误响应: ${e}`;
      }

      if (response.status === 403) {
        console.error('❌ API 认证失败 (403 Forbidden)');
        console.error('API 响应:', errorText);
        console.error('可能的原因：');
        console.error('1. API Key 无效或已过期 - 请检查 API Key 是否正确');
        console.error('2. 账户余额不足 - 请检查 Nano Banana 账户余额');
        console.error('3. API Key 权限不足 - 确认 API Key 有生成图片的权限');
        console.error('4. 账户被限制 - 联系 API 提供商确认账户状态');
        throw new Error(`API 认证失败 (403): ${errorText}`);
      }

      throw new Error(`API 请求失败 (${response.status}): ${errorText}`);
    }

    const data = await response.json();

    console.log('✅ 任务已提交:', {
      taskId: data.taskId,
      estimatedTime: data.estimatedTime,
    });

    return {
      taskId: data.taskId,
      estimatedTime: data.estimatedTime,
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
  const baseUrl = getApiBaseUrl();

  try {
    const response = await fetch(`${baseUrl}/api/nanoBanana`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'queryStatus',
        taskId,
      }),
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
 * @param maxWaitTime 最大等待时间（毫秒），默认 180 秒
 * @returns 生成的图片 URL
 */
export async function waitForTaskCompletion(
  taskId: string,
  onProgress?: (progress: number) => void,
  maxWaitTime: number = 180000
): Promise<string> {
  const baseUrl = getApiBaseUrl();
  const startTime = Date.now();

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
      const errorMessage = 'Image generation failed, please retry';
      console.error('❌ Nano Banana 任务失败:', {
        taskId,
        error: taskStatus.error,
      });
      throw new Error(errorMessage);
    }

    // 等待后继续轮询
    await new Promise(resolve => setTimeout(resolve, 2000));
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
