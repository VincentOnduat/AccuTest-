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
    
    const { data, error } = await supabase
      .from('atrd_results')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return json({ error: 'ATRD not found' }, { status: 404 });
      }
      console.error('Supabase select error:', error);
      return json({ error: error.message }, { status: 500 });
    }
    
    return json(data);
    
  } catch (error) {
    console.error('Get ATRD error:', error);
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
    const { name, content, domain } = await request.json();
    
    const { data, error } = await supabase
      .from('atrd_results')
      .update({
        name: name,
        content: content,
        domain: domain,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();
    
    if (error) {
      console.error('Supabase update error:', error);
      return json({ error: error.message }, { status: 500 });
    }
    
    return json({ success: true, data });
    
  } catch (error) {
    console.error('Update ATRD error:', error);
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
    
    // Also delete associated test packages
    await supabase
      .from('test_packages')
      .delete()
      .eq('atrd_id', id);
    
    const { error } = await supabase
      .from('atrd_results')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    
    if (error) {
      console.error('Supabase delete error:', error);
      return json({ error: error.message }, { status: 500 });
    }
    
    return json({ success: true });
    
  } catch (error) {
    console.error('Delete ATRD error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
