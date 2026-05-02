<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase';

  export let userId: string;

  // State
  let testPrompt = '';
  let testType = 'ui';
  let framework = 'playwright';
  let includeManualSteps = true;
  let includeBusinessReport = true;
  let generating = false;
  let error = '';
  let generatedPackage: any = null;
  let activeTab = 'automated';
  let saveSuccess = false;

  // Define types
  interface Framework {
    value: string;
    label: string;
    icon: string;
  }

  interface TestType {
    value: string;
    label: string;
    icon: string;
  }

  interface PromptTemplate {
    name: string;
    prompt: string;
    type: string;
    framework: string;
    icon: string;
  }

  // Frameworks and test types
  const frameworks: Framework[] = [
    { value: 'playwright', label: 'Playwright', icon: '🎭' },
    { value: 'cypress', label: 'Cypress', icon: '🔄' },
    { value: 'jest', label: 'Jest', icon: '🃏' },
    { value: 'vitest', label: 'Vitest', icon: '⚡' }
  ];

  const testTypes: TestType[] = [
    { value: 'ui', label: 'UI Automation', icon: '🖥️' },
    { value: 'api', label: 'API Testing', icon: '🔌' },
    { value: 'unit', label: 'Unit Test', icon: '🧪' },
    { value: 'integration', label: 'Integration', icon: '🔄' }
  ];

  // Template prompts with icons
  const promptTemplates: PromptTemplate[] = [
    { 
      name: 'Login Flow', 
      prompt: 'Test user login with email/password, validation, and error handling',
      type: 'ui',
      framework: 'playwright',
      icon: '🔐'
    },
    { 
      name: 'API CRUD', 
      prompt: 'Test REST API endpoints for creating, reading, updating, and deleting users',
      type: 'api',
      framework: 'jest',
      icon: '🔌'
    },
    { 
      name: 'Form Validation', 
      prompt: 'Test registration form with email, password, and confirm password validation',
      type: 'ui',
      framework: 'playwright',
      icon: '📝'
    },
    { 
      name: 'Shopping Cart', 
      prompt: 'Test adding items to cart, updating quantities, and checkout process',
      type: 'ui',
      framework: 'playwright',
      icon: '🛒'
    },
    { 
      name: 'Payment Flow', 
      prompt: 'Test payment processing with credit card, PayPal, and error scenarios',
      type: 'integration',
      framework: 'playwright',
      icon: '💰'
    }
  ];

  // Improved helper function to extract JSON from text
  function extractJSONFromText(text: string): any {
    // Find the JSON object in the response
    let jsonStr = text;
    
    // Try to extract JSON if there's extra text
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }
    
    // Clean up common JSON issues
    jsonStr = jsonStr
      // Remove trailing commas before closing braces
      .replace(/,(\s*[}\]])/g, '$1')
      // Fix unescaped backslashes in strings
      .replace(/(?<!\\)\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})/g, '\\\\')
      // Remove control characters
      .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
      // Fix newlines in strings
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
    
    try {
      return JSON.parse(jsonStr);
    } catch (e) {
      console.error('JSON parse failed:', e);
      
      // Second attempt: Try to manually extract the code field
      const codeMatch = text.match(/"code":\s*"([\s\S]*?)"(?=,\s*"|$)/);
      if (codeMatch) {
        try {
          // Create a simple package with the extracted code
          const frameworkMatch = text.match(/"framework":\s*"([^"]+)"/);
          return {
            automated: {
              code: codeMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\'),
              framework: frameworkMatch ? frameworkMatch[1] : 'playwright',
              dependencies: ['@playwright/test'],
              setup: 'npm install @playwright/test',
              testCases: ['Generated test']
            },
            metadata: { 
              name: `${testType.charAt(0).toUpperCase() + testType.slice(1)} Test`, 
              description: testPrompt 
            },
            manual: { testSuite: { name: "Manual Tests", description: "" }, testCases: [] },
            business: { executiveSummary: "", keyMetrics: {}, businessValue: [], risks: [] }
          };
        } catch (e2) {
          console.error('Manual extraction also failed:', e2);
        }
      }
      
      return null;
    }
  }

  // Generate test package - simplified using cookies
  async function generatePackage() {
    if (!testPrompt.trim()) {
      error = 'Please describe what you want to test';
      return;
    }

    generating = true;
    error = '';

    try {
      console.log('🔵 Generating test package...');
      
      // Check session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.error('❌ No active session');
        error = 'Your session has expired. Please log in again.';
        setTimeout(() => {
          window.location.href = '/';
        }, 1500);
        generating = false;
        return;
      }

      console.log('✅ Session active for user:', session.user.email);

      // Use cookies for auth - no Authorization header needed
      const response = await fetch('/api/ai/generate-test-package', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          prompt: testPrompt,
          testType,
          framework,
          includeManualSteps,
          includeBusinessReport
        })
      });

      console.log('📡 API response status:', response.status);

      if (response.status === 401) {
        error = 'Your session has expired. Please log in again.';
        setTimeout(() => {
          window.location.href = '/';
        }, 1500);
        return;
      }

      if (!response.ok) {
        throw new Error(`Failed to generate test package (${response.status})`);
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let result = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          result += decoder.decode(value, { stream: true });
        }
      }

      console.log('📝 Raw response length:', result.length);
      console.log('📝 Raw response preview:', result.substring(0, 500));

      // Try to extract JSON using the improved function
      const extractedData = extractJSONFromText(result);
      
      if (extractedData) {
        generatedPackage = extractedData;
        console.log('✅ Package parsed successfully');
        
        // Ensure required fields exist
        if (!generatedPackage.metadata) {
          generatedPackage.metadata = {
            name: `${testType.charAt(0).toUpperCase() + testType.slice(1)} Test`,
            description: testPrompt,
            testType: testType,
            framework: framework
          };
        }
        if (!generatedPackage.automated) {
          generatedPackage.automated = {
            code: result.substring(0, 2000),
            framework: framework,
            dependencies: [],
            setup: `npm install ${framework}`,
            testCases: [`Test: ${testPrompt.substring(0, 50)}`]
          };
        }
      } else {
        console.warn('No valid JSON found, creating fallback package');
        // Create a fallback package with the raw text as code
        generatedPackage = {
          metadata: { 
            name: `${testType.charAt(0).toUpperCase() + testType.slice(1)} Test`, 
            description: testPrompt,
            testType: testType,
            framework: framework
          },
          automated: {
            code: result.length > 100 ? result.substring(0, 2000) : `// AI generated test for: ${testPrompt}\n// Response received: ${result.substring(0, 500)}`,
            framework: framework,
            dependencies: framework === 'playwright' ? ['@playwright/test'] : framework === 'jest' ? ['jest'] : [],
            setup: `npm install ${framework === 'playwright' ? '@playwright/test' : framework}`,
            testCases: [`Test: ${testPrompt.substring(0, 50)}`]
          },
          manual: {
            testSuite: { name: `Manual: ${testPrompt}`, description: "Manual test steps" },
            testCases: []
          },
          business: {
            executiveSummary: `Test suite for: ${testPrompt}`,
            keyMetrics: { coverage: "N/A" },
            businessValue: ["Ensures quality"],
            risks: []
          }
        };
      }

    } catch (err: any) {
      error = err.message || 'Failed to generate test package';
      console.error('❌ Generation error:', err);
    } finally {
      generating = false;
    }
  }

  // Save to library
  async function saveToLibrary() {
    if (!generatedPackage) return;

    try {
      const { error: saveError } = await supabase
        .from('test_packages')
        .insert([
          {
            user_id: userId,
            name: generatedPackage?.metadata?.name || 'Untitled Package',
            description: testPrompt,
            version: 1,
            automated_test_count: generatedPackage?.automated?.testCases?.length || 0,
            manual_test_count: generatedPackage?.manual?.testCases?.length || 0,
            package_data: generatedPackage
          }
        ]);

      if (saveError) throw saveError;

      saveSuccess = true;
      setTimeout(() => saveSuccess = false, 3000);
    } catch (err: any) {
      error = err.message;
    }
  }

  // Use template
  function useTemplate(template: PromptTemplate) {
    testPrompt = template.prompt;
    testType = template.type;
    framework = template.framework;
  }

  // Reset form
  function resetForm() {
    testPrompt = '';
    generatedPackage = null;
    error = '';
  }

  // Copy to clipboard
  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
  }
