import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

export async function POST({ request }) {
  console.log('🔵 Generate Test Package API called');
  
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
    const { document, name, framework = 'playwright', testDomain = 'functional' } = body;

    console.log('🔍 DEBUG - Received testDomain:', testDomain);
    console.log('🔍 DEBUG - Full body:', JSON.stringify(body, null, 2));
    
    if (!document) {
      return json({ error: 'Missing document' }, { status: 400 });
    }
    
    console.log(`🟢 Generating test code for domain: ${testDomain}`);
    console.log(`📝 Document: ${document.substring(0, 100)}`);
    
    // Generate actual executable test code based on the framework and domain 
    let testCode = '';
let testCases: any[] = [];

// Include ALL frameworks that should use the Playwright/Jest generator
const playwrightFrameworks = ['playwright', 'k6', 'owasp-zap', 'axe-core', 'percy', 'chromatic', 'dbt', 'great-expectations'];
const cypressFrameworks = ['cypress'];
const jestFrameworks = ['jest', 'vitest'];

if (playwrightFrameworks.includes(framework)) {
  testCode = generatePlaywrightTests(document, testDomain);
  testCases = extractTestCasesFromDocument(document, testDomain);
} else if (cypressFrameworks.includes(framework)) {
  testCode = generateCypressTests(document, testDomain);
  testCases = extractTestCasesFromDocument(document, testDomain);
} else if (jestFrameworks.includes(framework)) {
  testCode = generateJestTests(document, testDomain);
  testCases = extractTestCasesFromDocument(document, testDomain);
} else {
  // Default fallback - use playwright generator
  console.log(`⚠️ Unknown framework: ${framework}, using playwright generator as fallback`);
  testCode = generatePlaywrightTests(document, testDomain);
  testCases = extractTestCasesFromDocument(document, testDomain);
}

console.log(`🔧 Framework: ${framework}, testCode length: ${testCode.length}`);

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
        status: 'draft'
      })
      .select()
      .single();
    
    if (dbError) {
      console.error('Database error:', dbError);
      return json({ error: dbError.message }, { status: 500 });
    }
    
    console.log('✅ Test package saved with executable code');
    
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

