import type { SupabaseClient } from '@supabase/supabase-js';
import { runPackageAndRecord, type PackageRow } from './packageRunner';

/**
 * The scheduler half of removing the human from the accumulation loop (see
 * api/internal/scheduled-runs for the trigger and the full reasoning).
 * Everything here runs with a SERVICE-ROLE Supabase client, since finding
 * and running "every account's due packages" is inherently a cross-account
 * operation no per-user RLS-scoped client could do — the caller is
 * responsible for constructing that client and never handing it to
 * anything client-facing.
 */

// A run at midnight for every account with a package due at midnight would
// be a real, avoidable spike in concurrent headless Chromium processes on a
// single server. One batch per invocation, invoked hourly (see the pg_cron
// schedule), spreads that out instead.
const MAX_PACKAGES_PER_BATCH = 20;
const RERUN_INTERVAL_HOURS = 24;

export interface ScheduledRunOutcome {
  packageId: string;
  outcome: string;
  error?: string;
}

type DuePackageRow = PackageRow & { user_id: string };

/** Finds packages whose owner opted into auto-rerun and whose schedule has come due. */
async function findDuePackages(supabase: SupabaseClient): Promise<DuePackageRow[]> {
  const { data, error } = await supabase
    .from('test_packages')
    .select('id, user_id, name, status, target_url, test_cases')
    .eq('auto_rerun_enabled', true)
    .or(`next_scheduled_run_at.is.null,next_scheduled_run_at.lte.${new Date().toISOString()}`)
    .order('next_scheduled_run_at', { ascending: true, nullsFirst: true })
    .limit(MAX_PACKAGES_PER_BATCH);

  if (error) {
    console.error('Failed to query due packages:', error);
    return [];
  }
  return data || [];
}

/**
 * Runs every currently-due package once (via the same runPackageAndRecord
 * used by a real click of the Run button) and reschedules each one 24 hours
 * out regardless of outcome — a package that fails to run isn't retried
 * sooner, since a broken target site or broken generated code won't fix
 * itself between now and the next scheduled attempt.
 */
export async function runDuePackages(supabase: SupabaseClient): Promise<ScheduledRunOutcome[]> {
  const due = await findDuePackages(supabase);
  const outcomes: ScheduledRunOutcome[] = [];

  for (const pkg of due) {
    const userId = pkg.user_id;
    try {
      const result = await runPackageAndRecord(supabase, userId, pkg, { environment: 'scheduled' });
      outcomes.push({ packageId: pkg.id, outcome: result.outcome, error: 'error' in result ? result.error : undefined });
    } catch (err) {
      console.error(`Scheduled run failed for package ${pkg.id}:`, err);
      outcomes.push({ packageId: pkg.id, outcome: 'exception', error: err instanceof Error ? err.message : String(err) });
    } finally {
      // Reschedule regardless of outcome — see the function comment above.
      await supabase
        .from('test_packages')
        .update({ next_scheduled_run_at: new Date(Date.now() + RERUN_INTERVAL_HOURS * 60 * 60 * 1000).toISOString() })
        .eq('id', pkg.id);
    }
  }

  return outcomes;
}
