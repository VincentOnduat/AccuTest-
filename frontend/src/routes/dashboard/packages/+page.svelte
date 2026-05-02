<script lang="ts">
  import { supabase } from '$lib/supabase';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  let user: any = null;
  let packages: any[] = [];
  let loading = true;
  let error = '';

  onMount(async () => {
    try {
      const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !currentUser) {
        goto('/');
        return;
      }
      
      user = currentUser;
      await fetchPackages();
      
    } catch (err: any) {
      error = err.message;
    } finally {
      loading = false;
    }
  });

  async function fetchPackages() {
    try {
      const { data, error: fetchError } = await supabase
        .from('test_packages')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      
      packages = data || [];
    } catch (err: any) {
      error = err.message;
    }
  }

  async function deletePackage(id: string, event: Event) {
    event.stopPropagation();
    
    if (confirm('Are you sure you want to delete this package?')) {
      try {
        const { error: deleteError } = await supabase
          .from('test_packages')
          .delete()
          .eq('id', id);

        if (deleteError) throw deleteError;
        
        await fetchPackages();
      } catch (err: any) {
        error = err.message;
      }
    }
  }

  function viewPackage(id: string) {
    goto(`/dashboard/packages/${id}`);
  }

  function handleKeyDown(e: KeyboardEvent, id: string) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      viewPackage(id);
    }
  }

  function createNewPackage() {
    goto('/dashboard');
    // Scroll to the AI generator section
    setTimeout(() => {
      document.querySelector('.ai-generator-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }
</script>

<svelte:head>
  <title>Test Packages - Aether Automate</title>
</svelte:head>

<div class="container">
  <div class="header">
    <div>
      <h1>Test Packages</h1>
      <p class="subtitle">AI-generated test packages with automated scripts, manual test cases, and business reports</p>
    </div>
    <button class="primary-btn" on:click={createNewPackage}>
      ✨ Create New Package
    </button>
  </div>

  {#if loading}
    <div class="loading">Loading packages...</div>
  {:else if error}
    <div class="error">Error: {error}</div>
  {:else if packages.length === 0}
    <div class="empty-state">
      <div class="empty-icon">📦</div>
      <h3>No packages yet</h3>
      <p>Create your first AI-generated test package from the dashboard</p>
      <button class="primary-btn" on:click={createNewPackage}>
        Go to AI Generator
      </button>
    </div>
  {:else}
    <div class="packages-grid">
      {#each packages as pkg}
        <!-- Use a div for the card container -->
        <div class="package-card-wrapper">
          <!-- Make the entire card clickable with a button overlay technique -->
          <button 
            class="package-card-button" 
            on:click={() => viewPackage(pkg.id)}
            on:keydown={(e) => handleKeyDown(e, pkg.id)}
            aria-label={`View package ${pkg.name || 'Untitled'}`}
          >
            <span class="package-icon" aria-hidden="true">📦</span>
            <span class="package-version">v{pkg.version || 1}</span>
            <h3>{pkg.name || 'Untitled Package'}</h3>
            <p class="package-description">{pkg.description || 'No description'}</p>
            
            <div class="package-stats">
              <div class="stat">
                <span class="stat-value">{pkg.automated_test_count || 0}</span>
                <span class="stat-label">Automated</span>
              </div>
              <div class="stat">
                <span class="stat-value">{pkg.manual_test_count || 0}</span>
                <span class="stat-label">Manual</span>
              </div>
              <div class="stat">
                <span class="stat-value">{new Date(pkg.created_at).toLocaleDateString()}</span>
                <span class="stat-label">Created</span>
              </div>
            </div>

            <div class="package-footer">
              <span class="package-type">{pkg.package_data?.metadata?.testType || 'test'}</span>
            </div>
          </button>
          
          <!-- Delete button is separate, outside the main button -->
          <button 
            class="delete-btn" 
            on:click={(e) => deletePackage(pkg.id, e)}
            aria-label={`Delete package ${pkg.name || 'Untitled'}`}
          >
            Delete
          </button>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
    flex-wrap: wrap;
    gap: 1rem;
  }

  h1 {
    font-size: 2rem;
    color: #1f2937;
    margin: 0 0 0.25rem 0;
  }

  .subtitle {
    color: #6b7280;
    margin: 0;
  }

  .primary-btn {
    padding: 0.75rem 1.5rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 0.375rem;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
  }

  .primary-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 6px rgba(102,126,234,0.3);
  }

  .loading, .error, .empty-state {
    text-align: center;
    padding: 3rem;
    background: white;
    border-radius: 0.5rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }

  .empty-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
  }

  .empty-state h3 {
    font-size: 1.5rem;
    color: #1f2937;
    margin-bottom: 0.5rem;
  }

  .empty-state p {
    color: #6b7280;
    margin-bottom: 1.5rem;
  }

  .packages-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
    gap: 1.5rem;
  }

  /* Wrapper for each package card to handle absolute positioning of delete button */
  .package-card-wrapper {
    position: relative;
    background: white;
    border-radius: 0.5rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    transition: all 0.2s;
  }

  .package-card-wrapper:hover {
    transform: translateY(-4px);
    box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
  }

  /* The main clickable button that covers the entire card */
  .package-card-button {
    width: 100%;
    padding: 1.5rem;
    border: none;
    background: none;
    border-radius: 0.5rem;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    text-align: left;
    font-family: inherit;
    font-size: inherit;
    color: inherit;
  }

  .package-card-button:focus-visible {
    outline: 2px solid #667eea;
    outline-offset: 2px;
    border-radius: 0.5rem;
  }

  .package-icon {
    font-size: 2rem;
    margin-bottom: 0.5rem;
  }

  .package-version {
    position: absolute;
    top: 1rem;
    right: 3.5rem; /* Leave space for delete button */
    padding: 0.25rem 0.5rem;
    background: #f3f4f6;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    color: #6b7280;
  }

  .package-card-button h3 {
    font-size: 1.125rem;
    font-weight: 600;
    color: #1f2937;
    margin: 0 0 0.5rem 0;
  }

  .package-description {
    color: #6b7280;
    font-size: 0.875rem;
    margin-bottom: 1rem;
    line-height: 1.5;
  }

  .package-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
    margin-bottom: 1rem;
    padding: 0.75rem;
    background: #f9fafb;
    border-radius: 0.375rem;
  }

  .stat {
    text-align: center;
  }

  .stat-value {
    display: block;
    font-size: 1.125rem;
    font-weight: 600;
    color: #1f2937;
  }

  .stat-label {
    font-size: 0.7rem;
    color: #6b7280;
    text-transform: uppercase;
  }

  .package-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 0.5rem;
  }

  .package-type {
    padding: 0.25rem 0.5rem;
    background: #ede9fe;
    color: #5b21b6;
    border-radius: 0.25rem;
    font-size: 0.7rem;
    text-transform: uppercase;
  }

  /* Delete button positioned absolutely */
  .delete-btn {
    position: absolute;
    top: 1rem;
    right: 1rem;
    padding: 0.25rem 0.5rem;
    background: #fee2e2;
    color: #991b1b;
    border: none;
    border-radius: 0.25rem;
    font-size: 0.7rem;
    cursor: pointer;
    z-index: 2;
    opacity: 0;
    transition: opacity 0.2s;
  }

  .package-card-wrapper:hover .delete-btn {
    opacity: 1;
  }

  .delete-btn:hover {
    background: #fecaca;
  }

  .delete-btn:focus-visible {
    outline: 2px solid #991b1b;
    outline-offset: 2px;
    opacity: 1;
  }

  @media (max-width: 768px) {
    .container {
      padding: 1rem;
    }

    .header {
      flex-direction: column;
      align-items: flex-start;
    }

    .packages-grid {
      grid-template-columns: 1fr;
    }
    
    .delete-btn {
      opacity: 1; /* Always visible on mobile */
    }
    
    .package-version {
      right: 3rem;
    }
  }
</style>
