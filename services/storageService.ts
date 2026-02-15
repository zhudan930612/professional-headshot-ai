import { GenerationSession, UserQuota, GeneratedImage, QuotaInfo, UserSubscription } from '../types';
import { supabase } from '../lib/supabase';

const HISTORY_KEY = 'ai_headshot_history';
const QUOTA_KEY = 'ai_headshot_quota';
const USER_ID_KEY = 'ai_headshot_user_id';

// 获取登录用户 ID（用户必须已登录才能生成图片）
const getUserId = async (): Promise<string | null> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) {
      return session.user.id;
    }
  } catch (error) {
    console.error('获取 Supabase 会话失败:', error);
  }
  return null;
};

export const getHistory = async (): Promise<GenerationSession[]> => {
  try {
    const userId = await getUserId();
    if (!userId) {
      console.log('[getHistory] 用户未登录，返回空历史');
      return [];
    }
    console.log('[getHistory] 正在获取用户历史记录, userId:', userId);

    // 1. 获取用户所有会话
    const { data: sessions, error: sessionError } = await supabase
      .from('generation_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (sessionError) {
      console.error('[getHistory] 获取会话失败:', sessionError);
      throw sessionError;
    }

    if (!sessions || sessions.length === 0) {
      console.log('[getHistory] 没有找到任何会话');
      return [];
    }
    console.log('[getHistory] 找到会话数量:', sessions.length);

    // 2. 获取这些会话的所有图片
    const sessionIds = sessions.map(s => s.session_id);
    const { data: images, error: imagesError } = await supabase
      .from('generated_images')
      .select('session_id, image_id, url, jpg_url, storage_path, file_size, mime_type, created_at_timestamp')
      .in('session_id', sessionIds);

    if (imagesError) {
      console.error('[getHistory] 获取图片失败:', imagesError);
      throw imagesError;
    }
    console.log('[getHistory] 找到图片数量:', images?.length || 0);

    // 3. 按 session_id 分组图片
    const imagesBySession = new Map<string, any[]>();
    images?.forEach(img => {
      const list = imagesBySession.get(img.session_id) || [];
      list.push(img);
      imagesBySession.set(img.session_id, list);
    });

    // 4. 转换为应用格式
    const history: GenerationSession[] = sessions.map((session: any) => ({
      id: session.session_id,
      date: session.date,
      style: session.style,
      useCase: session.use_case,
      images: (imagesBySession.get(session.session_id) || []).map((img: any) => ({
        id: img.image_id,
        url: img.url,
        createdAt: img.created_at_timestamp,
        storagePath: img.storage_path,
        fileSize: img.file_size,
        mimeType: img.mime_type,
        jpgUrl: img.jpg_url,
      })),
    }));

    // 过滤掉没有图片的会话
    const filteredHistory = history.filter(s => s.images.length > 0);
    console.log('[getHistory] 返回会话数量（有图片的）:', filteredHistory.length);

    return filteredHistory;
  } catch (e) {
    console.error('[getHistory] Error fetching history from Supabase:', e);
    return [];
  }
};

export const saveSession = async (session: GenerationSession): Promise<void> => {
  // 用户必须已登录才能生成图片，所以直接保存到数据库
  try {
    const userId = await getUserId();
    if (!userId) {
      console.error('[saveSession] 用户未登录，无法保存');
      throw new Error('User ID not available');
    }
    console.log('[saveSession] 开始保存会话, userId:', userId, 'sessionId:', session.id);

    // 准备会话数据（不包含参考图信息，参考图不保存到数据库）
    const sessionData: any = {
      user_id: userId,
      session_id: session.id,
      date: session.date,
      style: session.style,
      use_case: session.useCase,
    };

    // 保存会话到 Supabase
    console.log('[saveSession] 保存会话数据:', sessionData);
    const { error: sessionError } = await supabase
      .from('generation_sessions')
      .insert(sessionData);

    if (sessionError) {
      console.error('[saveSession] 保存会话失败:', sessionError);
      throw sessionError;
    }
    console.log('[saveSession] 会话保存成功');

    // 保存图片到 Supabase（包含存储路径等元数据）
    if (session.images && session.images.length > 0) {
      console.log('[saveSession] 保存图片数量:', session.images.length);
      const imageRecords = session.images.map(img => ({
        session_id: session.id,
        image_id: img.id,
        url: img.url,
        created_at_timestamp: img.createdAt,
        storage_path: img.storagePath,
        file_size: img.fileSize,
        mime_type: img.mimeType,
        jpg_url: img.jpgUrl,
      }));
      console.log('[saveSession] 图片记录:', imageRecords);

      const { error: imagesError } = await supabase
        .from('generated_images')
        .insert(imageRecords);

      if (imagesError) {
        console.error('[saveSession] 保存图片失败:', imagesError);
        throw imagesError;
      }
      console.log('[saveSession] ✅ 图片保存成功');
    } else {
      console.log('[saveSession] 没有图片需要保存');
    }
  } catch (e) {
    console.error('[saveSession] Error saving session to Supabase:', e);
    throw e;
  }
};

