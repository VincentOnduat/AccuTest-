// src/routes/api/atrd/parse/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { parseATRDContent } from '$lib/server/atrdParser';

export const POST: RequestHandler = async ({ request }) => {
  console.log('🔍 Parse endpoint called');
  
  try {
    // ✅ Get the authorization header from the request
    const authHeader = request.headers.get('Authorization');
    console.log('Auth header present:', !!authHeader);
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ No valid Authorization header');
      return json({ success: false, error: 'Unauthorized - No token provided' }, { status: 401 });
    }
    
    const token = authHeader.split(' ')[1];
    console.log('Token received, length:', token.length);
    
    // ✅ Create a Supabase client with the token
    const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);
    
    // ✅ Verify the token and get the user
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError) {
      console.error('❌ Token verification failed:', userError.message);
      return json({ success: false, error: 'Unauthorized - Invalid token' }, { status: 401 });
    }
    
    if (!user) {
      console.error('❌ No user found for token');
      return json({ success: false, error: 'Unauthorized - User not found' }, { status: 401 });
    }
    
    console.log('✅ Authenticated user:', user.email);
    
    // ✅ Parse the request body
    const body = await request.json();
    const { content } = body;
    
    if (!content) {
      return json({ success: false, error: 'No content provided' }, { status: 400 });
    }
    
    console.log('📝 Parsing ATRD content, length:', content.length);
    
    // ✅ Parse the ATRD content
    // This is a simple parser - you can enhance it based on your ATRD format
    const parsedData = parseATRDContent(content);
    
    console.log('✅ Parse successful, found sections:', parsedData.sections.length);
    
    return json({ 
      success: true, 
      data: parsedData 
    });
    
  } catch (error) {
    console.error('❌ Parse endpoint error:', error);
    return json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 });
  }
};
