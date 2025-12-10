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
          // Chrome-specific: Handle errors more gracefully with retry logic
          fetch: (url, options = {}) => {
            // Chrome may have stricter CORS or network policies
            // Add retry logic for failed requests
            const fetchWithRetry = async (attempt = 0): Promise<Response> => {
              const maxRetries = 2;
              const controller = new AbortController();
              // Increased timeout for file uploads (5 minutes for large files)
              const isStorageRequest = url.toString().includes('/storage/');
              const timeoutDuration = isStorageRequest ? 5 * 60 * 1000 : 15000; // 5 minutes for storage, 15 seconds for others
              const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);
              
              // Merge existing signal if present (for nested abort controllers)
              const existingSignal = (options as any)?.signal;
              if (existingSignal) {
                existingSignal.addEventListener('abort', () => controller.abort());
              }
              
              try {
                const response = await fetch(url, {
                  ...options,
                  signal: controller.signal,
                  // Chrome-specific: Add cache control
                  cache: 'no-store'
                  // Note: Don't use credentials: 'include' as it causes CORS issues
                  // Supabase handles authentication via headers, not cookies
                });
                
                clearTimeout(timeoutId);
                return response;
              } catch (error: any) {
                clearTimeout(timeoutId);
                
                // If timeout or network error, retry
                if ((error.name === 'AbortError' || error.name === 'TimeoutError' || error.message?.includes('network')) && attempt < maxRetries) {
                  console.warn(`Fetch retry ${attempt + 1}/${maxRetries} for:`, url);
                  await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1))); // Exponential backoff
                  return fetchWithRetry(attempt + 1);
                }
                
                // If timeout, throw a more descriptive error
                if (error.name === 'AbortError' || error.name === 'TimeoutError') {
                  console.warn('Fetch timeout for:', url);
                  throw new Error('Request timeout - connection to database is slow or unavailable');
                }
                throw error;
              }
            };
            
            return fetchWithRetry();
          }
  },
  // Real-time configuration
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});
