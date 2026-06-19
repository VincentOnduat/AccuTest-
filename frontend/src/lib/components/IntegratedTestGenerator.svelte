<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase';

  export let userId: string = '';
  export let initialDomain: 'functional' | 'performance' | 'security' | 'accessibility' | 'visual' | 'dataQuality' = 'functional';

  type DomainKey = 'functional' | 'performance' | 'security' | 'accessibility' | 'visual' | 'dataQuality';
  type Domain = {
    value: DomainKey;
    label: string;
    icon: string;
    description: string;
    testTypes: {
      value: string;
      label: string;
      icon: string;
      defaultFramework: string;
    }[];
  };

  // State
  let testPrompt = '';
  let testDomain: DomainKey = initialDomain;
  let testType = 'ui';
  let framework = 'playwright';
  let includeManualSteps = true;
  let includeBusinessReport = true;
  let generating = false;
  let error = '';
  let generatedPackage: any = null;
  let activeTab = 'automated';
  let saveSuccess = false;

  // Domain configurations
  const domains: Domain[] = [
    { value: 'functional', label: 'Functional Testing', icon: '🤖', description: 'Web, mobile, desktop, API, ERP automation',
      testTypes: [
        { value: 'ui', label: 'UI Automation', icon: '🖥️', defaultFramework: 'playwright' },
        { value: 'api', label: 'API Testing', icon: '🔌', defaultFramework: 'jest' },
        { value: 'unit', label: 'Unit Test', icon: '🧪', defaultFramework: 'vitest' },
        { value: 'integration', label: 'Integration', icon: '🔄', defaultFramework: 'jest' }
      ]
    },
    { value: 'performance', label: 'Performance & Load', icon: '⚡', description: 'Load, stress, APM, SaaS labs',
      testTypes: [
        { value: 'load', label: 'Load Testing', icon: '📊', defaultFramework: 'k6' },
        { value: 'stress', label: 'Stress Testing', icon: '💥', defaultFramework: 'k6' },
        { value: 'apm', label: 'APM Monitoring', icon: '📈', defaultFramework: 'datadog' }
      ]
    },
    { value: 'security', label: 'Security / DevSecOps', icon: '🛡️', description: 'DAST, SAST, secrets, SBOM',
      testTypes: [
        { value: 'dast', label: 'DAST (Dynamic)', icon: '🎯', defaultFramework: 'owasp-zap' },
        { value: 'sast', label: 'SAST (Static)', icon: '📝', defaultFramework: 'semgrep' },
        { value: 'secrets', label: 'Secrets Scanning', icon: '🔑', defaultFramework: 'gitleaks' }
      ]
    },
    { value: 'accessibility', label: 'Accessibility Testing', icon: '♿', description: 'WCAG, screen readers, compliance',
      testTypes: [
        { value: 'wcag', label: 'WCAG Compliance', icon: '📋', defaultFramework: 'axe-core' },
        { value: 'screenReader', label: 'Screen Reader', icon: '🔊', defaultFramework: 'nvda' },
        { value: 'keyboard', label: 'Keyboard Navigation', icon: '⌨️', defaultFramework: 'playwright' }
      ]
    },
    { value: 'visual', label: 'Visual Testing', icon: '👁️', description: 'Visual diff, UI comparison, screenshots',
      testTypes: [
        { value: 'visualDiff', label: 'Visual Regression', icon: '🖼️', defaultFramework: 'percy' },
        { value: 'uiComparison', label: 'UI Comparison', icon: '🔄', defaultFramework: 'chromatic' },
        { value: 'screenshot', label: 'Screenshot Testing', icon: '📸', defaultFramework: 'playwright' }
      ]
    },
    { value: 'dataQuality', label: 'Data/ETL Validation', icon: '📊', description: 'Data pipelines, data quality, migration',
      testTypes: [
        { value: 'etl', label: 'ETL Pipeline', icon: '🔄', defaultFramework: 'dbt' },
        { value: 'dataQuality', label: 'Data Quality', icon: '✅', defaultFramework: 'great-expectations' },
        { value: 'migration', label: 'Migration Testing', icon: '🚚', defaultFramework: 'dbt' }
      ]
    }
  ];

  // Frameworks by domain
  const frameworksByDomain = {
    functional: [
      { value: 'playwright', label: 'Playwright', icon: '🎭' },
      { value: 'cypress', label: 'Cypress', icon: '🔄' },
      { value: 'jest', label: 'Jest', icon: '🃏' },
      { value: 'vitest', label: 'Vitest', icon: '⚡' }
    ],
    performance: [
      { value: 'k6', label: 'k6', icon: '📊' },
      { value: 'jmeter', label: 'JMeter', icon: '⚡' },
      { value: 'locust', label: 'Locust', icon: '🐍' }
    ],
    security: [
      { value: 'owasp-zap', label: 'OWASP ZAP', icon: '🛡️' },
      { value: 'semgrep', label: 'Semgrep', icon: '📝' },
      { value: 'snyk', label: 'Snyk', icon: '🔒' },
      { value: 'gitleaks', label: 'Gitleaks', icon: '🔑' }
    ],
    accessibility: [
      { value: 'axe-core', label: 'Axe Core', icon: '♿' },
      { value: 'playwright', label: 'Playwright', icon: '🎭' },
      { value: 'lighthouse', label: 'Lighthouse', icon: '💡' }
    ],
    visual: [
      { value: 'percy', label: 'Percy', icon: '👁️' },
      { value: 'chromatic', label: 'Chromatic', icon: '🎨' },
      { value: 'playwright', label: 'Playwright', icon: '🎭' }
    ],
    dataQuality: [
      { value: 'dbt', label: 'dbt', icon: '📊' },
      { value: 'great-expectations', label: 'Great Expectations', icon: '✅' },
      { value: 'soda', label: 'Soda', icon: '🥤' }
    ]
  };

  // Template prompts by domain
  const templatesByDomain = {
    functional: [
      { name: 'Login Flow', prompt: 'Test user login with email/password, validation, and error handling', icon: '🔐' },
      { name: 'API CRUD', prompt: 'Test REST API endpoints for creating, reading, updating, and deleting users', icon: '🔌' },
      { name: 'Shopping Cart', prompt: 'Test adding items to cart, updating quantities, and checkout process', icon: '🛒' }
    ],
    performance: [
      { name: 'Load Test', prompt: 'Load test with 1000 concurrent users accessing the homepage', icon: '📊' },
      { name: 'Stress Test', prompt: 'Stress test to find breaking point of the checkout API', icon: '💥' },
      { name: 'API Performance', prompt: 'Test API response times under peak loads (p95 < 200ms)', icon: '⚡' }
    ],
    security: [
      { name: 'DAST Scan', prompt: 'Dynamic security scan for OWASP Top 10 vulnerabilities', icon: '🎯' },
      { name: 'SAST Analysis', prompt: 'Static code security analysis for SQL injection and XSS', icon: '📝' },
      { name: 'Secret Detection', prompt: 'Scan repository for hardcoded secrets and API keys', icon: '🔑' }
    ],
    accessibility: [
      { name: 'WCAG Compliance', prompt: 'Test web application for WCAG 2.1 AA compliance', icon: '♿' },
      { name: 'Screen Reader', prompt: 'Test compatibility with NVDA and VoiceOver screen readers', icon: '🔊' }
    ],
    visual: [
      { name: 'Visual Regression', prompt: 'Capture and compare screenshots of key pages', icon: '👁️' },
      { name: 'Responsive Design', prompt: 'Test UI responsiveness across desktop, tablet, and mobile', icon: '📱' }
    ],
    dataQuality: [
      { name: 'ETL Validation', prompt: 'Validate ETL pipeline data transformation and row counts', icon: '🔄' },
      { name: 'Data Quality', prompt: 'Test data quality rules: null checks, unique constraints', icon: '✅' }
    ]
  };

  // Get current domain data
  $: currentDomain = domains.find(d => d.value === testDomain) || domains[0];
  $: currentTestTypes = currentDomain.testTypes;
  $: currentFrameworks = frameworksByDomain[testDomain] || frameworksByDomain.functional;
  $: currentTemplates = templatesByDomain[testDomain] || templatesByDomain.functional;

  // Set defaults when domain changes
  $: {
    if (currentTestTypes.length > 0) {
      testType = currentTestTypes[0].value;
      framework = currentTestTypes[0].defaultFramework;
    }
  }

  // Watch for initialDomain changes from parent
  $: {
    if (initialDomain && initialDomain !== testDomain) {
      console.log(`🔄 Generator updating domain from ${testDomain} to ${initialDomain}`);
      testDomain = initialDomain;
    }
  }

  async function generatePackage() {
    if (!testPrompt.trim()) {
      error = 'Please describe what you want to test';
      return;
    }

    generating = true;
    error = '';

    try {
      console.log(`🔵 Generating test package for domain: ${testDomain}`);
      
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (!token) {
        error = 'Please refresh the page and try again';
        generating = false;
        return;
      }

      const response = await fetch('/api/ai/generate-test-package', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          document: testPrompt,
          name: `${currentDomain.label} - ${new Date().toLocaleString()}`,
          testDomain: testDomain,
          testType: testType,
          framework: framework,
          userId
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to generate test package (${response.status})`);
      }

      const result = await response.json();
      console.log('📦 API Response:', result);

      // FIX: Check the actual response structure from your API
      if (result.success) {
        let testCases = [];
        let executableCode = '';
        
        // The executable code is in result.testCode from your API
        executableCode = result.testCode || '';
        
        // Try to extract test cases from various possible locations
        if (result.data?.test_cases?.testCases) {
          testCases = result.data.test_cases.testCases;
        } else if (result.data?.testCases) {
          testCases = result.data.testCases;
        } else if (result.testCases) {
          testCases = result.testCases;
        }
        
        // Also check if the API returned test cases in the testCode string (parse it)
        if (testCases.length === 0 && executableCode) {
          // Try to extract basic test info from the code
          const codeLines = executableCode.split('\n');
          for (const line of codeLines) {
            if (line.includes('test(') || line.includes('it(')) {
              const match = line.match(/['"`]([^'"`]+)['"`]/);
              if (match) {
                testCases.push({
                  name: match[1],
                  description: `Test: ${match[1]}`,
                  priority: 'Medium'
                });
              }
            }
          }
        }
        
        generatedPackage = {
          metadata: {
            name: result.data?.name || `${currentDomain.label} - ${new Date().toLocaleString()}`,
            description: testPrompt,
            testDomain: testDomain,
            testType: testType,
            framework: framework,
            id: result.data?.id || result.id
          },
          automated: {
            executableCode: executableCode,
            framework: framework,
            testCases: testCases,
            summary: result.summary || { totalTests: testCases.length }
          },
          manual: { testSuite: { name: `Manual: ${testPrompt}` }, testCases: [] },
          business: { executiveSummary: `Test suite for ${currentDomain.label}`, keyMetrics: {}, businessValue: [], risks: [] }
        };
      } else {
        error = result.error || 'Failed to generate test package';
      }
    } catch (err: any) {
      error = err.message;
      console.error('Generation error:', err);
    } finally {
      generating = false;
    }
  }

  function useTemplate(template: any) {
    testPrompt = template.prompt;
  }

  function resetForm() {
    testPrompt = '';
    generatedPackage = null;
    error = '';
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
  }
