<script lang="ts">
  import { supabase } from '$lib/supabase';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  
  let pkg: any = null;
  let loading = true;
  let error = '';
  let activeTab = 'code';
  
  $: id = $page.params.id;
  
  onMount(async () => {
    await loadPackage();
  });
  
  async function loadPackage() {
    loading = true;
    error = '';
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (!token) {
        error = 'Not authenticated';
        loading = false;
        return;
      }
      
      const response = await fetch(`/api/packages/id/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const result = await response.json();
        pkg = result.data || result;
        console.log('Package loaded:', pkg);
      } else if (response.status === 404) {
        error = 'Package not found';
      } else {
        error = 'Failed to load package';
      }
    } catch (err) {
      console.error('Error loading package:', err);
      error = err instanceof Error ? err.message : String(err);
    } finally {
      loading = false;
    }
  }
  
  async function deletePackage() {
    if (!confirm('Delete this test package?')) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      const response = await fetch(`/api/packages/id/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        goto('/dashboard/packages');
      } else {
        alert('Failed to delete');
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert('Error deleting');
    }
  }
  
  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  }
  
  function getPriorityColor(priority: string) {
    switch(priority?.toLowerCase()) {
      case 'critical': return '#dc2626';
      case 'high': return '#f97316';
      case 'medium': return '#eab308';
      default: return '#10b981';
    }
  }
</script>

