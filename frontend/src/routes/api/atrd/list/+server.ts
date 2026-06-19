import { json } from '@sveltejs/kit';

export async function GET({ locals }) {
  try {
    const session = await locals.getSession();
    if (!session) return json({ error: 'Unauthorized' }, { status: 401 });
    
    const supabase = locals.supabase;
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return json({ error: 'Unauthorized' }, { status: 401 });
    
    const { data, error } = await supabase
      .from('atrd_results')
      .select('id, name, domain, created_at, updated_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (error) return json({ error: error.message }, { status: 500 });
    return json(data || []);
  } catch (error) {
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
