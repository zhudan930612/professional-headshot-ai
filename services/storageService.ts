import { GenerationSession, UserQuota, GeneratedImage, QuotaInfo, UserSubscription } from '../types';
import { DAILY_LIMIT } from '../constants';
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
      return [];
    }

    const { data: sessions, error } = await supabase
      .from('generation_sessions')
      .select(`
        session_id,
        date,
        style,
        use_case,
        generated_images (
          image_id,
          url,
          created_at_timestamp
        )
      `)
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (error) throw error;

    // 转换为应用格式
    const history: GenerationSession[] = sessions?.map((session: any) => ({
      id: session.session_id,
      date: session.date,
      style: session.style,
      useCase: session.use_case,
      images: session.generated_images?.map((img: any) => ({
        id: img.image_id,
        url: img.url,
        createdAt: img.created_at_timestamp,
      })) || [],
    })) || [];

    return history;
  } catch (e) {
    console.error('Error fetching history from Supabase:', e);
    return [];
  }
};

export const saveSession = async (session: GenerationSession): Promise<void> => {
  // 用户必须已登录才能生成图片，所以直接保存到数据库
  try {
    const userId = await getUserId();
    if (!userId) {
      throw new Error('User ID not available');
    }

    // 准备会话数据（不包含参考图信息，参考图不保存到数据库）
    const sessionData: any = {
      user_id: userId,
      session_id: session.id,
      date: session.date,
      style: session.style,
      use_case: session.useCase,
    };

    // 保存会话到 Supabase
    const { error: sessionError } = await supabase
      .from('generation_sessions')
      .insert(sessionData);

    if (sessionError) throw sessionError;

    // 保存图片到 Supabase（包含存储路径等元数据）
    if (session.images && session.images.length > 0) {
      const imageRecords = session.images.map(img => ({
        session_id: session.id,
        image_id: img.id,
        url: img.url,
        created_at_timestamp: img.createdAt,
        storage_path: img.storagePath,
        file_size: img.fileSize,
        mime_type: img.mimeType,
      }));

      const { error: imagesError } = await supabase
        .from('generated_images')
        .insert(imageRecords);

      if (imagesError) throw imagesError;
    }
  } catch (e) {
    console.error('Error saving session to Supabase:', e);
    throw e;
  }
};

export const getQuota = async (): Promise<number> => {
  // 用户必须已登录才能生成图片，所以直接从数据库读取
  try {
    const userId = await getUserId();
    if (!userId) {
      return 0;
    }

    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('user_quotas')
      .select('count, date')
      .eq('user_id', userId)
      .eq('date', today)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    if (data) {
      return data.count;
    }

    // 如果今天没有记录，初始化
    const { error: insertError } = await supabase
      .from('user_quotas')
      .insert({
        user_id: userId,
        date: today,
        count: 0,
      });

    if (insertError) throw insertError;

    return 0;
  } catch (e) {
    console.error('Error fetching quota from Supabase:', e);
    return 0;
  }
};

export const incrementQuota = async (amount: number): Promise<boolean> => {
  // 用户必须已登录才能生成图片，所以直接更新数据库
  try {
    const current = await getQuota();
    if (current + amount > DAILY_LIMIT) {
      return false;
    }

    const userId = await getUserId();
    if (!userId) {
      throw new Error('User ID not available');
    }

    const today = new Date().toISOString().split('T')[0];
    const newCount = current + amount;

    const { error } = await supabase
      .from('user_quotas')
      .upsert({
        user_id: userId,
        date: today,
        count: newCount,
      }, {
        onConflict: 'user_id,date'
      });

    if (error) throw error;

    return true;
  } catch (e) {
    console.error('Error incrementing quota in Supabase:', e);
    return false;
  }
};

export const getRemainingQuota = async (): Promise<number> => {
  try {
    const quotaInfo = await getUserQuotaInfo();
    return quotaInfo.remaining_quota;
  } catch (error) {
    console.error('获取剩余配额失败，回退到每日配额:', error);
    const current = await getQuota();
    return Math.max(0, DAILY_LIMIT - current);
  }
};

/**
 * 获取用户完整配额信息（支持订阅系统）
 * Free 用户返回每日配额信息，付费用户返回永久配额信息
 */
export const getUserQuotaInfo = async (): Promise<QuotaInfo> => {
  const userId = await getUserId();
  if (!userId) {
    throw new Error('用户未登录');
  }

  try {
    const { data, error } = await supabase
      .rpc('get_user_quota_info', { p_user_id: userId });

    if (error) throw error;

    return data as QuotaInfo;
  } catch (error) {
    console.error('获取配额信息失败:', error);
    throw error;
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
  if (!userId) {
    throw new Error('用户未登录');
  }

  try {
    const { data, error } = await supabase
      .rpc('decrement_subscription_quota_safe', {
        p_user_id: userId,
        p_amount: amount,
        p_is_retry: isRetry
      });

    if (error) throw error;

    return {
      success: data.success,
      remaining: data.remaining
    };
  } catch (error) {
    console.error('扣减配额失败:', error);
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