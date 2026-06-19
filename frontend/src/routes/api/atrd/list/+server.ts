import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

export async function GET({ request }) {
  console.log('📋 ATRD List endpoint called');
  
  try {
    const authHeader = request.headers.get('authorization');
    console.log('Auth header present:', !!authHeader);
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ No auth header, returning 401');
      return json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const token = authHeader.substring(7);
    console.log('Token received, length:', token.length);
    
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
      console.log('❌ User verification failed:', userError?.message);
      return json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('✅ Authenticated user:', user.email);
    console.log('   User ID:', user.id);
    
    const { data, error } = await supabase
      .from('atrd_results')
      .select('id, name, domain, created_at, updated_at, content')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Database error:', error);
      return json({ error: error.message }, { status: 500 });
    }
    
    console.log(`✅ Retrieved ${data?.length || 0} ATRDs`);
    
    // Log the results for debugging
    if (data && data.length > 0) {
      data.forEach((atrd, index) => {
        console.log(`   ${index + 1}. ${atrd.name} (${atrd.domain}) - ${atrd.id}`);
      });
    }
    
    return json(data || []);
    
  } catch (error) {
    console.error('❌ List endpoint error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