// getQuota() 函数已删除 - user_quotas 表已废弃，使用 getUserQuotaInfo() 代替

/**
 * @deprecated 已废弃：现在所有用户都使用永久配额系统，不再使用每日配额
 * 请使用 decrementQuota() 函数代替
 */
export const incrementQuota = async (amount: number): Promise<boolean> => {
  console.warn('incrementQuota() is deprecated. All users now use permanent quota system.');
  return true;
};

export const getRemainingQuota = async (): Promise<number> => {
  try {
    // 首先检查用户是否登录
    const userId = await getUserId();
    if (!userId) {
      // 未登录用户返回 0（新系统不支持未登录用户）
      return 0;
    }

    const quotaInfo = await getUserQuotaInfo();
    return quotaInfo.remaining_quota;
  } catch (error) {
    console.error('获取剩余配额失败:', error);
    // 默认返回 0，不再回退到每日配额系统
    return 0;
  }
};

/**
 * 获取用户完整配额信息（支持订阅系统）
 * 所有用户（包括免费用户）都返回永久配额信息
 */
export const getUserQuotaInfo = async (): Promise<QuotaInfo> => {
  const userId = await getUserId();
  if (!userId) {
    throw new Error('用户未登录');
  }

  try {
    // RPC functions are defined in `public`; table reads/writes stay in `headshot_ai`.
    const { data, error } = await supabase
      .schema('public')
      .rpc('get_user_quota_info', { p_user_id: userId });

    if (error) throw error;

    return data as QuotaInfo;
  } catch (error) {
    console.error('获取配额信息失败:', error);
    // 兜底：返回免费配额，避免页面完全空白
    return {
      plan_type: 'free',
      total_quota: 0,
      used_quota: 0,
      remaining_quota: 0,
      is_paid: false,
      quality: '1K',
      has_watermark: true,
    } as QuotaInfo;
  }
};

/**
 * 扣减配额（支持订阅系统，重试不扣减）
 */
