import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { json } from '@sveltejs/kit';
import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

export async function POST({ request, cookies }) {
  try {
    // Dynamic import of private env - only runs at runtime
    let OPENAI_API_KEY;
    try {
      const env = await import('$env/static/private');
      OPENAI_API_KEY = (env as any).OPENAI_API_KEY;
    } catch (error) {
      console.error('Failed to load OpenAI API key:', error);
      return json({ 
        error: 'OpenAI API key not configured',
        message: 'Please add OPENAI_API_KEY to your environment variables'
      }, { status: 503 });
    }

    if (!OPENAI_API_KEY || OPENAI_API_KEY === '') {
      return json({ 
        error: 'OpenAI API key not configured',
        message: 'Please add OPENAI_API_KEY to your environment variables'
      }, { status: 503 });
    }

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
    
    const { document, detectedDomain, systemUrls, environments } = await request.json();
    
    const openai = createOpenAI({ apiKey: OPENAI_API_KEY });
    
    const systemPrompt = `You are an expert test automation architect and business analyst. Parse the provided Automation Test Requirement Document (ATRD) and extract structured information.

CRITICAL: Return ONLY valid JSON with this exact structure:

{
  "metadata": {
    "projectName": "Extracted project name from document",
    "domain": "${detectedDomain || 'general'}",
    "version": "1.0",
    "date": "${new Date().toISOString().split('T')[0]}",
    "description": "Brief description of the system under test"
  },
  "objectives": {
    "primary": "Main objective from document",
    "metrics": ["metric1", "metric2"],
    "targets": { "key": "value" }
  },
  "scope": {
    "inScope": ["item1", "item2"],
    "outOfScope": ["item1", "item2"]
  },
  "functionalAreas": [
    {
      "name": "Area name",
      "priority": "Critical/High/Medium/Low",
      "scenarios": ["scenario1", "scenario2"],
      "subModules": []
    }
  ],
  "techStack": {
    "language": "TypeScript",
    "apiAutomation": "Playwright",
    "uiAutomation": "Playwright",
    "ciCd": "GitHub Actions",
    "reporting": "Allure",
    "database": "PostgreSQL"
  },
  "environments": ${JSON.stringify(environments || [
    { name: "Development", url: "", apiUrl: "", automation: "on-demand" },
    { name: "QA", url: "", apiUrl: "", automation: "nightly" },
    { name: "Staging", url: "", apiUrl: "", automation: "post-deployment" },
    { name: "Production", url: "", apiUrl: "", automation: "read-only" }
  ])},
  "systemUnderTest": ${JSON.stringify(systemUrls || {
    baseUrl: "",
    apiBaseUrl: "",
    adminUrl: "",
    mobileAppPackage: "",
    healthCheckEndpoint: "/health",
    authEndpoint: "/auth/login"
  })},
  "testingRequirements": {
    "api": ["API requirement 1"],
    "security": ["Security requirement 1"],
    "performance": ["Performance requirement 1"],
    "compliance": ["Compliance requirement 1"],
    "ui": ["UI requirement 1"],
    "integration": ["Integration requirement 1"]
  },
  "criticalWorkflows": [
    {
      "name": "Workflow name",
      "steps": ["step1", "step2"],
      "validations": ["validation1"],
      "priority": "Critical/High/Medium"
    }
  ],
  "regulatoryCompliance": [
    { "regulation": "HIPAA/GDPR/PCI-DSS", "requirements": ["req1", "req2"] }
  ],
  "testDataRequirements": {
    "syntheticData": true,
    "dataMasking": true,
    "cleanupRequired": true,
    "dataSources": ["Database", "API", "CSV"]
  },
  "risks": [
    { "risk": "description", "impact": "High/Medium/Low", "mitigation": "strategy", "owner": "Team" }
  ],
  "deliverables": ["deliverable1", "deliverable2"],
  "successCriteria": ["All critical flows pass", "Response time < 2 seconds"]
}`;

    const userPrompt = `Parse this Automation Test Requirement Document and extract all structured information:

${document}

${detectedDomain ? `Detected domain: ${detectedDomain}` : ''}

Extract as JSON. If information is missing, use reasonable defaults based on the context.`;

    const result = await streamText({
      model: openai('gpt-4-turbo'),
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      temperature: 0.3,
    });
    
    return result.toTextStreamResponse();
    
  } catch (error) {
    console.error('Parse error:', error);
    return json({ error: 'Failed to parse document' }, { status: 500 });
  }
}
