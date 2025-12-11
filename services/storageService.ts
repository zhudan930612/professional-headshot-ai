import { GenerationSession, UserQuota, GeneratedImage } from '../types';
import { DAILY_LIMIT } from '../constants';
import { supabase } from '../lib/supabase';

const HISTORY_KEY = 'ai_headshot_history';
const QUOTA_KEY = 'ai_headshot_quota';
const USER_ID_KEY = 'ai_headshot_user_id';

// 获取用户 ID（优先使用 Supabase 认证用户，否则使用匿名 ID）
const getUserId = async (): Promise<string> => {
  try {
    // 尝试获取 Supabase 认证用户
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) {
      return session.user.id;
    }
  } catch (error) {
    console.error('获取 Supabase 会话失败:', error);
  }

  // 降级到匿名用户 ID
  let userId = localStorage.getItem(USER_ID_KEY);
  if (!userId) {
    userId = `anon_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;
    localStorage.setItem(USER_ID_KEY, userId);
  }
  return userId;
};

export const getHistory = async (): Promise<GenerationSession[]> => {
  try {
    const userId = await getUserId();

    // 从 Supabase 获取历史记录
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
    // 降级到 localStorage
    try {
      const data = localStorage.getItem(HISTORY_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }
};

export const saveSession = async (session: GenerationSession): Promise<void> => {
  try {
    const userId = await getUserId();

    // 保存会话到 Supabase
    const { error: sessionError } = await supabase
      .from('generation_sessions')
      .insert({
        user_id: userId,
        session_id: session.id,
        date: session.date,
        style: session.style,
        use_case: session.useCase,
      });

    if (sessionError) throw sessionError;

    // 保存图片到 Supabase
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

      if (imagesError) throw imagesError;
    }

    // 同时保存到 localStorage 作为备份
    const history = await getHistory();
    const updated = [session, ...history.filter(s => s.id !== session.id)];
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Error saving session to Supabase:', e);
    // 降级到 localStorage
    const history = await getHistory();
    const updated = [session, ...history.filter(s => s.id !== session.id)];
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  }
};

export const getQuota = async (): Promise<number> => {
  try {
    const userId = await getUserId();
    const today = new Date().toISOString().split('T')[0];

    // 从 Supabase 获取配额
    const { data, error } = await supabase
      .from('user_quotas')
      .select('count, date')
      .eq('user_id', userId)
      .eq('date', today)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
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
    // 降级到 localStorage
    try {
      const today = new Date().toISOString().split('T')[0];
      const data = localStorage.getItem(QUOTA_KEY);

      if (data) {
        const parsed: UserQuota = JSON.parse(data);
        if (parsed.date === today) {
          return parsed.count;
        }
      }
      localStorage.setItem(QUOTA_KEY, JSON.stringify({ date: today, count: 0 }));
      return 0;
    } catch {
      return 0;
    }
  }
};

export const incrementQuota = async (amount: number): Promise<boolean> => {
  try {
    const current = await getQuota();
    if (current + amount > DAILY_LIMIT) {
      return false;
    }

    const userId = await getUserId();
    const today = new Date().toISOString().split('T')[0];
    const newCount = current + amount;

    // 更新 Supabase 中的配额
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

    // 同时更新 localStorage
    localStorage.setItem(QUOTA_KEY, JSON.stringify({ date: today, count: newCount }));

    return true;
  } catch (e) {
    console.error('Error incrementing quota in Supabase:', e);
    // 降级到 localStorage
    const current = await getQuota();
    if (current + amount > DAILY_LIMIT) {
      return false;
    }
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem(QUOTA_KEY, JSON.stringify({ date: today, count: current + amount }));
    return true;
  }
};

export const getRemainingQuota = async (): Promise<number> => {
  const current = await getQuota();
  return Math.max(0, DAILY_LIMIT - current);
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