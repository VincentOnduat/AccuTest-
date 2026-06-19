import { json } from '@sveltejs/kit';

export async function GET({ url, locals }) {
  try {
    const session = await locals.getSession();
    if (!session) return json({ error: 'Unauthorized' }, { status: 401 });
    
    const supabase = locals.supabase;
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return json({ error: 'Unauthorized' }, { status: 401 });
    
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const atrdId = url.searchParams.get('atrd_id');
    
    let query = supabase
      .from('test_packages')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (atrdId) query = query.eq('atrd_id', atrdId);
    
    const { data, error } = await query;
    if (error) return json({ error: error.message }, { status: 500 });
    return json({ success: true, data: data || [] });
  } catch (error) {
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
