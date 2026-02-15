/**
 * Cloudflare Pages Function - 保存生成的图片
 * 在服务器端下载 Nano Banana 生成的图片并上传到 Supabase Storage
 * 完全绕过浏览器 CORS 限制
 */

interface Env {
  VITE_SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

interface SaveImageRequest {
  imageUrl: string;
  userId: string;
  sessionId: string;
  index: number;
}

const GENERATED_IMAGES_BUCKET = 'generated-headshots';

/**
 * 处理保存图片请求
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
    // 验证环境变量
    if (!context.env.VITE_SUPABASE_URL || !context.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase environment variables');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: corsHeaders }
      );
    }

    // 解析请求
    const body = await context.request.json() as SaveImageRequest;
    const { imageUrl, userId, sessionId, index } = body;

    if (!imageUrl || !userId || !sessionId || index === undefined) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: corsHeaders }
      );
    }

    console.log('开始下载图片（服务器端）:', imageUrl);

    // 1. 在服务器端下载图片（无 CORS 限制）
    const imageResponse = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Professional-Headshot-AI/1.0',
      },
    });

    if (!imageResponse.ok) {
      console.error('下载图片失败:', imageResponse.status, imageResponse.statusText);
      return new Response(
        JSON.stringify({ 
          error: `Failed to download image: ${imageResponse.status} ${imageResponse.statusText}` 
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    const imageBlob = await imageResponse.blob();
    console.log('图片下载成功，大小:', imageBlob.size, 'bytes');

    // 2. 动态导入 Supabase 客户端（Cloudflare Functions 要求）
    const { createClient } = await import('@supabase/supabase-js');
    
    // 3. 初始化 Supabase 客户端（使用 service_role key）
    const supabase = createClient(
      context.env.VITE_SUPABASE_URL,
      context.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        db: { schema: 'headshot_ai' },
      }
    );

    // 4. 生成文件路径
    const timestamp = Date.now();
    const baseName = `${sessionId}_${index}`;
    const pngPath = `${userId}/${baseName}.png`;

    // 5. 上传 PNG 到 Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(GENERATED_IMAGES_BUCKET)
      .upload(pngPath, imageBlob, {
        cacheControl: '3600',
        upsert: false,
        contentType: 'image/png',
      });

    if (uploadError) {
      console.error('上传 PNG 失败:', uploadError);
      return new Response(
        JSON.stringify({ error: `Upload failed: ${uploadError.message}` }),
        { status: 500, headers: corsHeaders }
      );
    }

    // 6. 获取公开访问 URL
    const { data: { publicUrl: pngUrl } } = supabase.storage
      .from(GENERATED_IMAGES_BUCKET)
      .getPublicUrl(pngPath);

    console.log('PNG 上传成功:', pngUrl);

    // 7. 尝试生成并上传 JPG 版本（可选）
    let jpgUrl: string | undefined;
    
    try {
      // 注意：Cloudflare Workers 不支持 Canvas API
      // 这里我们跳过 JPG 转换，只上传原始 PNG
      // 如果需要 JPG，可以在前端展示时添加参数
      console.log('跳过 JPG 转换（在 Cloudflare Worker 环境）');
    } catch (err) {
      console.warn('JPG 转换失败，仅保留 PNG:', err);
    }

    // 8. 返回结果
    const result = {
      id: `gen_${timestamp}_${index}`,
      url: pngUrl,
      jpgUrl: jpgUrl || pngUrl,  // 回退到 PNG
      storagePath: pngPath,
      fileSize: imageBlob.size,
      mimeType: 'image/png',
      createdAt: timestamp,
    };

    console.log('✅ 图片保存成功');

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error('保存图片错误:', error);
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
