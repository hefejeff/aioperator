import React, { useEffect, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import { auth } from '../services/firebaseInit';
import { signOut } from 'firebase/auth';
import { Icons } from '../constants';
import brainIcon from '../assets/brain_icon.png';
import ProfileModal from './ProfileModal';
import { useTranslation } from '../i18n';
import LoginView from './LoginView';

interface HeaderProps {
  onNavigate: (view: 'DASHBOARD' | 'TRAINING' | 'ADMIN' | 'RESEARCH') => void;
  user: User | null;
  userRole?: 'SUPER_ADMIN' | 'ADMIN' | 'PRO_USER' | 'USER' | null;
  onOpenWorkflowDrawer?: () => void;
  onOpenChat?: () => void;
}

  const Avatar: React.FC<{ user: User; onClick?: () => void }> = ({ user, onClick }) => {
  const initials = user.displayName
    ? user.displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : user.email ? user.email[0].toUpperCase() : '?';

  if (user.photoURL) {
    return <img onClick={onClick} src={user.photoURL} alt={user.displayName || 'User'} className="h-8 w-8 rounded-full cursor-pointer" />;
  }
  return (
    <div onClick={onClick} className="h-8 w-8 rounded-full bg-sky-700 flex items-center justify-center text-sm font-bold text-white select-none cursor-pointer" title={String(user.displayName || '')}>
      {initials}
    </div>
  );
};


const Header: React.FC<HeaderProps> = ({ onNavigate, user, userRole, onOpenWorkflowDrawer, onOpenChat }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const { t, lang, setLang } = useTranslation();
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  const handleLogout = () => {
    signOut(auth).catch(error => console.error('Logout Error:', error));
  };

  const handleMobileNav = (view: 'DASHBOARD' | 'TRAINING' | 'ADMIN' | 'RESEARCH') => {
    onNavigate(view);
    setIsMenuOpen(false); // Close menu after navigation
  };

  // Close menu on Esc or click outside
  useEffect(() => {
    if (!isMenuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsMenuOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [isMenuOpen]);

  // Prevent body scroll when menu open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMenuOpen]);

  // Close profile dropdown on Esc or click outside
  useEffect(() => {
    if (!isProfileMenuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsProfileMenuOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [isProfileMenuOpen]);

  return (
    <>
      <header className="bg-slate-900/70 backdrop-blur-md sticky top-0 z-40 border-b border-slate-700">
        <nav className="container mx-auto px-4 sm:px-6 md:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div 
                className="flex items-center space-x-2 cursor-pointer"
                onClick={() => onNavigate('DASHBOARD')}
              >
                <img src={brainIcon} alt="Logo" className="h-8 w-8 object-contain drop-shadow" />
                <span className="text-xl font-bold text-sky-400">{t('app.title')}</span>
              </div>
              
              {/* Workflow Drawer Button */}
              {user && onOpenWorkflowDrawer && (
                <button
                  onClick={onOpenWorkflowDrawer}
                  className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/60 text-slate-300 hover:text-white transition-colors"
                  title="Open My Workflows"
                >
                  <Icons.Document />
                </button>
              )}
            </div>
            {user ? (
              <>
                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center space-x-4">
                  <button 
                    onClick={() => onNavigate('DASHBOARD')}
                    className="px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                  >
                      {t('nav.dashboard')}
                  </button>
                  <button 
                    onClick={() => onNavigate('TRAINING')}
                    className="px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                  >
                      {t('nav.library')}
                  </button>
                  <button 
                    onClick={() => onNavigate('RESEARCH')}
                    className="px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                  >
                    {t('nav.research')}
                  </button>
                  {(userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') && (
                    <button 
                      onClick={() => onNavigate('ADMIN')}
                      className="px-3 py-2 rounded-md text-sm font-medium text-amber-300 hover:bg-amber-800/20 hover:text-amber-200 transition-colors border border-amber-700/40"
                    >
                        {t('nav.admin')}
                    </button>
                  )}
                  <div className="flex items-center space-x-3">
                    {/* AI Chat button */}
                    <button
                      onClick={onOpenChat}
                      className="p-2 rounded-md text-sky-300 hover:bg-sky-800/20 hover:text-sky-200 transition-colors border border-sky-700/40"
                      title="Open AI Chat"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                    </button>
                    {/* Language selector */}
                    <select
                      value={lang}
                      onChange={(e) => setLang(e.target.value as any)}
                      className="bg-slate-900 border border-slate-700 text-slate-200 rounded-md px-2 py-1 text-sm"
                      aria-label="Language selector"
                    >
                      <option value="English">English</option>
                      <option value="Spanish">Spanish</option>
                    </select>

                    {/* Avatar with dropdown menu for profile actions */}
                    <div className="relative" ref={profileMenuRef}>
                      <button
                        onClick={() => setIsProfileMenuOpen(prev => !prev)}
                        aria-haspopup="menu"
                        aria-expanded={isProfileMenuOpen}
                        className="flex items-center rounded-md focus:outline-none"
                        title={String(user.displayName || '')}
                      >
                        <Avatar user={user} />
                      </button>

                      {isProfileMenuOpen && (
                        <div className="absolute right-0 mt-2 w-44 bg-slate-800 border border-slate-700 rounded-md shadow-lg z-50">
                          <button onClick={() => { setIsProfileOpen(true); setIsProfileMenuOpen(false); }} className="w-full text-left px-4 py-2 text-slate-200 hover:bg-slate-700">{t('header.editProfile')}</button>
                          <button onClick={() => { setIsProfileMenuOpen(false); handleLogout(); }} className="w-full text-left px-4 py-2 text-slate-200 hover:bg-red-700/20">{t('header.logout')}</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {/* Mobile Hamburger Button */}
                <div className="md:hidden">
                    <button 
                        onClick={() => setIsMenuOpen(true)}
                        className="p-2 rounded-md text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                        aria-label="Open menu"
                    >
                        <Icons.Menu />
                    </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <select
                  value={lang}
                  onChange={(e) => setLang(e.target.value as any)}
                  className="hidden sm:block bg-slate-900 border border-slate-700 text-slate-200 rounded-md px-2 py-1 text-sm"
                  aria-label="Language selector"
                >
                  <option value="English">English</option>
                  <option value="Spanish">Spanish</option>
                </select>
                <button
                  onClick={() => { setAuthMode('signup'); setIsAuthOpen(true); }}
                  className="px-3 py-2 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500"
                >
                  {t('auth.signUp')}
                </button>
                <button
                  onClick={() => { setAuthMode('login'); setIsAuthOpen(true); }}
                  className="px-3 py-2 rounded-md bg-slate-800 text-white text-sm font-medium border border-slate-700 hover:bg-slate-700"
                >
                  {t('auth.signIn')}
                </button>
              </div>
            )}
          </div>
        </nav>
      </header>
      
      {/* Mobile Menu Overlay */}
      {isMenuOpen && user && (
          <div
            ref={menuRef}
            className="fixed inset-0 bg-slate-900 z-50 animate-fade-in p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile menu"
          >
              <div className="flex justify-between items-center mb-8">
        <div 
          className="flex items-center space-x-2"
        >
          <img src={brainIcon} alt="Logo" className="h-8 w-8 object-contain drop-shadow" />
          <span className="text-xl font-bold text-sky-400">{t('app.title')}</span>
        </div>
                <button 
                    onClick={() => setIsMenuOpen(false)}
                    className="p-2 rounded-md text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                    aria-label="Close menu"
                >
                    <Icons.X />
                </button>
              </div>

              <div className="flex flex-col items-center justify-center space-y-4 text-center">
        <div className="flex items-center space-x-4 mb-8">
          <Avatar user={user} />
                    <div>
                        <p className="font-semibold text-white">{user.displayName}</p>
                        <p className="text-sm text-slate-400">{user.email}</p>
                    </div>
                </div>

          <div className="mb-6">
            {/* Mobile Edit profile remains inside mobile menu but is a menu item, not triggered by avatar click */}
            <button onClick={() => { setIsProfileOpen(true); setIsMenuOpen(false); }} className="w-full text-left px-4 py-3 rounded-md text-slate-300 hover:bg-slate-800">{t('header.editProfile')}</button>
          </div>

        <button 
          onClick={() => handleMobileNav('DASHBOARD')}
          className="w-full text-xl py-4 rounded-md font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
        >
          {t('nav.dashboard')}
        </button>
        <button 
          onClick={() => handleMobileNav('TRAINING')}
          className="w-full text-xl py-4 rounded-md font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
        >
          {t('nav.library')}
        </button>
        <button 
          onClick={() => handleMobileNav('RESEARCH')}
          className="w-full text-xl py-4 rounded-md font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
        >
          {t('nav.research')}
        </button>
        {(userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') && (
          <button 
            onClick={() => handleMobileNav('ADMIN')}
            className="w-full text-xl py-4 rounded-md font-medium text-amber-300 hover:bg-amber-800/20 hover:text-amber-200 transition-colors border border-amber-700/40"
          >
            {t('nav.admin')}
          </button>
        )}
                
                <div className="absolute bottom-8 left-0 right-0 px-4 space-y-3">
                    <div className="flex justify-center">
                      <select value={lang} onChange={(e) => setLang(e.target.value as any)} className="bg-slate-800 border border-slate-700 text-slate-200 rounded-md px-3 py-2 text-sm">
                        <option value="English">English</option>
                        <option value="Spanish">Spanish</option>
                      </select>
                    </div>
                    <button 
                        onClick={handleLogout}
                        className="w-full max-w-sm mx-auto text-lg py-3 rounded-md font-medium text-red-400 border border-red-500/50 hover:bg-red-500/20 transition-colors"
                    >
                        Logout
                    </button>
                </div>
              </div>
          </div>
      )}
      {isProfileOpen && user && (
        <ProfileModal user={user} onClose={() => setIsProfileOpen(false)} onSaved={() => {/* App listens to profile-updated event to refresh UI */}} />
      )}
      {isAuthOpen && !user && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" onClick={() => setIsAuthOpen(false)}>
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-lg w-full p-4 md:p-6" onClick={(e)=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-semibold">{authMode === 'signup' ? t('auth.createAccount') : t('auth.welcomeBack')}</h3>
              <button onClick={() => setIsAuthOpen(false)} className="p-2 rounded-md text-slate-300 hover:text-white hover:bg-slate-700/50" aria-label="Close">
                <Icons.X />
              </button>
            </div>
            <LoginView mode={authMode} />
          </div>
        </div>
      )}
    </>
  );
};

export default Header;