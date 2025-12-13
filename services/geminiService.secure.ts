/**
 * Gemini AI 安全服务（通过 Serverless Function 调用）
 *
 * 此版本不直接暴露 API Key，而是通过 Vercel Serverless Function 调用 Gemini API。
 * 所有 API Key 都存储在服务器端环境变量中，不会被前端访问到。
 */

const getApiBaseUrl = (): string => {
  // 获取当前域名
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  // 降级到环境变量 (Vercel/生产环境)
  return import.meta.env.VITE_APP_URL || 'http://localhost:3000';
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
