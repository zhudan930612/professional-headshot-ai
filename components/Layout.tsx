import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Camera, Menu, X, User, LogIn, LogOut, ChevronDown, Zap } from 'lucide-react';
import { getRemainingQuota, getUserQuotaInfo } from '../services/storageService';
import { useAuth } from '../contexts/AuthContext';
import type { QuotaInfo } from '../types';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [quota, setQuota] = useState(0);
  // 对于未登录用户，我们维护一个本地 legacyQuota 状态（用于显示剩余配额）
  // 对于已登录用户，直接使用全局 authQuotaInfo
  const { user, signOut, openAuthModal, quotaInfo: authQuotaInfo } = useAuth();

  // Update quota display for non-logged-in users
  useEffect(() => {
    const loadLegacyQuota = async () => {
      if (!user) {
        try {
          const remainingQuota = await getRemainingQuota();
          setQuota(remainingQuota);
        } catch (err) {
          console.error('Failed to load legacy quota:', err);
          setQuota(0);
        }
      }
    };

    loadLegacyQuota();

    // Listen for updates (for legacy flow)
    const handleQuotaUpdate = () => loadLegacyQuota();
    window.addEventListener('quota-updated', handleQuotaUpdate);
    return () => {
      window.removeEventListener('quota-updated', handleQuotaUpdate);
    };
  }, [user]);

  // Derived state for display
  const displayQuotaInfo = user ? authQuotaInfo : null;
  const displayQuota = user ? (authQuotaInfo?.remaining_quota ?? 0) : quota;

  const handleSignOut = async () => {
    setIsUserMenuOpen(false);
    // Clear all user-related data from localStorage
    localStorage.removeItem('ai_headshot_history');
    localStorage.removeItem('ai_headshot_quota');
    localStorage.removeItem('ai_headshot_user_id');
    localStorage.removeItem('auth_return_path');
    // Clear sessionStorage as well
    sessionStorage.clear();

    try {
      // Sign out from Supabase
      await signOut();
    } catch (error) {
      console.error('登出失败:', error);
    }

    // Force complete page reload - this clears all React state
    window.location.href = window.location.origin;
  };

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'My Headshots', path: '/history' },
    { name: 'Pricing', path: '/pricing' },
    { name: 'Blog', path: '/blog' },
  ];

  return (
    <>
      <nav className="bg-white border-b border-slate-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link
                to="/"
                onClick={(e) => {
                  if (location.pathname === '/') {
                    e.preventDefault();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
                className="flex-shrink-0 flex items-center gap-2.5 group"
              >
                <img src="/logo.svg" alt="Professional Headshot AI" className="w-10 h-10 group-hover:scale-105 transition-transform duration-300" />
                <span className="font-bold text-xl tracking-tight text-slate-900 group-hover:text-primary-700 transition-colors">
                  Professional Headshot<span className="text-primary-600 ml-1.5 border-0 border-none bg-[unset] bg-none" style={{ borderWidth: '0px', borderColor: 'rgba(0, 0, 0, 0)', borderImage: 'none', borderStyle: 'none', background: 'unset', backgroundImage: 'none' }}>AI</span>
                </span>
              </Link>
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex md:items-center md:space-x-8">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  onClick={() => {
                    if (location.pathname === link.path) {
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  }}
                  className={`text-sm font-medium transition-colors ${location.pathname === link.path ? 'text-primary-600' : 'text-slate-500 hover:text-slate-900'
                    }`}
                >
                  {link.name}
                </Link>
              ))}

              {user && (
                <div className="flex items-center gap-3">
                  {authQuotaInfo ? (
                    <>
                      {/* Plan Badge */}
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${authQuotaInfo.plan_type === 'executive' ? 'bg-amber-100 text-amber-800' :
                          authQuotaInfo.plan_type === 'professional' ? 'bg-blue-100 text-blue-800' :
                            'bg-slate-100 text-slate-600'
                        }`}>
                        {authQuotaInfo.plan_type.toUpperCase()}
                      </span>

                      {/* Quota Display */}
                      <div className="px-3 py-1 bg-slate-100 rounded-full text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                        <Zap size={12} className="text-primary-600" />
                        {displayQuota} {authQuotaInfo.is_paid ? 'credits' : 'uses'} left
                      </div>

                      {/* Subscription Link */}
                      <Link
                        to="/subscription"
                        className="text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors"
                      >
                        Details
                      </Link>
                    </>
                  ) : (
                    /* Skeleton for Quota Info */
                    <div className="animate-pulse flex items-center gap-3">
                      <div className="h-6 w-20 bg-slate-100 rounded-full"></div>
                      <div className="h-6 w-24 bg-slate-100 rounded-full"></div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2 border-l border-slate-200 pl-6">
                {user ? (
                  /* 已登录：显示用户菜单 */
                  <div className="relative">
                    <button
                      onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold">
                        {user.user_metadata?.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <span className="text-sm font-medium text-slate-700 max-w-[120px] truncate hidden lg:block">
                        {user.user_metadata?.name || user.email?.split('@')[0]}
                      </span>
                      <ChevronDown size={16} className="text-slate-400" />
                    </button>

                    {/* 下拉菜单 */}
                    {isUserMenuOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setIsUserMenuOpen(false)}
                        />
                        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-slate-200 py-2 z-20">
                          <div className="px-4 py-2 border-b border-slate-100">
                            <p className="text-sm font-medium text-slate-900 truncate">
                              {user.user_metadata?.name || 'User'}
                            </p>
                            <p className="text-xs text-slate-500 truncate">{user.email}</p>
                          </div>
                          <Link
                            to="/history"
                            onClick={() => setIsUserMenuOpen(false)}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                          >
                            <User size={16} />
                            My Headshots
                          </Link>
                          <Link
                            to="/subscription"
                            onClick={() => setIsUserMenuOpen(false)}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                          >
                            <Zap size={16} />
                            My Subscription
                          </Link>
                          <Link
                            to="/pricing"
                            onClick={() => setIsUserMenuOpen(false)}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-primary-600 hover:bg-primary-50"
                          >
                            <Zap size={16} />
                            Upgrade Plan
                          </Link>
                          <button
                            onClick={handleSignOut}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                          >
                            <LogOut size={16} />
                            Sign Out
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  /* 未登录：显示登录按钮 */
                  <button
                    onClick={() => openAuthModal(location.pathname)}
                    className="text-slate-600 hover:text-primary-600 font-medium text-sm px-3 py-2 transition-colors flex items-center gap-2"
                  >
                    <LogIn size={18} />
                    Sign In
                  </button>
                )}
              </div>
            </div>

            {/* Mobile menu button */}
            <div className="flex items-center md:hidden gap-3">
              {user && (
                authQuotaInfo ? (
                  <span className="text-xs font-medium text-slate-500">
                    {authQuotaInfo.plan_type.toUpperCase()} • {displayQuota} left
                  </span>
                ) : (
                  <div className="h-4 w-24 bg-slate-100 rounded animate-pulse"></div>
                )
              )}
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="text-slate-500 hover:text-slate-900 focus:outline-none"
              >
                {isOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden bg-white border-b border-slate-100">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  onClick={() => {
                    setIsOpen(false);
                    if (location.pathname === link.path) {
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  }}
                  className={`block px-3 py-2 rounded-md text-base font-medium ${location.pathname === link.path ? 'bg-primary-50 text-primary-600' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                >
                  {link.name}
                </Link>
              ))}
              <div className="mt-4 pt-4 border-t border-slate-100">
                {user ? (
                  /* 已登录：显示用户信息和登出 */
                  <>
                    <div className="px-3 py-2 mb-2">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center text-white font-bold">
                          {user.user_metadata?.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {user.user_metadata?.name || 'User'}
                          </p>
                          <p className="text-xs text-slate-500 truncate">{user.email}</p>
                        </div>
                      </div>
                    </div>
                    <Link
                      to="/history"
                      onClick={() => setIsOpen(false)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-md"
                    >
                      <User size={18} />
                      My Headshots
                    </Link>
                    <Link
                      to="/subscription"
                      onClick={() => setIsOpen(false)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-md"
                    >
                      <Zap size={18} />
                      My Subscription
                    </Link>
                    <Link
                      to="/pricing"
                      onClick={() => setIsOpen(false)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-primary-600 font-medium hover:bg-primary-50 rounded-md"
                    >
                      <Zap size={18} />
                      Upgrade Plan
                    </Link>
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        handleSignOut();
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-red-600 font-medium hover:bg-red-50 rounded-md"
                    >
                      <LogOut size={18} />
                      Sign Out
                    </button>
                  </>
                ) : (
                  /* 未登录：显示登录按钮 */
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      openAuthModal(location.pathname);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-md"
                  >
                    <LogIn size={18} />
                    Sign In / Register
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>
    </>
  );
};

const Footer = () => {
  const location = useLocation();

  return (
    <footer className="bg-slate-900 text-slate-300 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="col-span-1 md:col-span-1">
          <Link
            to="/"
            onClick={(e) => {
              if (location.pathname === '/') {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
            className="flex items-center gap-2.5 mb-4 text-white"
          >
            <img src="/logo.svg" alt="Professional Headshot AI" className="w-8 h-8" />
            <span className="font-bold text-xl tracking-tight">Professional Headshot<span className="text-primary-400 ml-1.5">AI</span></span>
          </Link>
          <p className="text-sm text-slate-400">
            Professional AI-generated headshots for your career success. Fast, free, and private.
          </p>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-4">Product</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/" className="hover:text-white transition-colors">Generator</Link></li>
            <li><Link to="/history" className="hover:text-white transition-colors">My Headshots</Link></li>
            <li><Link to="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-4">Resources</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/blog" className="hover:text-white transition-colors">Blog</Link></li>
            <li><Link to="/faq" className="hover:text-white transition-colors">Help Center</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-4">Legal</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
            <li><Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
          </ul>
        </div>
      </div>

      {/* Featured On - Navigation Sites Badges */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 pt-5 border-t border-slate-800">
        <div className="grid grid-cols-6 md:grid-cols-10 lg:grid-cols-12 gap-2">

          {/* JustSimple Tools */}
          <a
            href="https://www.justsimple.tools"
            target="_blank"
            rel="nofollow noreferrer"
            className="transition-all duration-300 hover:opacity-100 hover:scale-105 opacity-80"
          >
            <img
              src="https://www.justsimple.tools/badge.svg"
              alt="Listed on JustSimple Tools"
              className="w-full h-8 object-contain"
              loading="lazy"
            />
          </a>

        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-5 pt-8 border-t border-slate-800 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} Professional Headshot AI. All rights reserved.
      </div>
    </footer>
  );
};

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />
      <main className="flex-grow">
        {children}
      </main>
      <Footer />
    </div>
  );
};