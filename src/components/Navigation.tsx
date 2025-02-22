import { Link, useLocation, useNavigate } from 'react-router-dom';
import { HomeIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import { supabase } from '../lib/supabase';

export default function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const handleLogout = async () => {
    try {
      // Clear all Supabase-related items from localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('sb-')) {
          localStorage.removeItem(key);
        }
      }
      
      const { error } = await supabase.auth.signOut({
        scope: 'local'
      });
      
      if (error) {
        // Only log real errors, not session-related ones
        if (!error.message.includes('session') && !error.name.includes('AuthSession')) {
          console.error('Error signing out:', error);
        }
      }
      
      // Force navigation to root after logout
      navigate('/sign-in', { replace: true });
      
      // Reload the page to ensure a clean state
      window.location.reload();
    } catch (error) {
      console.error('Unexpected error during sign out:', error);
    }
  };
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-20">
      <div className="max-w-lg mx-auto px-4">
        <div className="flex justify-around py-3">
          <Link 
            to="/workouts" 
            className={`flex flex-col items-center min-w-[100px] h-[64px] justify-center ${
              location.pathname === '/workouts' 
                ? 'text-black dark:text-black bg-[#dbf111] px-4 rounded-lg' 
                : 'text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white hover:bg-[#dbf111] px-4 rounded-lg'
            }`}
          >
            <HomeIcon className="h-6 w-6" />
            <span className="text-sm">Workouts</span>
          </Link>
          <Link 
            to="/statistics" 
            className={`flex flex-col items-center min-w-[100px] h-[64px] justify-center ${
              location.pathname === '/statistics' 
                ? 'text-black dark:text-black bg-[#dbf111] px-4 rounded-lg' 
                : 'text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white hover:bg-[#dbf111] px-4 rounded-lg'
            }`}
          >
            <ChartBarIcon className="h-6 w-6" />
            <span className="text-sm">Statistics</span>
          </Link>
          <button
            onClick={handleLogout}
            className="flex flex-col items-center min-w-[100px] h-[64px] justify-center text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white hover:bg-[#dbf111] px-4 rounded-lg transition-all"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="text-sm">Logout</span>
          </button>
        </div>
      </div>
    </nav>
  );
}