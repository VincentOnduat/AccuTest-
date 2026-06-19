import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

export async function getUserFromRequest(request) {
  // Get the authorization header
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('❌ No Bearer token in request');
    return null;
  }
  
  const token = authHeader.slice(7); // Remove 'Bearer ' prefix
  console.log('🔑 Token received, length:', token.length);
  
  // Create a Supabase client with just the token
  const supabase = createClient(
    PUBLIC_SUPABASE_URL,
    PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    }
  );
  
  // Verify the token
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error) {
    console.log('❌ Token validation error:', error.message);
    return null;
  }
  
  if (!user) {
    console.log('❌ No user found for token');
    return null;
  }
  
  console.log('✅ User authenticated:', user.email);
  return { user, supabase };
}
