import type { GenerationSession, QuotaInfo, UserSubscription } from '@/types';
import { api } from './apiClient';
import { getCurrentUser } from './authService';

const HISTORY_KEY = 'ai_headshot_history';
export async function getHistory(): Promise<GenerationSession[]> {
  const result: GenerationSession[] = [];
  let cursor: string | null = null;
  do {
    const page: { items: GenerationSession[]; nextCursor: string | null } = await api('/api/history' + (cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''));
    result.push(...page.items); cursor = page.nextCursor;
  } while (cursor);
  return result.filter(session => session.images.length > 0);
}
export const saveSession = async (session: GenerationSession): Promise<void> => {
  await api('/api/history', { method: 'POST', body: JSON.stringify(session) });
};
export const getUserQuotaInfo = async (): Promise<QuotaInfo> => (await api<{ quota: QuotaInfo }>('/api/account')).quota;
export const getRemainingQuota = async (): Promise<number> => {
  try { return (await getUserQuotaInfo()).remaining_quota; } catch { return 0; }
};
export async function migrateLocalHistoryToDatabase(userId: string): Promise<void> {
  const original = localStorage.getItem(HISTORY_KEY);
  if (!original) return;
  try {
    const history: GenerationSession[] = JSON.parse(original);
    if (!Array.isArray(history)) return;
    const failed: GenerationSession[] = [];
    for (const session of history) {
      if ((await getCurrentUser())?.id !== userId) return;
      try { await saveSession(session); } catch { failed.push(session); }
    }
    if (localStorage.getItem(HISTORY_KEY) !== original) return;
    if (failed.length) localStorage.setItem(HISTORY_KEY, JSON.stringify(failed));
    else localStorage.removeItem(HISTORY_KEY);
  } catch { /* Failed imports keep their original local copy. */ }
}
