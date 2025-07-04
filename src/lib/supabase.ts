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

// Create Supabase client with enhanced error handling
export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    debug: import.meta.env.MODE === 'development',
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

// Test basic connectivity with better error handling
const testConnection = async () => {
  try {
    console.log('Testing Supabase connection...');
    
    // Use a simple auth check instead of direct fetch to test connectivity
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.warn('⚠ Supabase connection test failed:', error.message);
      
      // Provide specific guidance based on error type
      if (error.message.includes('Failed to fetch') || error.message.includes('fetch')) {
        console.error('Network connectivity issue detected. Please check:');
        console.error('1. Your internet connection');
        console.error('2. Supabase project URL and API key in .env file');
        console.error('3. Supabase project status at https://supabase.com/dashboard');
        console.error('4. Restart your development server after updating .env');
        console.error('5. Check if your firewall or proxy is blocking requests to Supabase');
      }
    } else {
      console.log('✓ Supabase connection test successful');
    }
  } catch (error) {
    console.warn('⚠ Supabase connection test failed:', error);
    
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      console.error('Network error detected. Please check:');
      console.error('1. Your internet connection');
      console.error('2. Supabase project status');
      console.error('3. Environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)');
      console.error('4. Restart your development server');
      console.error('5. Verify your Supabase project URL and API key are correct');
      console.error('6. Check if your firewall or proxy is blocking requests');
    }
  }
};

// Run connection test in development with delay to avoid blocking initialization
if (import.meta.env.MODE === 'development') {
  setTimeout(testConnection, 1000);
}

console.log('✓ Supabase client initialized successfully');

// Export a helper function to check if Supabase is properly configured
export const isSupabaseConfigured = () => {
  return !!(supabaseUrl && supabaseKey);
};

// Export a helper function to test connectivity
export const testSupabaseConnection = async () => {
  try {
    const { error } = await supabase.auth.getSession();
    return { success: !error, error: error?.message };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};