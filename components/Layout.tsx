import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Camera, Menu, X, User, LogIn, ScanFace, Sparkles } from 'lucide-react';
import { getRemainingQuota } from '../services/storageService';
import { AuthModal } from './AuthModal';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const location = useLocation();
  const [quota, setQuota] = useState(getRemainingQuota());

  // Update quota display on route change or periodically
  useEffect(() => {
    setQuota(getRemainingQuota());
    const interval = setInterval(() => setQuota(getRemainingQuota()), 2000);
    return () => clearInterval(interval);
  }, [location]);

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'My Headshots', path: '/history' },
    { name: 'FAQ', path: '/faq' },
    { name: 'Blog', path: '/blog' },
  ];

  return (
    <>
      <nav className="bg-white border-b border-slate-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex-shrink-0 flex items-center gap-2.5 group">
                <div className="relative w-10 h-10 flex items-center justify-center bg-gradient-to-br from-primary-600 to-indigo-700 rounded-xl text-white shadow-lg shadow-primary-500/20 group-hover:scale-105 transition-transform duration-300">
                  <ScanFace size={22} strokeWidth={2} />
                  <div className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 shadow-sm border border-slate-50">
                     <Sparkles size={10} className="text-yellow-500 fill-yellow-500" />
                  </div>
                </div>
                <span className="font-bold text-xl tracking-tight text-slate-900 group-hover:text-primary-700 transition-colors">
                  Professional Headshot<span className="text-primary-600">AI</span>
                </span>
              </Link>
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex md:items-center md:space-x-8">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  className={`text-sm font-medium transition-colors ${
                    location.pathname === link.path ? 'text-primary-600' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {link.name}
                </Link>
              ))}
              <div className="px-3 py-1 bg-slate-100 rounded-full text-xs font-semibold text-slate-600">
                 {quota} credits left today
              </div>
              
              <div className="flex items-center gap-2 border-l border-slate-200 pl-6">
                <button 
                  onClick={() => setIsAuthOpen(true)}
                  className="text-slate-600 hover:text-primary-600 font-medium text-sm px-3 py-2 transition-colors flex items-center gap-2"
                >
                  <LogIn size={18} />
                  Sign In
                </button>
                <Link 
                    to="/" 
                    className="bg-primary-600 text-white hover:bg-primary-700 px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm"
                >
                    Get Started
                </Link>
              </div>
            </div>

            {/* Mobile menu button */}
            <div className="flex items-center md:hidden gap-3">
              <span className="text-xs font-medium text-slate-500">{quota} left</span>
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
                  onClick={() => setIsOpen(false)}
                  className={`block px-3 py-2 rounded-md text-base font-medium ${
                     location.pathname === link.path ? 'bg-primary-50 text-primary-600' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {link.name}
                </Link>
              ))}
              <div className="mt-4 pt-4 border-t border-slate-100">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setIsAuthOpen(true);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-md"
                >
                  <LogIn size={18} />
                  Sign In / Register
                </button>
                <Link
                    to="/"
                    onClick={() => setIsOpen(false)}
                    className="block w-full text-center mt-2 bg-primary-600 text-white px-4 py-3 rounded-lg font-semibold"
                >
                    Create Headshot
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>
      
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </>
  );
};

const Footer = () => (
  <footer className="bg-slate-900 text-slate-300 py-12">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
      <div className="col-span-1 md:col-span-1">
        <div className="flex items-center gap-2.5 mb-4 text-white">
          <div className="relative w-8 h-8 flex items-center justify-center bg-gradient-to-br from-primary-500 to-indigo-600 rounded-lg text-white shadow-inner">
             <ScanFace size={18} strokeWidth={2} />
             <div className="absolute -top-1 -right-1 bg-slate-900 rounded-full p-0.5 border border-slate-800">
                <Sparkles size={8} className="text-yellow-400 fill-yellow-400" />
             </div>
          </div>
          <span className="font-bold text-xl tracking-tight">Professional Headshot<span className="text-primary-400">AI</span></span>
        </div>
        <p className="text-sm text-slate-400">
          Professional AI-generated headshots for your career success. Fast, free, and private.
        </p>
      </div>
      <div>
        <h4 className="text-white font-semibold mb-4">Product</h4>
        <ul className="space-y-2 text-sm">
          <li><Link to="/" className="hover:text-white transition-colors">Generator</Link></li>
          <li><Link to="/history" className="hover:text-white transition-colors">My Headshots</Link></li>
          <li><Link to="/faq" className="hover:text-white transition-colors">Pricing (Free)</Link></li>
        </ul>
      </div>
      <div>
        <h4 className="text-white font-semibold mb-4">Resources</h4>
        <ul className="space-y-2 text-sm">
          <li><Link to="/blog" className="hover:text-white transition-colors">Blog</Link></li>
          <li><Link to="/faq" className="hover:text-white transition-colors">Help Center</Link></li>
          <li><Link to="/faq" className="hover:text-white transition-colors">Tips & Guides</Link></li>
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-8 border-t border-slate-800 text-center text-xs text-slate-500">
      © {new Date().getFullYear()} Professional Headshot AI. All rights reserved.
    </div>
  </footer>
);

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