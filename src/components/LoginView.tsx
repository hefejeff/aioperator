
import React, { useEffect, useState } from 'react';
import { auth } from '../firebaseConfig';
import { Icons } from '../constants';
import { LoadingSpinner } from './OperatorConsole';

interface LoginViewProps {
  mode?: 'login' | 'signup';
}

const LoginView: React.FC<LoginViewProps> = ({ mode = 'login' }) => {
  const [isSignUp, setIsSignUp] = useState(mode === 'signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsSignUp(mode === 'signup');
  }, [mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (isSignUp) {
        // Handle Sign Up
        if (!displayName.trim()) {
          throw new Error("Display Name is required.");
        }
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        if (userCredential.user) {
          await userCredential.user.updateProfile({
            displayName: displayName.trim(),
          });
          // onAuthStateChanged in App.tsx will handle the rest
        }
      } else {
        // Handle Login
        await auth.signInWithEmailAndPassword(email, password);
      }
    } catch (err: any) {
      // Map common Firebase auth errors to more user-friendly messages
      switch (err.code) {
        case 'auth/user-not-found':
          setError('No account found with this email. Please sign up.');
          break;
        case 'auth/wrong-password':
          setError('Incorrect password. Please try again.');
          break;
        case 'auth/email-already-in-use':
          setError('This email is already in use. Please log in.');
          break;
        case 'auth/weak-password':
          setError('Password should be at least 6 characters long.');
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
          {isSignUp ? 'Create Your Account' : 'Welcome Back'}
        </h1>
        <p className="max-w-xl mx-auto text-base text-slate-400 mb-8">
          {isSignUp ? 'Join the hub to start your training.' : 'Sign in to continue your journey.'}
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          {isSignUp && (
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-slate-300 mb-1">Display Name</label>
              <input
                id="displayName"
                name="displayName"
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg p-3 text-slate-200 focus:ring-2 focus:ring-sky-500 focus:outline-none transition-shadow"
                placeholder="Jane Doe"
              />
            </div>
          )}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1">Email Address</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg p-3 text-slate-200 focus:ring-2 focus:ring-sky-500 focus:outline-none transition-shadow"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg p-3 text-slate-200 focus:ring-2 focus:ring-sky-500 focus:outline-none transition-shadow"
              placeholder="••••••••"
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
            {isLoading ? <LoadingSpinner /> : isSignUp ? 'Sign Up' : 'Login'}
          </button>
        </form>

        <p className="mt-6 text-sm text-slate-400">
          {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
          <button onClick={() => { setIsSignUp(!isSignUp); setError(null); }} className="font-medium text-sky-400 hover:text-sky-300">
            {isSignUp ? 'Login' : 'Sign Up'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default LoginView;
