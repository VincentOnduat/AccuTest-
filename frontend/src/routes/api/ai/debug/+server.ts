import { json } from '@sveltejs/kit';
import { hasOpenAI } from '$lib/server/openai';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

export async function GET() {
    return json({
        status: 'ok',
        features: {
            openai: hasOpenAI,
            supabase: !!(PUBLIC_SUPABASE_URL && PUBLIC_SUPABASE_ANON_KEY)
        },
        message: hasOpenAI ? '✅ OpenAI is configured and ready' : '⚠️ OpenAI API key missing. AI features will not work.'
    });
}
