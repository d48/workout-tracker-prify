import { Link } from 'react-router-dom';
import Header from './Header';

export default function PrivacyPolicy() {
  return (
    <>
      <Header headerType="detail" />
      <div className="p-4">
        <div className="max-w-2xl mx-auto">
          <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
            <div className="max-w-lg mx-auto px-4 pt-4 pb-16">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Privacy Policy</h1>
                <div className="prose dark:prose-invert">
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                    At PRify Workout Tracker, we take your privacy seriously. We do not share, sell, or distribute your personal information to third parties. All passwords are securely encrypted, and we implement industry-standard security measures to protect your data.
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
        </div>
      </div>
    </>
  );
}