export const decrementQuota = async (
  amount: number = 1,
  isRetry: boolean = false
): Promise<{ success: boolean; remaining: number }> => {
  const userId = await getUserId();
  console.log('[decrementQuota] 🎯 开始扣减配额', { userId, amount, isRetry });

  if (!userId) {
    throw new Error('用户未登录');
  }

  // 重试请求不扣减配额
  if (isRetry) {
    console.log('[decrementQuota] ⏭️ 重试请求，不扣减配额');
    try {
      const remaining = await getRemainingQuota();
      console.log('[decrementQuota] ✅ 重试返回剩余配额:', remaining);
      return { success: true, remaining };
    } catch (e) {
      console.error('[decrementQuota] ❌ 重试获取配额失败:', e);
      return { success: true, remaining: 0 };
    }
  }

  try {
    console.log('[decrementQuota] 📡 调用 RPC 函数...', {
      function: 'decrement_subscription_quota_safe',
      params: { p_user_id: userId, p_amount: amount, p_is_retry: isRetry }
    });

    const { data, error } = await supabase
      .schema('public')
      .rpc('decrement_subscription_quota_safe', {
        p_user_id: userId,
        p_amount: amount,
        p_is_retry: isRetry
      });

    console.log('[decrementQuota] 📥 RPC 原始返回:', { data, error });

    if (error) {
      console.error('[decrementQuota] ❌ RPC 调用返回错误:', error);
      throw error;
    }

    if (!data) {
      console.error('[decrementQuota] ❌ RPC 返回 null/undefined');
      throw new Error('RPC 函数未返回数据');
    }

    const result = {
      success: data.success,
      remaining: data.remaining
    };

    console.log('[decrementQuota] ✅ 配额扣减结果:', result);
    console.log('[decrementQuota] 📊 扣减前后对比:', {
      扣减数量: amount,
      扣减后剩余: data.remaining,
      是否成功: data.success
    });

    return result;
  } catch (error) {
    console.error('[decrementQuota] ❌ 扣减配额失败:', error);
    console.error('[decrementQuota] ❌ 错误详情:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
};

/**
 * 将本地历史记录迁移到数据库（登录后调用）
 * @param userId 用户 ID
 */
export const migrateLocalHistoryToDatabase = async (userId: string): Promise<void> => {
  try {
    // 读取本地历史记录
    const data = localStorage.getItem(HISTORY_KEY);
    if (!data) {
      console.log('📦 没有本地历史记录需要迁移');
      return;
    }

    const localHistory: GenerationSession[] = JSON.parse(data);
    if (localHistory.length === 0) {
      console.log('📦 本地历史记录为空，无需迁移');
      return;
    }

    console.log(`📦 开始迁移 ${localHistory.length} 条本地历史记录到数据库...`);

    // 检查数据库中已存在的 session_id，避免重复插入
    const { data: existingSessions } = await supabase
      .from('generation_sessions')
      .select('session_id')
      .eq('user_id', userId);

    const existingSessionIds = new Set(
      existingSessions?.map((s: any) => s.session_id) || []
    );

    // 过滤出需要迁移的会话（不在数据库中的）
    const sessionsToMigrate = localHistory.filter(
      session => !existingSessionIds.has(session.id)
    );

    if (sessionsToMigrate.length === 0) {
      console.log('✅ 所有本地历史记录已存在于数据库中');
      // 清空本地历史记录（已迁移完成）
      localStorage.removeItem(HISTORY_KEY);
      return;
    }

    console.log(`📤 迁移 ${sessionsToMigrate.length} 条新会话...`);

    // 批量迁移会话
    for (const session of sessionsToMigrate) {
      try {
        // 只插入必需字段，避免数据库 schema 不匹配
        const sessionData: any = {
          user_id: userId,
          session_id: session.id,
          date: session.date,
          style: session.style,
          use_case: session.useCase,
        };

        const { error: sessionError } = await supabase
          .from('generation_sessions')
          .insert(sessionData);

        if (sessionError) {
          console.error(`❌ 迁移会话 ${session.id} 失败:`, sessionError);
          continue;
        }

        // 迁移图片（只插入必需字段）
        if (session.images && session.images.length > 0) {
          const imageRecords = session.images.map(img => ({
            session_id: session.id,
            image_id: img.id,
            url: img.url,
            created_at_timestamp: img.createdAt,
            storage_path: img.storagePath,
            file_size: img.fileSize,
            mime_type: img.mimeType,
            jpg_url: img.jpgUrl,
          }));

          const { error: imagesError } = await supabase
            .from('generated_images')
            .insert(imageRecords);

          if (imagesError) {
            console.error(`❌ 迁移会话 ${session.id} 的图片失败:`, imagesError);
          }
        }
      } catch (error) {
        console.error(`❌ 迁移会话 ${session.id} 时出错:`, error);
      }
    }

    console.log('✅ 本地历史记录迁移完成');
    // 迁移成功后，清空本地历史记录
    localStorage.removeItem(HISTORY_KEY);
  } catch (error) {
    console.error('❌ 迁移本地历史记录失败:', error);
    // 迁移失败时不删除本地数据，保留作为备份
  }
};

// Mock Image Generation Service
export const mockGenerateImages = async (count: number): Promise<GeneratedImage[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const images: GeneratedImage[] = Array.from({ length: count }).map((_, i) => ({
        id: Math.random().toString(36).substr(2, 9),
        // Using picsum with different seeds to simulate different generated images
        url: `https://picsum.photos/500/500?random=${Date.now() + i}`,
        createdAt: Date.now(),
      }));
      resolve(images);
    }, 3000); // Simulate 3s processing time
  });
};
