import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { AuthError } from '@supabase/supabase-js';
import { useTheme } from '../lib/ThemeContext';
import ThemeToggle from './ThemeToggle';
import { Link, useNavigate } from 'react-router-dom';

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [authInProgress, setAuthInProgress] = useState(false);
  const { logo } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN') {
        console.log('Successfully signed in:', session?.user?.email);
      } else if (event === 'SIGNED_OUT') {
        setAuthInProgress(false);
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('Token refreshed successfully');
      }
    });

    checkSession();

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  async function checkSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      setAuthInProgress(!!session);
    } catch (error) {
      console.error('Error checking session:', error);
      setAuthInProgress(false);
    }
  }

  const validateForm = () => {
    setError('');
    
    if (!email) {
      setError('Please enter your email address');
      return false;
    }
    if (!password) {
      setError('Please enter your password');
      return false;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }
    return true;
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setLoading(true);
    setError('');
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin
        }
      });

      if (error) {
        if (error.message === 'User already registered') {
          setError('An account with this email already exists. Please sign in instead.');
        } else {
          setError(error.message);
        }
        return;
      }

      if (data.user) {
        alert('Signed up successfully! You can now sign in.');
        setEmail('');
        setPassword('');
      }
    } catch (err) {
      const authError = err as AuthError;
      setError(authError.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setLoading(true);
    setError('');
    setAuthInProgress(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message === 'Invalid login credentials') {
          setError('Invalid email or password');
        } else if (error.message.includes('rate limit')) {
          setError('Too many attempts. Please try again later.');
        } else {
          setError(error.message);
        }
        setAuthInProgress(false);
      } else if (!data.session) {
        setError('Unable to sign in. Please try again.');
        setAuthInProgress(false);
      } else {
        navigate('/workouts');
      }
    } catch (err) {
      const authError = err as AuthError;
      setError(authError.message || 'An error occurred while signing in');
      setAuthInProgress(false);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setError('');
      setLoading(true);
      setAuthInProgress(true);

      // Determine the redirect URL based on the environment
      const redirectToUrl = process.env.NODE_ENV === 'development'
        ? 'http://localhost:5173/workouts'
        : `${window.location.origin}/workouts`;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectToUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      });

      if (error) throw error;

      if (!data.url) {
        throw new Error('No OAuth URL returned');
      }

      console.log('Redirecting to Google OAuth...');
    } catch (err) {
      const authError = err as AuthError;
      console.error('Google Sign-in error:', authError);
      setError(authError.message);
      setAuthInProgress(false);
    } finally {
      setLoading(false);
    }
  };

  if (authInProgress) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
        <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-xl p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-2">Authenticating...</h2>
          <p className="text-gray-500 dark:text-gray-400">Please wait while we sign you in.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <div className="fixed top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <img 
            src={logo}
            alt="PRIFY Workout Tracker" 
            className="h-32 mx-auto mb-4"
          />
          <p className="text-gray-600 dark:text-gray-300">Track your workouts and break your personal records (PRs)</p>
        </div>
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-400 rounded">
            <p className="text-sm">{error}</p>
          </div>
        )}
        
        <form className="space-y-6" onSubmit={handleSignIn}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#dbf111] focus:border-[#dbf111] transition-colors"
              placeholder="you@example.com"
              required
              disabled={loading}
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#dbf111] focus:border-[#dbf111] transition-colors"
              placeholder="••••••••"
              required
              disabled={loading}
            />
          </div>
          <div className="space-y-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#dbf111] text-black py-3 px-4 rounded-lg font-medium hover:bg-[#c5d60f] focus:outline-none focus:ring-2 focus:ring-[#dbf111] focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </span>
              ) : 'Sign in'}
            </button>
            <button
              type="button"
              onClick={handleSignUp}
              disabled={loading}
              className="w-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create account
            </button>
          </div>
        </form>

        <div className="mt-8">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-gray-700" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">Or continue with</span>
            </div>
          </div>

          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="mt-6 w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg shadow-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-[#dbf111] focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-gray-300 dark:border-gray-600"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Sign in with Google
          </button>
        </div>

        <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400 space-x-4">
          <Link to="/privacy-policy" className="hover:text-gray-900 dark:hover:text-white">
            Privacy Policy
          </Link>
          <span>•</span>
          <Link to="/terms-of-service" className="hover:text-gray-900 dark:hover:text-white">
            Terms of Service
          </Link>
        </div>
      </div>
    </div>
  );
}