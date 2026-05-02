import { json } from '@sveltejs/kit';
import OpenAI from 'openai';
import { OPENAI_API_KEY } from '$env/static/private';

export async function GET() {
  try {
    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'Say "OpenAI is working!"' }],
      max_tokens: 30,
    });
    
    return json({
      success: true,
      message: completion.choices[0].message.content,
      model: 'gpt-3.5-turbo'
    });
  } catch (error: any) {
    return json({
      success: false,
      error: error.message,
      type: error.type,
      code: error.code
    }, { status: 500 });
  }
}
