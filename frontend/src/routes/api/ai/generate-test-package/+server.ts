import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { createOpenAI } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { assertSafeTargetUrl, UnsafeTargetUrlError } from '$lib/server/targetUrl';

const TEST_PRIORITIES = ['Critical', 'High', 'Medium', 'Low'] as const;

const TestPackageSchema = z.object({
  testCases: z
    .array(
      z.object({
        name: z.string(),
        description: z.string(),
        priority: z.enum(TEST_PRIORITIES),
        steps: z.array(z.string()),
        expectedResult: z.string()
      })
    )
    .min(1),
  executableCode: z.string()
});

const FRAMEWORK_LABELS: Record<string, string> = {
  playwright: 'Playwright (@playwright/test)',
  k6: 'Playwright (@playwright/test)',
  'owasp-zap': 'Playwright (@playwright/test)',
  'axe-core': 'Playwright (@playwright/test)',
  percy: 'Playwright (@playwright/test)',
  chromatic: 'Playwright (@playwright/test)',
  dbt: 'Playwright (@playwright/test)',
  'great-expectations': 'Playwright (@playwright/test)',
  cypress: 'Cypress',
  jest: 'Jest',
  vitest: 'Jest'
};

function buildPrompt(document: string, testDomain: string, framework: string) {
  const frameworkLabel = FRAMEWORK_LABELS[framework] || 'Playwright (@playwright/test)';

  const system = `You are an expert test automation engineer. Given an Automation Test \
Requirement Document (ATRD) excerpt and a target test domain, produce a single ${frameworkLabel} \
test file plus a structured list of the test cases it covers.

Rules for the generated code:
- It must be a complete, syntactically valid ${frameworkLabel} test file — real imports, real \
assertions, nothing left as a placeholder or TODO.
- Use RELATIVE paths for navigation (e.g. page.goto('/'), cy.visit('/login')) — the base URL is \
injected externally at run time, never hardcode a domain.
- Don't assume app-specific selectors (like '#login-btn') unless the document explicitly \
describes the UI. When the document doesn't describe concrete selectors, write a generic \
smoke-style test appropriate to the ${testDomain} domain instead of guessing at markup.
- Tailor the scenario to the ${testDomain} test domain (functional, performance, security, \
accessibility, visual, or dataQuality/ETL) as well as anything concrete the document describes.

Rules for testCases: one entry per distinct scenario the code actually exercises — don't list \
cases the code doesn't cover, and don't leave code the test cases don't describe.`;

  const prompt = `Test domain: ${testDomain}
Target framework: ${frameworkLabel}

ATRD document:
"""
${document}
"""`;

  return { system, prompt };
}

export async function POST({ request }) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized - No token' }, { status: 401 });
    }
    
    const token = authHeader.substring(7);
    
    const supabase = createClient(
      PUBLIC_SUPABASE_URL,
      PUBLIC_SUPABASE_ANON_KEY,
      {
        auth: { autoRefreshToken: false, persistSession: false },
        global: { headers: { Authorization: `Bearer ${token}` } }
      }
    );
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return json({ error: 'Unauthorized - Invalid token' }, { status: 401 });
    }
    
    const body = await request.json();
    const { document, name, framework = 'playwright', testDomain = 'functional', atrdId, targetUrl } = body;

    if (!document) {
      return json({ error: 'Missing document' }, { status: 400 });
    }

    let OPENAI_API_KEY: string | undefined;
    try {
      const env = await import('$env/static/private');
      OPENAI_API_KEY = (env as any).OPENAI_API_KEY;
    } catch {
      // module import itself failing (not just an empty value) — treat the same as unconfigured
    }
    if (!OPENAI_API_KEY) {
      return json({ error: 'OpenAI API key not configured' }, { status: 503 });
    }

    // The website this package tests, e.g. a live site the user wants
    // AccuTest to actually drive a browser against. Optional here — a
    // package without one falls back to the account-wide default in
    // Settings at run time (see api/test-runner) — but if given, it's
    // validated up front so the user gets an immediate, clear error instead
    // of a confusing failure the first time they run the package.
    let normalizedTargetUrl: string | null = null;
    if (typeof targetUrl === 'string' && targetUrl.trim()) {
      try {
        normalizedTargetUrl = (await assertSafeTargetUrl(targetUrl.trim())).toString();
      } catch (err) {
        if (err instanceof UnsafeTargetUrlError) {
          return json({ error: err.message }, { status: 400 });
        }
        throw err;
      }
    }

    const openai = createOpenAI({ apiKey: OPENAI_API_KEY });
    const { system, prompt } = buildPrompt(document, testDomain, framework);

    let testCode: string;
    let testCases: z.infer<typeof TestPackageSchema>['testCases'];
    try {
      const result = await generateObject({
        model: openai('gpt-4o'),
        schema: TestPackageSchema,
        system,
        prompt,
        temperature: 0.3
      });
      testCode = result.object.executableCode;
      testCases = result.object.testCases;
    } catch (aiError) {
      console.error('AI generation failed:', aiError);
      return json({ error: 'Test generation failed — the AI service did not return a usable result' }, { status: 502 });
    }

    const testPackage = {
      testCases: testCases,
      executableCode: testCode,
      framework: framework,
      summary: {
        totalTests: testCases.length,
        critical: testCases.filter((t: any) => t.priority === 'Critical').length,
        high: testCases.filter((t: any) => t.priority === 'High').length,
        medium: testCases.filter((t: any) => t.priority === 'Medium').length,
        low: testCases.filter((t: any) => t.priority === 'Low').length
      }
    };
    
    const packageName = name || `Test Package ${new Date().toLocaleString()}`;
    
    const { data, error: dbError } = await supabase
      .from('test_packages')
      .insert({
        user_id: user.id,
        name: packageName,
        description: `Generated from: ${document.substring(0, 100)}`,
        test_cases: testPackage,
        status: 'draft',
        ...(atrdId ? { atrd_id: atrdId } : {}),
        ...(normalizedTargetUrl ? { target_url: normalizedTargetUrl } : {})
      })
      .select()
      .single();
    
    if (dbError) {
      console.error('Database error:', dbError);
      return json({ error: dbError.message }, { status: 500 });
    }
    
    return json({
      success: true, 
      id: data.id, 
      data,
      testCode: testCode,
      summary: testPackage.summary 
    });
    
  } catch (error) {
    console.error('API error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
