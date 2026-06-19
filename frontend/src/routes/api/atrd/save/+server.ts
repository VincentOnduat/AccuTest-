import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

export async function POST({ request }) {
  console.log('💾 ATRD Save endpoint called');
  
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
    
    const body = await request.json();
    const { name, content, domain } = body;
    
    if (!content) {
      console.log('❌ No content provided');
      return json({ error: 'No content provided' }, { status: 400 });
    }
    
    console.log('📝 Saving ATRD for user:', user.id);
    console.log('   Name:', name);
    console.log('   Domain:', domain);
    console.log('   Content type:', typeof content);
    
    // Make sure content is properly structured
    const contentToSave = typeof content === 'object' ? content : { content };
    
    const { data, error } = await supabase
      .from('atrd_results')
      .insert({
        user_id: user.id,
        name: name || `ATRD ${new Date().toLocaleString()}`,
        content: contentToSave,
        domain: domain || 'general'
      })
      .select('id, name, domain, created_at, updated_at')
      .single();
    
    if (error) {
      console.error('❌ Database error:', error);
      return json({ error: error.message }, { status: 500 });
    }
    
    console.log(`✅ ATRD saved successfully! ID: ${data.id}`);
    return json({ success: true, id: data.id, data });
    
  } catch (error) {
    console.error('❌ Save endpoint error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
