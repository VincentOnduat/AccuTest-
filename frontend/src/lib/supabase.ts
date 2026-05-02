import { createClient } from '@supabase/supabase-js'
import { browser } from '$app/environment';

// Import env vars
let PUBLIC_SUPABASE_URL = '';
let PUBLIC_SUPABASE_ANON_KEY = '';

try {
  const env = await import('$env/static/public');
  PUBLIC_SUPABASE_URL = env.PUBLIC_SUPABASE_URL;
  PUBLIC_SUPABASE_ANON_KEY = env.PUBLIC_SUPABASE_ANON_KEY;
  
  console.log('📡 Env vars loaded:', {
    hasUrl: !!PUBLIC_SUPABASE_URL,
    hasKey: !!PUBLIC_SUPABASE_ANON_KEY,
    urlPrefix: PUBLIC_SUPABASE_URL?.substring(0, 30)
  });
} catch (err) {
  console.error('❌ Failed to load environment variables:', err);
}

if (!PUBLIC_SUPABASE_URL || !PUBLIC_SUPABASE_ANON_KEY) {
  console.error('❌ Supabase credentials missing!');
}

export const supabase = createClient(
  PUBLIC_SUPABASE_URL || '',
  PUBLIC_SUPABASE_ANON_KEY || '',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,  // This is crucial - auto-refreshes expired tokens
      detectSessionInUrl: true,
      storage: browser ? localStorage : undefined,
      flowType: 'pkce'
    }
  }
)

// Function to refresh session if needed
export async function ensureValidSession() {
  if (!browser) return null;
  
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error) {
    console.error('Session error:', error);
    return null;
  }
  
  if (!session) {
    console.log('No session found');
    return null;
  }
  
  // Check if session is about to expire (within 5 minutes)
  const expiresAt = session.expires_at;
  if (expiresAt) {
    const now = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = expiresAt - now;
    
    if (timeUntilExpiry < 300) { // Less than 5 minutes
      console.log('Session expiring soon, refreshing...');
      const { data: { session: newSession }, error: refreshError } = await supabase.auth.refreshSession();
      if (!refreshError && newSession) {
        console.log('Session refreshed successfully');
        return newSession;
      }
    }
  }
  
  return session;
}

console.log('✅ Supabase client initialized');
