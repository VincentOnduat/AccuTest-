import { json } from '@sveltejs/kit';
import { OPENAI_API_KEY } from '$env/static/private';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

export async function GET() {
  // Check environment variables
  const envStatus = {
    openai: {
      hasKey: !!OPENAI_API_KEY,
      keyPrefix: OPENAI_API_KEY ? OPENAI_API_KEY.substring(0, 15) + '...' : 'missing',
      keyLength: OPENAI_API_KEY ? OPENAI_API_KEY.length : 0
    },
    supabase: {
      hasUrl: !!PUBLIC_SUPABASE_URL,
      hasKey: !!PUBLIC_SUPABASE_ANON_KEY,
      urlPrefix: PUBLIC_SUPABASE_URL ? PUBLIC_SUPABASE_URL.substring(0, 30) + '...' : 'missing'
    },
    environment: process.env.NODE_ENV || 'development'
  };
  
  return json(envStatus);
}
