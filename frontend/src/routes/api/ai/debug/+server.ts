import { json } from '@sveltejs/kit';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

export async function GET() {
    // Check OpenAI key at runtime
    let hasOpenAI = false;
    try {
        const env = await import('$env/static/private');
        const apiKey = (env as any).OPENAI_API_KEY;
        hasOpenAI = !!apiKey && apiKey !== '';
    } catch (error) {
        hasOpenAI = false;
    }
    
    return json({
        status: 'ok',
        features: {
            openai: hasOpenAI,
            supabase: !!(PUBLIC_SUPABASE_URL && PUBLIC_SUPABASE_ANON_KEY)
        },
        message: hasOpenAI ? '✅ OpenAI is configured and ready' : '⚠️ OpenAI API key missing. AI features will not work.'
    });
}
