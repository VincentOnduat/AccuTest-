import { json } from '@sveltejs/kit';
import { getUserFromRequest } from '$lib/server/auth';

interface TestResult {
  status?: string;
}

interface Defect {
  severity?: string;
}

// Shapes a raw business_reports row (real columns: name, report_data jsonb,
// failures_by_severity jsonb, ...) into the fields BusinessReportView.svelte
// reads (title, executive_summary, critical_issues, metrics), without
// changing what's actually stored.
function toViewModel(row: any) {
  return {
    ...row,
    title: row.name,
    executive_summary: row.report_data?.executive_summary ?? null,
    critical_issues: row.failures_by_severity?.critical ?? 0,
    metrics: row.report_data ?? {}
  };
}

export async function POST({ request, cookies }) {
  try {
    const auth = await getUserFromRequest(request, cookies);
    if (!auth) return json({ error: 'Unauthorized' }, { status: 401 });

    const { data: executions, error: execError } = await auth.supabase
      .from('test_executions')
      .select('*')
      .eq('user_id', auth.user.id)
      .order('executed_at', { ascending: false });

    if (execError) {
      console.error('Error loading test executions:', execError);
      return json({ error: execError.message }, { status: 500 });
    }

    const rows = executions || [];

    let totalTests = 0;
    let passedTests = 0;
    let criticalIssues = 0;
    const byEnvironment: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    let totalDuration = 0;

    for (const execution of rows) {
      const results: TestResult[] = execution.test_results || [];
      totalTests += results.length;
      passedTests += results.filter((r) => r.status === 'passed').length;

      const defects: Defect[] = execution.defects || [];
      criticalIssues += defects.filter((d) => (d.severity || '').toLowerCase() === 'critical').length;

      const env = execution.environment || 'unknown';
      byEnvironment[env] = (byEnvironment[env] || 0) + 1;

      const status = execution.status || 'unknown';
      byStatus[status] = (byStatus[status] || 0) + 1;

      totalDuration += execution.duration || 0;
    }

    const failedTests = totalTests - passedTests;
    const passRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 1000) / 10 : 0;
    const failureRate = totalTests > 0 ? Math.round((failedTests / totalTests) * 1000) / 10 : 0;

    const executiveSummary =
      rows.length === 0
        ? 'No test executions have been recorded yet. Run some tests to populate this report.'
        : `Across ${rows.length} test execution${rows.length === 1 ? '' : 's'}, ${totalTests} test${totalTests === 1 ? '' : 's'} ran with a ${passRate}% pass rate (${passedTests} passed, ${failedTests} failed).` +
          (criticalIssues > 0 ? ` ${criticalIssues} critical issue${criticalIssues === 1 ? '' : 's'} require attention.` : ' No critical issues were flagged.');

    const { data: saved, error: insertError } = await auth.supabase
      .from('business_reports')
      .insert({
        user_id: auth.user.id,
        name: `Business Report - ${new Date().toLocaleDateString()}`,
        total_tests: totalTests,
        passed_tests: passedTests,
        failed_tests: failedTests,
        pass_rate: passRate,
        failure_rate: failureRate,
        failures_by_severity: { critical: criticalIssues },
        report_data: {
          executive_summary: executiveSummary,
          executions: rows.length,
          total_duration_ms: totalDuration,
          by_environment: byEnvironment,
          by_status: byStatus
        }
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error saving business report:', insertError);
      return json({ error: `Failed to save report: ${insertError.message}` }, { status: 500 });
    }

    return json({ success: true, report: toViewModel(saved) });
  } catch (error) {
    console.error('Business report generation error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
