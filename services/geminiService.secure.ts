// 安全版本: 通过 Vercel Serverless Function 调用 Gemini API
// 使用此版本需要将文件重命名为 geminiService.ts 替换原文件

export const generateHeadshotTips = async (profession: string): Promise<string> => {
  try {
    const response = await fetch('/api/gemini', {
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
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.result || "No tips available.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Unable to generate tips at this moment.";
  }
};

export const generatePlaceholderImageDescription = async (): Promise<string> => {
  try {
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'generateDescription',
      }),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.result || "Professional business portrait";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Professional business portrait";
  }
};
