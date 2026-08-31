import { json, type RequestEvent } from '@sveltejs/kit';
import { createServerClient } from '@supabase/ssr';
import { dev } from '$app/environment';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

export async function POST({ request, cookies }: RequestEvent) {
  try {
    const { session } = await request.json();

    if (!session) {
      return json({ error: 'No session provided' }, { status: 400 });
    }

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
              // httpOnly is safe here — nothing in this app reads these
              // cookies from client-side JS; the browser Supabase client
              // (lib/supabase.ts) keeps its own session in localStorage, and
              // these cookies exist purely so SvelteKit server routes can
              // read the session via cookies.get() on the raw request,
              // which works regardless of httpOnly.
              httpOnly: true,
              // secure: true would make the browser silently drop the
              // cookie over plain http://localhost in dev — only require it
              // in production, where the app is actually served over HTTPS.
              secure: !dev,
              sameSite: 'lax'
            });
          },
          remove: (key, options) => {
            cookies.delete(key, { ...options, path: '/' });
          }
        }
      }
    );

    await supabase.auth.setSession(session);

    return json({ success: true });
  } catch (error) {
    console.error('Set cookie error:', error);
    return json({ error: 'Failed to set cookies' }, { status: 500 });
  }
}
