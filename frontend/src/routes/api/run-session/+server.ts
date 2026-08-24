import { json } from '@sveltejs/kit';
import { getUserFromRequest } from '$lib/server/auth';

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
      const { data: allTests } = await auth.supabase
        .from('tests')
        .select('*')
        .eq('user_id', auth.user.id);
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
    const startTime = Date.now();
    let passedCount = 0;
    let failedCount = 0;

    for (const _test of tests) {
      const passed = Math.random() > 0.2; // simulated execution, same convention as /api/test-runner
      if (passed) passedCount++;
      else failedCount++;
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
        skipped_tests: 0,
        duration: totalDuration,
        end_time: nowIso,
        completed_at: nowIso,
        logs: `Ran ${tests.length} test(s): ${passedCount} passed, ${failedCount} failed.`
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
        duration: totalDuration
      }
    });
  } catch (error) {
    console.error('Run session error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
