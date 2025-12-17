import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';
import { migrateLocalHistoryToDatabase, getUserQuotaInfo } from '../services/storageService';
import type { QuotaInfo } from '../types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithGoogle: (returnTo?: string) => Promise<void>;
  signOut: () => Promise<void>;
  isAuthModalOpen: boolean;
  openAuthModal: (returnTo?: string) => void;
  closeAuthModal: () => void;
  getReturnPath: () => string;
  clearReturnPath: () => void;
  quotaInfo: QuotaInfo | null;
  refreshQuota: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const RETURN_PATH_KEY = 'auth_return_path';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  // 从 localStorage 读取返回路径，默认为 /
  const [returnPath, setReturnPath] = useState<string>(() => {
    return typeof window !== 'undefined' ? localStorage.getItem(RETURN_PATH_KEY) || '/' : '/';
  });
  const [quotaInfo, setQuotaInfo] = useState<QuotaInfo | null>(null);

  const refreshQuota = async () => {
    if (!user) {
      setQuotaInfo(null);
      return;
    }
    try {
      const info = await getUserQuotaInfo();
      setQuotaInfo(info);
    } catch (error) {
      console.error('Failed to refresh quota:', error);
    }
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      // Fetch initial quota if user is logged in
      if (session?.user) {
        getUserQuotaInfo().then(setQuotaInfo).catch(console.error);
      } else {
        setQuotaInfo(null);
      }

      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      // Handle quota updates on auth state change
      if (session?.user) {
        // Delay slightly to ensure DB triggers might have finished if this is a signup
        getUserQuotaInfo().then(setQuotaInfo).catch(console.error);
      } else {
        setQuotaInfo(null);
      }

      setLoading(false);

      // 登录后迁移本地历史记录到数据库，并通知前端刷新
      if (event === 'SIGNED_IN' && session?.user?.id) {
        try {
          await migrateLocalHistoryToDatabase(session.user.id);
          window.dispatchEvent(new CustomEvent('history-migrated'));
        } catch (error) {
          console.error('迁移本地历史记录失败:', error);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async (returnTo?: string) => {
    // Save return path to localStorage before OAuth redirect
    if (returnTo && typeof returnTo === 'string') {
      localStorage.setItem(RETURN_PATH_KEY, returnTo);
    }

    // Build redirect URL with return path as query parameter
    const callbackUrl = new URL(`${window.location.origin}/auth/callback`);
    if (returnTo && typeof returnTo === 'string') {
      callbackUrl.searchParams.set('returnTo', returnTo);
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: callbackUrl.toString(),
      },
    });

    if (error) {
      console.error('Google login error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  };

  const value = {
    user,
    session,
    loading,
    signInWithGoogle,
    signOut,
    isAuthModalOpen,
    openAuthModal: (returnTo?: string) => {
      if (returnTo) {
        // Save to localStorage immediately
        localStorage.setItem(RETURN_PATH_KEY, returnTo);
        setReturnPath(returnTo);
      }
      setIsAuthModalOpen(true);
    },
    closeAuthModal: () => setIsAuthModalOpen(false),
    getReturnPath: () => returnPath,
    clearReturnPath: () => {
      localStorage.removeItem(RETURN_PATH_KEY);
      setReturnPath('/');
    },
    quotaInfo,
    refreshQuota,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