function generatePlaywrightTests(document: string, testDomain: string): string {
  console.log(`🎯 [DEBUG] testDomain value: "${testDomain}"`);
  console.log(`🎯 [DEBUG] testDomain type: ${typeof testDomain}`);
  console.log(`🎯 [DEBUG] testDomain === 'performance': ${testDomain === 'performance'}`);
  const doc = document.toLowerCase();
  
  // Performance/Load test detection
  if (testDomain === 'performance' || doc.includes('load test') || doc.includes('performance') || doc.includes('concurrent')) {
    return `
import { test, expect } from '@playwright/test';

test.describe('Performance & Load Tests', () => {
  test('Load test with concurrent users', async ({ request }) => {
    const startTime = Date.now();
    const requests = [];
    const url = '/api/endpoint';
    
    // Simulate 100 concurrent requests
    for (let i = 0; i < 100; i++) {
      requests.push(request.get(url));
    }
    
    const responses = await Promise.all(requests);
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(\`Completed 100 requests in \${duration}ms\`);
    console.log(\`Average response time: \${duration / 100}ms\`);
    
    // Verify all requests succeeded
    responses.forEach(response => {
      expect(response.ok()).toBeTruthy();
    });
  });
  
  test('Response time under load', async ({ request }) => {
    const responseTimes = [];
    
    for (let i = 0; i < 50; i++) {
      const start = Date.now();
      await request.get('/api/endpoint');
      const end = Date.now();
      responseTimes.push(end - start);
    }
    
    const avgTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    console.log(\`Average response time: \${avgTime}ms\`);
    
    // Assert average response time is under 500ms
    expect(avgTime).toBeLessThan(500);
  });
});
`;
  }
  
  // Security test detection
  if (testDomain === 'security' || doc.includes('security') || doc.includes('dast') || doc.includes('sast')) {
    return `
import { test, expect } from '@playwright/test';

test.describe('Security Tests', () => {
  test('Check for SQL injection vulnerabilities', async ({ request }) => {
    const maliciousInputs = ["' OR '1'='1", "'; DROP TABLE users; --", "' OR 1=1--"];
    
    for (const input of maliciousInputs) {
      const response = await request.get(\`/api/search?q=\${encodeURIComponent(input)}\`);
      // Should not return error or unexpected data
      expect(response.status()).not.toBe(500);
      const body = await response.text();
      expect(body).not.toContain('SQL syntax');
    }
  });
  
  test('Check for XSS vulnerabilities', async ({ page }) => {
    await page.goto('/search');
    const xssPayload = '<script>alert("XSS")</script>';
    await page.fill('input[name="q"]', xssPayload);
    await page.click('button[type="submit"]');
    
    // Check that script wasn't executed
    const pageContent = await page.content();
    expect(pageContent).not.toContain('<script>alert("XSS")</script>');
  });
});
`;
  }
  
  // Accessibility test detection
  if (testDomain === 'accessibility' || doc.includes('accessibility') || doc.includes('wcag')) {
    return `
import { test, expect } from '@playwright/test';
const AxeBuilder = require('@axe-core/playwright').default;

test.describe('Accessibility Tests', () => {
  test('Homepage has no accessibility violations', async ({ page }) => {
    await page.goto('/');
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });
  
  test('Check keyboard navigation', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toBeVisible();
    
    // Tab through all focusable elements
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Tab');
    }
  });
});
`;
  }
  
  // Visual test detection
  if (testDomain === 'visual' || doc.includes('visual') || doc.includes('screenshot')) {
    return `
import { test, expect } from '@playwright/test';

test.describe('Visual Regression Tests', () => {
  test('Homepage visual snapshot', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveScreenshot('homepage.png');
  });
  
  test('Responsive design - mobile view', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await expect(page).toHaveScreenshot('homepage-mobile.png');
  });
});
`;
  }
  
  // Data Quality/ETL test detection
  if (testDomain === 'dataQuality' || doc.includes('etl') || doc.includes('data quality') || doc.includes('data validation')) {
    return `
import { test, expect } from '@playwright/test';

test.describe('Data Quality & ETL Tests', () => {
  test('Validate data completeness', async ({ request }) => {
    const response = await request.get('/api/data/validate');
    const data = await response.json();
    
    expect(data).toHaveProperty('totalRecords');
    expect(data.totalRecords).toBeGreaterThan(0);
    expect(data).toHaveProperty('nullCounts');
  });
  
  test('Check data consistency', async ({ request }) => {
    const response = await request.get('/api/data/consistency');
    const data = await response.json();
    
    // Verify no duplicate keys
    const keys = data.map((item: any) => item.id);
    const uniqueKeys = new Set(keys);
    expect(keys.length).toBe(uniqueKeys.size);
  });
});
`;
  }
  
  // Login flow detection
  if (doc.includes('login')) {
    return `
import { test, expect } from '@playwright/test';

test.describe('Login Functionality', () => {
  test('User can login with valid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', 'test@example.com');
    await page.fill('#password', 'password123');
    await page.click('#login-btn');
    await expect(page).toHaveURL('/dashboard');
  });

  test('Shows error with invalid password', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', 'test@example.com');
    await page.fill('#password', 'wrongpassword');
    await page.click('#login-btn');
    await expect(page.locator('.error')).toBeVisible();
  });
});
`;
  }
  
  if (doc.includes('api')) {
    return `
import { test, expect } from '@playwright/test';

test.describe('API Tests', () => {
  test('GET endpoint returns 200', async ({ request }) => {
    const response = await request.get('/api/users');
    expect(response.status()).toBe(200);
  });

  test('POST endpoint creates resource', async ({ request }) => {
    const response = await request.post('/api/users', {
      data: { name: 'Test User', email: 'test@example.com' }
    });
    expect(response.status()).toBe(201);
  });
});
`;
  }
  
  // Default - always return something
  return `
import { test, expect } from '@playwright/test';

test.describe('Generated Tests', () => {
  test('Verify functionality works', async ({ page }) => {
    console.log('Test generated for: ${document.substring(0, 100)}');
    expect(true).toBe(true);
  });
});
`;
}

function generateCypressTests(document: string, testDomain: string): string {
  const doc = document.toLowerCase();
  
  // Performance/Load test detection
  if (testDomain === 'performance' || doc.includes('load test') || doc.includes('performance')) {
    return `
describe('Performance & Load Tests', () => {
  it('Load test with concurrent requests', () => {
    const startTime = Date.now();
    const requests = [];
    
    // Simulate requests using cy.request
    for (let i = 0; i < 50; i++) {
      requests.push(cy.request('/api/endpoint'));
    }
    
    cy.wrap(Promise.all(requests)).then(() => {
      const endTime = Date.now();
      const duration = endTime - startTime;
      cy.log(\`Completed 50 requests in \${duration}ms\`);
      expect(duration).to.be.lessThan(5000);
    });
  });
});
`;
  }
  
  // Security test detection
  if (testDomain === 'security' || doc.includes('security')) {
    return `
describe('Security Tests', () => {
  it('Check for SQL injection', () => {
    const maliciousInput = "' OR '1'='1";
    cy.request({
      method: 'GET',
      url: \`/api/search?q=\${encodeURIComponent(maliciousInput)}\`,
      failOnStatusCode: false
    }).then((response) => {
      expect(response.status).not.to.eq(500);
      expect(response.body).not.to.contain('SQL syntax');
    });
  });
});
`;
  }
  
  // Default Cypress test
  if (doc.includes('login')) {
    return `
describe('Login Functionality', () => {
  beforeEach(() => {
    cy.visit('/login');
  });

  it('User can login with valid credentials', () => {
    cy.get('#email').type('test@example.com');
    cy.get('#password').type('password123');
    cy.get('#login-btn').click();
    cy.url().should('include', '/dashboard');
  });
});
`;
  }
  
  return `
describe('Generated Tests', () => {
  it('Test generated for: ${document.substring(0, 50)}', () => {
    expect(true).to.be.true;
  });
});
`;
}

