import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

// Google Identity Services type declarations
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          prompt: (momentListener?: (notification: any) => void) => void;
          cancel: () => void;
        };
      };
    };
  }
}

export const GoogleOneTap = () => {
  const { user, loading } = useAuth();

  useEffect(() => {
    // Only show One Tap if user is not logged in and not loading
    if (user || loading) {
      return;
    }

    // Initialize Google One Tap
    const initializeGoogleOneTap = () => {
      if (window.google?.accounts?.id) {
        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

        if (!clientId) {
          console.error('❌ Google Client ID 未配置');
          console.error('请在 .env.local 中配置 VITE_GOOGLE_CLIENT_ID');
          return;
        }

        try {
          // Initialize Google One Tap
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: handleCredentialResponse,
            auto_select: false,
            cancel_on_tap_outside: true,
          });

          // Show One Tap prompt
          window.google.accounts.id.prompt((notification: any) => {
            if (notification.isNotDisplayed()) {
              const reason = notification.getNotDisplayedReason();
              console.warn('⚠️ Google One Tap 未显示:', reason);

              // 根据不同原因给出提示
              if (reason === 'suppressed_by_user') {
                console.info('💡 用户已关闭 One Tap，请使用标准登录按钮');
              } else if (reason === 'opt_out_or_no_session') {
                console.info('💡 浏览器禁用了 One Tap，请使用标准登录按钮');
              } else if (reason === 'browser_not_supported') {
                console.info('💡 浏览器不支持 One Tap，请使用标准登录按钮');
              }
            } else if (notification.isSkippedMoment()) {
              console.info('ℹ️ Google One Tap 被跳过');
            } else {
              console.log('✅ Google One Tap 显示成功');
            }
          });
        } catch (error) {
          console.error('❌ Google One Tap 初始化失败:', error);
          console.info('💡 将使用标准登录流程作为备选方案');
        }
      }
    };

    // Handle Google One Tap credential response
    const handleCredentialResponse = async (response: { credential: string }) => {
      try {
        console.log('Received Google One Tap credential');

        // Use Supabase signInWithIdToken method
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: response.credential,
        });

        if (error) {
          console.error('Google One Tap login failed:', error);
          return;
        }

        console.log('Google One Tap login successful:', data);
        // AuthContext will automatically update on state change
      } catch (err) {
        console.error('Error handling Google One Tap credential:', err);
      }
    };

    // Wait for Google Identity Services to load
    if (window.google?.accounts?.id) {
      initializeGoogleOneTap();
    } else {
      // If script not loaded yet, wait for it
      const checkGoogleLoaded = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(checkGoogleLoaded);
          initializeGoogleOneTap();
        }
      }, 100);

      // Stop checking after 10 seconds
      setTimeout(() => clearInterval(checkGoogleLoaded), 10000);
    }

    // Cleanup function
    return () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.cancel();
      }
    };
  }, [user, loading]);

  // Component renders nothing
  return null;
};
