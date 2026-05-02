import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { OPENAI_API_KEY } from '$env/static/private';
import { json } from '@sveltejs/kit';
import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

const openai = createOpenAI({ apiKey: OPENAI_API_KEY });

export async function POST({ request, cookies }) {
  try {
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
    
    // Handle different input formats
    let contentToUse = atrdContent || requirements || document;
    
    if (!contentToUse) {
      return json({ error: 'Missing requirements, ATRD content, or document' }, { status: 400 });
    }
    
    // If contentToUse is a string, try to parse it as JSON
    if (typeof contentToUse === 'string') {
      try {
        contentToUse = JSON.parse(contentToUse);
      } catch (e) {
        // Keep as string if not JSON
      }
    }
    
    const systemPrompt = `You are a test automation expert. Generate a comprehensive test package from the provided requirements.

Return ONLY valid JSON with this exact structure:
{
  "testCases": [
    {
      "id": "TC001",
      "name": "Test case name",
      "description": "What this test verifies",
      "priority": "Critical",
      "type": "API",
      "steps": ["Step 1", "Step 2"],
      "expectedResult": "Expected outcome",
      "preconditions": ["Precondition 1"],
      "postconditions": ["Cleanup step 1"],
      "automated": true
    }
  ],
  "summary": {
    "totalTests": 0,
    "critical": 0,
    "high": 0,
    "medium": 0,
    "low": 0,
    "automated": 0,
    "manual": 0
  }
}`;

    const userPrompt = `Generate detailed test cases from these requirements:
${JSON.stringify(contentToUse, null, 2)}

Create specific, actionable test cases that cover all critical functionality.`;

    const result = await generateText({
      model: openai('gpt-3.5-turbo'),
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.3,
    });
    
    // Parse the response
    let testPackage;
    try {
      const text = result.text;
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        testPackage = JSON.parse(jsonMatch[0]);
      } else {
        testPackage = { testCases: [], summary: { totalTests: 0, automated: 0, manual: 0 } };
      }
    } catch (e) {
      testPackage = { 
        testCases: [], 
        raw: result.text,
        summary: { totalTests: 0, automated: 0, manual: 0 } 
      };
    }
    
    // Save to database
    const packageName = name || `Test Package ${new Date().toLocaleString()}`;
    
    const { data, error } = await supabase
      .from('test_packages')
      .insert({
        user_id: user.id,
        atrd_id: atrdId || null,
        name: packageName,
        description: `Generated from ${atrdId ? 'ATRD' : 'manual input'}`,
        test_cases: testPackage,
        status: 'draft',
        created_at: new Date().toISOString()
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
