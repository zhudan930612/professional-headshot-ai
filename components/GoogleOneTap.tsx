import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { initializeGoogleSignIn } from '@/services/authService';

export const GoogleOneTap = () => {
  const { user, loading } = useAuth();
  useEffect(() => {
    let cancelled = false;
    if (!user && !loading) void initializeGoogleSignIn().then(google => { if (!cancelled) google.prompt(); }).catch(() => { /* The dialog shows login errors. */ });
    return () => { cancelled = true; window.google?.accounts.id.cancel(); };
  }, [user, loading]);
  return null;
};