</script>

<!-- Rest of your template remains exactly the same -->
<div class="ai-generator">
  <div class="generator-header">
    <h3>🤖 Test Package Generator</h3>
    <p class="subtitle">Describe what you want to test, and we will generate complete test packages</p>
  </div>

  {#if !generatedPackage}
    <!-- Input Form -->
    <div class="input-section">
      <!-- Templates -->
      <div class="templates-section">
        <span class="label">Quick Templates</span>
        <div class="template-grid">
          {#each promptTemplates as template}
            <button 
              class="template-btn" 
              on:click={() => useTemplate(template)}
              type="button"
              aria-label={`Use ${template.name} template`}
            >
              <span class="template-icon" aria-hidden="true">{template.icon}</span>
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
          placeholder="Example: Test the user login flow including successful login, invalid credentials, and password reset..."
          rows="4"
          disabled={generating}
          aria-describedby={error ? 'error-message' : undefined}
        ></textarea>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label for="testType">Test Type</label>
          <select id="testType" bind:value={testType} disabled={generating}>
            {#each testTypes as type}
              <option value={type.value}>{type.icon} {type.label}</option>
            {/each}
          </select>
        </div>

        <div class="form-group">
          <label for="framework">Framework</label>
          <select id="framework" bind:value={framework} disabled={generating}>
            {#each frameworks as fw}
              <option value={fw.value}>{fw.icon} {fw.label}</option>
            {/each}
          </select>
        </div>
      </div>

      <div class="options-row">
        <label class="checkbox">
          <input type="checkbox" bind:checked={includeManualSteps} disabled={generating} />
          <span>Include Manual Test Cases</span>
        </label>
        <label class="checkbox">
          <input type="checkbox" bind:checked={includeBusinessReport} disabled={generating} />
          <span>Include Business Report</span>
        </label>
      </div>

      {#if error}
        <div id="error-message" class="error-message" role="alert">
          <span aria-hidden="true">⚠️</span>
          {error}
        </div>
      {/if}

      <button 
        class="generate-btn" 
        on:click={generatePackage}
        disabled={generating || !testPrompt.trim()}
        aria-busy={generating}
      >
        {#if generating}
          <span class="spinner" aria-hidden="true"></span>
          <span>Generating...</span>
        {:else}
          <span aria-hidden="true">🚀</span>
          <span>Generate Test Package</span>
        {/if}
      </button>
    </div>
  {:else}
    <!-- Results Section -->
    <div class="results-section">
      <div class="results-header">
        <h4>Generated Test Package</h4>
        <div class="results-actions">
          {#if saveSuccess}
            <span class="success-badge" role="status">✓ Saved!</span>
          {/if}
          <button class="action-btn" on:click={saveToLibrary} aria-label="Save to library">💾 Save</button>
          <button class="action-btn" on:click={resetForm} aria-label="Create new package">🔄 New</button>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs" role="tablist">
        <button 
          class="tab-btn" 
          class:active={activeTab === 'automated'}
          on:click={() => activeTab = 'automated'}
          role="tab"
          aria-selected={activeTab === 'automated'}
          aria-controls="automated-panel"
        >
          <span aria-hidden="true">🤖</span>
          Automated ({generatedPackage.automated?.testCases?.length || 0})
        </button>
        <button 
          class="tab-btn" 
          class:active={activeTab === 'manual'}
          on:click={() => activeTab = 'manual'}
          role="tab"
          aria-selected={activeTab === 'manual'}
          aria-controls="manual-panel"
        >
          <span aria-hidden="true">📝</span>
          Manual ({generatedPackage.manual?.testCases?.length || 0})
        </button>
        <button 
          class="tab-btn" 
          class:active={activeTab === 'business'}
          on:click={() => activeTab = 'business'}
          role="tab"
          aria-selected={activeTab === 'business'}
          aria-controls="business-panel"
        >
          <span aria-hidden="true">📊</span>
          Business
        </button>
      </div>

      <div class="tab-content">
        {#if activeTab === 'automated'}
          <div id="automated-panel" class="code-section" role="tabpanel">
            <div class="code-header">
              <h5>Test Code ({generatedPackage.automated?.framework})</h5>
              <button 
                class="copy-btn" 
                on:click={() => copyToClipboard(generatedPackage.automated?.code)}
                aria-label="Copy code to clipboard"
              >
                📋 Copy
              </button>
            </div>
            <pre class="code-block"><code>{generatedPackage.automated?.code || '// No code generated'}</code></pre>
            
            {#if generatedPackage.automated?.dependencies?.length > 0}
              <h5>Dependencies</h5>
              <pre class="dependencies">{generatedPackage.automated.dependencies.join('\n')}</pre>
            {/if}
          </div>
        {/if}

        {#if activeTab === 'manual'}
          <div id="manual-panel" class="manual-section" role="tabpanel">
            {#if generatedPackage.manual?.testCases?.length > 0}
              {#each generatedPackage.manual.testCases as testCase}
                <div class="test-case">
                  <h5>{testCase.id}: {testCase.title}</h5>
                  <p class="priority-{testCase.priority?.toLowerCase()}">Priority: {testCase.priority}</p>
                  <p>{testCase.description}</p>
                  
                  {#if testCase.preconditions?.length > 0}
                    <h6>Preconditions:</h6>
                    <ul>
                      {#each testCase.preconditions as pre}
                        <li>{pre}</li>
                      {/each}
                    </ul>
                  {/if}

                  <h6>Test Steps:</h6>
                  <table class="steps-table">
                    <thead>
                      <tr>
                        <th>Step</th>
                        <th>Action</th>
                        <th>Expected Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {#each testCase.steps as step}
                        <tr>
                          <td>{step.step}</td>
                          <td>{step.action}</td>
                          <td>{step.expectedResult}</td>
                        </tr>
                      {/each}
                    </tbody>
                  </table>
                </div>
              {/each}
            {:else}
              <p>No manual test cases generated</p>
            {/if}
          </div>
        {/if}

        {#if activeTab === 'business'}
          <div id="business-panel" class="business-section" role="tabpanel">
            <h5>Executive Summary</h5>
            <p>{generatedPackage.business?.executiveSummary}</p>
            
            <h5>Key Metrics</h5>
            <div class="metrics-grid">
              {#each Object.entries(generatedPackage.business?.keyMetrics || {}) as [key, value]}
                <div class="metric">
                  <span class="metric-label">{key}</span>
                  <span class="metric-value">{value}</span>
                </div>
              {/each}
            </div>

            <h5>Business Value</h5>
            <ul>
              {#each generatedPackage.business?.businessValue || [] as value}
                <li>{value}</li>
              {/each}
            </ul>

            <h5>Risks</h5>
            {#each generatedPackage.business?.risks || [] as risk}
              <div class="risk-item">
                <strong>{risk.risk}</strong>
                <span class="risk-impact {risk.impact?.toLowerCase()}">{risk.impact}</span>
                <p>{risk.mitigation}</p>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  /* Your existing styles remain exactly the same */
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
    margin: 0;
  }

  /* Templates */
  .templates-section {
    margin-bottom: 1.5rem;
  }

  .templates-section .label {
    display: block;
    font-weight: 500;
    color: #374151;
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

  .template-icon {
    font-size: 1rem;
  }

  /* Form */
  .form-group {
    margin-bottom: 1rem;
  }

  .form-group label {
    display: block;
    font-weight: 500;
    color: #374151;
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

  textarea:focus, select:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102,126,234,0.1);
  }

  textarea:disabled, select:disabled {
    background: #f3f4f6;
    cursor: not-allowed;
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .options-row {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
    flex-wrap: wrap;
  }

  .checkbox {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    font-size: 0.875rem;
    color: #374151;
  }

  .checkbox input {
    width: auto;
    margin: 0;
  }

  /* Generate Button */
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
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  /* Error Message */
  .error-message {
    padding: 0.75rem;
    background: #fee2e2;
    color: #991b1b;
    border-radius: 0.375rem;
    margin-bottom: 1rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
  }

  /* Results Section */
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

  .success-badge {
    padding: 0.25rem 0.75rem;
    background: #d1fae5;
    color: #065f46;
    border-radius: 0.25rem;
    font-size: 0.875rem;
  }

  /* Tabs */
  .tabs {
    display: flex;
    gap: 0.5rem;
    border-bottom: 1px solid #e5e7eb;
    margin-bottom: 1rem;
    overflow-x: auto;
  }

  .tab-btn {
    padding: 0.5rem 1rem;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    cursor: pointer;
    color: #6b7280;
    white-space: nowrap;
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

  /* Code Section */
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
    margin: 0 0 1rem 0;
    white-space: pre-wrap;
    font-family: 'Monaco', 'Menlo', monospace;
  }

  .dependencies {
    background: #374151;
    color: #e5e7eb;
    padding: 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    margin: 0;
    font-family: 'Monaco', 'Menlo', monospace;
  }

  /* Manual Test Cases */
  .manual-section {
    max-height: 500px;
    overflow-y: auto;
    padding-right: 0.5rem;
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

  .test-case h6 {
    font-size: 0.875rem;
    color: #374151;
    margin: 1rem 0 0.25rem 0;
  }

  .priority-high {
    color: #dc2626;
    font-weight: 500;
  }
  
  .priority-medium {
    color: #f59e0b;
    font-weight: 500;
  }
  
  .priority-low {
    color: #10b981;
    font-weight: 500;
  }

  .steps-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 0.5rem;
    font-size: 0.875rem;
  }

  .steps-table th,
  .steps-table td {
    padding: 0.5rem;
    text-align: left;
    border: 1px solid #e5e7eb;
  }

  .steps-table th {
    background: #f3f4f6;
    font-weight: 600;
  }

  /* Business Section */
  .business-section {
    padding: 0.5rem;
    max-height: 500px;
    overflow-y: auto;
  }

  .business-section h5 {
    font-size: 1rem;
    color: #1f2937;
    margin: 1rem 0 0.5rem 0;
  }

  .business-section h5:first-child {
    margin-top: 0;
  }

  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 0.5rem;
    margin: 1rem 0;
  }

  .metric {
    background: #f3f4f6;
    padding: 0.75rem;
    border-radius: 0.375rem;
    text-align: center;
  }

  .metric-label {
    display: block;
    font-size: 0.75rem;
    color: #6b7280;
    text-transform: capitalize;
  }

  .metric-value {
    display: block;
    font-size: 1.125rem;
    font-weight: 600;
    color: #1f2937;
  }

  .risk-item {
    padding: 0.75rem;
    border: 1px solid #e5e7eb;
    border-radius: 0.375rem;
    margin-bottom: 0.5rem;
  }

  .risk-item strong {
    display: block;
    color: #1f2937;
    margin-bottom: 0.25rem;
  }

  .risk-impact {
    display: inline-block;
    padding: 0.125rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    margin-left: 0.5rem;
  }

  .risk-impact.high {
    background: #fee2e2;
    color: #991b1b;
  }

  .risk-impact.medium {
    background: #fed7aa;
    color: #92400e;
  }

  .risk-impact.low {
    background: #d1fae5;
    color: #065f46;
  }

  /* Responsive */
  @media (max-width: 640px) {
    .form-row {
      grid-template-columns: 1fr;
    }
    
    .options-row {
      flex-direction: column;
      gap: 0.5rem;
    }
    
    .template-grid {
      flex-direction: column;
    }
    
    .results-header {
      flex-direction: column;
      align-items: flex-start;
    }
  }
</style>
