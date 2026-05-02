import { json } from '@sveltejs/kit';
import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

export async function GET({ cookies }) {
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
    
    const { data, error } = await supabase
      .from('test_executions')
      .select('*')
      .eq('user_id', user.id)
      .order('executed_at', { ascending: false })
        .limit(50);
    
    if (error) {
      console.error('Supabase select error:', error);
      return json({ error: error.message }, { status: 500 });
    }
    
    return json(data || []);
    
  } catch (error) {
    console.error('List test executions error:', error);
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
    const { package_id, name, suite_name, status, duration, environment, test_results, defects } = body;
    
    const { data, error } = await supabase
      .from('test_executions')
      .insert({
        user_id: user.id,
        package_id: package_id,
        name: name || `Execution ${new Date().toLocaleString()}`,
        suite_name: suite_name,
        status: status || 'pending',
        duration: duration || 0,
        environment: environment || 'staging',
        test_results: test_results || [],
        defects: defects || [],
        executed_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      console.error('Insert error:', error);
      return json({ error: error.message }, { status: 500 });
    }
    
    return json({ success: true, id: data.id, data });
    
  } catch (error) {
    console.error('Create test execution error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}

