<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase';

  export let onRequirementParsed: (data: any) => void;

  // State
  let inputMethod: 'paste' | 'upload' | 'form' = 'paste';
  let rawText = '';
  let parsedRequirements: any = null;
  let isParsing = false;
  let error = '';
  let detectedDomain = '';
  let detectionConfidence = 0;
  let extractedUrls: string[] = [];

  // Form input state
  let formData = {
    projectName: '',
    industry: '',
    functionalAreas: '',
    criticalRequirements: '',
    systemUrls: {
      baseUrl: '',
      apiBaseUrl: '',
      adminUrl: '',
      mobileAppPackage: '',
      healthCheckEndpoint: '/health',
      authEndpoint: '/auth/login'
    },
    environments: [
      { name: 'Development', url: '', apiUrl: '', automation: 'on-demand' },
      { name: 'QA', url: '', apiUrl: '', automation: 'nightly' },
      { name: 'Staging', url: '', apiUrl: '', automation: 'post-deployment' },
      { name: 'Production', url: '', apiUrl: '', automation: 'read-only' }
    ]
  };

  // Domain detection patterns
  const domainPatterns = {
    fintech: { keywords: ['payment', 'transaction', 'wallet', 'banking', 'card', 'PCI', 'PSD2', 'KYC', 'AML'], icon: '💰', color: '#10b981' },
    healthcare: { keywords: ['patient', 'clinical', 'EHR', 'EMR', 'PHI', 'HIPAA', 'prescription', 'medication', 'FHIR', 'HL7'], icon: '🏥', color: '#3b82f6' },
    ecommerce: { keywords: ['product', 'cart', 'checkout', 'inventory', 'order', 'shipping', 'payment'], icon: '🛒', color: '#f59e0b' },
    saas: { keywords: ['tenant', 'subscription', 'billing', 'user management', 'workspace', 'SaaS'], icon: '☁️', color: '#8b5cf6' },
    general: { keywords: [], icon: '📋', color: '#9ca3af' }
  };

  function detectDomain(text: string): { domain: string; confidence: number; icon: string; color: string } {
    const scores: Record<string, number> = {};
    for (const [domain, config] of Object.entries(domainPatterns)) {
      let score = 0;
      const lowerText = text.toLowerCase();
      for (const keyword of config.keywords) {
        score += (lowerText.match(new RegExp(keyword, 'g')) || []).length * 2;
      }
      scores[domain] = score;
    }
    const bestDomain = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
    const maxScore = bestDomain?.[1] || 0;
    const confidence = maxScore > 0 ? Math.min(100, Math.round((maxScore / 20) * 100)) : 0;
    const domainConfig = domainPatterns[bestDomain?.[0] as keyof typeof domainPatterns] || domainPatterns.general;
    return { domain: maxScore > 0 ? bestDomain[0] : 'general', confidence, icon: domainConfig.icon, color: domainConfig.color };
  }

  function extractUrls(text: string): string[] {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return [...new Set(text.match(urlRegex) || [])];
  }

  async function parseATRD() {
    if (!rawText.trim() && inputMethod !== 'form') {
      error = 'Please enter or upload an Automation Test Requirement Document';
      return;
    }
    isParsing = true;
    error = '';

    try {
      const textToAnalyze = inputMethod === 'form' ? 
        `${formData.projectName} ${formData.industry} ${formData.functionalAreas}` : rawText;
      const detection = detectDomain(textToAnalyze);
      detectedDomain = detection.domain;
      detectionConfidence = detection.confidence;
      
      if (inputMethod === 'paste' || inputMethod === 'upload') {
        extractedUrls = extractUrls(rawText);
      }

      const payload = inputMethod === 'form' ? {
        document: `Project: ${formData.projectName}\nIndustry: ${formData.industry}\nFunctional Areas: ${formData.functionalAreas}\nCritical Requirements: ${formData.criticalRequirements}\nSystem URLs: ${JSON.stringify(formData.systemUrls)}\nEnvironments: ${JSON.stringify(formData.environments)}`,
        detectedDomain: detection.domain,
        systemUrls: formData.systemUrls,
        environments: formData.environments
      } : { document: rawText, detectedDomain: detection.domain, extractedUrls };

      const response = await fetch('/api/ai/parse-atrd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) throw new Error('Failed to parse document');
      
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
      
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedRequirements = JSON.parse(jsonMatch[0]);
        if (inputMethod === 'form') {
          parsedRequirements.systemUnderTest = { ...parsedRequirements.systemUnderTest, ...formData.systemUrls };
          parsedRequirements.environments = formData.environments;
        }
        onRequirementParsed(parsedRequirements);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err: any) {
      error = err.message || 'Failed to parse ATRD';
    } finally {
      isParsing = false;
    }
  }

  function handleFileUpload(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => rawText = e.target?.result as string;
      reader.readAsText(file);
    }
  }

  function clearForm() {
    rawText = '';
    parsedRequirements = null;
    error = '';
    detectedDomain = '';
    detectionConfidence = 0;
    extractedUrls = [];
    formData = {
      projectName: '', industry: '', functionalAreas: '', criticalRequirements: '',
      systemUrls: { baseUrl: '', apiBaseUrl: '', adminUrl: '', mobileAppPackage: '', healthCheckEndpoint: '/health', authEndpoint: '/auth/login' },
      environments: [
        { name: 'Development', url: '', apiUrl: '', automation: 'on-demand' },
        { name: 'QA', url: '', apiUrl: '', automation: 'nightly' },
        { name: 'Staging', url: '', apiUrl: '', automation: 'post-deployment' },
        { name: 'Production', url: '', apiUrl: '', automation: 'read-only' }
      ]
    };
  }
