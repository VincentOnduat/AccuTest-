import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

export async function GET({ params, request }) {
  console.log('?? Package Detail API called for ID:', params.id);
  
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized - No token' }, { status: 401 });
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
      return json({ error: 'Unauthorized - Invalid token' }, { status: 401 });
    }
    
    const { data, error } = await supabase
      .from('test_packages')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();
    
    if (error) {
      return json({ error: 'Package not found' }, { status: 404 });
    }
    
    return json({ success: true, data });
    
  } catch (error) {
    console.error('Package detail API error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
