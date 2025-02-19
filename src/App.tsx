import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import WorkoutList from './components/WorkoutList';
import WorkoutDetail from './components/WorkoutDetail';
import Statistics from './components/Statistics';
import Navigation from './components/Navigation';
import Auth from './components/Auth';
import PrivacyPolicy from './components/PrivacyPolicy';
import TermsOfService from './components/TermsOfService';
import { ThemeProvider } from './lib/ThemeContext';
import { ToastProvider } from './lib/ToastContext';

function App() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <ThemeProvider>
      <ToastProvider>
        {!session ? (
          <Router>
            <div className="dark:bg-gray-900 transition-colors">
              <Routes>
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/terms-of-service" element={<TermsOfService />} />
                <Route path="*" element={<Auth />} />
              </Routes>
            </div>
          </Router>
        ) : (
          <Router>
            <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors">
              <div className="max-w-lg mx-auto pb-20">
                <Routes>
                  <Route path="/" element={<WorkoutList />} />
                  <Route path="/workout/:id" element={<WorkoutDetail />} />
                  <Route path="/statistics" element={<Statistics />} />
                  <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                  <Route path="/terms-of-service" element={<TermsOfService />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </div>
              <Navigation />
            </div>
          </Router>
        )}
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;