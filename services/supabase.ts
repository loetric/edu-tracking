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

// Chrome-specific: Custom storage adapter that handles Chrome's stricter localStorage
const getStorage = () => {
  if (typeof window === 'undefined') return undefined;
  
  try {
    // Test localStorage access (Chrome may block in certain contexts)
    const testKey = '__supabase_test__';
    window.localStorage.setItem(testKey, 'test');
    window.localStorage.removeItem(testKey);
    return window.localStorage;
  } catch (error) {
    console.warn('=== localStorage not available, using memory storage ===', error);
    // Fallback to memory storage if localStorage is blocked
    const memoryStorage: { [key: string]: string } = {};
    return {
      getItem: (key: string) => memoryStorage[key] || null,
      setItem: (key: string, value: string) => { memoryStorage[key] = value; },
      removeItem: (key: string) => { delete memoryStorage[key]; },
      clear: () => { Object.keys(memoryStorage).forEach(k => delete memoryStorage[k]); },
      get length() { return Object.keys(memoryStorage).length; },
      key: (index: number) => Object.keys(memoryStorage)[index] || null
    } as Storage;
  }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: getStorage(),
    storageKey: 'supabase.auth.token',
    flowType: 'pkce',
    // Chrome-specific: Ensure session persists across refreshes
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
    // Chrome-specific: Handle errors more gracefully
    fetch: (url, options = {}) => {
      // Create AbortController for timeout (more compatible than AbortSignal.timeout)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // Increased to 10 seconds for Chrome
      
      // Merge existing signal if present (for nested abort controllers)
      const existingSignal = (options as any)?.signal;
      if (existingSignal) {
        existingSignal.addEventListener('abort', () => controller.abort());
      }
      
      return fetch(url, {
        ...options,
        signal: controller.signal
      }).catch((error) => {
        clearTimeout(timeoutId);
        // If timeout, throw a more descriptive error
        if (error.name === 'AbortError' || error.name === 'TimeoutError') {
          console.warn('Fetch timeout for:', url);
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
