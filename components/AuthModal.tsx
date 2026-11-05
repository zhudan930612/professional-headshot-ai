import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { initializeGoogleSignIn } from '@/services/authService';

interface Props { isOpen: boolean; onClose: () => void }
export const AuthModal = ({ isOpen, onClose }: Props) => {
  const container = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setError('');
    const failed = (event: Event) => setError((event as CustomEvent<string>).detail);
    window.addEventListener('account-error', failed);
    void initializeGoogleSignIn().then(google => {
      if (!cancelled && container.current) google.renderButton(container.current, { type: 'standard', theme: 'outline', size: 'large', width: 320, text: 'signin_with' });
    }).catch(error => { if (!cancelled) setError(error instanceof Error ? error.message : 'Sign in could not load.'); });
    return () => { cancelled = true; window.removeEventListener('account-error', failed); };
  }, [isOpen, attempt]);
  if (!isOpen) return null;
  return <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
    <div role="dialog" aria-modal="true" aria-labelledby="sign-in-title" className="bg-white rounded-2xl w-full max-w-md p-8 relative z-10 shadow-2xl">
      <button onClick={onClose} aria-label="Close sign in" className="absolute top-4 right-4 p-1 text-slate-500"><X size={20} /></button>
      <h2 id="sign-in-title" className="text-center text-2xl font-bold text-slate-900 mb-8">Sign in to Professional Headshot AI</h2>
      <div ref={container} className="flex justify-center min-h-11" />
      {error && <div role="alert" className="mt-4 text-sm text-red-600">{error}<button className="block mt-2 underline" onClick={() => setAttempt(value => value + 1)}>Try again</button></div>}
      <p className="mt-6 text-center text-xs text-slate-500">By signing in, you agree to our <a href="/terms" className="text-primary-600">Terms of Service</a> and <a href="/privacy" className="text-primary-600">Privacy Policy</a>.</p>
    </div>
  </div>;
};
