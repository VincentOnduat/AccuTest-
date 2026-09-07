import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
// Both dynamic/private, matching the reasoning already in api/ai/generate-test-package
// for OPENAI_API_KEY: read at request time, never inlined into the build, so neither
// secret ends up baked into an image layer or the client bundle.
import { env as privateEnv } from '$env/dynamic/private';
import { runDuePackages } from '$lib/server/scheduledRuns';

/**
 * The trigger for removing the human from the accumulation loop — see the
 * QA report's "Highest leverage, near-term" recommendation. Both prior
 * assessments and the QA pass flagged the same thing: flaky detection and
 * selector memory only learn anything when a person clicks Run, which caps
 * how fast real execution history accumulates at the pace of manual habit.
 *
 * This is called on a schedule by pg_cron + pg_net running inside the
 * Supabase project itself (see migrations/20260907000100_schedule_package_reruns.sql)
 * rather than by any user action — there is no user session here at all,
 * which is exactly why it needs its own authentication (a shared secret,
 * not a user JWT) and its own elevated database access (a service-role
 * client, since finding and running every account's due packages is
 * inherently cross-account — no per-user RLS-scoped client could do it).
 *
 * Two things must be true in this app's environment for this to do
 * anything at all: CRON_SECRET and SUPABASE_SERVICE_ROLE_KEY both set.
 * Neither exists by default — see README's Scheduled Execution section.
 * Until both are set, this 503s and nothing runs; it is not silently a
 * no-op that could be mistaken for "working, just idle."
 */
export async function POST({ request }) {
  const expectedSecret = privateEnv.CRON_SECRET;
  if (!expectedSecret) {
    return json({ error: 'Scheduled execution is not configured — CRON_SECRET is not set.' }, { status: 503 });
  }

  const providedSecret = request.headers.get('x-cron-secret');
  if (providedSecret !== expectedSecret) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const serviceRoleKey = privateEnv.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return json({ error: 'Scheduled execution is not configured — SUPABASE_SERVICE_ROLE_KEY is not set.' }, { status: 503 });
  }

  try {
    const supabase = createClient(PUBLIC_SUPABASE_URL, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const outcomes = await runDuePackages(supabase);
    return json({ ranCount: outcomes.length, outcomes });
  } catch (error) {
    console.error('Scheduled runs error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
