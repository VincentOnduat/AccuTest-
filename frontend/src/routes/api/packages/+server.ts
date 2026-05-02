import { json } from '@sveltejs/kit';
import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

export async function GET({ url, cookies }) {
  try {
    const supabase = createServerClient(
      PUBLIC_SUPABASE_URL,
      PUBLIC_SUPABASE_ANON_KEY,
      { 
        cookies: { 
          get: (key) => cookies.get(key)
        } 
      }
    );
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const atrdId = url.searchParams.get('atrd_id');
    
    let query = supabase
      .from('test_packages')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (atrdId) {
      query = query.eq('atrd_id', atrdId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Supabase select error:', error);
      return json({ error: error.message }, { status: 500 });
    }
    
    return json({ success: true, data: data || [] });
    
  } catch (error) {
    console.error('List packages error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST({ request, cookies }) {
  try {
    const supabase = createServerClient(
      PUBLIC_SUPABASE_URL,
      PUBLIC_SUPABASE_ANON_KEY,
      { 
        cookies: { 
          get: (key) => cookies.get(key),
          set: (key, value, options) => cookies.set(key, value, options),
          remove: (key, options) => cookies.delete(key, options)
        } 
      }
    );
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { name, description, test_cases, atrd_id, status } = body;
    
    const { data, error } = await supabase
      .from('test_packages')
      .insert({
        user_id: user.id,
        atrd_id: atrd_id || null,
        name: name || `Package ${new Date().toLocaleString()}`,
        description: description || '',
        test_cases: test_cases || [],
        status: status || 'draft'
      })
      .select()
      .single();
    
    if (error) {
      console.error('Insert error:', error);
      return json({ error: error.message }, { status: 500 });
    }
    
    return json({ success: true, id: data.id, data });
    
  } catch (error) {
    console.error('Create package error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
