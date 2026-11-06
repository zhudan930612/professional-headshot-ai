import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { safeReturnPath } from '@/lib/authRedirect';
import { getCurrentUser } from '@/services/authService';
import { SEOHead } from '@/components/SEOHead';

export const AuthCallback = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  useEffect(() => {
    let cancelled = false;
    void getCurrentUser().then(user => {
      if (cancelled) return;
      const target = safeReturnPath(params.get('returnTo') || localStorage.getItem('auth_return_path'));
      localStorage.removeItem('auth_return_path'); navigate(user ? target : '/', { replace: true });
    }).catch(() => { if (!cancelled) navigate('/', { replace: true }); });
    return () => { cancelled = true; };
  }, [navigate, params]);
  return <><SEOHead title="Signing in – Professional Headshot AI" noIndex /><div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" aria-label="Completing sign in" /></div></>;
};
