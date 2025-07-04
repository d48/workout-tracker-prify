import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Enhanced debugging for Supabase configuration
console.log('Supabase Configuration Check:');
console.log('- URL:', supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'MISSING');
console.log('- Key exists:', !!supabaseKey);
console.log('- Key length:', supabaseKey ? supabaseKey.length : 0);
console.log('- Environment:', import.meta.env.MODE);

if (!supabaseUrl || !supabaseKey) {
  const missingVars = [];
  if (!supabaseUrl) missingVars.push('VITE_SUPABASE_URL');
  if (!supabaseKey) missingVars.push('VITE_SUPABASE_ANON_KEY');
  
  const errorMessage = `Missing required environment variables: ${missingVars.join(', ')}. Please check your .env file and restart the development server.`;
  console.error(errorMessage);
  throw new Error(errorMessage);
}

// Validate URL format
try {
  new URL(supabaseUrl);
  console.log('✓ Supabase URL format is valid');
} catch (error) {
  const errorMessage = `Invalid VITE_SUPABASE_URL format: ${supabaseUrl}. Please check your .env file.`;
  console.error(errorMessage);
  throw new Error(errorMessage);
}

// Test basic connectivity
const testConnection = async () => {
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'HEAD',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    
    if (response.ok) {
      console.log('✓ Supabase connection test successful');
    } else {
      console.warn('⚠ Supabase connection test failed:', response.status, response.statusText);
    }
  } catch (error) {
    console.warn('⚠ Supabase connection test failed:', error);
  }
};

// Run connection test in development
if (import.meta.env.MODE === 'development') {
  testConnection();
}

export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    debug: process.env.NODE_ENV === 'development',
    storage: {
      getItem: (key) => {
        try {
          return localStorage.getItem(key);
        } catch (error) {
          console.warn('Error accessing localStorage:', error);
          return null;
        }
      },
      setItem: (key, value) => {
        try {
          localStorage.setItem(key, value);
        } catch (error) {
          console.warn('Error writing to localStorage:', error);
        }
      },
      removeItem: (key) => {
        try {
          localStorage.removeItem(key);
        } catch (error) {
          console.warn('Error removing from localStorage:', error);
        }
      }
    }
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'x-my-custom-header': 'workout-tracker'
    }
  }
});

console.log('✓ Supabase client initialized successfully');