<script lang="ts">
  import { supabase } from '$lib/supabase';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  
  let packages: any[] = [];
  let loading = true;
  
  onMount(async () => {
    await loadPackages();
  });
  
  async function loadPackages() {
    loading = true;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      const response = await fetch('/api/packages', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const result = await response.json();
        packages = result.data || [];
        console.log('Packages loaded:', packages.length);
      }
    } catch (err) {
      console.error('Error loading packages:', err);
    } finally {
      loading = false;
    }
  }
</script>

<div style="max-width: 1200px; margin: 0 auto; padding: 2rem;">
  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
    <h1 style="margin: 0;">?? Test Packages</h1>
    <button onclick={() => goto('/dashboard?tab=quick')} style="padding: 0.5rem 1rem; background: #667eea; color: white; border: none; border-radius: 0.375rem; cursor: pointer;">
      + Generate New
    </button>
  </div>
  
  {#if loading}
    <div style="text-align: center; padding: 3rem;">Loading packages...</div>
  {:else if packages.length === 0}
    <div style="text-align: center; padding: 3rem; background: #f9fafb; border-radius: 0.5rem;">
      <p>No test packages yet.</p>
      <button onclick={() => goto('/dashboard?tab=quick')} style="margin-top: 1rem; padding: 0.5rem 1rem; background: #667eea; color: white; border: none; border-radius: 0.375rem; cursor: pointer;">
        Create your first test package
      </button>
    </div>
  {:else}
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 1rem;">
      {#each packages as pkg}
        <button class="package-card" onclick={() => goto(`/dashboard/packages/${pkg.id}`)} style="text-align: left; background: white; border: 1px solid #e5e7eb; border-radius: 0.5rem; padding: 1rem; cursor: pointer; transition: all 0.2s; width: 100%;">
          <div style="font-weight: 600; margin-bottom: 0.25rem;">{pkg.name}</div>
          <div style="font-size: 0.75rem; color: #6b7280; margin-bottom: 0.5rem;">
            {new Date(pkg.created_at).toLocaleDateString()}
          </div>
          <div style="font-size: 0.875rem; color: #4b5563;">
            {pkg.test_cases?.testCases?.length || 0} test cases
          </div>
          <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem; flex-wrap: wrap;">
            {#if pkg.test_cases?.summary}
              <span style="font-size: 0.7rem; padding: 0.125rem 0.375rem; background: #fee2e2; color: #dc2626; border-radius: 0.25rem;">
                Critical: {pkg.test_cases.summary.critical || 0}
              </span>
              <span style="font-size: 0.7rem; padding: 0.125rem 0.375rem; background: #fed7aa; color: #f97316; border-radius: 0.25rem;">
                High: {pkg.test_cases.summary.high || 0}
              </span>
            {/if}
          </div>
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .package-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
  }
</style>
