<script lang="ts">
  import { supabase } from '$lib/supabase';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';

  let session: any = null;
  let testResults: any[] = [];
  let loading = true;
  let error = '';
  let running = false;

  const sessionId = $page.params.id;

  function getErrorMessage(err: unknown) {
    return err instanceof Error ? err.message : String(err);
  }

  onMount(async () => {
    await fetchSessionDetails();
  });

  async function fetchSessionDetails() {
    try {
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError) throw sessionError;
      
      session = sessionData;

      // Fetch test results for this session
      const { data: results } = await supabase
        .from('test_results')
        .select('*, tests(*)')
        .eq('session_id', sessionId);

      testResults = results || [];
      
    } catch (err) {
      error = getErrorMessage(err);
    } finally {
      loading = false;
    }
  }

  async function runSession() {
    running = true;
    try {
      // Update session status
      await supabase
        .from('sessions')
        .update({ status: 'running', started_at: new Date().toISOString() })
        .eq('id', sessionId);

      // Call your automation API
      const response = await fetch('/api/run-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });

      if (!response.ok) throw new Error('Failed to start session');

      // Refresh session data
      await fetchSessionDetails();
      
    } catch (err) {
      error = getErrorMessage(err);
    } finally {
      running = false;
    }
  }

  async function deleteSession() {
    if (confirm('Are you sure you want to delete this session?')) {
      await supabase.from('sessions').delete().eq('id', sessionId);
      goto('/dashboard/sessions');
    }
  }
</script>

<svelte:head>
  <title>Session Details - Aether Automate</title>
</svelte:head>

<div class="container">
  <button class="back-btn" on:click={() => goto('/dashboard/sessions')}>
    ← Back to Sessions
  </button>

  {#if loading}
    <div class="loading">Loading session details...</div>
  {:else if error}
    <div class="error">{error}</div>
  {:else if session}
    <div class="session-header">
      <div>
        <h1>{session.name || 'Untitled Session'}</h1>
        <p class="session-meta">
          Created {new Date(session.created_at).toLocaleString()} • 
          Type: {session.type || 'ui'} • 
          Environment: {session.environment || 'production'}
        </p>
      </div>
      <div class="header-actions">
        <button class="run-btn" on:click={runSession} disabled={running || session.status === 'running'}>
          {running ? 'Starting...' : session.status === 'running' ? 'Running' : 'Run Session'}
        </button>
        <button class="delete-btn" on:click={deleteSession}>Delete</button>
      </div>
    </div>

    <div class="session-status-card">
      <div class="status-info">
        <span class="status-label">Status</span>
        <span class="status-value {session.status}">{session.status || 'pending'}</span>
      </div>
      <div class="progress-info">
        <span class="progress-label">Progress</span>
        <div class="progress-bar">
          <div class="progress-fill" style="width: {session.progress || 0}%"></div>
        </div>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-box">
        <span class="stat-value">{testResults.length}</span>
        <span class="stat-label">Total Tests</span>
      </div>
      <div class="stat-box success">
        <span class="stat-value">{testResults.filter(r => r.status === 'passed').length}</span>
        <span class="stat-label">Passed</span>
      </div>
      <div class="stat-box failed">
        <span class="stat-value">{testResults.filter(r => r.status === 'failed').length}</span>
        <span class="stat-label">Failed</span>
      </div>
      <div class="stat-box">
        <span class="stat-value">{session.duration || '0s'}</span>
        <span class="stat-label">Duration</span>
      </div>
    </div>

    <div class="test-results">
      <h2>Test Results</h2>
      {#if testResults.length === 0}
        <p class="empty">No tests have been run in this session yet.</p>
      {:else}
        <div class="results-list">
          {#each testResults as result}
            <div class="result-item">
              <div class="result-header">
                <h3>{result.tests?.name || 'Test'}</h3>
                <span class="result-status {result.status}">{result.status}</span>
              </div>
              {#if result.error}
                <pre class="error-details">{result.error}</pre>
              {/if}
              <div class="result-meta">
                <span>Duration: {result.duration || '0s'}</span>
                <span>•</span>
                <span>Completed: {new Date(result.completed_at).toLocaleTimeString()}</span>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    {#if session.logs}
      <div class="logs">
        <h2>Session Logs</h2>
        <pre class="log-output">{session.logs}</pre>
      </div>
    {/if}
  {/if}
</div>

<style>
  .container {
    max-width: 1000px;
    margin: 2rem auto;
    padding: 0 2rem;
  }

  .back-btn {
    background: none;
    border: none;
    color: #667eea;
    cursor: pointer;
    margin-bottom: 1rem;
  }

  .session-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 2rem;
  }

  h1 {
    font-size: 2rem;
    color: #1f2937;
    margin-bottom: 0.5rem;
  }

  .session-meta {
    color: #6b7280;
    font-size: 0.875rem;
  }

  .header-actions {
    display: flex;
    gap: 1rem;
  }

  .run-btn, .delete-btn {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 0.375rem;
    cursor: pointer;
  }

  .run-btn {
    background: #10b981;
    color: white;
  }

  .run-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .delete-btn {
    background: #ef4444;
    color: white;
  }

  .session-status-card {
    background: white;
    padding: 1.5rem;
    border-radius: 0.5rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    margin-bottom: 2rem;
    display: flex;
    gap: 2rem;
  }

  .status-info, .progress-info {
    flex: 1;
  }

  .status-label, .progress-label {
    display: block;
    font-size: 0.875rem;
    color: #6b7280;
    margin-bottom: 0.5rem;
  }

  .status-value {
    font-size: 1.25rem;
    font-weight: 600;
    text-transform: capitalize;
  }

  .status-value.running { color: #3b82f6; }
  .status-value.completed { color: #10b981; }
  .status-value.failed { color: #ef4444; }

  .progress-bar {
    height: 8px;
    background: #e5e7eb;
    border-radius: 4px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    transition: width 0.3s;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .stat-box {
    background: white;
    padding: 1.5rem;
    border-radius: 0.5rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    text-align: center;
  }

  .stat-box.success .stat-value { color: #10b981; }
  .stat-box.failed .stat-value { color: #ef4444; }

  .stat-value {
    font-size: 1.5rem;
    font-weight: 600;
    color: #1f2937;
    display: block;
  }

  .stat-label {
    font-size: 0.875rem;
    color: #6b7280;
  }

  .test-results, .logs {
    background: white;
    padding: 1.5rem;
    border-radius: 0.5rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    margin-bottom: 2rem;
  }

  h2 {
    font-size: 1.125rem;
    color: #1f2937;
    margin-bottom: 1rem;
  }

  .results-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .result-item {
    padding: 1rem;
    border: 1px solid #e5e7eb;
    border-radius: 0.375rem;
  }

  .result-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .result-header h3 {
    font-size: 1rem;
    font-weight: 500;
    color: #1f2937;
  }

  .result-status {
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: 500;
    text-transform: capitalize;
  }

  .result-status.passed {
    background: #d1fae5;
    color: #065f46;
  }

  .result-status.failed {
    background: #fee2e2;
    color: #991b1b;
  }

  .error-details {
    background: #fee2e2;
    color: #991b1b;
    padding: 0.75rem;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    margin-bottom: 0.5rem;
    white-space: pre-wrap;
  }

  .result-meta {
    font-size: 0.75rem;
    color: #6b7280;
    display: flex;
    gap: 0.5rem;
  }

  .log-output {
    background: #1f2937;
    color: #e5e7eb;
    padding: 1rem;
    border-radius: 0.375rem;
    font-family: monospace;
    font-size: 0.875rem;
    white-space: pre-wrap;
  }

  .empty {
    text-align: center;
    color: #6b7280;
    padding: 2rem;
  }
</style>
