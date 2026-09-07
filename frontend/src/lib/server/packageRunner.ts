import type { SupabaseClient } from '@supabase/supabase-js';
import { runPlaywrightCode, REAL_EXECUTION_FRAMEWORKS, type TestCaseResult } from './testRunner';
import { assertSafeTargetUrl, UnsafeTargetUrlError } from './targetUrl';
import { recordSelectorOutcomes } from './selectorMemory';

/**
 * Runs one test package for real and records the result — the single shared
 * code path behind both api/test-runner (a person clicking Run) and
 * api/internal/scheduled-runs (the cron-triggered path that removes the
 * human from the accumulation loop; see that route for the reasoning).
 * Pulled out of api/test-runner so there's exactly one implementation of
 * "run a package," not two that could quietly drift apart.
 */

export interface PackageRow {
  id: string;
  name: string;
  status: string;
  target_url: string | null;
  test_cases: { framework?: string; executableCode?: string } | null;
}

export type RunPackageResult =
  | { outcome: 'unsupported_framework'; error: string }
  | { outcome: 'no_code'; error: string }
  | { outcome: 'unsafe_target_url'; error: string }
  | { outcome: 'run_incomplete'; error: string; detail?: string; executionId: string | null }
  | {
      outcome: 'ran';
      executionId: string;
      runStatus: 'passed' | 'failed';
      summary: { total: number; passed: number; failed: number; duration: number; passRate: number };
      results: TestCaseResult[];
    };

export async function runPackageAndRecord(
  supabase: SupabaseClient,
  userId: string,
  pkg: PackageRow,
  opts: { environment?: string; fallbackTargetUrl?: string | null } = {}
): Promise<RunPackageResult> {
  const environment = opts.environment ?? 'staging';
  const framework: string = pkg.test_cases?.framework || 'playwright';
  const code: string = pkg.test_cases?.executableCode || '';

  if (!REAL_EXECUTION_FRAMEWORKS.has(framework)) {
    return {
      outcome: 'unsupported_framework',
      error: `Real execution isn't implemented yet for "${framework}" — only Playwright-family generated code can be run right now. The generated code is still available in the package.`
    };
  }

  if (!code.trim()) {
    return { outcome: 'no_code', error: 'This package has no generated code to execute.' };
  }

  const targetUrlRaw: string | undefined = pkg.target_url || opts.fallbackTargetUrl || undefined;

  let baseUrl: string | undefined;
  if (targetUrlRaw) {
    try {
      baseUrl = (await assertSafeTargetUrl(targetUrlRaw)).toString();
    } catch (err) {
      if (err instanceof UnsafeTargetUrlError) {
        return { outcome: 'unsafe_target_url', error: err.message };
      }
      throw err;
    }
  }

  const run = await runPlaywrightCode(code, { baseUrl });

  if (pkg.status === 'draft') {
    await supabase.from('test_packages').update({ status: 'active' }).eq('id', pkg.id).eq('user_id', userId);
  }

  if (run.status === 'error') {
    const { data: execution } = await supabase
      .from('test_executions')
      .insert({
        user_id: userId,
        package_id: pkg.id,
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

    return { outcome: 'run_incomplete', error: 'Test run did not complete', detail: run.rawError, executionId: execution?.id ?? null };
  }

  const passedCount = run.results.filter((r) => r.status === 'passed').length;
  const failedCount = run.results.filter((r) => r.status === 'failed' || r.status === 'timedOut').length;

  const { data: execution, error: execError } = await supabase
    .from('test_executions')
    .insert({
      user_id: userId,
      package_id: pkg.id,
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
    return { outcome: 'run_incomplete', error: execError.message, executionId: null };
  }

  // Write side of the selector-memory loop (see lib/server/selectorMemory.ts) — score
  // this run's real per-test outcomes against the locators the generated code actually
  // used, so the next generation for this site can build on it. Best-effort: a failure
  // here shouldn't fail a run that already completed and is already saved above.
  try {
    await recordSelectorOutcomes(supabase, userId, baseUrl, code, run.results);
  } catch (memoryError) {
    console.error('Failed to record selector memory:', memoryError);
  }

  return {
    outcome: 'ran',
    executionId: execution.id,
    runStatus: run.status,
    summary: {
      total: run.results.length,
      passed: passedCount,
      failed: failedCount,
      duration: run.duration,
      passRate: run.results.length ? (passedCount / run.results.length) * 100 : 0
    },
    results: run.results
  };
}
