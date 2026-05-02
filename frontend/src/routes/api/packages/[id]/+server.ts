import { json } from '@sveltejs/kit';
import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

export async function GET({ params, cookies }) {
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
    
    const { id } = params;
    
    const { data, error } = await supabase
      .from('test_packages')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return json({ error: 'Package not found' }, { status: 404 });
      }
      console.error('Supabase select error:', error);
      return json({ error: error.message }, { status: 500 });
    }
    
    return json({ success: true, data });
    
  } catch (error) {
    console.error('Get package error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT({ params, request, cookies }) {
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
    
    const { id } = params;
    const updates = await request.json();
    
    const { data, error } = await supabase
      .from('test_packages')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();
    
    if (error) {
      console.error('Update error:', error);
      return json({ error: error.message }, { status: 500 });
    }
    
    return json({ success: true, data });
    
  } catch (error) {
    console.error('Update package error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE({ params, cookies }) {
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
    
    const { id } = params;
    
    const { error } = await supabase
      .from('test_packages')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    
    if (error) {
      console.error('Delete error:', error);
      return json({ error: error.message }, { status: 500 });
    }
    
    return json({ success: true });
    
  } catch (error) {
    console.error('Delete package error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
