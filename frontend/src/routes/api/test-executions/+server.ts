import { json } from '@sveltejs/kit';
import { getUserFromRequest } from '$lib/server/auth';

export async function GET({ request, cookies }) {
  const auth = await getUserFromRequest(request, cookies);
  if (!auth) return json({ error: 'Unauthorized' }, { status: 401 });
  
  const { data, error } = await auth.supabase
    .from('test_executions')
    .select('*')
    .eq('user_id', auth.user.id)
    .order('executed_at', { ascending: false });
  
  if (error) return json({ error: error.message }, { status: 500 });
  return json(data || []);
}

export async function POST({ request, cookies }) {
  const auth = await getUserFromRequest(request, cookies);
  if (!auth) return json({ error: 'Unauthorized' }, { status: 401 });
  
  const body = await request.json();
  const { package_id, name, suite_name, status, duration, environment, test_results, defects } = body;
  
  const { data, error } = await auth.supabase
    .from('test_executions')
    .insert({
      user_id: auth.user.id,
      package_id: package_id || null,
      name: name || `Execution ${new Date().toLocaleString()}`,
      suite_name: suite_name || null,
      status: status || 'pending',
      duration: duration || 0,
      environment: environment || 'staging',
      test_results: test_results || [],
      defects: defects || [],
      executed_at: new Date().toISOString()
    })
    .select()
    .single();
  
  if (error) return json({ error: error.message }, { status: 500 });
  return json({ success: true, id: data.id, data });
}
