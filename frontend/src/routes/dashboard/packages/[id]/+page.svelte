<script lang="ts">
  import { supabase } from '$lib/supabase';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';

  let pkg: any = null;
  let loading = true;
  let error = '';
  let activeTab = 'automated';

  const packageId = $page.params.id;

  onMount(async () => {
    await fetchPackage();
  });

  async function fetchPackage() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        goto('/');
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('test_packages')
        .select('*')
        .eq('id', packageId)
        .eq('user_id', user.id)
        .single();

      if (fetchError) throw fetchError;
      
      pkg = data;
    } catch (err: any) {
      error = err.message;
    } finally {
      loading = false;
    }
  }

  async function deletePackage() {
    if (confirm('Are you sure you want to delete this package?')) {
      try {
        const { error: deleteError } = await supabase
          .from('test_packages')
          .delete()
          .eq('id', packageId);

        if (deleteError) throw deleteError;
        
        goto('/dashboard/packages');
      } catch (err: any) {
        error = err.message;
      }
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    // Could add toast notification here
  }
</script>

<svelte:head>
  <title>{pkg?.name || 'Package'} - Aether Automate</title>
</svelte:head>

<div class="container">
  <button class="back-btn" on:click={() => goto('/dashboard/packages')}>
    ← Back to Packages
  </button>

  {#if loading}
    <div class="loading">Loading package...</div>
  {:else if error}
    <div class="error">Error: {error}</div>
  {:else if pkg}
    <div class="package-header">
      <div>
        <h1>{pkg.name}</h1>
        <p class="package-meta">
          Created {new Date(pkg.created_at).toLocaleString()} • 
          Version {pkg.version || 1} • 
          {pkg.automated_test_count || 0} automated tests • 
          {pkg.manual_test_count || 0} manual tests
        </p>
      </div>
      <button class="delete-btn" on:click={deletePackage}>Delete Package</button>
    </div>

    <div class="tabs">
      <button 
        class="tab-btn" 
        class:active={activeTab === 'automated'}
        on:click={() => activeTab = 'automated'}
      >
        🤖 Automated Tests
      </button>
      <button 
        class="tab-btn" 
        class:active={activeTab === 'manual'}
        on:click={() => activeTab = 'manual'}
      >
        📝 Manual Tests
      </button>
      <button 
        class="tab-btn" 
        class:active={activeTab === 'business'}
        on:click={() => activeTab = 'business'}
      >
        📊 Business Report
      </button>
      <button 
        class="tab-btn" 
        class:active={activeTab === 'data'}
        on:click={() => activeTab = 'data'}
      >
        📁 Test Data
      </button>
    </div>

    <div class="tab-content">
      {#if activeTab === 'automated'}
        <div class="automated-section">
          <div class="code-header">
            <h3>Test Code ({pkg.package_data?.automated?.framework})</h3>
            <button class="copy-btn" on:click={() => copyToClipboard(pkg.package_data?.automated?.code)}>
              Copy Code
            </button>
          </div>
          <pre class="code-block"><code>{pkg.package_data?.automated?.code || '// No code available'}</code></pre>
          
          {#if pkg.package_data?.automated?.dependencies?.length > 0}
            <h4>Dependencies</h4>
            <pre class="dependencies">{pkg.package_data.automated.dependencies.join('\n')}</pre>
          {/if}
        </div>
      {/if}

      {#if activeTab === 'manual'}
        <div class="manual-section">
          {#if pkg.package_data?.manual?.testCases?.length > 0}
            {#each pkg.package_data.manual.testCases as testCase}
              <div class="test-case">
                <h4>{testCase.id}: {testCase.title}</h4>
                <p class="priority-{testCase.priority?.toLowerCase()}">Priority: {testCase.priority}</p>
                <p>{testCase.description}</p>
                
                {#if testCase.preconditions?.length > 0}
                  <h5>Preconditions:</h5>
                  <ul>
                    {#each testCase.preconditions as pre}
                      <li>{pre}</li>
                    {/each}
                  </ul>
                {/if}

                <h5>Test Steps:</h5>
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
            <p>No manual test cases in this package</p>
          {/if}
        </div>
      {/if}

      {#if activeTab === 'business'}
        <div class="business-section">
          <h3>Executive Summary</h3>
          <p>{pkg.package_data?.business?.executiveSummary}</p>
          
          <h4>Key Metrics</h4>
          <div class="metrics-grid">
            {#each Object.entries(pkg.package_data?.business?.keyMetrics || {}) as [key, value]}
              <div class="metric">
                <span class="metric-label">{key}</span>
                <span class="metric-value">{value}</span>
              </div>
            {/each}
          </div>

          <h4>Business Value</h4>
          <ul>
            {#each pkg.package_data?.business?.businessValue || [] as value}
              <li>{value}</li>
            {/each}
          </ul>

          <h4>Risks</h4>
          {#each pkg.package_data?.business?.risks || [] as risk}
            <div class="risk-item">
              <strong>{risk.risk}</strong>
              <span class="risk-impact {risk.impact?.toLowerCase()}">{risk.impact}</span>
              <p>{risk.mitigation}</p>
            </div>
          {/each}
        </div>
      {/if}

      {#if activeTab === 'data'}
        <div class="data-section">
          <h3>Test Data</h3>
          <pre class="data-block">{JSON.stringify(pkg.package_data?.testData || {}, null, 2)}</pre>
          
          <h4>Documentation</h4>
          <div class="docs">
            <h5>Quick Start</h5>
            <p>{pkg.package_data?.documentation?.quickStart}</p>
            
            <h5>Prerequisites</h5>
            <ul>
              {#each pkg.package_data?.documentation?.prerequisites || [] as prereq}
                <li>{prereq}</li>
              {/each}
            </ul>
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .container {
    max-width: 1000px;
    margin: 0 auto;
    padding: 2rem;
  }

  .back-btn {
    background: none;
    border: none;
    color: #667eea;
    cursor: pointer;
    margin-bottom: 1rem;
    font-size: 0.875rem;
  }

  .back-btn:hover {
    text-decoration: underline;
  }

  .package-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 2rem;
    flex-wrap: wrap;
    gap: 1rem;
  }

  h1 {
    font-size: 2rem;
    color: #1f2937;
    margin: 0 0 0.5rem 0;
  }

  .package-meta {
    color: #6b7280;
    margin: 0;
  }

  .delete-btn {
    padding: 0.5rem 1rem;
    background: #ef4444;
    color: white;
    border: none;
    border-radius: 0.375rem;
    cursor: pointer;
  }

  .delete-btn:hover {
    background: #dc2626;
  }

  .tabs {
    display: flex;
    gap: 0.5rem;
    border-bottom: 1px solid #e5e7eb;
    margin-bottom: 2rem;
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
  }

  .tab-btn.active {
    border-bottom-color: #667eea;
    color: #667eea;
    font-weight: 500;
  }

  .code-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .copy-btn {
    padding: 0.5rem 1rem;
    background: #f3f4f6;
    border: 1px solid #e5e7eb;
    border-radius: 0.375rem;
    cursor: pointer;
  }

  .copy-btn:hover {
    background: #e5e7eb;
  }

  .code-block {
    background: #1f2937;
    color: #e5e7eb;
    padding: 1rem;
    border-radius: 0.5rem;
    overflow-x: auto;
    font-size: 0.875rem;
    white-space: pre-wrap;
    margin-bottom: 2rem;
  }

  .dependencies {
    background: #f3f4f6;
    padding: 1rem;
    border-radius: 0.375rem;
    font-size: 0.875rem;
  }

  .test-case {
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .test-case h4 {
    margin: 0 0 0.5rem 0;
    color: #1f2937;
  }

  .priority-high { color: #dc2626; }
  .priority-medium { color: #f59e0b; }
  .priority-low { color: #10b981; }

  .steps-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 1rem;
  }

  .steps-table th,
  .steps-table td {
    padding: 0.75rem;
    text-align: left;
    border: 1px solid #e5e7eb;
  }

  .steps-table th {
    background: #f3f4f6;
  }

  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 1rem;
    margin: 1rem 0;
  }

  .metric {
    background: #f3f4f6;
    padding: 1rem;
    border-radius: 0.375rem;
    text-align: center;
  }

  .metric-label {
    display: block;
    font-size: 0.75rem;
    color: #6b7280;
  }

  .metric-value {
    display: block;
    font-size: 1.25rem;
    font-weight: 600;
    color: #1f2937;
  }

  .risk-item {
    padding: 1rem;
    border: 1px solid #e5e7eb;
    border-radius: 0.375rem;
    margin-bottom: 1rem;
  }

  .risk-impact {
    display: inline-block;
    padding: 0.25rem 0.5rem;
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

  .data-block {
    background: #1f2937;
    color: #e5e7eb;
    padding: 1rem;
    border-radius: 0.5rem;
    overflow-x: auto;
    font-size: 0.875rem;
    margin-bottom: 2rem;
  }

  .loading, .error {
    text-align: center;
    padding: 3rem;
  }
</style>
