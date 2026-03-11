
import React, { useState } from 'react';
import { auth } from '../services/firebaseInit';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { Icons } from '../constants';
import { LoadingSpinner } from './OperatorConsole';
import { useTranslation } from '../i18n';

interface LoginViewProps {
  mode?: 'login' | 'signup';
}

const LoginView: React.FC<LoginViewProps> = ({ mode: _mode = 'login' }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Handle Login
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      // Map common Firebase auth errors to more user-friendly messages
      switch (err.code) {
        case 'auth/user-not-found':
          setError(t('login.error.userNotFound'));
          break;
        case 'auth/wrong-password':
          setError(t('login.error.wrongPassword'));
          break;
        case 'auth/invalid-credential':
          setError('Invalid email or password.');
          break;
        case 'auth/network-request-failed':
          setError(
            navigator.onLine
              ? 'Network error reaching Firebase Auth. Disable VPN/ad-blockers and refresh the page.'
              : 'No internet connection. Reconnect and try again.'
          );
          break;
        default:
          setError(err.message || 'An unknown error occurred. Please try again.');
          break;
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] text-center animate-fade-in-up">
      <div className="w-full max-w-sm">
        <div className="text-sky-400 mx-auto w-fit">
          <Icons.Sparkles />
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-500 mt-4 mb-2">
          {t('login.welcomeBack')}
        </h1>
        <p className="max-w-xl mx-auto text-base text-slate-400 mb-8">
          {t('login.loginSubtitle')}
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1">{t('login.emailLabel')}</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg p-3 text-slate-200 focus:ring-2 focus:ring-sky-500 focus:outline-none transition-shadow"
              placeholder={t('login.emailPlaceholder')}
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1">{t('login.passwordLabel')}</label>
            <input
              id="password"
              name="password"
              type="password"
                autoComplete="current-password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg p-3 text-slate-200 focus:ring-2 focus:ring-sky-500 focus:outline-none transition-shadow"
              placeholder={t('login.passwordPlaceholder')}
            />
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-900/30 p-3 rounded-lg">{error}</p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center bg-sky-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-sky-500 transition-colors disabled:bg-slate-700 disabled:cursor-not-allowed"
          >
            {isLoading ? <LoadingSpinner /> : t('login.loginButton')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginView;
