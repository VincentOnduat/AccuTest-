<script lang="ts">
  import { supabase } from '$lib/supabase';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  let sessions: any[] = [];
  let loading = true;
  let error = '';
  let filter = 'all';

  onMount(async () => {
    await fetchSessions();
  });

  async function fetchSessions() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        goto('/');
        return;
      }

      let query = supabase
        .from('sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      
      sessions = data || [];
    } catch (err) {
      error = err instanceof Error ? err.message : 'An unknown error occurred';
    } finally {
      loading = false;
    }
  }

  $: filter, fetchSessions();

  function getStatusColor(status: string) {
    const colors: Record<string, string> = {
      completed: '#10b981',
      running: '#3b82f6',
      failed: '#ef4444',
      pending: '#f59e0b'
    };
    return colors[status] || '#6b7280';
  }
</script>

<svelte:head>
  <title>Sessions - Aether Automate</title>
</svelte:head>

<div class="container">
  <div class="header">
    <div>
      <h1>Test Sessions</h1>
      <p class="subtitle">Manage and monitor your automation sessions</p>
    </div>
    <button class="primary-btn" on:click={() => goto('/dashboard/sessions/new')}>
      + New Session
    </button>
  </div>

  <div class="filters">
    <button class:active={filter === 'all'} on:click={() => filter = 'all'}>All</button>
    <button class:active={filter === 'running'} on:click={() => filter = 'running'}>Running</button>
    <button class:active={filter === 'completed'} on:click={() => filter = 'completed'}>Completed</button>
    <button class:active={filter === 'failed'} on:click={() => filter = 'failed'}>Failed</button>
  </div>

  {#if loading}
    <div class="loading">Loading sessions...</div>
  {:else if error}
    <div class="error">Error: {error}</div>
  {:else if sessions.length === 0}
    <div class="empty-state">
      <span class="empty-icon">🔄</span>
      <h3>No sessions found</h3>
      <p>Create your first test session to get started</p>
      <button class="primary-btn" on:click={() => goto('/dashboard/sessions/new')}>
        Create Session
      </button>
    </div>
  {:else}
    <div class="sessions-list">
      {#each sessions as session}
        <button class="session-card" on:click={() => goto(`/dashboard/sessions/${session.id}`)}>
          <div class="session-info">
            <h3>{session.name || 'Untitled Session'}</h3>
            <p class="session-description">{session.description || 'No description'}</p>
            <div class="session-meta">
              <span>Created: {new Date(session.created_at).toLocaleDateString()}</span>
              <span>•</span>
              <span>Type: {session.type || 'ui'}</span>
            </div>
          </div>
          <div class="session-stats">
            <div class="stat">
              <span class="stat-label">Tests</span>
              <span class="stat-value">{(session.test_count || 0)}</span>
            </div>
            <div class="stat">
              <span class="stat-label">Passed</span>
              <span class="stat-value success">{(session.passed_tests || 0)}</span>
            </div>
            <div class="stat">
              <span class="stat-label">Failed</span>
              <span class="stat-value failed">{(session.failed_tests || 0)}</span>
            </div>
            <div class="session-status">
              <span class="status-badge" style="background: {getStatusColor(session.status)}20; color: {getStatusColor(session.status)}">
                {session.status || 'pending'}
              </span>
            </div>
          </div>
        </button>
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

  .filters {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 2rem;
  }

  .filters button {
    padding: 0.5rem 1rem;
    border: 1px solid #e5e7eb;
    border-radius: 0.375rem;
    background: white;
    color: #4b5563;
    cursor: pointer;
  }

  .filters button.active {
    background: #667eea;
    color: white;
    border-color: #667eea;
  }

  .sessions-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .session-card {
    background: white;
    border-radius: 0.5rem;
    padding: 1.5rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    transition: all 0.2s;
    border: none;
    font-family: inherit;
    text-align: left;
  }

  .session-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  }

  .session-info h3 {
    font-size: 1.125rem;
    font-weight: 600;
    color: #1f2937;
    margin-bottom: 0.5rem;
  }

  .session-description {
    color: #6b7280;
    font-size: 0.875rem;
    margin-bottom: 0.5rem;
  }

  .session-meta {
    display: flex;
    gap: 0.5rem;
    font-size: 0.75rem;
    color: #9ca3af;
  }

  .session-stats {
    display: flex;
    align-items: center;
    gap: 2rem;
  }

  .stat {
    text-align: center;
  }

  .stat-label {
    display: block;
    font-size: 0.75rem;
    color: #6b7280;
  }

  .stat-value {
    font-size: 1.125rem;
    font-weight: 600;
    color: #1f2937;
  }

  .stat-value.success {
    color: #10b981;
  }

  .stat-value.failed {
    color: #ef4444;
  }

  .session-status {
    margin-left: 1rem;
  }

  .status-badge {
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 500;
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
