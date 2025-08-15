
import React from 'react';
import type firebase from 'firebase/compat/app';
import { auth } from '../firebaseConfig';
import { Icons } from '../constants';

interface HeaderProps {
  onNavigate: (view: 'DASHBOARD' | 'TRAINING' | 'HISTORY') => void;
  user: firebase.User | null;
}

const Avatar: React.FC<{ user: firebase.User }> = ({ user }) => {
  const initials = user.displayName
    ? user.displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : user.email ? user.email[0].toUpperCase() : '?';

  if (user.photoURL) {
    return <img src={user.photoURL} alt={user.displayName || 'User'} className="h-8 w-8 rounded-full" />;
  }

  return (
    <div className="h-8 w-8 rounded-full bg-sky-700 flex items-center justify-center text-sm font-bold text-white select-none">
      {initials}
    </div>
  );
};


const Header: React.FC<HeaderProps> = ({ onNavigate, user }) => {
  const handleLogout = () => {
    auth.signOut().catch(error => console.error('Logout Error:', error));
  };

  return (
    <header className="bg-slate-900/70 backdrop-blur-md sticky top-0 z-50 border-b border-slate-700">
      <nav className="container mx-auto px-4 sm:px-6 md:px-8">
        <div className="flex items-center justify-between h-16">
          <div 
            className="flex items-center space-x-2 cursor-pointer"
            onClick={() => onNavigate('DASHBOARD')}
          >
            <Icons.Sparkles />
            <span className="text-xl font-bold text-sky-400">AI Operator Hub</span>
          </div>
          {user && (
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => onNavigate('DASHBOARD')}
                className="px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
              >
                Home
              </button>
              <button 
                onClick={() => onNavigate('TRAINING')}
                className="px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
              >
                Training
              </button>
              <button 
                onClick={() => onNavigate('HISTORY')}
                className="px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
              >
                History
              </button>
              <div className="flex items-center space-x-3">
                <Avatar user={user} />
                <button 
                  onClick={handleLogout}
                  className="px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:bg-red-500/20 hover:text-red-400 transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Header;
