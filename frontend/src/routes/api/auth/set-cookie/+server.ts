import { json, type RequestEvent } from '@sveltejs/kit';
import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

export async function POST({ request, cookies }: RequestEvent) {
  try {
    const { session } = await request.json();
    
    if (!session) {
      return json({ error: 'No session provided' }, { status: 400 });
    }

    console.log('📡 Setting cookies for user:', session.user?.email);

    const supabase = createServerClient(
      PUBLIC_SUPABASE_URL,
      PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get: (key) => cookies.get(key),
          set: (key, value, options) => {
            cookies.set(key, value, { 
              ...options, 
              path: '/',
              httpOnly: false,
              secure: false,
              sameSite: 'lax'
            });
            console.log(`🍪 Set cookie: ${key}`);
          },
          remove: (key, options) => {
            cookies.delete(key, { ...options, path: '/' });
          },
        },
      }
    );

    await supabase.auth.setSession(session);
    console.log('✅ Cookies set successfully');
    
    return json({ success: true });
  } catch (error) {
    console.error('Set cookie error:', error);
    return json({ error: 'Failed to set cookies' }, { status: 500 });
  }
}
