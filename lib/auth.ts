import { createClient } from '@supabase/supabase-js';
import type { VercelRequest } from '@vercel/node';

/**
 * 从请求头中提取并验证用户身份
 * @param req Vercel请求对象
 * @returns 用户ID（UUID格式），如果验证失败返回null
 */
export async function getUserIdFromRequest(req: VercelRequest): Promise<string | null> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      console.log('[Auth] No authorization header found');
      return null;
    }

    // 提取Bearer token
    const token = authHeader.replace('Bearer ', '').trim();

    if (!token) {
      console.log('[Auth] Empty token');
      return null;
    }

    // 创建Supabase客户端
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.VITE_SUPABASE_ANON_KEY!
    );

    // 验证token并获取用户信息
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error) {
      console.error('[Auth] Token validation error:', error.message);
      return null;
    }

    if (!user) {
      console.log('[Auth] No user found for token');
      return null;
    }

    console.log(`[Auth] User authenticated: ${user.id}`);
    return user.id;

  } catch (error) {
    console.error('[Auth] Unexpected error:', error);
    return null;
  }
}

/**
 * 验证用户是否已认证（用于受保护的端点）
 * @param req Vercel请求对象
 * @returns 用户ID，如果未认证抛出错误
 */
export async function requireAuth(req: VercelRequest): Promise<string> {
  const userId = await getUserIdFromRequest(req);

  if (!userId) {
    throw new Error('UNAUTHORIZED');
  }

  return userId;
}