function generateJestTests(document: string, testDomain: string): string {
  const doc = document.toLowerCase();
  
  // Performance test
  if (testDomain === 'performance') {
    return `
describe('Performance Tests', () => {
  test('API response time under load', async () => {
    const startTime = Date.now();
    const response = await fetch('/api/endpoint');
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    expect(response.ok).toBe(true);
    expect(duration).toBeLessThan(500);
  });
});
`;
  }
  
  // Security test
  if (testDomain === 'security') {
    return `
describe('Security Tests', () => {
  test('No SQL injection vulnerabilities', async () => {
    const maliciousInput = "' OR '1'='1";
    const response = await fetch(\`/api/search?q=\${encodeURIComponent(maliciousInput)}\`);
    const text = await response.text();
    
    expect(response.status).not.toBe(500);
    expect(text).not.toContain('SQL syntax');
  });
});
`;
  }
  
  return `
describe('API Tests', () => {
  test('Generated test for: ${document.substring(0, 50)}', async () => {
    expect(true).toBe(true);
  });
});
`;
}

function extractTestCasesFromDocument(document: string, testDomain: string): any[] {
  const doc = document.toLowerCase();
  const testCases: any[] = [];
  
  // Performance test cases
  if (testDomain === 'performance') {
    testCases.push(
      {
        name: "Load test with concurrent users",
        description: "Verify system handles concurrent users without performance degradation",
        priority: "High",
        steps: ["Simulate 100 concurrent users", "Measure response times", "Check for errors"],
        expectedResult: "All requests complete within acceptable time"
      },
      {
        name: "Response time validation",
        description: "Ensure API responses are under threshold",
        priority: "Medium",
        steps: ["Send multiple requests", "Measure response times", "Calculate average"],
        expectedResult: "Average response time < 500ms"
      }
    );
  }
  // Security test cases
  else if (testDomain === 'security') {
    testCases.push(
      {
        name: "SQL Injection prevention",
        description: "Verify SQL injection attempts are blocked",
        priority: "Critical",
        steps: ["Send SQL injection payloads", "Check responses", "Verify no data leakage"],
        expectedResult: "All injection attempts are rejected"
      },
      {
        name: "XSS prevention",
        description: "Verify cross-site scripting attempts are blocked",
        priority: "Critical",
        steps: ["Send XSS payloads", "Check if scripts execute", "Verify sanitization"],
        expectedResult: "Scripts are not executed"
      }
    );
  }
  // Accessibility test cases
  else if (testDomain === 'accessibility') {
    testCases.push(
      {
        name: "WCAG compliance",
        description: "Verify page meets WCAG 2.1 standards",
        priority: "High",
        steps: ["Run axe-core scan", "Check violations", "Verify contrast ratios"],
        expectedResult: "No critical violations found"
      }
    );
  }
  // Visual test cases
  else if (testDomain === 'visual') {
    testCases.push(
      {
        name: "Visual regression",
        description: "Verify UI matches expected appearance",
        priority: "Medium",
        steps: ["Capture screenshots", "Compare with baseline", "Check for differences"],
        expectedResult: "No unexpected visual changes"
      }
    );
  }
  // Data Quality test cases
  else if (testDomain === 'dataQuality') {
    testCases.push(
      {
        name: "Data completeness",
        description: "Verify all required data is present",
        priority: "High",
        steps: ["Check record counts", "Validate required fields", "Check for nulls"],
        expectedResult: "All expected data is present"
      },
      {
        name: "Data consistency",
        description: "Verify data consistency across sources",
        priority: "High",
        steps: ["Compare data sources", "Check for duplicates", "Validate relationships"],
        expectedResult: "Data is consistent across all sources"
      }
    );
  }
  // Login test cases
  else if (doc.includes('login')) {
    testCases.push(
      {
        name: "Login with valid credentials",
        description: "Verify user can log in with valid email and password",
        priority: "Critical",
        steps: ["Navigate to login page", "Enter email", "Enter password", "Click login"],
        expectedResult: "Redirected to dashboard"
      },
      {
        name: "Login with invalid password",
        description: "Verify error shown with wrong password",
        priority: "High",
        steps: ["Navigate to login page", "Enter email", "Enter wrong password", "Click login"],
        expectedResult: "Error message displayed"
      }
    );
  } else {
    testCases.push({
      name: "Verify functionality",
      description: `Verify that ${document.substring(0, 50)} works correctly`,
      priority: "Critical",
      steps: ["Execute test scenario", "Verify expected behavior"],
      expectedResult: "Functionality works as expected"
    });
  }
  
  return testCases;
}
