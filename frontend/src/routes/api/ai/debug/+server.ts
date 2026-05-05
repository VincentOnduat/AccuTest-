import { json } from '@sveltejs/kit';
import { hasOpenAI } from '$lib/openai';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

export async function GET() {
    return json({
        status: 'ok',
        features: {
            openai: hasOpenAI,
            supabase: !!(PUBLIC_SUPABASE_URL && PUBLIC_SUPABASE_ANON_KEY)
        },
        message: hasOpenAI ? 'OpenAI is configured and ready' : 'OpenAI API key missing. AI features will not work.'
    });
}

export async function POST({ request }) {
    try {
        if (!hasOpenAI) {
            return json({ 
                error: 'OpenAI API key not configured',
                message: 'Please add OPENAI_API_KEY to your environment variables'
            }, { status: 503 });
        }

        // Your existing debug code here...
        
        return json({ success: true, message: 'OpenAI is working' });
        
    } catch (error) {
        console.error('Debug error:', error);
        return json({ error: 'Internal server error' }, { status: 500 });
    }
}
