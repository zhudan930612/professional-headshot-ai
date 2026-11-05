import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { AccountUser, QuotaInfo } from '@/types';
import { getCurrentUser, signOut as endSession } from '@/services/authService';
import { getUserQuotaInfo, migrateLocalHistoryToDatabase } from '@/services/storageService';
import { safeReturnPath } from '@/lib/authRedirect';

interface AuthContextType {
  user: AccountUser | null;
  session: { user: AccountUser } | null;
  loading: boolean;
  signInWithGoogle: (returnTo?: string) => Promise<void>;
  signOut: () => Promise<void>;
  isAuthModalOpen: boolean;
  openAuthModal: (returnTo?: string) => void;
  closeAuthModal: () => void;
  getReturnPath: () => string;
  clearReturnPath: () => void;
  quotaInfo: QuotaInfo | null;
  refreshQuota: () => Promise<QuotaInfo | null>;
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);
const RETURN_PATH_KEY = 'auth_return_path';
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AccountUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [returnPath, setReturnPath] = useState(() => safeReturnPath(localStorage.getItem(RETURN_PATH_KEY)));
  const [quotaInfo, setQuotaInfo] = useState<QuotaInfo | null>(null);
  const refreshQuota = useCallback(async () => {
    if (!user) { setQuotaInfo(null); return null; }
    try { const quota = await getUserQuotaInfo(); setQuotaInfo(quota); return quota; } catch { return null; }
  }, [user]);
  useEffect(() => {
    let alive = true;
    const refresh = () => { void getCurrentUser().then(value => { if (alive) setUser(value); }).catch(() => { if (alive) setUser(null); }).finally(() => { if (alive) setLoading(false); }); };
    refresh(); window.addEventListener('account-changed', refresh);
    return () => { alive = false; window.removeEventListener('account-changed', refresh); };
  }, []);
  useEffect(() => {
    let cancelled = false;
    setQuotaInfo(null);
    if (user) void getUserQuotaInfo().then(async quota => {
      if (!cancelled) setQuotaInfo(quota);
      await migrateLocalHistoryToDatabase(user.id);
      if (!cancelled) window.dispatchEvent(new Event('history-migrated'));
    }).catch(() => { /* Unknown quota remains unavailable. */ });
    return () => { cancelled = true; };
  }, [user?.id]);
  const openAuthModal = (target?: string) => {
    const safe = safeReturnPath(target || window.location.pathname + window.location.search);
    localStorage.setItem(RETURN_PATH_KEY, safe); setReturnPath(safe); setIsAuthModalOpen(true);
  };
  return <AuthContext.Provider value={{ user, session: user ? { user } : null, loading, quotaInfo, refreshQuota,
    signInWithGoogle: async target => openAuthModal(target), signOut: endSession, isAuthModalOpen, openAuthModal,
    closeAuthModal: () => setIsAuthModalOpen(false), getReturnPath: () => returnPath,
    clearReturnPath: () => { localStorage.removeItem(RETURN_PATH_KEY); setReturnPath('/'); },
  }}>{children}</AuthContext.Provider>;
};
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
