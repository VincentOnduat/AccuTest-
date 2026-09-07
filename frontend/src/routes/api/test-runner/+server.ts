import { json } from '@sveltejs/kit';
import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { runPackageAndRecord } from '$lib/server/packageRunner';

export async function POST({ request, cookies }) {
  try {
    const supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
      cookies: {
        get: (key) => cookies.get(key),
        set: (key, value, options) => cookies.set(key, value, options),
        remove: (key, options) => cookies.delete(key, options)
      }
    });

    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { package_id, environment = 'staging' } = await request.json();

    // Fetch the test package
    const { data: pkg, error: pkgError } = await supabase
      .from('test_packages')
      .select('*')
      .eq('id', package_id)
      .eq('user_id', user.id)
      .single();

    if (pkgError || !pkg) {
      return json({ error: 'Test package not found' }, { status: 404 });
    }

    // A package can target its own remote website (set at generation time);
    // otherwise fall back to the account-wide default from Settings.
    const { data: profile } = await supabase.from('profiles').select('target_url').eq('id', user.id).single();

    const result = await runPackageAndRecord(supabase, user.id, pkg, {
      environment,
      fallbackTargetUrl: profile?.target_url
    });

    switch (result.outcome) {
      case 'unsupported_framework':
        // Honest: we don't fabricate results for frameworks we can't actually run yet.
        return json({ error: result.error }, { status: 501 });
      case 'no_code':
        return json({ error: result.error }, { status: 400 });
      case 'unsafe_target_url':
        return json({ error: result.error }, { status: 400 });
      case 'run_incomplete':
        return json({ error: result.error, detail: result.detail, execution_id: result.executionId }, { status: 500 });
      case 'ran':
        return json({
          success: true,
          execution_id: result.executionId,
          summary: result.summary,
          results: result.results
        });
    }
  } catch (error) {
    console.error('Test runner error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
