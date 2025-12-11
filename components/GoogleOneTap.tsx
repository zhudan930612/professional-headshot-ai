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
          console.error('Google Client ID not configured');
          return;
        }

        // Initialize Google One Tap
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        // Show One Tap prompt
        window.google.accounts.id.prompt((notification: any) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            console.log('Google One Tap not displayed:', notification.getNotDisplayedReason());
          }
        });
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
