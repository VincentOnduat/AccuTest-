import { OPENAI_API_KEY } from '/static/private';

export const hasOpenAI = !!OPENAI_API_KEY && OPENAI_API_KEY !== '';

export function getOpenAIConfig() {
    if (!hasOpenAI) {
        throw new Error('OpenAI API key not configured');
    }
    return { apiKey: OPENAI_API_KEY };
}