</script>

<div class="atrd-parser">
  <div class="header">
    <h2>📄 Automation Test Requirement Parser</h2>
    <p>Upload or paste any ATRD - We will structure it for any industry</p>
  </div>

  <div class="method-selector">
    <button class="method-btn" class:active={inputMethod === 'paste'} on:click={() => inputMethod = 'paste'}>📋 Paste Document</button>
    <button class="method-btn" class:active={inputMethod === 'upload'} on:click={() => inputMethod = 'upload'}>📁 Upload File</button>
    <button class="method-btn" class:active={inputMethod === 'form'} on:click={() => inputMethod = 'form'}>✍️ Guided Form</button>
  </div>

  <div class="input-area">
    {#if inputMethod === 'paste'}
      <textarea bind:value={rawText} placeholder="Paste your ATRD here..." rows="12" disabled={isParsing}></textarea>
      <div class="hint"><small>✨ AI will auto-detect industry and requirements</small></div>
    {:else if inputMethod === 'upload'}
      <div class="upload-area">
        <input type="file" accept=".txt,.md,.docx,.pdf" on:change={handleFileUpload} disabled={isParsing} />
        <small>Supported: .txt, .md, .docx, .pdf</small>
      </div>
      {#if rawText}<div class="preview"><strong>Preview:</strong><p>{rawText.substring(0, 300)}...</p></div>{/if}
    {:else}
      <div class="form-input">
        <div class="form-row">
          <div class="form-group"><label for="projectName">📋 Project Name *</label><input id="projectName" type="text" bind:value={formData.projectName} placeholder="e.g., MedEHR" /></div>
          <div class="form-group"><label for="industry">🏭 Industry</label><select id="industry" bind:value={formData.industry}><option value="">Auto-detect</option><option value="fintech">FinTech</option><option value="healthcare">Healthcare</option><option value="ecommerce">E-commerce</option><option value="saas">SaaS</option></select></div>
        </div>
        <div class="form-group"><label for="functionalAreas">🔄 Key Functional Areas</label><textarea id="functionalAreas" bind:value={formData.functionalAreas} rows="2" placeholder="e.g., Patient Management, Clinical Workflows"></textarea></div>
        <div class="form-group"><label for="criticalRequirements">⚠️ Critical Requirements</label><textarea id="criticalRequirements" bind:value={formData.criticalRequirements} rows="2" placeholder="e.g., HIPAA compliance, PCI-DSS"></textarea></div>
        <div class="urls-section"><h4>🔗 System Under Test URLs</h4>
          <div class="form-row"><div class="form-group"><label for="baseUrl">Web App URL</label><input id="baseUrl" type="url" bind:value={formData.systemUrls.baseUrl} placeholder="https://app.company.com" /></div>
          <div class="form-group"><label for="apiBaseUrl">API Base URL</label><input id="apiBaseUrl" type="url" bind:value={formData.systemUrls.apiBaseUrl} placeholder="https://api.company.com/v1" /></div></div>
        </div>
        <div class="environments-section"><h4>🌍 Environment URLs</h4>
          {#each formData.environments as env, idx}<div class="env-row"><div class="env-name">{env.name}</div><div class="env-urls"><input type="url" bind:value={env.url} placeholder="URL" /><input type="url" bind:value={env.apiUrl} placeholder="API URL" /></div></div>{/each}
        </div>
      </div>
    {/if}
  </div>

  {#if (rawText && inputMethod !== 'form') || (inputMethod === 'form' && formData.projectName)}
    <div class="domain-detection" style="border-left-color: {domainPatterns[detectedDomain as keyof typeof domainPatterns]?.color || '#667eea'}">
      <div class="detection-header"><span class="detection-icon">{domainPatterns[detectedDomain as keyof typeof domainPatterns]?.icon || '🔍'}</span><span class="detection-domain">{detectedDomain.toUpperCase()}</span><span class="detection-confidence">{detectionConfidence}% confidence</span></div>
      {#if detectionConfidence < 50}<p class="warning">⚠️ Low confidence - please review domain</p>{/if}
    </div>
  {/if}

  {#if extractedUrls.length > 0 && inputMethod !== 'form'}
    <div class="extracted-urls"><h4>🔗 Detected URLs</h4><div class="url-list">{#each extractedUrls as url}<div class="url-item"><span>🌐</span><code>{url}</code></div>{/each}</div></div>
  {/if}

  {#if error}<div class="error">{error}</div>{/if}

  <div class="actions">
    <button class="clear-btn" on:click={clearForm} disabled={isParsing}>Clear All</button>
    <button class="parse-btn" on:click={parseATRD} disabled={isParsing || (inputMethod !== 'form' && !rawText) || (inputMethod === 'form' && !formData.projectName)}>
      {#if isParsing}<span class="spinner"></span>Analyzing...{:else}🚀 Generate Test Package{/if}
    </button>
  </div>

  {#if parsedRequirements}
    <div class="parsed-result"><div class="result-header"><h3>✅ Parsed Requirements</h3><span class="result-badge">Ready</span></div>
      <div class="result-summary"><div class="summary-item"><strong>Project:</strong> {parsedRequirements.metadata?.projectName || 'Detected'}</div><div class="summary-item"><strong>Domain:</strong> {parsedRequirements.metadata?.domain || detectedDomain}</div><div class="summary-item"><strong>Workflows:</strong> {parsedRequirements.criticalWorkflows?.length || 0}</div><div class="summary-item"><strong>Areas:</strong> {parsedRequirements.functionalAreas?.length || 0}</div></div>
      <details class="result-details"><summary>View Full Structure</summary><pre>{JSON.stringify(parsedRequirements, null, 2)}</pre></details>
    </div>
  {/if}
</div>

<style>
  .atrd-parser {
    background: white;
    border-radius: 1rem;
    padding: 2rem;
    box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
  }

  .header {
    text-align: center;
    margin-bottom: 2rem;
  }

  .header h2 {
    font-size: 1.5rem;
    font-weight: 600;
    color: #1f2937;
    margin: 0 0 0.5rem 0;
  }

  .header p {
    color: #6b7280;
    font-size: 0.875rem;
    line-height: 1.5;
  }

  .method-selector {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
    border-bottom: 1px solid #e5e7eb;
    padding-bottom: 1rem;
  }

  .method-btn {
    padding: 0.5rem 1rem;
    background: none;
    border: none;
    border-radius: 0.5rem;
    cursor: pointer;
    color: #6b7280;
    font-size: 0.875rem;
    font-weight: 500;
    transition: all 0.2s;
  }

  .method-btn.active {
    background: #667eea;
    color: white;
  }

  .input-area textarea {
    width: 100%;
    padding: 1rem;
    border: 1px solid #d1d5db;
    border-radius: 0.5rem;
    font-family: 'Monaco', 'Menlo', monospace;
    font-size: 0.875rem;
  }

  .upload-area {
    padding: 2rem;
    border: 2px dashed #d1d5db;
    border-radius: 0.5rem;
    text-align: center;
    background: #f9fafb;
  }

  .preview {
    margin-top: 1rem;
    padding: 1rem;
    background: #f9fafb;
    border-radius: 0.5rem;
    font-size: 0.875rem;
  }

  .domain-detection {
    margin-top: 1rem;
    padding: 1rem;
    background: #f9fafb;
    border-radius: 0.5rem;
    border-left: 4px solid;
  }

  .detection-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .detection-icon {
    font-size: 1.25rem;
  }

  .detection-domain {
    font-weight: 600;
    color: #1f2937;
    font-size: 0.875rem;
  }

  .detection-confidence {
    font-size: 0.75rem;
    color: #6b7280;
  }

  .warning {
    margin-top: 0.5rem;
    color: #f59e0b;
    font-size: 0.875rem;
  }

  .extracted-urls {
    margin-top: 1rem;
    padding: 1rem;
    background: #f0fdf4;
    border-radius: 0.5rem;
  }

  .extracted-urls h4 {
    font-size: 0.875rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
    color: #1f2937;
  }

  .url-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .url-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: white;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
  }

  .url-item code {
    color: #059669;
    font-family: monospace;
  }

  .error {
    margin-top: 1rem;
    padding: 0.75rem;
    background: #fee2e2;
    color: #991b1b;
    border-radius: 0.5rem;
    font-size: 0.875rem;
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    margin-top: 1.5rem;
  }

  .parse-btn,
  .clear-btn {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 0.5rem;
    cursor: pointer;
    font-weight: 600;
    font-size: 0.875rem;
    transition: all 0.2s;
  }

  .parse-btn {
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: white;
  }

  .parse-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 6px rgba(102,126,234,0.3);
  }

  .parse-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .clear-btn {
    background: #f3f4f6;
    color: #374151;
  }

  .clear-btn:hover {
    background: #e5e7eb;
  }

  .parsed-result {
    margin-top: 2rem;
    padding: 1rem;
    background: #f9fafb;
    border-radius: 0.5rem;
    border: 1px solid #e5e7eb;
  }

  .result-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .result-header h3 {
    font-size: 1rem;
    font-weight: 600;
    color: #1f2937;
    margin: 0;
  }

  .result-badge {
    padding: 0.25rem 0.5rem;
    background: #d1fae5;
    color: #065f46;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .result-summary {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;
    margin-bottom: 1rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #e5e7eb;
  }

  .summary-item {
    font-size: 0.875rem;
    color: #4b5563;
  }

  .summary-item strong {
    color: #1f2937;
  }

  .result-details summary {
    cursor: pointer;
    color: #667eea;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .result-details pre {
    margin-top: 0.5rem;
    padding: 0.5rem;
    background: #1f2937;
    color: #e5e7eb;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    overflow-x: auto;
    font-family: monospace;
  }

  .spinner {
    display: inline-block;
    width: 1rem;
    height: 1rem;
    border: 2px solid white;
    border-top-color: transparent;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin-right: 0.5rem;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .form-input {
    max-height: 500px;
    overflow-y: auto;
    padding-right: 0.5rem;
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .form-group {
    margin-bottom: 1rem;
  }

  .form-group label {
    display: block;
    font-weight: 500;
    font-size: 0.875rem;
    margin-bottom: 0.25rem;
    color: #374151;
  }

  .form-group input,
  .form-group textarea,
  .form-group select {
    width: 100%;
    padding: 0.5rem 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-family: inherit;
  }

  .form-group input:focus,
  .form-group textarea:focus,
  .form-group select:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102,126,234,0.1);
  }

  .urls-section,
  .environments-section {
    margin-top: 1.5rem;
    padding-top: 1rem;
    border-top: 1px solid #e5e7eb;
  }

  .urls-section h4,
  .environments-section h4 {
    font-size: 1rem;
    font-weight: 600;
    color: #1f2937;
    margin-bottom: 1rem;
  }

  .env-row {
    display: flex;
    gap: 1rem;
    margin-bottom: 0.75rem;
    align-items: center;
  }

  .env-name {
    width: 100px;
    font-weight: 500;
    font-size: 0.875rem;
    color: #374151;
  }

  .env-urls {
    flex: 1;
    display: flex;
    gap: 0.5rem;
  }

  .env-urls input {
    flex: 1;
    padding: 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.75rem;
  }

  @media (max-width: 768px) {
    .form-row {
      grid-template-columns: 1fr;
    }

    .env-row {
      flex-direction: column;
      align-items: flex-start;
    }

    .env-name {
      width: auto;
    }

    .env-urls {
      width: 100%;
      flex-direction: column;
    }

    .result-summary {
      grid-template-columns: 1fr 1fr;
    }
  }
</style>
