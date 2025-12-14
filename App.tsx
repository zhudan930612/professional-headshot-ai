import React, { useLayoutEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { GoogleOneTap } from './components/GoogleOneTap';
import { AuthModal } from './components/AuthModal';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { History } from './pages/History';
import { FAQ } from './pages/FAQ';
import { Blog } from './pages/Blog';
import { BlogPost } from './pages/BlogPost';
import { Terms, Privacy } from './pages/Terms';
import { AuthCallback } from './pages/AuthCallback';
import { Pricing } from './pages/Pricing';
import { Subscription } from './pages/Subscription';

// Custom component to handle scroll restoration on route change
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

// Global AuthModal component that uses AuthContext
const GlobalAuthModal = () => {
  const { isAuthModalOpen, closeAuthModal } = useAuth();
  return <AuthModal isOpen={isAuthModalOpen} onClose={closeAuthModal} />;
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ScrollToTop />
        {/* Global AuthModal - rendered once at the top level */}
        <GlobalAuthModal />
        {/* Google One Tap 快捷登录 */}
        <GoogleOneTap />
        <Routes>
          {/* OAuth 回调路由（不需要 Layout） */}
          <Route path="/auth/callback" element={<AuthCallback />} />

          {/* 其他路由（各页面自己负责 Layout） */}
          <Route path="/" element={<Home />} />
          <Route path="/history" element={<History />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/subscription" element={<Subscription />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;