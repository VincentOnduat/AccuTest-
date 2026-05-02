<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  
  let executions: any[] = [];
  let loading = true;
  let stats = {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    passRate: 0,
    totalDuration: 0
  };
  
  onMount(async () => {
    await loadExecutions();
  });
  
  async function loadExecutions() {
    loading = true;
    try {
      const response = await fetch('/api/test-executions', { credentials: 'include' });
      if (response.ok) {
        executions = await response.json();
        calculateStats();
      }
    } catch (err) {
      console.error('Error loading executions:', err);
    } finally {
      loading = false;
    }
  }
  
  function calculateStats() {
    stats.total = executions.length;
    stats.passed = executions.filter(e => e.status === 'passed').length;
    stats.failed = executions.filter(e => e.status === 'failed').length;
    stats.skipped = executions.filter(e => e.status === 'skipped').length;
    stats.passRate = stats.total > 0 ? (stats.passed / stats.total) * 100 : 0;
    stats.totalDuration = executions.reduce((sum, e) => sum + (e.duration || 0), 0);
  }
  
  function getStatusIcon(status: string) {
    switch(status) {
      case 'passed': return '✅';
      case 'failed': return '❌';
      case 'skipped': return '⏭️';
      default: return '❓';
    }
  }
</script>

<div class="container">
  <h1>Test Execution Dashboard</h1>
  
  {#if loading}
    <p>Loading executions...</p>
  {:else}
    <div class="stats">
      <div class="stat-card">
        <h3>Total Tests</h3>
        <p class="stat-value">{stats.total}</p>
      </div>
      <div class="stat-card">
        <h3>Passed</h3>
        <p class="stat-value passed">{stats.passed}</p>
      </div>
      <div class="stat-card">
        <h3>Failed</h3>
        <p class="stat-value failed">{stats.failed}</p>
      </div>
      <div class="stat-card">
        <h3>Skipped</h3>
        <p class="stat-value skipped">{stats.skipped}</p>
      </div>
      <div class="stat-card">
        <h3>Pass Rate</h3>
        <p class="stat-value">{stats.passRate.toFixed(2)}%</p>
      </div>
      <div class="stat-card">
        <h3>Total Duration</h3>
        <p class="stat-value">{(stats.totalDuration / 1000).toFixed(2)}s</p>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Status</th>
          <th>Duration (ms)</th>
          <th>Timestamp</th>
        </tr>
      </thead>
      <tbody>
        {#each executions as execution (execution.id)}
          <tr>
            <td>{execution.id}</td>
            <td>{getStatusIcon(execution.status)} {execution.status}</td>
            <td>{execution.duration}</td>
            <td>{new Date(execution.timestamp).toLocaleString()}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</div>

<style>
  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
  }

  h1 {
    margin-bottom: 2rem;
  }

  .stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .stat-card {
    background: #f5f5f5;
    padding: 1rem;
    border-radius: 8px;
    text-align: center;
  }

  .stat-card h3 {
    margin: 0 0 0.5rem 0;
    font-size: 0.9rem;
    color: #666;
  }

  .stat-value {
    margin: 0;
    font-size: 1.8rem;
    font-weight: bold;
    color: #333;
  }

  .stat-value.passed {
    color: #4caf50;
  }

  .stat-value.failed {
    color: #f44336;
  }

  .stat-value.skipped {
    color: #ff9800;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 1rem;
  }

  th, td {
    padding: 0.75rem;
    text-align: left;
    border-bottom: 1px solid #ddd;
  }

  th {
    background: #f5f5f5;
    font-weight: bold;
  }

  tr:hover {
    background: #f9f9f9;
  }
</style>