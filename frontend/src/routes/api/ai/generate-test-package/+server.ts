import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { json } from '@sveltejs/kit';
import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { hasOpenAI, getOpenAIConfig } from '$lib/server/openai';  // Import from server only

export async function POST({ request, cookies }) {
  try {
    // Check if OpenAI is available
    if (!hasOpenAI) {
      return json({ 
        error: 'OpenAI API key not configured',
        message: 'Please add OPENAI_API_KEY to your environment variables'
      }, { status: 503 });
    }

    // Rest of your code...
    const supabase = createServerClient(
      PUBLIC_SUPABASE_URL,
      PUBLIC_SUPABASE_ANON_KEY,
      { 
        cookies: { 
          get: (key) => cookies.get(key),
          set: (key, value, options) => cookies.set(key, value, options),
          remove: (key, options) => cookies.delete(key, options)
        } 
      }
    );
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { atrdContent, requirements, name, atrdId, document } = body;
    
    let contentToUse = atrdContent || requirements || document;
    
    if (!contentToUse) {
      return json({ error: 'Missing requirements, ATRD content, or document' }, { status: 400 });
    }
    
    if (typeof contentToUse === 'string') {
      try {
        contentToUse = JSON.parse(contentToUse);
      } catch (e) {
        // Keep as string
      }
    }
    
    const openai = createOpenAI({ apiKey: getOpenAIConfig().apiKey });
    
    const systemPrompt = `You are a test automation expert. Generate a comprehensive test package...`;
    
    const userPrompt = `Generate detailed test cases from these requirements:
${JSON.stringify(contentToUse, null, 2)}`;

    const result = await generateText({
      model: openai('gpt-3.5-turbo'),
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.3,
    });
    
    let testPackage;
    try {
      const text = result.text;
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        testPackage = JSON.parse(jsonMatch[0]);
      } else {
        testPackage = { testCases: [], summary: { totalTests: 0 } };
      }
    } catch (e) {
      testPackage = { testCases: [], summary: { totalTests: 0 } };
    }
    
    const packageName = name || `Test Package ${new Date().toLocaleString()}`;
    
    const { data, error } = await supabase
      .from('test_packages')
      .insert({
        user_id: user.id,
        atrd_id: atrdId || null,
        name: packageName,
        description: `Generated from ${atrdId ? 'ATRD' : 'manual input'}`,
        test_cases: testPackage,
        status: 'draft'
      })
      .select()
      .single();
    
    if (error) {
      console.error('Save error:', error);
      return json({ error: error.message }, { status: 500 });
    }
    
    return json({ 
      success: true, 
      id: data.id, 
      data,
      summary: testPackage.summary 
    });
    
  } catch (error) {
    console.error('Generate test package error:', error);
    return json({ error: 'Internal server error: ' + (error as Error).message }, { status: 500 });
  }
}
