import { GenerationSession, UserQuota, GeneratedImage } from '../types';
import { DAILY_LIMIT } from '../constants';

const HISTORY_KEY = 'ai_headshot_history';
const QUOTA_KEY = 'ai_headshot_quota';

export const getHistory = (): GenerationSession[] => {
  try {
    const data = localStorage.getItem(HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};

export const saveSession = (session: GenerationSession) => {
  const history = getHistory();
  const updated = [session, ...history];
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
};

export const getQuota = (): number => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const data = localStorage.getItem(QUOTA_KEY);
    
    if (data) {
      const parsed: UserQuota = JSON.parse(data);
      if (parsed.date === today) {
        return parsed.count;
      }
    }
    // Reset or initialize
    localStorage.setItem(QUOTA_KEY, JSON.stringify({ date: today, count: 0 }));
    return 0;
  } catch (e) {
    return 0;
  }
};

export const incrementQuota = (amount: number): boolean => {
  const current = getQuota();
  if (current + amount > DAILY_LIMIT) {
    return false;
  }
  const today = new Date().toISOString().split('T')[0];
  localStorage.setItem(QUOTA_KEY, JSON.stringify({ date: today, count: current + amount }));
  return true;
};

export const getRemainingQuota = (): number => {
  return Math.max(0, DAILY_LIMIT - getQuota());
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