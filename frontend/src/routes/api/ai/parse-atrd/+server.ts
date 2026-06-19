import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { json } from '@sveltejs/kit';
import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

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
    
    // Get OpenAI API key
    let OPENAI_API_KEY;
    try {
      const env = await import('$env/static/private');
      OPENAI_API_KEY = (env as any).OPENAI_API_KEY;
    } catch (error) {
      return json({ error: 'OpenAI API key not configured' }, { status: 503 });
    }
    
    const openai = createOpenAI({ apiKey: OPENAI_API_KEY });
    
    const { document, detectedDomain, systemUrls, environments } = await request.json();
    
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
  "testCategories": {
    "functional": {
      "enabled": true,
      "subCategories": ["web", "mobile", "desktop", "api", "erp"],
      "description": "Functional testing of application features"
    },
    "performance": {
      "enabled": false,
      "subCategories": ["load", "stress", "apm", "saasLabs"],
      "description": "Performance and load testing"
    },
    "security": {
      "enabled": false,
      "subCategories": ["dast", "sast", "secrets", "sbom"],
      "description": "Security and DevSecOps testing"
    },
    "accessibility": {
      "enabled": false,
      "subCategories": ["wcag", "screenReaders", "compliance"],
      "description": "Accessibility compliance testing"
    },
    "visual": {
      "enabled": false,
      "subCategories": ["visualDiff", "uiComparison", "screenshots"],
      "description": "Visual regression testing"
    },
    "dataQuality": {
      "enabled": false,
      "subCategories": ["etl", "dataPipelines", "migration", "dataQuality"],
      "description": "Data and ETL validation"
    }
  },
  "functionalAreas": [
    {
      "name": "Area name",
      "priority": "Critical/High/Medium/Low",
      "scenarios": ["scenario1", "scenario2"],
      "subModules": [],
      "testCategory": "functional"
    }
  ],
  "techStack": {
    "language": "TypeScript",
    "apiAutomation": "Playwright",
    "uiAutomation": "Playwright",
    "ciCd": "GitHub Actions",
    "reporting": "Allure",
    "database": "PostgreSQL",
    "performanceTools": ["k6", "JMeter"],
    "securityTools": ["OWASP ZAP", "Snyk"],
    "accessibilityTools": ["axe-core", "Lighthouse"],
    "visualTools": ["Percy", "Chromatic"]
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
    "functional": ["Functional requirement 1"],
    "performance": ["Performance requirement 1"],
    "security": ["Security requirement 1"],
    "accessibility": ["Accessibility requirement 1"],
    "visual": ["Visual testing requirement 1"],
    "dataQuality": ["Data validation requirement 1"]
  },
  "criticalWorkflows": [
    {
      "name": "Workflow name",
      "steps": ["step1", "step2"],
      "validations": ["validation1"],
      "priority": "Critical/High/Medium",
      "testCategory": "functional"
    }
  ],
  "regulatoryCompliance": [
    { "regulation": "HIPAA/GDPR/PCI-DSS/WCAG", "requirements": ["req1", "req2"] }
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

IMPORTANT: Based on the document content, determine which test categories are relevant:
- Functional (web, mobile, desktop, API, ERP automation)
- Performance (load, stress, APM, SaaS labs)
- Security (DAST, SAST, secrets, SBOM)
- Accessibility (WCAG, screen readers, compliance)
- Visual (visual diff, UI comparison, screenshots)
- Data/ETL validation (data pipelines, data quality, migration)

Set "enabled": true for categories mentioned in the document.
Add specific requirements to the testingRequirements section for each enabled category.

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
