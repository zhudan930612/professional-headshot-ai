/**
 * Gemini AI 安全服务（通过 Serverless Function 调用）
 *
 * 此版本不直接暴露 API Key，而是通过 Vercel Serverless Function 调用 Gemini API。
 * 所有 API Key 都存储在服务器端环境变量中，不会被前端访问到。
 */

const getApiBaseUrl = (): string => {
  // 优先使用环境变量（生产环境）
  if (import.meta.env.VITE_APP_URL) {
    const envUrl = import.meta.env.VITE_APP_URL;
    // 确保环境变量 URL 格式正确
    if (envUrl.startsWith('http://') || envUrl.startsWith('https://')) {
      return envUrl;
    }
  }

  // 浏览器环境：验证 window.location.origin
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

  // 最终回退
  return 'http://localhost:3000';
};

/**
 * 生成头像建议（通过 Serverless Function）
 *
 * @param profession 职业
 * @returns 生成的建议文本
 */
export const generateHeadshotTips = async (profession: string): Promise<string> => {
  try {
    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/api/gemini`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'generateTips',
        profession,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Gemini API Error:', error);
      return "Unable to generate tips at this moment.";
    }

    const data = await response.json();
    return data.result || "No tips available.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Unable to generate tips at this moment.";
  }
};

/**
 * 生成占位图描述（通过 Serverless Function）
 *
 * @returns 生成的描述文本
 */
export const generatePlaceholderImageDescription = async (): Promise<string> => {
  try {
    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/api/gemini`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'generateDescription',
      }),
    });

    if (!response.ok) {
      console.error('Gemini API Error');
      return "Professional business portrait";
    }

    const data = await response.json();
    return data.result || "Professional business portrait";
  } catch (error) {
    console.error('Gemini API Error:', error);
    return "Professional business portrait";
  }
};
