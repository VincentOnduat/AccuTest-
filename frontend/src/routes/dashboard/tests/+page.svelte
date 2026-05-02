<script lang="ts">
  import { supabase } from '$lib/supabase';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  let tests: any[] = [];
  let loading = true;
  let error = '';

  onMount(async () => {
    await fetchTests();
  });

  async function fetchTests() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        goto('/');
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('tests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      
      tests = data || [];
    } catch (err) {
      error = err instanceof Error ? err.message : 'An unknown error occurred';
    } finally {
      loading = false;
    }
  }

  async function deleteTest(id: string, event: Event) {
    event.stopPropagation();
    if (confirm('Are you sure you want to delete this test?')) {
      await supabase.from('tests').delete().eq('id', id);
      await fetchTests();
    }
  }
</script>

<svelte:head>
  <title>Tests - Aether Automate</title>
</svelte:head>

<div class="container">
  <div class="header">
    <div>
      <h1>Test Library</h1>
      <p class="subtitle">Create and manage your automated tests</p>
    </div>
    <button class="primary-btn" on:click={() => goto('/dashboard/tests/new')}>
      + New Test
    </button>
  </div>

  {#if loading}
    <div class="loading">Loading tests...</div>
  {:else if error}
    <div class="error">Error: {error}</div>
  {:else if tests.length === 0}
    <div class="empty-state">
      <span class="empty-icon">🧪</span>
      <h3>No tests yet</h3>
      <p>Create your first test to get started with automation</p>
      <button class="primary-btn" on:click={() => goto('/dashboard/tests/new')}>
        Create Your First Test
      </button>
    </div>
  {:else}
    <div class="tests-grid">
      {#each tests as test}
        <a href={`/dashboard/tests/${test.id}`} class="test-card">
          <div class="test-header">
            <h3>{test.name}</h3>
            <span class="test-type">{test.type || 'ui'}</span>
          </div>
          <p class="test-description">{test.description || 'No description'}</p>
          <div class="test-footer">
            <div class="test-meta">
              <span>Created: {new Date(test.created_at).toLocaleDateString()}</span>
              <span>•</span>
              <span>Last run: {test.last_run ? new Date(test.last_run).toLocaleDateString() : 'Never'}</span>
            </div>
            <button class="delete-btn" on:click={(e) => deleteTest(test.id, e)}>Delete</button>
          </div>
        </a>
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
  }

  h1 {
    font-size: 2rem;
    color: #1f2937;
    margin-bottom: 0.5rem;
  }

  .subtitle {
    color: #6b7280;
  }

  .primary-btn {
    padding: 0.75rem 1.5rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 0.375rem;
    font-weight: 600;
    cursor: pointer;
  }

  .tests-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
    gap: 1.5rem;
  }

  .test-card {
    background: white;
    border-radius: 0.5rem;
    padding: 1.5rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    cursor: pointer;
    transition: all 0.2s;
    display: block;
    text-decoration: none;
    color: inherit;
  }

  .test-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  }

  .test-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .test-header h3 {
    font-size: 1.125rem;
    font-weight: 600;
    color: #1f2937;
  }

  .test-type {
    padding: 0.25rem 0.5rem;
    background: #f3f4f6;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    color: #4b5563;
    text-transform: uppercase;
  }

  .test-description {
    color: #6b7280;
    font-size: 0.875rem;
    margin-bottom: 1rem;
    line-height: 1.5;
  }

  .test-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .test-meta {
    font-size: 0.75rem;
    color: #9ca3af;
    display: flex;
    gap: 0.25rem;
  }

  .delete-btn {
    padding: 0.25rem 0.5rem;
    background: #fee2e2;
    color: #991b1b;
    border: none;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    cursor: pointer;
  }

  .loading, .error, .empty-state {
    text-align: center;
    padding: 3rem;
    background: white;
    border-radius: 0.5rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }

  .empty-icon {
    font-size: 3rem;
    display: block;
    margin-bottom: 1rem;
  }
</style>

