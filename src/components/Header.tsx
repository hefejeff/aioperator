import React, { useEffect, useRef, useState } from 'react';
import type firebase from 'firebase/compat/app';
import { auth } from '../firebaseConfig';
import { Icons } from '../constants';
import ProfileModal from './ProfileModal';
import { useTranslation } from '../i18n';

interface HeaderProps {
  onNavigate: (view: 'DASHBOARD' | 'TRAINING' | 'HISTORY') => void;
  user: firebase.User | null;
}

  const Avatar: React.FC<{ user: firebase.User; onClick?: () => void }> = ({ user, onClick }) => {
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


const Header: React.FC<HeaderProps> = ({ onNavigate, user }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const { t, lang, setLang } = useTranslation();

  const handleLogout = () => {
    auth.signOut().catch(error => console.error('Logout Error:', error));
  };

  const handleMobileNav = (view: 'DASHBOARD' | 'TRAINING' | 'HISTORY') => {
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

  return (
    <>
      <header className="bg-slate-900/70 backdrop-blur-md sticky top-0 z-40 border-b border-slate-700">
        <nav className="container mx-auto px-4 sm:px-6 md:px-8">
          <div className="flex items-center justify-between h-16">
            <div 
              className="flex items-center space-x-2 cursor-pointer"
              onClick={() => onNavigate('DASHBOARD')}
            >
              <Icons.Sparkles />
              <span className="text-xl font-bold text-sky-400">{t('app.title')}</span>
            </div>
            {user && (
              <>
                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center space-x-4">
                  <button 
                    onClick={() => onNavigate('DASHBOARD')}
                    className="px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                  >
                      {t('nav.home')}
                  </button>
                  <button 
                    onClick={() => onNavigate('TRAINING')}
                    className="px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                  >
                      {t('nav.training')}
                  </button>
                  <button 
                    onClick={() => onNavigate('HISTORY')}
                    className="px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                  >
                      {t('nav.history')}
                  </button>
                  <div className="flex items-center space-x-3">
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

                    <Avatar user={user} />
                    <button 
                      onClick={() => setIsProfileOpen(true)}
                      aria-label={t('header.editProfile')}
                      className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                    >
                      <svg className="h-4 w-4 text-sky-400" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zM6 20v-1a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v1"/></svg>
                      <span>{t('header.editProfile')}</span>
                    </button>
                    <button 
                      onClick={handleLogout}
                      className="px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:bg-red-500/20 hover:text-red-400 transition-colors"
                    >
                      {t('header.logout')}
                    </button>
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
          <Icons.Sparkles />
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
          <Avatar user={user} onClick={() => setIsProfileOpen(true)} />
                    <div>
                        <p className="font-semibold text-white">{user.displayName}</p>
                        <p className="text-sm text-slate-400">{user.email}</p>
                    </div>
                </div>

          <div className="mb-6">
            <button onClick={() => setIsProfileOpen(true)} className="w-full text-left px-4 py-3 rounded-md text-slate-300 hover:bg-slate-800">{t('header.editProfile')}</button>
          </div>

        <button 
          onClick={() => handleMobileNav('DASHBOARD')}
          className="w-full text-xl py-4 rounded-md font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
        >
          {t('nav.home')}
        </button>
        <button 
          onClick={() => handleMobileNav('TRAINING')}
          className="w-full text-xl py-4 rounded-md font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
        >
          {t('nav.training')}
        </button>
        <button 
          onClick={() => handleMobileNav('HISTORY')}
          className="w-full text-xl py-4 rounded-md font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
        >
          {t('nav.history')}
        </button>
                
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
    </>
  );
};

export default Header;