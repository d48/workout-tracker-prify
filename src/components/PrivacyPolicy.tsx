import { Link } from 'react-router-dom';
import { useTheme } from '../lib/ThemeContext';
import ThemeToggle from './ThemeToggle';

export default function PrivacyPolicy() {
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Privacy Policy</h1>
          <div className="prose dark:prose-invert">
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              At PRIFY Workout Tracker, we take your privacy seriously. We do not share, sell, or distribute your personal information to third parties. All passwords are securely encrypted, and we implement industry-standard security measures to protect your data.
            </p>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed mt-4">
              Any information you provide is used solely to enhance your experience on our platform. If you have any concerns, please contact us.
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