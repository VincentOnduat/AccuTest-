import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

export async function GET({ request }) {
  try {
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);

    const supabase = createClient(
      PUBLIC_SUPABASE_URL,
      PUBLIC_SUPABASE_ANON_KEY,
      {
        auth: { autoRefreshToken: false, persistSession: false },
        global: { headers: { Authorization: `Bearer ${token}` } }
      }
    );
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('atrd_results')
      .select('id, name, domain, created_at, updated_at, content')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Database error:', error);
      return json({ error: error.message }, { status: 500 });
    }

    return json(data || []);
    
  } catch (error) {
    console.error('❌ List endpoint error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
