import { json } from '@sveltejs/kit';
import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

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
    
    const { name, content, domain } = await request.json();
    
    if (!content) {
      return json({ error: 'Content is required' }, { status: 400 });
    }
    
    const { data, error } = await supabase
      .from('atrd_results')
      .insert({
        user_id: user.id,
        name: name || `ATRD ${new Date().toLocaleString()}`,
        content: content,
        domain: domain || 'general'
      })
      .select()
      .single();
    
    if (error) {
      console.error('Supabase insert error:', error);
      return json({ error: error.message }, { status: 500 });
    }
    
    return json({ success: true, id: data.id, data });
    
  } catch (error) {
    console.error('Save ATRD error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
