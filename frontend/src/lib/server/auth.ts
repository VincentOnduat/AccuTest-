import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

/**
 * Authenticates a request against Supabase.
 *
 * Most dashboard fetches send an `Authorization: Bearer <token>` header, so that's
 * tried first. A few pages instead rely on `credentials: 'include'` with no header
 * (expecting the Supabase session cookies to carry auth) — pass `cookies` (the
 * SvelteKit `RequestEvent.cookies`) to fall back to that path for those callers.
 *
 * Returns `{ user, supabase }` (a Supabase client scoped to whichever credential
 * worked) or `null` if neither is present/valid.
 */
export async function getUserFromRequest(request: Request, cookies?: import('@sveltejs/kit').Cookies) {
  const authHeader = request.headers.get('authorization');

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    console.log('🔑 Token received, length:', token.length);

    const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      console.log('❌ Token validation error:', error?.message);
      return null;
    }

    console.log('✅ User authenticated:', user.email);
    return { user, supabase };
  }

  if (cookies) {
    const supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
      cookies: {
        get: (key) => cookies.get(key),
        set: (key, value, options) => cookies.set(key, value, { ...options, path: '/' }),
        remove: (key, options) => cookies.delete(key, { ...options, path: '/' })
      }
    });

    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      console.log('❌ No session cookie found for request');
      return null;
    }

    console.log('✅ User authenticated via cookies:', user.email);
    return { user, supabase };
  }

  console.log('❌ No Bearer token or cookies present on request');
  return null;
}
