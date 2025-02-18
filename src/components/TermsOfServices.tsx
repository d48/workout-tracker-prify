import { Link } from 'react-router-dom';
import { useTheme } from '../lib/ThemeContext';
import ThemeToggle from './ThemeToggle';

export default function TermsOfService() {
  const { logo } = useTheme();

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="fixed top-0 left-0 right-0 bg-white dark:bg-gray-800 shadow-md z-10">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Link to="/">
              <img 
                src={logo}
                alt="PRIFY Workout Tracker" 
                className="h-16 cursor-pointer"
              />
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-32 pb-16">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Terms of Service</h1>
          <div className="prose dark:prose-invert">
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              By using PRIFY Workout Tracker, you agree to comply with our terms. Your account is personal and should not be shared. We do our best to keep your data secure, including encrypting passwords and preventing unauthorized access.
            </p>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed mt-4">
              Misuse of the platform, including attempting to breach security or manipulate records, may result in account termination. We reserve the right to update these terms as needed. Continued use of our service indicates acceptance of any changes.
            </p>
          </div>
          <div className="mt-8 pt-6 border-t dark:border-gray-700">
            <Link 
              to="/" 
              className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white text-sm"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}