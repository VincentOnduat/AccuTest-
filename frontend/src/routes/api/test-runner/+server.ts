import { json } from '@sveltejs/kit';
import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { runPlaywrightCode, REAL_EXECUTION_FRAMEWORKS } from '$lib/server/testRunner';
import { assertSafeTargetUrl, UnsafeTargetUrlError } from '$lib/server/targetUrl';

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

    const framework: string = pkg.test_cases?.framework || 'playwright';
    const code: string = pkg.test_cases?.executableCode || '';

    if (!REAL_EXECUTION_FRAMEWORKS.has(framework)) {
      // Honest: we don't fabricate results for frameworks we can't actually
      // run yet (Cypress/Jest). Tell the caller plainly instead of guessing.
      return json(
        {
          error: `Real execution isn't implemented yet for "${framework}" — only Playwright-family generated code can be run right now. The generated code is still available in the package.`
        },
        { status: 501 }
      );
    }

    if (!code.trim()) {
      return json({ error: 'This package has no generated code to execute.' }, { status: 400 });
    }

    // A package can target its own remote website (set at generation time);
    // otherwise fall back to the account-wide default from Settings.
    const { data: profile } = await supabase.from('profiles').select('target_url').eq('id', user.id).single();
    const targetUrlRaw: string | undefined = pkg.target_url || profile?.target_url || undefined;

    // Re-validate here regardless of where the URL came from — this is the
    // one place that actually launches a browser against it, so it's the
    // choke point that has to hold even if something upstream (a direct API
    // call, a stale saved value) skipped validation. See targetUrl.ts.
    let baseUrl: string | undefined;
    if (targetUrlRaw) {
      try {
        baseUrl = (await assertSafeTargetUrl(targetUrlRaw)).toString();
      } catch (err) {
        if (err instanceof UnsafeTargetUrlError) {
          return json({ error: err.message }, { status: 400 });
        }
        throw err;
      }
    }

    const run = await runPlaywrightCode(code, { baseUrl });

    // A package that's actually been executed at least once is no longer just
    // a "draft" — flip it once, regardless of the run's outcome. (Never
    // downgrade a package a user has since marked otherwise.)
    if (pkg.status === 'draft') {
      await supabase.from('test_packages').update({ status: 'active' }).eq('id', package_id).eq('user_id', user.id);
    }

    if (run.status === 'error') {
      // The run itself couldn't complete (crash/timeout/bad code) — still record it
      // so it's visible in the execution history, but don't claim a pass/fail verdict.
      // test_executions has no dedicated error column, so the failure reason is
      // stored as a single synthetic result — it renders through the same
      // per-test list the UI already uses, and survives a page reload.
      const { data: execution } = await supabase
        .from('test_executions')
        .insert({
          user_id: user.id,
          package_id,
          name: `${pkg.name} - ${new Date().toLocaleString()}`,
          suite_name: pkg.name,
          status: 'error',
          duration: run.duration,
          environment,
          test_results: [
            {
              name: 'Run did not complete',
              status: 'failed',
              duration: run.duration,
              error_message: run.rawError || 'Unknown error'
            }
          ],
          executed_at: new Date().toISOString()
        })
        .select()
        .single();

      return json(
        { error: 'Test run did not complete', detail: run.rawError, execution_id: execution?.id },
        { status: 500 }
      );
    }

    const passedCount = run.results.filter((r) => r.status === 'passed').length;
    const failedCount = run.results.filter((r) => r.status === 'failed' || r.status === 'timedOut').length;

    const { data: execution, error: execError } = await supabase
      .from('test_executions')
      .insert({
        user_id: user.id,
        package_id,
        name: `${pkg.name} - ${new Date().toLocaleString()}`,
        suite_name: pkg.name,
        status: run.status,
        duration: run.duration,
        environment,
        test_results: run.results,
        executed_at: new Date().toISOString()
      })
      .select()
      .single();

    if (execError) {
      return json({ error: execError.message }, { status: 500 });
    }

    return json({
      success: true,
      execution_id: execution.id,
      summary: {
        total: run.results.length,
        passed: passedCount,
        failed: failedCount,
        duration: run.duration,
        passRate: run.results.length ? (passedCount / run.results.length) * 100 : 0
      },
      results: run.results
    });
  } catch (error) {
    console.error('Test runner error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
