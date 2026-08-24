import { json } from '@sveltejs/kit';
import { getUserFromRequest } from '$lib/server/auth';

// Shapes a raw business_reports row into the fields BusinessReportView.svelte
// reads (title, executive_summary, critical_issues, metrics) — see the
// generate endpoint for what's actually stored.
function toViewModel(row: any) {
  return {
    ...row,
    title: row.name,
    executive_summary: row.report_data?.executive_summary ?? null,
    critical_issues: row.failures_by_severity?.critical ?? 0,
    metrics: row.report_data ?? {}
  };
}

export async function GET({ request, cookies }) {
  try {
    const auth = await getUserFromRequest(request, cookies);
    if (!auth) return json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await auth.supabase
      .from('business_reports')
      .select('*')
      .eq('user_id', auth.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error listing business reports:', error);
      return json({ reports: [], error: error.message });
    }

    return json({ reports: (data || []).map(toViewModel) });
  } catch (error) {
    console.error('Business reports list error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
