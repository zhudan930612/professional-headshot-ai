import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // 仅允许 POST 请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // CORS 配置 (如果需要)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { action, profession } = req.body;

    // 从服务器端环境变量获取 API Key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'API key not configured' });
    }

    const ai = new GoogleGenAI({ apiKey });

    // 根据不同的 action 执行不同操作
    if (action === 'generateTips' && profession) {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Give me 3 short, punchy tips for a professional headshot for a ${profession}.`,
      });
      return res.status(200).json({ result: response.text });
    }

    if (action === 'generateDescription') {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: "Describe a generic professional headshot for a business person in 10 words.",
      });
      return res.status(200).json({ result: response.text });
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (error) {
    console.error('Gemini API Error:', error);
    return res.status(500).json({ error: 'Failed to generate content' });
  }
}
