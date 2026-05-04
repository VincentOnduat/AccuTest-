import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

console.log('📡 Env vars loaded:', {
    hasUrl: !!PUBLIC_SUPABASE_URL,
    hasKey: !!PUBLIC_SUPABASE_ANON_KEY,
    urlPrefix: PUBLIC_SUPABASE_URL?.substring(0, 30)
});

if (!PUBLIC_SUPABASE_URL || !PUBLIC_SUPABASE_ANON_KEY) {
    console.error('❌ Supabase credentials missing!');
}

export const supabase = createClient(
    PUBLIC_SUPABASE_URL,
    PUBLIC_SUPABASE_ANON_KEY,
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            flowType: 'pkce'
        }
    }
);

console.log('✅ Supabase client initialized');
