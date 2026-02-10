import type { VercelRequest, VercelResponse } from '@vercel/node';

const NANO_BANANA_API_BASE = 'https://api.evolink.ai/v1';
const NANO_BANANA_API_KEY = process.env.NANO_BANANA_API_KEY;

/**
 * 生成任务响应接口
 */
interface NanoBananaTaskResponse {
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
}

/**
 * 提交生成任务
 * @param referenceImageUrl 参考图 URL
 * @param templateImageUrl 模板图 URL
 * @param quality 生成质量 ('1K' 或 '2K'，默认 '2K')
 */
async function submitGenerationTask(
  referenceImageUrl: string,
  templateImageUrl: string,
  quality: '1K' | '2K' = '2K'
): Promise<{ taskId: string; estimatedTime: number }> {
  const defaultPrompt =
    "Generate a realistic professional headshot using the user's uploaded photo as the only and exclusive source of identity. " +
    "The final image must depict the exact same person, strictly preserving facial structure, face shape, facial proportions, eye spacing, jawline position, nose and lip shape, skin tone, age appearance, and overall facial balance, with no identity averaging, no face replacement, and no change to gender or age perception. " +
    "The reference example image must be used only to define non-identity visual style, including background environment, lighting direction and softness, color palette, camera framing, depth of field, and overall photographic quality, and must not transfer any facial traits, proportions, expression style, or age characteristics. " +
    "Apply subtle, professional-grade retouching only, including gentle skin smoothing, slight tone evening, and very mild facial contour refinement that does not alter facial width, jaw length, or natural facial impression. " +
    "Avoid beauty filters, exaggerated slimming, artificial symmetry, or aesthetic stylization. " +
    "Realism and identity accuracy must take absolute priority over cosmetic enhancement. " +
    "The result should look like the same person professionally photographed by a high-end portrait photographer, suitable for LinkedIn, resumes, and corporate profiles.";

  const requestBody = {
    model: 'nano-banana-2-lite',
    prompt: defaultPrompt,
    size: '3:4',
    quality: quality,  // 动态质量参数
    image_urls: [referenceImageUrl, templateImageUrl],
  };

  if (!NANO_BANANA_API_KEY) {
    throw new Error('API Key 未配置。请在 Vercel Dashboard → Settings → Environment Variables 中添加 NANO_BANANA_API_KEY');
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
        throw new Error(`API 认证失败 (403): ${errorText}`);
      }

      throw new Error(`API 请求失败 (${response.status}): ${errorText}`);
    }

    const data: NanoBananaTaskResponse = await response.json();

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
async function queryTaskStatus(taskId: string): Promise<NanoBananaTaskResponse> {
  if (!NANO_BANANA_API_KEY) {
    throw new Error('API Key 未配置');
  }

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
 */
async function waitForTaskCompletion(
  taskId: string,
  maxWaitTime: number = 180000
): Promise<string> {
  const startTime = Date.now();
  const pollInterval = 2000; // 每 2 秒轮询一次

  while (true) {
    // 检查是否超时
    if (Date.now() - startTime > maxWaitTime) {
      throw new Error('Generation timeout, please try again later');
    }

    // 查询任务状态
    const taskStatus = await queryTaskStatus(taskId);

    // 检查任务状态
    if (taskStatus.status === 'completed' && taskStatus.progress === 100) {
      if (!taskStatus.results || taskStatus.results.length === 0) {
        throw new Error('Generation completed but no image returned');
      }

      const imageUrl = taskStatus.results[0];
      return imageUrl;
    }

    if (taskStatus.status === 'failed') {
      throw new Error('Image generation failed, please retry');
    }

    // 等待后继续轮询
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }
}

/**
 * Serverless Function 处理器
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS 配置
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 处理 CORS preflight 请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 仅允许 POST 请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action, referenceImageUrl, templateImageUrl, quality = '2K' } = req.body;

    if (!action) {
      return res.status(400).json({ error: 'Missing action parameter' });
    }

    // 验证 quality 参数
    if (!['1K', '2K'].includes(quality)) {
      return res.status(400).json({ error: 'Invalid quality parameter' });
    }

    // 提交生成任务
    if (action === 'submitTask') {
      if (!referenceImageUrl || !templateImageUrl) {
        return res.status(400).json({ error: 'Missing image URLs' });
      }

      const result = await submitGenerationTask(
        referenceImageUrl,
        templateImageUrl,
        quality as '1K' | '2K'
      );
      return res.status(200).json(result);
    }

    // 查询任务状态
    if (action === 'queryStatus') {
      const taskId = req.body.taskId;
      if (!taskId) {
        return res.status(400).json({ error: 'Missing taskId parameter' });
      }

      const status = await queryTaskStatus(taskId);
      return res.status(200).json(status);
    }

    // 等待任务完成
    if (action === 'waitCompletion') {
      const taskId = req.body.taskId;
      if (!taskId) {
        return res.status(400).json({ error: 'Missing taskId parameter' });
      }

      const maxWaitTime = req.body.maxWaitTime || 180000;
      const imageUrl = await waitForTaskCompletion(taskId, maxWaitTime);
      return res.status(200).json({ imageUrl });
    }

    // 一键生成（提交 + 等待完成）
    if (action === 'generateHeadshot') {
      if (!referenceImageUrl || !templateImageUrl) {
        return res.status(400).json({ error: 'Missing image URLs' });
      }

      // 1. 提交任务
      const { taskId, estimatedTime } = await submitGenerationTask(
        referenceImageUrl,
        templateImageUrl,
        quality as '1K' | '2K'
      );

      // 2. 等待完成
      const maxWaitTime = Math.max(estimatedTime * 1000 * 2, 120000);
      const imageUrl = await waitForTaskCompletion(taskId, maxWaitTime);

      return res.status(200).json({ imageUrl, taskId });
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (error) {
    console.error('Nano Banana API Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ error: errorMessage });
  }
}
