import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { createOpenAI } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
// $env/dynamic/private (not $env/static/private) deliberately: static env is
// inlined into the build by Vite, which would make OPENAI_API_KEY a
// Docker build-time secret — flagged by `docker build`'s own linter
// (SecretsUsedInArgOrEnv) as unsafe, since ARG/ENV values persist in image
// layer history. Dynamic env reads process.env at request time instead, so
// this only ever needs to be a normal runtime variable on the host —
// nothing Docker-image-specific, and rotating it needs a restart, not a
// rebuild.
import { env as privateEnv } from '$env/dynamic/private';
import { assertSafeTargetUrl, UnsafeTargetUrlError } from '$lib/server/targetUrl';
import { checkRateLimit } from '$lib/server/rateLimit';

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
  executableCode: z.string(),
  requiresReview: z.boolean(),
  unresolvedFields: z.array(z.string())
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
Requirement Document (ATRD) excerpt and a target test domain, do this in two separate steps:

STEP 1 — Design the test cases from requirements alone.
Read the ATRD and decide what should be tested: one test case per distinct scenario it describes \
for the ${testDomain} domain. Each test case (name, description, priority, steps, expectedResult) \
must be grounded in what the document actually says — do not invent scenarios, UI, or behavior \
the document doesn't describe. This step is pure requirements reasoning; it has nothing to do \
with implementation details like selectors or element identifiers yet.

STEP 2 — Write the ${frameworkLabel} code for those test cases.
- It must be a complete, syntactically valid ${frameworkLabel} test file — real imports, real \
assertions, one test.step() (or one top-level test, see STRUCTURE below) per test case from \
Step 1.
- Use RELATIVE paths for navigation (e.g. page.goto('/'), cy.visit('/login')) — the base URL is \
injected externally at run time, never hardcode a domain.
- STRUCTURE — when test cases from Step 1 form a sequential flow (a later case only makes sense \
after an earlier one happened — e.g. "add to cart" assumes the user already logged in), write \
them as test.step('<case name>', async () => { ... }) calls inside ONE test(), in order, sharing \
a single page — never as separate top-level test() blocks, which each get an independent, \
unauthenticated page with no memory of prior steps. Only use separate top-level test() blocks \
for cases that are genuinely independent of each other (neither depends on the other's state).
- GROUNDING RULE — the most important rule in this prompt, follow it exactly, and it applies \
equally to BOTH of the following:
    (a) any selector/locator/element identifier the code interacts with
    (b) any page route/path the code navigates to (page.goto(), cy.visit()), EXCEPT '/' itself — \
the bare base URL is always fine to navigate to, since that's true by definition, not a guess
  Only use one if the ATRD document explicitly names it (an element id, a data-testid, a labeled \
field name, button text quoted in the document; a specific page path stated in the document). \
For anything the code needs that the document does NOT explicitly identify, do NOT guess a \
plausible-looking real value. Instead:
    - In the code, use an obviously-fake placeholder following the pattern \
'[data-testid="TODO_<snake_case_name>"]' for a selector, or '/TODO_ROUTE_<snake_case_name>' \
for a route, with a comment on the same line: // NOT SPECIFIED IN ATRD — REPLACE
    - Add that same <snake_case_name> to the unresolvedFields output field.
  Never fabricate a selector or route that looks like it could be real — no '#login-btn', no \
'/login', no guessed name= attributes. A fake-but-plausible value is worse than an obvious \
placeholder: it fails silently instead of being visibly a TODO.

Rules for the structured output:
- testCases: exactly the scenarios designed in Step 1 — one entry per scenario the code actually \
exercises, nothing the code doesn't cover and nothing left out.
- requiresReview: true if the code contains ANY TODO_ placeholder (selector or route), false only \
if every selector and route the code uses was grounded in an explicit statement in the document \
(or is the bare '/').
- unresolvedFields: the exact list of <snake_case_name> placeholders used in the code (empty \
array if requiresReview is false). Each entry should be short and specific — e.g. \
"shipping_address_input", "login_page_route" — not a vague "form field".`;

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

    // Shared budget with ai/parse-atrd — both call OpenAI, both cost real
    // money per call, and unlike most routes in this app, nothing else
    // throttled how often a signed-up user could hit them.
    const rateLimit = checkRateLimit(`ai:${user.id}`);
    if (!rateLimit.allowed) {
      return json(
        { error: `Rate limit exceeded. Try again in ${rateLimit.retryAfterSeconds}s.` },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } }
      );
    }

    const body = await request.json();
    const { document, name, framework = 'playwright', testDomain = 'functional', atrdId, targetUrl } = body;

    if (!document) {
      return json({ error: 'Missing document' }, { status: 400 });
    }

    const OPENAI_API_KEY = privateEnv.OPENAI_API_KEY;
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
    let requiresReview: boolean;
    let unresolvedFields: string[];
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
      requiresReview = result.object.requiresReview;
      unresolvedFields = result.object.unresolvedFields;
    } catch (aiError) {
      console.error('AI generation failed:', aiError);
      return json({ error: 'Test generation failed — the AI service did not return a usable result' }, { status: 502 });
    }

    const testPackage = {
      testCases: testCases,
      executableCode: testCode,
      framework: framework,
      requiresReview: requiresReview,
      unresolvedFields: unresolvedFields,
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
      requiresReview: requiresReview,
      unresolvedFields: unresolvedFields,
      summary: testPackage.summary
    });
    
  } catch (error) {
    console.error('API error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
