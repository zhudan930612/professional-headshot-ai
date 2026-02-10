/**
 * Cloudflare Pages Function - Nano Banana AI 图片生成
 */

interface Env {
  NANO_BANANA_API_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  VITE_SUPABASE_URL: string;
}

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
  usage?: {
    billing_rule: 'per_call' | 'per_token' | 'per_second';
    credits_reserved: number;
    user_group: 'default' | 'vip';
  };
}

const NANO_BANANA_API_BASE = 'https://api.evolink.ai/v1';

/**
 * 提交生成任务
 */
async function submitGenerationTask(
  referenceImageUrl: string,
  templateImageUrl: string,
  quality: '1K' | '2K' | '4K',
  apiKey: string
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
    quality: quality,
    image_urls: [referenceImageUrl, templateImageUrl],
  };

  const response = await fetch(`${NANO_BANANA_API_BASE}/images/generations`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
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
}

/**
 * 查询任务状态
 */
async function queryTaskStatus(taskId: string, apiKey: string): Promise<NanoBananaTaskResponse> {
  const response = await fetch(`${NANO_BANANA_API_BASE}/tasks/${taskId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`查询任务失败 (${response.status}): ${errorText}`);
  }

  return await response.json();
}

/**
 * 轮询等待任务完成
 */
async function waitForTaskCompletion(
  taskId: string,
  apiKey: string,
  maxWaitTime: number = 180000
): Promise<string> {
  const startTime = Date.now();
  const pollInterval = 2000;

  while (true) {
    if (Date.now() - startTime > maxWaitTime) {
      throw new Error('Generation timeout, please try again later');
    }

    const taskStatus = await queryTaskStatus(taskId, apiKey);

    if (taskStatus.status === 'completed' && taskStatus.progress === 100) {
      if (!taskStatus.results || taskStatus.results.length === 0) {
        throw new Error('Generation completed but no image returned');
      }
      return taskStatus.results[0];
    }

    if (taskStatus.status === 'failed') {
      throw new Error('Image generation failed, please retry');
    }

    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }
}

/**
 * Cloudflare Pages Function 处理器
 */
export async function onRequestPost(context: {
  request: Request;
  env: Env;
}): Promise<Response> {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  try {
    const apiKey = context.env.NANO_BANANA_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API Key 未配置' }),
        { status: 500, headers: corsHeaders }
      );
    }

    const body = await context.request.json() as {
      action: string;
      referenceImageUrl?: string;
      templateImageUrl?: string;
      quality?: '1K' | '2K' | '4K';
      taskId?: string;
      maxWaitTime?: number;
    };

    const { action, referenceImageUrl, templateImageUrl, quality = '2K', taskId, maxWaitTime } = body;

    if (!action) {
      return new Response(
        JSON.stringify({ error: 'Missing action parameter' }),
        { status: 400, headers: corsHeaders }
      );
    }

    if (!['1K', '2K', '4K'].includes(quality)) {
      return new Response(
        JSON.stringify({ error: 'Invalid quality parameter, must be 1K, 2K or 4K' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // 提交生成任务
    if (action === 'submitTask') {
      if (!referenceImageUrl || !templateImageUrl) {
        return new Response(
          JSON.stringify({ error: 'Missing image URLs' }),
          { status: 400, headers: corsHeaders }
        );
      }

      const result = await submitGenerationTask(referenceImageUrl, templateImageUrl, quality as '1K' | '2K' | '4K', apiKey);
      return new Response(JSON.stringify(result), { status: 200, headers: corsHeaders });
    }

    // 查询任务状态
    if (action === 'queryStatus') {
      if (!taskId) {
        return new Response(
          JSON.stringify({ error: 'Missing taskId parameter' }),
          { status: 400, headers: corsHeaders }
        );
      }

      const status = await queryTaskStatus(taskId, apiKey);
      return new Response(JSON.stringify(status), { status: 200, headers: corsHeaders });
    }

    // 等待任务完成
    if (action === 'waitCompletion') {
      if (!taskId) {
        return new Response(
          JSON.stringify({ error: 'Missing taskId parameter' }),
          { status: 400, headers: corsHeaders }
        );
      }

      const imageUrl = await waitForTaskCompletion(taskId, apiKey, maxWaitTime || 180000);
      return new Response(JSON.stringify({ imageUrl }), { status: 200, headers: corsHeaders });
    }

    // 一键生成（提交 + 等待完成）
    if (action === 'generateHeadshot') {
      if (!referenceImageUrl || !templateImageUrl) {
        return new Response(
          JSON.stringify({ error: 'Missing image URLs' }),
          { status: 400, headers: corsHeaders }
        );
      }

      const { taskId: newTaskId, estimatedTime } = await submitGenerationTask(
        referenceImageUrl,
        templateImageUrl,
        quality as '1K' | '2K' | '4K',
        apiKey
      );

      const maxWait = Math.max(estimatedTime * 1000 * 2, 120000);
      const imageUrl = await waitForTaskCompletion(newTaskId, apiKey, maxWait);

      return new Response(
        JSON.stringify({ imageUrl, taskId: newTaskId }),
        { status: 200, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: corsHeaders }
    );
  } catch (error) {
    console.error('Nano Banana API Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * 处理 CORS preflight 请求
 */
export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
