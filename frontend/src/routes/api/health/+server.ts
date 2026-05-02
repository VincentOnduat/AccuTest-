import { json } from '@sveltejs/kit';
import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

export async function GET({ cookies }) {
  const startTime = Date.now();
  
  try {
    const supabase = createServerClient(
      PUBLIC_SUPABASE_URL,
      PUBLIC_SUPABASE_ANON_KEY,
      { cookies: { get: (key) => cookies.get(key) } }
    );
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    // Test database connectivity
    let dbStatus = 'connected';
    let dbLatency = null;
    try {
      const dbStart = Date.now();
      const { data: testQuery, error: dbError } = await supabase
        .from('test_packages')
        .select('count', { count: 'exact', head: true })
        .limit(1);
      dbLatency = Date.now() - dbStart;
      if (dbError) dbStatus = 'error';
    } catch (dbErr) {
      dbStatus = 'error';
    }
    
    return json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '2.0.0',
      environment: process.env.NODE_ENV || 'development',
      responseTime: Date.now() - startTime,
      authentication: {
        authenticated: !!user,
        userId: user?.id,
        userEmail: user?.email,
        error: userError?.message
      },
      database: {
        status: dbStatus,
        latency: dbLatency,
        supabaseUrl: PUBLIC_SUPABASE_URL?.substring(0, 30) + '...'
      },
      services: {
        api: 'healthy',
        auth: user ? 'healthy' : 'degraded'
      }
    });
  } catch (error) {
    console.error('Health check failed:', error);
    return json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      uptime: process.uptime(),
      version: '2.0.0'
    }, { status: 503 });
  }
}
