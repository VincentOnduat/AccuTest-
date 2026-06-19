<script lang="ts">
  import { supabase } from '$lib/supabase';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  
  let pkg: any = null;
  let loading = true;
  let error = '';
  
  $: id = $page.params.id;
  
  onMount(async () => {
    await loadPackage();
  });
  
  async function loadPackage() {
    loading = true;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      const response = await fetch(`/api/packages/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const result = await response.json();
        pkg = result.data || result;
        console.log('Package loaded:', pkg);
      } else {
        error = 'Package not found';
      }
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  }
  
  async function deletePackage() {
    if (!confirm('Delete this test package?')) return;
    
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    
    const response = await fetch(`/api/packages/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      goto('/dashboard/packages');
    } else {
      alert('Failed to delete');
    }
  }
</script>

<div style="max-width: 1000px; margin: 0 auto; padding: 2rem;">
  <button onclick={() => goto('/dashboard/packages')} style="margin-bottom: 1rem; background: none; border: none; color: #667eea; cursor: pointer;">
    ? Back to Packages
  </button>
  
  {#if loading}
    <div style="text-align: center; padding: 3rem;">Loading package...</div>
  {:else if error}
    <div style="text-align: center; padding: 3rem; color: #dc2626;">Error: {error}</div>
  {:else if pkg}
    <div style="display: flex; justify-content: space-between; align-items: start;">
      <div>
        <h1 style="margin: 0;">{pkg.name}</h1>
        <p style="color: #6b7280;">Created: {new Date(pkg.created_at).toLocaleString()}</p>
        <p><strong>Total Test Cases:</strong> {pkg.test_cases?.testCases?.length || 0}</p>
      </div>
      <button onclick={deletePackage} style="padding: 0.5rem 1rem; background: #ef4444; color: white; border: none; border-radius: 0.375rem; cursor: pointer;">
        Delete Package
      </button>
    </div>
    
    <h2 style="margin-top: 2rem;">Test Cases</h2>
    <div style="display: flex; flex-direction: column; gap: 1rem;">
      {#each pkg.test_cases?.testCases || [] as test, i}
        <div style="border: 1px solid #e5e7eb; border-radius: 0.5rem; padding: 1rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
            <h3 style="margin: 0;">{i+1}. {test.name}</h3>
            <span style="padding: 0.25rem 0.5rem; background: {test.priority === 'Critical' ? '#dc2626' : test.priority === 'High' ? '#f97316' : '#eab308'}; color: white; border-radius: 0.25rem; font-size: 0.7rem;">
              {test.priority || 'Medium'}
            </span>
          </div>
          <p style="color: #4b5563;">{test.description}</p>
          <div style="margin-top: 0.5rem;">
            <strong>Steps:</strong>
            <ol style="margin: 0.25rem 0 0 1rem;">
              {#each test.steps || [] as step}
                <li>{step}</li>
              {/each}
            </ol>
          </div>
          <div style="margin-top: 0.5rem;">
            <strong>Expected Result:</strong>
            <p style="margin: 0.25rem 0 0 0; color: #10b981;">? {test.expectedResult}</p>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
