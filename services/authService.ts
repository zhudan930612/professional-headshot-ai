import type { AccountUser } from '@/types';
import { safeReturnPath } from '@/lib/authRedirect';
import { api } from './apiClient';

interface GoogleIdentity {
  initialize(config: { client_id: string; nonce: string; callback: (response: { credential: string }) => void; auto_select: boolean }): void;
  renderButton(container: HTMLElement, options: { type: string; theme: string; size: string; width: number; text: string }): void;
  prompt(): void;
  cancel(): void;
  disableAutoSelect(): void;
}
declare global { interface Window { google?: { accounts: { id: GoogleIdentity } } } }
export const getCurrentUser = async (): Promise<AccountUser | null> => (await api<{ user: AccountUser | null }>('/api/auth/session')).user;
export const signOut = async () => {
  await api('/api/auth/logout', { method: 'POST', body: '{}' });
  window.google?.accounts.id.disableAutoSelect();
  googleReady = undefined;
  window.dispatchEvent(new Event('account-changed'));
};
let googleReady: Promise<GoogleIdentity> | undefined;
let challengeExpires = 0;
export function initializeGoogleSignIn(): Promise<GoogleIdentity> {
  if (Date.now() > challengeExpires) googleReady = undefined;
  if (!googleReady) {
    challengeExpires = Date.now() + 9 * 60_000;
    googleReady = (async () => {
      for (let i = 0; !window.google?.accounts.id && i < 100; i++) await new Promise(resolve => setTimeout(resolve, 100));
      const google = window.google?.accounts.id;
      if (!google) throw new Error('Google sign in could not load. Please refresh and try again.');
      const challenge = await api<{ nonce: string; clientId: string }>('/api/auth/challenge', { method: 'POST', body: '{}' });
      google.initialize({ client_id: challenge.clientId, nonce: challenge.nonce, auto_select: false, callback: response => {
        void api('/api/auth/google', { method: 'POST', body: JSON.stringify({ credential: response.credential }) }).then(() => {
          googleReady = undefined;
          window.dispatchEvent(new Event('account-changed'));
          const target = safeReturnPath(localStorage.getItem('auth_return_path') || window.location.pathname + window.location.search);
          localStorage.removeItem('auth_return_path');
          window.location.assign(target);
        }).catch(error => {
          googleReady = undefined;
          window.dispatchEvent(new CustomEvent('account-error', { detail: error instanceof Error ? error.message : 'Sign in failed. Please try again.' }));
        });
      } });
      return google;
    })().catch(error => { googleReady = undefined; throw error; });
  }
  return googleReady;
}
