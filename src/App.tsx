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
import Index from './components/Index';
import { ThemeProvider } from './lib/ThemeContext';

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
      <Router>
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors">
          <div className="max-w-full mx-auto pb-20">
            <Routes>
              <Route path="/" element={session ? <Navigate to="/workouts" replace /> : <Index />} />
              <Route path="/sign-in" element={<Auth />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/terms-of-service" element={<TermsOfService />} />
              <Route path="/workouts" element={<WorkoutList />} />
              <Route path="/workout/:id" element={<WorkoutDetail />} />
              <Route path="/statistics" element={<Statistics />} />
              <Route path="*" element={<Navigate to={session ? "/workouts" : "/"} replace />} />
            </Routes>
          </div>
          {session && <Navigation />}
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;