</script>

<div class="ai-generator">
  <div class="generator-header">
    <h3>{currentDomain.icon} AI Test Package Generator</h3>
    <p class="subtitle">{currentDomain.description}</p>
    <div class="domain-context-badge">
      <span>🎯 Generating for: <strong>{currentDomain.label}</strong></span>
    </div>
  </div>

  {#if !generatedPackage}
    <div class="input-section">
      <!-- Templates -->
      <div class="templates-section">
        <span class="label">Quick Templates</span>
        <div class="template-grid">
          {#each currentTemplates as template}
            <button class="template-btn" on:click={() => useTemplate(template)} type="button">
              <span class="template-icon">{template.icon}</span>
              <span class="template-name">{template.name}</span>
            </button>
          {/each}
        </div>
      </div>

      <!-- Main Form -->
      <div class="form-group">
        <label for="prompt">Describe what you want to test *</label>
        <textarea
          id="prompt"
          bind:value={testPrompt}
          placeholder="Example: Test the user login flow including successful login, invalid credentials..."
          rows="4"
          disabled={generating}
        ></textarea>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label for="testType">Test Type</label>
          <select id="testType" bind:value={testType} disabled={generating}>
            {#each currentTestTypes as type}
              <option value={type.value}>{type.icon} {type.label}</option>
            {/each}
          </select>
        </div>

        <div class="form-group">
          <label for="framework">Framework / Tool</label>
          <select id="framework" bind:value={framework} disabled={generating}>
            {#each currentFrameworks as fw}
              <option value={fw.value}>{fw.icon} {fw.label}</option>
            {/each}
          </select>
        </div>
      </div>

      {#if error}
        <div class="error-message">{error}</div>
      {/if}

      <button class="generate-btn" on:click={generatePackage} disabled={generating || !testPrompt.trim()}>
        {#if generating}
          <span class="spinner"></span>
          <span>Generating...</span>
        {:else}
          <span>🚀 Generate {currentDomain.label}</span>
        {/if}
      </button>
    </div>
  {:else}
    <div class="results-section">
      <div class="results-header">
        <h4>Generated Test Package</h4>
        <div class="results-actions">
          <button class="action-btn" on:click={resetForm}>🔄 New</button>
        </div>
      </div>

      <div class="tabs">
        <button class="tab-btn {activeTab === 'automated' ? 'active' : ''}" on:click={() => activeTab = 'automated'}>
          🤖 Automated
        </button>
        <button class="tab-btn {activeTab === 'business' ? 'active' : ''}" on:click={() => activeTab = 'business'}>
          📊 Business
        </button>
      </div>

      {#if activeTab === 'automated'}
        <div class="code-section">
          <div class="code-header">
            <h5>Test Code ({framework})</h5>
            <button class="copy-btn" on:click={() => copyToClipboard(generatedPackage.automated?.executableCode || '')}>
              📋 Copy
            </button>
          </div>
          <pre class="code-block"><code>{generatedPackage.automated?.executableCode || '// No code generated'}</code></pre>
          
          {#if generatedPackage.automated?.testCases?.length > 0}
            <h5 style="color: #e5e7eb; margin-top: 1rem;">Test Cases</h5>
            {#each generatedPackage.automated.testCases as test, index}
              <div class="test-case">
                <h5>{index + 1}. {test.name}</h5>
                <p>{test.description}</p>
              </div>
            {/each}
          {/if}
        </div>
      {:else}
        <div class="business-section">
          <h5>Executive Summary</h5>
          <p>{generatedPackage.business?.executiveSummary}</p>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .ai-generator {
    background: white;
    border-radius: 0.5rem;
    padding: 1.5rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }

  .generator-header {
    margin-bottom: 1.5rem;
  }

  .generator-header h3 {
    font-size: 1.25rem;
    color: #1f2937;
    margin: 0 0 0.25rem 0;
  }

  .subtitle {
    color: #6b7280;
    font-size: 0.875rem;
    margin: 0 0 0.5rem 0;
  }

  .domain-context-badge {
    display: inline-block;
    margin-top: 0.5rem;
    padding: 0.25rem 0.75rem;
    background: #ede9fe;
    border-radius: 9999px;
    font-size: 0.75rem;
    color: #5b21b6;
  }

  .templates-section {
    margin-bottom: 1.5rem;
  }

  .templates-section .label {
    display: block;
    font-weight: 500;
    margin-bottom: 0.5rem;
  }

  .template-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .template-btn {
    padding: 0.5rem 1rem;
    background: #f3f4f6;
    border: 1px solid #e5e7eb;
    border-radius: 0.375rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: #374151;
  }

  .template-btn:hover {
    background: #e5e7eb;
  }

  .form-group {
    margin-bottom: 1rem;
  }

  .form-group label {
    display: block;
    font-weight: 500;
    margin-bottom: 0.5rem;
  }

  textarea, select {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-family: inherit;
    background: white;
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .generate-btn {
    width: 100%;
    padding: 0.75rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 0.375rem;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    font-size: 1rem;
  }

  .generate-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 6px rgba(102,126,234,0.3);
  }

  .generate-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .spinner {
    width: 1rem;
    height: 1rem;
    border: 2px solid rgba(255,255,255,0.3);
    border-top: 2px solid white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .error-message {
    padding: 0.75rem;
    background: #fee2e2;
    color: #991b1b;
    border-radius: 0.375rem;
    margin-bottom: 1rem;
  }

  .results-section {
    margin-top: 1rem;
  }

  .results-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .results-header h4 {
    font-size: 1rem;
    color: #1f2937;
    margin: 0;
  }

  .results-actions {
    display: flex;
    gap: 0.5rem;
  }

  .action-btn {
    padding: 0.25rem 0.75rem;
    background: #f3f4f6;
    border: 1px solid #e5e7eb;
    border-radius: 0.25rem;
    cursor: pointer;
    font-size: 0.875rem;
    color: #374151;
  }

  .action-btn:hover {
    background: #e5e7eb;
  }

  .tabs {
    display: flex;
    gap: 0.5rem;
    border-bottom: 1px solid #e5e7eb;
    margin-bottom: 1rem;
  }

  .tab-btn {
    padding: 0.5rem 1rem;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    cursor: pointer;
    color: #6b7280;
    font-size: 0.875rem;
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .tab-btn.active {
    border-bottom-color: #667eea;
    color: #667eea;
    font-weight: 500;
  }

  .code-section {
    background: #1f2937;
    border-radius: 0.375rem;
    padding: 1rem;
  }

  .code-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
    color: #e5e7eb;
  }

  .code-header h5 {
    margin: 0;
    color: #e5e7eb;
    font-size: 0.875rem;
  }

  .copy-btn {
    padding: 0.25rem 0.5rem;
    background: rgba(255,255,255,0.1);
    border: 1px solid rgba(255,255,255,0.2);
    border-radius: 0.25rem;
    color: white;
    cursor: pointer;
    font-size: 0.75rem;
  }

  .copy-btn:hover {
    background: rgba(255,255,255,0.2);
  }

  .code-block {
    background: #111827;
    color: #e5e7eb;
    padding: 1rem;
    border-radius: 0.25rem;
    overflow-x: auto;
    font-size: 0.875rem;
    margin: 0;
    white-space: pre-wrap;
    font-family: 'Monaco', 'Menlo', monospace;
  }

  .test-case {
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 0.375rem;
    padding: 1rem;
    margin-bottom: 1rem;
  }

  .test-case h5 {
    font-size: 1rem;
    color: #1f2937;
    margin: 0 0 0.5rem 0;
  }

  .business-section {
    padding: 1rem;
    max-height: 500px;
    overflow-y: auto;
  }

  .business-section h5 {
    font-size: 1rem;
    color: #1f2937;
    margin: 0 0 0.5rem 0;
  }

  @media (max-width: 640px) {
    .form-row {
      grid-template-columns: 1fr;
    }
    
    .template-grid {
      flex-direction: column;
    }
  }
</style>
