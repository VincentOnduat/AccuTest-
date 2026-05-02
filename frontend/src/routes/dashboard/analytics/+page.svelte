<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { supabase } from '$lib/supabase';
  
  let loading = true;
  let stats = {
    totalATRDs: 0,
    totalTestPackages: 0,
    totalTestCases: 0,
    totalExecutions: 0,
    passRate: 0,
    criticalTests: 0,
    failedTests: 0,
    recentlyUsed: [] as any[]
  };
  
  let recentActivity: any[] = [];
  let chartData = {
    labels: [],
    datasets: []
  };
  
  onMount(async () => {
    await loadAnalytics();
  });
  
  async function loadAnalytics() {
    loading = true;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // Get ATRD count
      const { count: atrdCount } = await supabase
        .from('atrd_results')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      
      // Get test packages
      const { data: packages } = await supabase
        .from('test_packages')
        .select('*')
        .eq('user_id', user.id);
      
      // Get test executions
      const { data: executions } = await supabase
        .from('test_executions')
        .select('*')
        .eq('user_id', user.id)
        .order('executed_at', { ascending: false })
        .limit(10);
      
      // Calculate statistics
      let totalTestCases = 0;
      let criticalTests = 0;
      
      packages?.forEach(pkg => {
        const testCases = pkg.test_cases?.testCases || [];
        totalTestCases += testCases.length;
        criticalTests += testCases.filter((tc: any) => tc.priority === 'Critical').length;
      });
      
      const passedExecutions = executions?.filter(e => e.status === 'passed').length || 0;
      const passRate = executions?.length ? (passedExecutions / executions.length) * 100 : 0;
      const failedTests = executions?.reduce((sum, e) => {
        return sum + (e.test_results?.filter((r: { status: string }) => r.status === 'failed').length || 0);
      }, 0) || 0;
      
      stats = {
        totalATRDs: atrdCount || 0,
        totalTestPackages: packages?.length || 0,
        totalTestCases: totalTestCases,
        totalExecutions: executions?.length || 0,
        passRate: Math.round(passRate),
        criticalTests: criticalTests,
        failedTests: failedTests,
        recentlyUsed: (packages || []).slice(0, 5)
      };
      
      recentActivity = executions || [];
      
    } catch (err) {
      console.error('Error loading analytics:', err);
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Analytics Dashboard - Aether Automate</title>
</svelte:head>

<div class="dashboard">
  <div class="header">
    <h1>📊 Analytics Dashboard</h1>
    <p class="subtitle">Your test automation insights at a glance</p>
  </div>
  
  {#if loading}
    <div class="loading">Loading analytics...</div>
  {:else}
    <!-- Stats Grid -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon blue">📋</div>
        <div class="stat-info">
          <div class="stat-value">{stats.totalATRDs}</div>
          <div class="stat-label">ATRD Documents</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon green">📦</div>
        <div class="stat-info">
          <div class="stat-value">{stats.totalTestPackages}</div>
          <div class="stat-label">Test Packages</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon purple">🧪</div>
        <div class="stat-info">
          <div class="stat-value">{stats.totalTestCases}</div>
          <div class="stat-label">Total Test Cases</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon orange">🎯</div>
        <div class="stat-info">
          <div class="stat-value">{stats.criticalTests}</div>
          <div class="stat-label">Critical Tests</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon red">❌</div>
        <div class="stat-info">
          <div class="stat-value">{stats.failedTests}</div>
          <div class="stat-label">Failed Tests</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon success">✅</div>
        <div class="stat-info">
          <div class="stat-value">{stats.passRate}%</div>
          <div class="stat-label">Pass Rate</div>
        </div>
      </div>
    </div>
    
    <!-- Recent Activity -->
    <div class="section">
      <h2>Recent Test Executions</h2>
      {#if recentActivity.length === 0}
        <div class="empty-state">
          <p>No test executions yet. Run your first test!</p>
          <button class="btn-primary" on:click={() => goto('/dashboard/packages')}>
            Run Tests →
          </button>
        </div>
      {:else}
        <div class="activity-list">
          {#each recentActivity as exec}
            <div class="activity-item {exec.status}">
              <div class="activity-icon">
                {exec.status === 'passed' ? '✅' : exec.status === 'failed' ? '❌' : '🔄'}
              </div>
              <div class="activity-details">
                <div class="activity-name">{exec.name}</div>
                <div class="activity-meta">
                  <span>📦 {exec.suite_name || 'Test Suite'}</span>
                  <span>🌍 {exec.environment || 'staging'}</span>
                  <span>⏱️ {(exec.duration / 1000).toFixed(1)}s</span>
                  <span>📅 {new Date(exec.executed_at).toLocaleString()}</span>
                </div>
              </div>
              <button class="view-btn" on:click={() => goto(`/dashboard/test-executions/${exec.id}`)}>
                View Details →
              </button>
            </div>
          {/each}
        </div>
      {/if}
    </div>
    
    <!-- Quick Actions -->
    <div class="section">
      <h2>Quick Actions</h2>
      <div class="actions-grid">
        <button class="action-card" on:click={() => goto('/dashboard?tab=atrd')}>
          <div class="action-icon">📄</div>
          <div class="action-title">New ATRD</div>
          <div class="action-desc">Import requirements document</div>
        </button>
        
        <button class="action-card" on:click={() => goto('/dashboard/packages')}>
          <div class="action-icon">🚀</div>
          <div class="action-title">Run Tests</div>
          <div class="action-desc">Execute test packages</div>
        </button>
        
        <button class="action-card" on:click={() => goto('/dashboard/reports')}>
          <div class="action-icon">📊</div>
          <div class="action-title">Generate Report</div>
          <div class="action-desc">Export test results</div>
        </button>
        
        <button class="action-card" on:click={() => goto('/dashboard/atrd')}>
          <div class="action-icon">📚</div>
          <div class="action-title">View All</div>
          <div class="action-desc">Browse all documents</div>
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  .dashboard {
    max-width: 1400px;
    margin: 0 auto;
    padding: 2rem;
  }
  
  .header {
    margin-bottom: 2rem;
  }
  
  .header h1 {
    margin: 0 0 0.5rem 0;
    font-size: 2rem;
    color: #1f2937;
  }
  
  .subtitle {
    color: #6b7280;
    margin: 0;
  }
  
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
  }
  
  .stat-card {
    background: white;
    border-radius: 1rem;
    padding: 1.5rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    transition: transform 0.2s, box-shadow 0.2s;
  }
  
  .stat-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  }
  
  .stat-icon {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
  }
  
  .stat-icon.blue { background: #dbeafe; color: #1e40af; }
  .stat-icon.green { background: #d1fae5; color: #065f46; }
  .stat-icon.purple { background: #ede9fe; color: #5b21b6; }
  .stat-icon.orange { background: #fed7aa; color: #92400e; }
  .stat-icon.red { background: #fee2e2; color: #dc2626; }
  .stat-icon.success { background: #d1fae5; color: #10b981; }
  
  .stat-info {
    flex: 1;
  }
  
  .stat-value {
    font-size: 2rem;
    font-weight: 700;
    color: #1f2937;
  }
  
  .stat-label {
    font-size: 0.875rem;
    color: #6b7280;
  }
  
  .section {
    margin-bottom: 2rem;
  }
  
  .section h2 {
    font-size: 1.25rem;
    color: #1f2937;
    margin-bottom: 1rem;
  }
  
  .activity-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .activity-item {
    background: white;
    border-radius: 0.75rem;
    padding: 1rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    border-left: 4px solid #9ca3af;
    transition: box-shadow 0.2s;
  }
  
  .activity-item:hover {
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }
  
  .activity-item.passed { border-left-color: #10b981; }
  .activity-item.failed { border-left-color: #ef4444; }
  
  .activity-icon {
    font-size: 1.5rem;
  }
  
  .activity-details {
    flex: 1;
  }
  
  .activity-name {
    font-weight: 600;
    color: #1f2937;
    margin-bottom: 0.25rem;
  }
  
  .activity-meta {
    display: flex;
    gap: 1rem;
    font-size: 0.75rem;
    color: #6b7280;
    flex-wrap: wrap;
  }
  
  .view-btn {
    background: none;
    border: none;
    color: #667eea;
    cursor: pointer;
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    transition: background 0.2s;
  }
  
  .view-btn:hover {
    background: #f3f4f6;
  }
  
  .actions-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 1rem;
  }
  
  .action-card {
    background: white;
    border: 2px solid #e5e7eb;
    border-radius: 0.75rem;
    padding: 1.5rem;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .action-card:hover {
    border-color: #667eea;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  }
  
  .action-icon {
    font-size: 2rem;
    margin-bottom: 0.75rem;
  }
  
  .action-title {
    font-weight: 600;
    color: #1f2937;
    margin-bottom: 0.25rem;
  }
  
  .action-desc {
    font-size: 0.75rem;
    color: #6b7280;
  }
  
  .btn-primary {
    background: #667eea;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    cursor: pointer;
  }
  
  .empty-state {
    text-align: center;
    padding: 3rem;
    background: #f9fafb;
    border-radius: 0.75rem;
    color: #6b7280;
  }
  
  .loading {
    text-align: center;
    padding: 4rem;
    color: #6b7280;
  }
  
  @media (max-width: 768px) {
    .dashboard {
      padding: 1rem;
    }
    
    .stats-grid {
      grid-template-columns: 1fr;
    }
    
    .actions-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
