import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2 } from 'lucide-react';

const RETURN_PATH_KEY = 'auth_return_path';

export const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Handle OAuth callback
    const handleCallback = async () => {
      try {
        // Get session after OAuth redirect
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Failed to get session:', error);
          navigate('/', { replace: true });
          return;
        }

        if (session) {
          console.log('Login successful:', session.user);
          // Get return path from URL params first, then localStorage, then default to /
          let returnPath = searchParams.get('returnTo') || localStorage.getItem(RETURN_PATH_KEY) || '/';
          // Ensure returnPath is a valid string starting with /
          if (!returnPath || !returnPath.startsWith('/')) {
            returnPath = '/';
          }
          localStorage.removeItem(RETURN_PATH_KEY);
          console.log('Navigating to:', returnPath);
          navigate(returnPath, { replace: true });
        } else {
          // No session, redirect to home page
          navigate('/', { replace: true });
        }
      } catch (err) {
        console.error('Callback error:', err);
        navigate('/', { replace: true });
      }
    };

    handleCallback();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        console.log('Auth state changed: user signed in');
        let returnPath = searchParams.get('returnTo') || localStorage.getItem(RETURN_PATH_KEY) || '/';
        // Ensure returnPath is a valid string starting with /
        if (!returnPath || !returnPath.startsWith('/')) {
          returnPath = '/';
        }
        localStorage.removeItem(RETURN_PATH_KEY);
        console.log('Navigating to:', returnPath);
        navigate(returnPath, { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="inline-flex items-center justify-center p-4 bg-white rounded-full shadow-lg mb-4">
          <Loader2 className="animate-spin text-primary-600" size={32} />
        </div>
        <h2 className="text-xl font-semibold text-slate-900 mb-2">Processing login...</h2>
        <p className="text-slate-500 text-sm">Please wait while we complete your authentication</p>
      </div>
    </div>
  );
};
