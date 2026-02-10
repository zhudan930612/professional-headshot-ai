/**
 * Cloudflare Pages Function - 图片代理下载
 * 用于绕过浏览器 CORS 限制，下载 Nano Banana API 返回的图片
 */

interface Env {
  // 暂无需要的环境变量
}

/**
 * 处理图片代理请求
 */
export async function onRequestGet(context: {
  request: Request;
  env: Env;
}): Promise<Response> {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    const url = new URL(context.request.url);
    const imageUrl = url.searchParams.get('url');

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing url parameter' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // 验证 URL 是否来自 evolink.ai
    if (!imageUrl.includes('evolink.ai')) {
      return new Response(
        JSON.stringify({ error: 'Invalid image URL' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('代理下载图片:', imageUrl);

    // 使用 Cloudflare Worker 下载图片（无 CORS 限制）
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Professional-Headshot-AI-Proxy/1.0',
      },
    });

    if (!response.ok) {
      console.error('下载图片失败:', response.status, response.statusText);
      return new Response(
        JSON.stringify({ 
          error: `Failed to download image: ${response.status} ${response.statusText}` 
        }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // 获取图片数据
    const imageBlob = await response.blob();
    const contentType = response.headers.get('Content-Type') || 'image/png';

    console.log('图片下载成功，大小:', imageBlob.size, 'bytes');

    // 返回图片，添加正确的 CORS 头
    return new Response(imageBlob, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      },
    });

  } catch (error) {
    console.error('代理下载图片错误:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
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
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
