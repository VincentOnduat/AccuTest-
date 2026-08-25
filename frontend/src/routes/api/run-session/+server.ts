import { json } from '@sveltejs/kit';
import { getUserFromRequest } from '$lib/server/auth';
import { runPlaywrightCode, REAL_EXECUTION_FRAMEWORKS } from '$lib/server/testRunner';

export async function POST({ request, cookies }) {
  try {
    const auth = await getUserFromRequest(request, cookies);
    if (!auth) return json({ error: 'Unauthorized' }, { status: 401 });

    const { sessionId } = await request.json();
    if (!sessionId) {
      return json({ error: 'Missing sessionId' }, { status: 400 });
    }

    const { data: session, error: sessionError } = await auth.supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', auth.user.id)
      .single();

    if (sessionError || !session) {
      return json({ error: 'Session not found' }, { status: 404 });
    }

    // Sessions don't carry an explicit test list, so run the user's tests that
    // match the session's type (e.g. 'ui', 'api'); fall back to all of the
    // user's tests if none share that type.
    let { data: tests } = await auth.supabase
      .from('tests')
      .select('*')
      .eq('user_id', auth.user.id)
      .eq('type', session.type);

    if (!tests || tests.length === 0) {
      const { data: allTests } = await auth.supabase.from('tests').select('*').eq('user_id', auth.user.id);
      tests = allTests || [];
    }

    // NOTE: this deliberately does not write to test_results. That table's
    // session_id foreign key points at test_sessions, not the sessions table
    // this page (and the rest of the dashboard's Sessions UI) actually uses —
    // inserting here would fail a FK constraint. The session-detail page's own
    // `test_results` query has the same mismatch (it also expects an embed
    // relationship to `tests` that doesn't exist in the schema), which is a
    // separate, pre-existing issue beyond this endpoint. This just records the
    // run's outcome on the session row itself, which the schema does support.
    const { data: profile } = await auth.supabase.from('profiles').select('target_url').eq('id', auth.user.id).single();
    const baseUrl = profile?.target_url || undefined;

    const startTime = Date.now();
    let passedCount = 0;
    let failedCount = 0;
    let skippedCount = 0;
    const logLines: string[] = [];

    for (const t of tests) {
      const framework = t.framework || 'playwright';
      const code: string = t.code || '';

      if (!code.trim() || !REAL_EXECUTION_FRAMEWORKS.has(framework)) {
        // Honest: nothing to actually run (no code, or a framework we don't
        // execute for real yet) — mark it skipped instead of faking a result.
        skippedCount++;
        logLines.push(`⏭️ ${t.name}: skipped (${!code.trim() ? 'no code' : `execution not supported for "${framework}"`})`);
        continue;
      }

      const run = await runPlaywrightCode(code, { baseUrl });
      if (run.status === 'error') {
        skippedCount++;
        logLines.push(`⚠️ ${t.name}: run failed to complete (${run.rawError?.split('\n')[0] || 'unknown error'})`);
        continue;
      }

      const anyFailed = run.results.some((r) => r.status === 'failed' || r.status === 'timedOut');
      if (anyFailed) {
        failedCount++;
      } else {
        passedCount++;
      }
      logLines.push(`${anyFailed ? '❌' : '✅'} ${t.name}: ${anyFailed ? 'failed' : 'passed'} (${run.duration}ms)`);
    }

    const totalDuration = Date.now() - startTime;
    const finalStatus = failedCount === 0 ? 'completed' : 'failed';
    const nowIso = new Date().toISOString();

    const { error: updateError } = await auth.supabase
      .from('sessions')
      .update({
        status: finalStatus,
        progress: 100,
        test_count: tests.length,
        passed_tests: passedCount,
        failed_tests: failedCount,
        skipped_tests: skippedCount,
        duration: totalDuration,
        end_time: nowIso,
        completed_at: nowIso,
        logs:
          `Ran ${tests.length} test(s): ${passedCount} passed, ${failedCount} failed, ${skippedCount} skipped.\n` +
          logLines.join('\n')
      })
      .eq('id', sessionId)
      .eq('user_id', auth.user.id);

    if (updateError) {
      console.error('Error updating session:', updateError);
      return json({ error: updateError.message }, { status: 500 });
    }

    return json({
      success: true,
      sessionId,
      summary: {
        total: tests.length,
        passed: passedCount,
        failed: failedCount,
        skipped: skippedCount,
        duration: totalDuration
      }
    });
  } catch (error) {
    console.error('Run session error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
