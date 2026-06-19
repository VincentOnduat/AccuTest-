import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

// Check if we're in the browser
const isBrowser = typeof window !== 'undefined' && typeof localStorage !== 'undefined';

export const supabase = createClient(
  PUBLIC_SUPABASE_URL,
  PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: isBrowser ? localStorage : undefined,
      flowType: 'pkce'
    }
  }
);

console.log('📡 Env vars loaded:', {
  hasUrl: !!PUBLIC_SUPABASE_URL,
  hasKey: !!PUBLIC_SUPABASE_ANON_KEY,
  urlPrefix: PUBLIC_SUPABASE_URL?.substring(0, 30)
});

console.log('✅ Supabase client initialized');