<div style="max-width: 1200px; margin: 0 auto; padding: 2rem;">
  {#if loading}
    <div style="text-align: center; padding: 3rem;">Loading package...</div>
  {:else if error}
    <div style="text-align: center; padding: 3rem; color: #dc2626;">
      <p>Error: {error}</p>
      <button on:click={() => goto('/dashboard/packages')} style="margin-top: 1rem; padding: 0.5rem 1rem; background: #667eea; color: white; border: none; border-radius: 0.375rem; cursor: pointer;">
        Back to Packages
      </button>
    </div>
  {:else if pkg}
    <!-- Header -->
    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem;">
      <div>
        <button on:click={() => goto('/dashboard/packages')} style="background: none; border: none; color: #667eea; cursor: pointer; margin-bottom: 0.5rem;">
          ← Back to Packages
        </button>
        <h1 style="margin: 0; font-size: 1.5rem;">{pkg.name}</h1>
        <p style="color: #6b7280; margin-top: 0.25rem;">
          Created: {new Date(pkg.created_at).toLocaleString()}
        </p>
      </div>
      <button on:click={deletePackage} style="padding: 0.5rem 1rem; background: #ef4444; color: white; border: none; border-radius: 0.375rem; cursor: pointer;">
        Delete Package
      </button>
    </div>
    
    <!-- Tabs -->
    <div style="display: flex; gap: 0.5rem; margin-bottom: 2rem; border-bottom: 1px solid #e5e7eb;">
      <button on:click={() => activeTab = 'code'} style="padding: 0.75rem 1.5rem; border-bottom: 2px solid {activeTab === 'code' ? '#667eea' : 'transparent'}; color: {activeTab === 'code' ? '#667eea' : '#6b7280'}; background: none; border: none; cursor: pointer;">
        📝 Test Code
      </button>
      <button on:click={() => activeTab = 'cases'} style="padding: 0.75rem 1.5rem; border-bottom: 2px solid {activeTab === 'cases' ? '#667eea' : 'transparent'}; color: {activeTab === 'cases' ? '#667eea' : '#6b7280'}; background: none; border: none; cursor: pointer;">
        🧪 Test Cases
      </button>
      <button on:click={() => activeTab = 'summary'} style="padding: 0.75rem 1.5rem; border-bottom: 2px solid {activeTab === 'summary' ? '#667eea' : 'transparent'}; color: {activeTab === 'summary' ? '#667eea' : '#6b7280'}; background: none; border: none; cursor: pointer;">
        📊 Summary
      </button>
    </div>
    
    <!-- Tab Content -->
    {#if activeTab === 'code'}
      <div style="background: #1e1e1e; border-radius: 0.5rem; padding: 1rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; color: #e5e7eb;">
          <span>Executable Test Code ({pkg.test_cases?.framework || 'playwright'})</span>
          <button on:click={() => copyToClipboard(pkg.test_cases?.executableCode || pkg.test_cases?.code || '')} style="padding: 0.25rem 0.5rem; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 0.25rem; color: white; cursor: pointer;">
            📋 Copy
          </button>
        </div>
        <pre style="background: #0d1117; color: #e6edf3; padding: 1rem; border-radius: 0.375rem; overflow-x: auto; font-size: 0.75rem; font-family: 'Monaco', monospace; margin: 0; white-space: pre-wrap;">
          <code>{(pkg.test_cases?.executableCode || pkg.test_cases?.code || '// No executable code found')}</code>
        </pre>
      </div>
    {/if}
    
    {#if activeTab === 'cases'}
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        {#if pkg.test_cases?.testCases?.length > 0}
          {#each pkg.test_cases.testCases as test, index}
            <div style="background: white; border: 1px solid #e5e7eb; border-radius: 0.5rem; padding: 1rem;">
              <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem; flex-wrap: wrap; gap: 0.5rem;">
                <div>
                  <span style="font-weight: 600; font-size: 1rem;">{index + 1}. {test.name || 'Test Case'}</span>
                  <span style="margin-left: 0.5rem; padding: 0.25rem 0.5rem; background: {getPriorityColor(test.priority)}; color: white; border-radius: 0.25rem; font-size: 0.7rem; font-weight: 500;">
                    {test.priority || 'Medium'}
                  </span>
                </div>
              </div>
              
              <p style="color: #4b5563; margin-bottom: 1rem; font-size: 0.875rem;">{test.description || 'No description'}</p>
              
              {#if test.steps?.length > 0}
                <div style="margin-bottom: 0.75rem;">
                  <div style="font-weight: 500; font-size: 0.75rem; color: #374151; margin-bottom: 0.25rem;">Steps:</div>
                  <ol style="margin: 0; padding-left: 1.25rem;">
                    {#each test.steps as step}
                      <li style="font-size: 0.875rem; color: #4b5563; margin-bottom: 0.25rem;">{step}</li>
                    {/each}
                  </ol>
                </div>
              {/if}
              
              {#if test.expectedResult}
                <div>
                  <div style="font-weight: 500; font-size: 0.75rem; color: #374151; margin-bottom: 0.25rem;">Expected Result:</div>
                  <p style="margin: 0; font-size: 0.875rem; color: #10b981;">✓ {test.expectedResult}</p>
                </div>
              {/if}
            </div>
          {/each}
        {:else}
          <div style="text-align: center; padding: 3rem; background: #f9fafb; border-radius: 0.5rem; color: #6b7280;">
            No test cases found in this package.
          </div>
        {/if}
      </div>
    {/if}
    
    {#if activeTab === 'summary'}
      <div style="background: #f9fafb; border-radius: 0.5rem; padding: 1.5rem;">
        <h3 style="margin: 0 0 1rem 0;">Package Summary</h3>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
          <div style="background: white; padding: 1rem; border-radius: 0.5rem; text-align: center;">
            <div style="font-size: 2rem; font-weight: 700;">{pkg.test_cases?.testCases?.length || 0}</div>
            <div style="color: #6b7280;">Total Test Cases</div>
          </div>
          <div style="background: white; padding: 1rem; border-radius: 0.5rem; text-align: center;">
            <div style="font-size: 2rem; font-weight: 700; color: #dc2626;">{pkg.test_cases?.summary?.critical || 0}</div>
            <div style="color: #6b7280;">Critical Priority</div>
          </div>
          <div style="background: white; padding: 1rem; border-radius: 0.5rem; text-align: center;">
            <div style="font-size: 2rem; font-weight: 700; color: #f97316;">{pkg.test_cases?.summary?.high || 0}</div>
            <div style="color: #6b7280;">High Priority</div>
          </div>
          <div style="background: white; padding: 1rem; border-radius: 0.5rem; text-align: center;">
            <div style="font-size: 2rem; font-weight: 700;">{pkg.test_cases?.summary?.totalTests || 0}</div>
            <div style="color: #6b7280;">Framework: {pkg.test_cases?.framework || 'N/A'}</div>
          </div>
        </div>
        
        <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #e5e7eb;">
          <p><strong>Package ID:</strong> {pkg.id}</p>
          <p><strong>Created:</strong> {new Date(pkg.created_at).toLocaleString()}</p>
          <p><strong>Last Updated:</strong> {new Date(pkg.updated_at).toLocaleString()}</p>
          <p><strong>Status:</strong> {pkg.status || 'draft'}</p>
        </div>
      </div>
    {/if}
  {/if}
</div>
