import { Link, useLocation } from 'react-router-dom';
import { HomeIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import { supabase } from '../lib/supabase';

export default function Navigation() {
  const location = useLocation();
  
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
    }
  };
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
      <div className="max-w-lg mx-auto px-4">
        <div className="flex justify-around py-3">
          <Link to="/" className={`flex flex-col items-center ${location.pathname === '/' ? 'text-blue-600' : 'text-gray-600'}`}>
            <HomeIcon className="h-6 w-6" />
            <span className="text-sm">Workouts</span>
          </Link>
          <Link to="/statistics" className={`flex flex-col items-center ${location.pathname === '/statistics' ? 'text-blue-600' : 'text-gray-600'}`}>
            <ChartBarIcon className="h-6 w-6" />
            <span className="text-sm">Statistics</span>
          </Link>
          <button
            onClick={handleLogout}
            className="flex flex-col items-center text-gray-600"
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