<script lang="ts">
  import { supabase } from '$lib/supabase';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { fade } from 'svelte/transition';

  let pkg: any = null;
  let loading = true;
  let error = '';
  let activeTab: 'cases' | 'code' | 'run' = 'cases';

  let running = false;
  let runError = '';
  // Full execution history for this package, newest first — persisted, so it
  // survives a page reload instead of vanishing back to "no run yet" the
  // moment you navigate away. Drives both the header status badge and the
  // Run Results tab.
  let executions: any[] = [];
  let selectedExecutionId: string | null = null;

  $: id = $page.params.id;
  $: selectedExecution = executions.find((e) => e.id === selectedExecutionId) || executions[0] || null;

  onMount(async () => {
    await Promise.all([loadPackage(), loadExecutions()]);
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
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const result = await response.json();
        pkg = result.data || result;
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

  async function loadExecutions() {
    const { data } = await supabase
      .from('test_executions')
      .select('*')
      .eq('package_id', id)
      .order('executed_at', { ascending: false });
    executions = data || [];
  }

  async function deletePackage() {
    if (!confirm('Delete this test package?')) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch(`/api/packages/id/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
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

  async function runTests() {
    running = true;
    runError = '';

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch('/api/test-runner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        credentials: 'include',
        body: JSON.stringify({ package_id: id })
      });

      const result = await response.json();

      if (!response.ok) {
        runError = result.error || 'Test run failed';
        // Even a run that didn't complete gets recorded (as an 'error' execution) —
        // refresh so it shows up in history rather than silently disappearing.
        await loadExecutions();
      } else {
        activeTab = 'run';
        // The run changed both the execution history and possibly the package's
        // lifecycle status (draft → active on its first run) — refresh both.
        await Promise.all([loadExecutions(), loadPackage()]);
        selectedExecutionId = result.execution_id;
      }
    } catch (err) {
      runError = err instanceof Error ? err.message : String(err);
    } finally {
      running = false;
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  }

  function getPriorityColor(priority: string) {
    switch (priority?.toLowerCase()) {
      case 'critical':
        return '#dc2626';
      case 'high':
        return '#f97316';
      case 'medium':
        return '#eab308';
      default:
        return '#10b981';
    }
  }

  $: latestRun = executions[0] || null;
  $: runBadge = !latestRun
    ? { icon: '▶️', label: 'Not run yet', className: 'not-run' }
    : latestRun.status === 'passed'
      ? { icon: '✅', label: 'Passing', className: 'passed' }
      : latestRun.status === 'failed'
        ? { icon: '❌', label: 'Failing', className: 'failed' }
        : { icon: '⚠️', label: 'Run error', className: 'errored' };

  function formatExecTime(iso: string) {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  function execSummary(exec: any) {
    const results = exec.test_results || [];
    const total = results.length;
    const passed = results.filter((r: any) => r.status === 'passed').length;
    return { total, passed, failed: total - passed, passRate: total ? (passed / total) * 100 : 0 };
  }
</script>

<svelte:head>
  <title>{pkg?.name || 'Test Package'} - AccuTest</title>
</svelte:head>

<div class="page">
  {#if loading}
    <div class="center-message">Loading package…</div>
  {:else if error}
    <div class="center-message error">
      <p>Error: {error}</p>
      <button class="primary-btn" on:click={() => goto('/dashboard/packages')}>Back to Packages</button>
    </div>
  {:else if pkg}
    <button class="back-link" on:click={() => goto('/dashboard/packages')}>← Back to Packages</button>

    <div class="header">
      <div>
        <div class="title-row">
          <h1>{pkg.name}</h1>
          <span class="run-badge {runBadge.className}">{runBadge.icon} {runBadge.label}</span>
          {#if pkg.test_cases?.requiresReview}
            <span class="review-badge" title="The AI couldn't find a real selector for some elements in the ATRD and used placeholders instead">⚠️ Needs selector review</span>
          {/if}
        </div>
        <p class="subtitle">
          Created {new Date(pkg.created_at).toLocaleDateString()} · {pkg.test_cases?.framework || 'playwright'} · id
          <code>{pkg.id}</code>
        </p>
      </div>
      <div class="header-actions">
        <button class="primary-btn" on:click={runTests} disabled={running}>
          {running ? '⏳ Running…' : '▶️ Run Tests'}
        </button>
        <button class="danger-btn" on:click={deletePackage}>Delete</button>
      </div>
    </div>

    {#if pkg.test_cases?.requiresReview && pkg.test_cases?.unresolvedFields?.length > 0}
      <div class="banner review">
        ⚠️ The ATRD didn't specify a real selector for: <strong>{pkg.test_cases.unresolvedFields.join(', ')}</strong>.
        The generated code uses placeholder <code>TODO_*</code> locators for these — check the Test Code tab and
        replace them before this package will run against a real page. You can still run it as-is to see exactly
        where the placeholders fail.
      </div>
    {/if}

    {#if runError}
      <div class="banner error">{runError}</div>
    {/if}

    <!-- At a glance: composition of the generated test cases, always visible
         regardless of which tab is open. -->
    <div class="stats-row">
      <div class="stat">
        <span class="stat-value">{pkg.test_cases?.testCases?.length || 0}</span>
        <span class="stat-label">Test Cases</span>
      </div>
      <div class="stat">
        <span class="stat-value critical">{pkg.test_cases?.summary?.critical || 0}</span>
        <span class="stat-label">Critical</span>
      </div>
      <div class="stat">
        <span class="stat-value high">{pkg.test_cases?.summary?.high || 0}</span>
        <span class="stat-label">High</span>
      </div>
      <div class="stat">
        <span class="stat-value">{pkg.status || 'draft'}</span>
        <span class="stat-label">Status</span>
      </div>
    </div>

    <div class="tabs">
      <button class="tab-btn" class:active={activeTab === 'cases'} on:click={() => (activeTab = 'cases')}>🧪 Test Cases</button>
      <button class="tab-btn" class:active={activeTab === 'code'} on:click={() => (activeTab = 'code')}>📝 Test Code</button>
      <button class="tab-btn" class:active={activeTab === 'run'} on:click={() => (activeTab = 'run')}>▶️ Run Results</button>
    </div>

    {#if activeTab === 'cases'}
      <div class="tab-panel" in:fade={{ duration: 150 }}>
        {#if pkg.test_cases?.testCases?.length > 0}
          <div class="cases-list">
            {#each pkg.test_cases.testCases as test, index}
              <div class="case-card">
                <div class="case-top">
                  <span class="case-title">{index + 1}. {test.name || 'Test Case'}</span>
                  <span class="priority-pill" style="background: {getPriorityColor(test.priority)};">{test.priority || 'Medium'}</span>
                </div>
                <p class="case-desc">{test.description || 'No description'}</p>
                {#if test.steps?.length > 0}
                  <div class="case-section">
                    <div class="case-section-label">Steps</div>
                    <ol>
                      {#each test.steps as step}
                        <li>{step}</li>
                      {/each}
                    </ol>
                  </div>
                {/if}
                {#if test.expectedResult}
                  <div class="case-section">
                    <div class="case-section-label">Expected Result</div>
                    <p class="expected">✓ {test.expectedResult}</p>
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        {:else}
          <div class="empty-panel">No test cases found in this package.</div>
        {/if}
      </div>
    {/if}

    {#if activeTab === 'code'}
      <div class="tab-panel" in:fade={{ duration: 150 }}>
        <div class="code-block">
          <div class="code-header">
            <span>Executable Test Code ({pkg.test_cases?.framework || 'playwright'})</span>
            <button class="copy-btn" on:click={() => copyToClipboard(pkg.test_cases?.executableCode || pkg.test_cases?.code || '')}>
              📋 Copy
            </button>
          </div>
          <pre><code>{pkg.test_cases?.executableCode || pkg.test_cases?.code || '// No executable code found'}</code></pre>
        </div>
      </div>
    {/if}

    {#if activeTab === 'run'}
      <div class="tab-panel" in:fade={{ duration: 150 }}>
        {#if executions.length === 0}
          <div class="empty-panel">
            <p>No run yet. Click <strong>Run Tests</strong> above to actually execute this package's generated code and see real pass/fail results.</p>
            <p class="hint">
              Tests navigate against the Target Application URL configured in <a href="/dashboard/settings">Settings</a> — leave it
              unset and relative navigations will fail as expected.
            </p>
          </div>
        {:else}
          <div class="run-layout">
            <div class="run-history">
              <div class="run-history-label">History ({executions.length})</div>
              {#each executions as exec}
                {@const s = execSummary(exec)}
                <button
                  type="button"
                  class="run-history-item"
                  class:selected={selectedExecution?.id === exec.id}
                  on:click={() => (selectedExecutionId = exec.id)}
                >
                  <span class="run-history-status">{exec.status === 'passed' ? '✅' : exec.status === 'failed' ? '❌' : '⚠️'}</span>
                  <span class="run-history-meta">
                    <span class="run-history-time">{formatExecTime(exec.executed_at)}</span>
                    <span class="run-history-sub">{s.passed}/{s.total} passed · {exec.duration}ms</span>
                  </span>
                </button>
              {/each}
            </div>

            {#if selectedExecution}
              {@const s = execSummary(selectedExecution)}
              <div class="run-detail">
                <div class="run-stats-row">
                  <div class="stat">
                    <span class="stat-value">{s.total}</span>
                    <span class="stat-label">Total</span>
                  </div>
                  <div class="stat">
                    <span class="stat-value" style="color: #10b981;">{s.passed}</span>
                    <span class="stat-label">Passed</span>
                  </div>
                  <div class="stat">
                    <span class="stat-value" style="color: #dc2626;">{s.failed}</span>
                    <span class="stat-label">Failed</span>
                  </div>
                  <div class="stat">
                    <span class="stat-value">{s.passRate.toFixed(0)}%</span>
                    <span class="stat-label">Pass Rate</span>
                  </div>
                </div>

                <div class="results-list">
                  {#each selectedExecution.test_results || [] as r}
                    <div class="result-row" class:failed={r.status !== 'passed'}>
                      <div class="result-top">
                        <span class="result-name">{r.status === 'passed' ? '✅' : '❌'} {r.name}</span>
                        <span class="result-duration">{r.duration}ms</span>
                      </div>
                      {#if r.error_message}
                        <pre class="result-error">{r.error_message}</pre>
                      {/if}
                    </div>
                  {/each}
                </div>
              </div>
            {/if}
          </div>
        {/if}
      </div>
    {/if}
  {/if}
</div>

<style>
  .page {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
  }

  .center-message {
    text-align: center;
    padding: 3rem;
  }
  .center-message.error {
    color: #dc2626;
  }

  .back-link {
    background: none;
    border: none;
    color: #667eea;
    cursor: pointer;
    margin-bottom: 0.75rem;
    padding: 0;
    font-size: 0.875rem;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    flex-wrap: wrap;
    margin-bottom: 1.5rem;
  }

  .title-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  h1 {
    margin: 0;
    font-size: 1.5rem;
    color: #1f2937;
  }

  .subtitle {
    color: #6b7280;
    margin-top: 0.375rem;
    font-size: 0.8125rem;
  }

  .subtitle code {
    background: #f3f4f6;
    padding: 0.05rem 0.3rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
  }

  .run-badge {
    flex-shrink: 0;
    font-size: 0.75rem;
    font-weight: 500;
    padding: 0.25rem 0.6rem;
    border-radius: 999px;
    white-space: nowrap;
  }
  .run-badge.not-run { background: #f3f4f6; color: #6b7280; }
  .run-badge.passed { background: #d1fae5; color: #065f46; }
  .run-badge.failed { background: #fee2e2; color: #991b1b; }
  .run-badge.errored { background: #fef3c7; color: #92400e; }

  .review-badge {
    flex-shrink: 0;
    font-size: 0.75rem;
    font-weight: 500;
    padding: 0.25rem 0.6rem;
    border-radius: 999px;
    white-space: nowrap;
    background: #fef3c7;
    color: #92400e;
  }

  .header-actions {
    display: flex;
    gap: 0.5rem;
  }

  .primary-btn {
    padding: 0.5rem 1rem;
    background: #667eea;
    color: white;
    border: none;
    border-radius: 0.375rem;
    cursor: pointer;
    font-size: 0.9rem;
    white-space: nowrap;
  }
  .primary-btn:hover:not(:disabled) { background: #5a67d8; }
  .primary-btn:disabled { opacity: 0.7; cursor: not-allowed; }

  .danger-btn {
    padding: 0.5rem 1rem;
    background: #ef4444;
    color: white;
    border: none;
    border-radius: 0.375rem;
    cursor: pointer;
    font-size: 0.9rem;
  }
  .danger-btn:hover { background: #dc2626; }

  .banner {
    border-radius: 0.5rem;
    padding: 1rem;
    margin-bottom: 1.5rem;
  }
  .banner.error { background: #fee2e2; color: #dc2626; }
  .banner.review { background: #fffbeb; color: #92400e; }
  .banner.review code {
    background: rgba(146, 64, 14, 0.12);
    padding: 0.1rem 0.3rem;
    border-radius: 0.25rem;
  }

  .stats-row,
  .run-stats-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.75rem;
    margin-bottom: 1.5rem;
  }

  .stat {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    padding: 0.75rem;
    text-align: center;
  }

  .stat-value {
    display: block;
    font-size: 1.375rem;
    font-weight: 700;
    color: #1f2937;
    text-transform: capitalize;
  }
  .stat-value.critical { color: #dc2626; }
  .stat-value.high { color: #f97316; }

  .stat-label {
    display: block;
    font-size: 0.75rem;
    color: #6b7280;
    margin-top: 0.125rem;
  }

  .tabs {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
    border-bottom: 1px solid #e5e7eb;
  }

  .tab-btn {
    padding: 0.75rem 1.5rem;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    color: #6b7280;
    cursor: pointer;
    font-size: 0.9rem;
  }
  .tab-btn.active {
    border-bottom-color: #667eea;
    color: #667eea;
    font-weight: 500;
  }

  .empty-panel {
    text-align: center;
    padding: 3rem;
    background: #f9fafb;
    border-radius: 0.5rem;
    color: #6b7280;
  }
  .empty-panel .hint {
    margin: 0.75rem 0 0 0;
    font-size: 0.8125rem;
  }
  .empty-panel a {
    color: #667eea;
  }

  .cases-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .case-card {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    padding: 1rem;
  }

  .case-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 0.5rem;
    flex-wrap: wrap;
    margin-bottom: 0.5rem;
  }

  .case-title {
    font-weight: 600;
    font-size: 1rem;
  }

  .priority-pill {
    padding: 0.2rem 0.5rem;
    color: white;
    border-radius: 0.25rem;
    font-size: 0.7rem;
    font-weight: 500;
    white-space: nowrap;
  }

  .case-desc {
    color: #4b5563;
    margin: 0 0 0.75rem 0;
    font-size: 0.875rem;
  }

  .case-section {
    margin-bottom: 0.5rem;
  }
  .case-section-label {
    font-weight: 500;
    font-size: 0.75rem;
    color: #374151;
    margin-bottom: 0.25rem;
  }
  .case-section ol {
    margin: 0;
    padding-left: 1.25rem;
  }
  .case-section li {
    font-size: 0.875rem;
    color: #4b5563;
    margin-bottom: 0.25rem;
  }
  .expected {
    margin: 0;
    font-size: 0.875rem;
    color: #10b981;
  }

  .code-block {
    background: #1e1e1e;
    border-radius: 0.5rem;
    padding: 1rem;
  }
  .code-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    color: #e5e7eb;
    font-size: 0.875rem;
  }
  .copy-btn {
    padding: 0.25rem 0.5rem;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 0.25rem;
    color: white;
    cursor: pointer;
    font-size: 0.8125rem;
  }
  .copy-btn:hover { background: rgba(255, 255, 255, 0.2); }
  .code-block pre {
    background: #0d1117;
    color: #e6edf3;
    padding: 1rem;
    border-radius: 0.375rem;
    overflow-x: auto;
    font-size: 0.75rem;
    font-family: 'Monaco', monospace;
    margin: 0;
    white-space: pre-wrap;
  }

  .run-layout {
    display: grid;
    grid-template-columns: 220px 1fr;
    gap: 1.5rem;
    align-items: start;
  }

  .run-history {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    max-height: 32rem;
    overflow-y: auto;
  }

  .run-history-label {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: #9ca3af;
    margin-bottom: 0.25rem;
  }

  .run-history-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.625rem;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 0.375rem;
    cursor: pointer;
    text-align: left;
    transition: border-color 0.15s, background 0.15s;
  }
  .run-history-item:hover {
    border-color: #a5b4fc;
  }
  .run-history-item.selected {
    border-color: #667eea;
    background: #f5f3ff;
  }

  .run-history-status {
    font-size: 1rem;
    flex-shrink: 0;
  }

  .run-history-meta {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .run-history-time {
    font-size: 0.8125rem;
    font-weight: 500;
    color: #1f2937;
  }

  .run-history-sub {
    font-size: 0.7rem;
    color: #6b7280;
  }

  .run-detail {
    min-width: 0;
  }

  .results-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .result-row {
    background: white;
    border: 1px solid #e5e7eb;
    border-left: 4px solid #10b981;
    border-radius: 0.375rem;
    padding: 0.875rem 1rem;
  }
  .result-row.failed {
    border-left-color: #dc2626;
  }
  .result-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
  }
  .result-name {
    font-weight: 500;
  }
  .result-duration {
    color: #6b7280;
    font-size: 0.8125rem;
    white-space: nowrap;
  }
  .result-error {
    margin: 0.5rem 0 0 0;
    background: #fef2f2;
    color: #991b1b;
    padding: 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    overflow-x: auto;
    white-space: pre-wrap;
  }

  @media (max-width: 640px) {
    .page { padding: 1rem; }
    .stats-row, .run-stats-row { grid-template-columns: repeat(2, 1fr); }
    .tabs { flex-wrap: wrap; }
    .run-layout { grid-template-columns: 1fr; }
    .run-history { flex-direction: row; overflow-x: auto; overflow-y: visible; max-height: none; }
    .run-history-item { flex-shrink: 0; }
  }
</style>
