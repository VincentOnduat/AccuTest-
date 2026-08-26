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
          get: (key) => cookies.get(key)
        } 
      }
    );
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { execution_id, channels = ['email', 'webhook'] } = await request.json();
    
    // Fetch execution details
    const { data: execution } = await supabase
      .from('test_executions')
      .select('*, test_packages(*)')
      .eq('id', execution_id)
      .eq('user_id', user.id)
      .single();
    
    if (!execution) {
      return json({ error: 'Execution not found' }, { status: 404 });
    }
    
    const notifications = [];

    // NOTE: no real email/webhook provider is wired up yet — these are
    // simulated sends (status: 'simulated'), not real deliveries. Don't
    // report them as 'sent' to the client; that would be a false claim.
    if (channels.includes('email')) {
      notifications.push({
        channel: 'email',
        status: 'simulated',
        message: `Test execution ${execution.status}: ${execution.name}`
      });
    }

    if (channels.includes('webhook')) {
      notifications.push({
        channel: 'webhook',
        status: 'simulated',
        message: `Webhook triggered for ${execution.name}`
      });
    }

    // Save notification record
    const { error: insertError } = await supabase
      .from('notifications')
      .insert({
        user_id: user.id,
        execution_id: execution_id,
        channels: channels,
        status: execution.status,
        sent_at: new Date().toISOString()
      });

    if (insertError) {
      console.error('Failed to save notification record:', insertError);
      return json({ error: 'Failed to save notification record' }, { status: 500 });
    }

    return json({
      success: true,
      notifications,
      summary: {
        totalTests: execution.test_results?.length || 0,
        passed: execution.test_results?.filter((t: any) => t.status === 'passed').length || 0,
        failed: execution.test_results?.filter((t: any) => t.status === 'failed').length || 0
      }
    });
    
  } catch (error) {
    console.error('Notification error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
