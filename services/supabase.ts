/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables:', {
    url: supabaseUrl ? 'set' : 'missing',
    key: supabaseAnonKey ? 'set' : 'missing'
  });
  throw new Error('Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local or Vercel environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    storageKey: 'supabase.auth.token',
    flowType: 'pkce',
    // Ensure session persists across refreshes
    debug: false
  },
  // Disable caching for database queries
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    },
    // Add fetch options to prevent hanging
    fetch: (url, options = {}) => {
      // Create AbortController for timeout (more compatible than AbortSignal.timeout)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
      
      return fetch(url, {
        ...options,
        signal: controller.signal
      }).catch((error) => {
        clearTimeout(timeoutId);
        // If timeout, throw a more descriptive error
        if (error.name === 'AbortError' || error.name === 'TimeoutError') {
          throw new Error('Request timeout - connection to database is slow or unavailable');
        }
        throw error;
      }).finally(() => {
        clearTimeout(timeoutId);
      });
    }
  },
  // Real-time configuration
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});
