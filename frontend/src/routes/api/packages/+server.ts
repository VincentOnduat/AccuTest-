import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

export async function GET({ url, request }) {
  console.log('?? Packages API called');
  
  const authHeader = request.headers.get('authorization');
  console.log('Auth header exists:', !!authHeader);
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('? No auth header, returning 401');
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
    console.log('? User verification failed');
    return json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const limit = parseInt(url.searchParams.get('limit') || '50');
  
  const { data, error } = await supabase
    .from('test_packages')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) {
    return json({ error: error.message }, { status: 500 });
  }
  
  return json({ success: true, data: data || [] });
}
