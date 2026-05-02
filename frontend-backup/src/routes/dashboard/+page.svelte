<script lang="ts">
  import { supabase } from '$lib/supabase';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  // User state
  let user: any = null;
  let loading = true;
  let error = '';

  // Dashboard data
  let stats = {
    totalSessions: 0,
    activeSessions: 0,
    completedTests: 0,
    successRate: 0
  };

  let recentActivity = [
    { id: 1, action: 'Login test completed', time: '2 minutes ago', status: 'success' },
    { id: 2, action: 'Payment flow test', time: '15 minutes ago', status: 'running' },
    { id: 3, action: 'User registration', time: '1 hour ago', status: 'success' },
    { id: 4, action: 'Dashboard navigation', time: '2 hours ago', status: 'failed' }
  ];

  // Check authentication on mount
  onMount(async () => {
    try {
      const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !currentUser) {
        goto('/');
        return;
      }
      
      user = currentUser;
      
      // Fetch real stats from your database here
      // For now, using mock data
      stats = {
        totalSessions: 24,
        activeSessions: 3,
        completedTests: 156,
        successRate: 94
      };
      
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  });

  // Sign out function
  async function handleSignOut() {
    await supabase.auth.signOut();
    goto('/');
  }

  // Navigation functions
  function createNewSession() {
    goto('/dashboard/sessions/new');
  }

  function viewAllSessions() {
    goto('/dashboard/sessions');
  }

  // Get status color
  function getStatusColor(status: string) {
    const colors = {
      success: '#10b981',
      running: '#3b82f6',
      failed: '#ef4444'
    };
    return colors[status] || '#6b7280';
  }
</script>

<svelte:head>
  <title>Dashboard - Aether Automate</title>
</svelte:head>

<!-- Main Dashboard -->
<div class="dashboard">
  
  <!-- Sidebar -->
  <aside class="sidebar">
    <div class="sidebar-header">
      <div class="logo">
        <span class="logo-icon">⚡</span>
        <span class="logo-text">Aether</span>
      </div>
    </div>
    
    <nav class="nav-menu">
      <a href="/dashboard" class="nav-item active">
        <span class="nav-icon">📊</span>
        <span>Overview</span>
      </a>
      <a href="/dashboard/sessions" class="nav-item">
        <span class="nav-icon">🔄</span>
        <span>Sessions</span>
      </a>
      <a href="/dashboard/tests" class="nav-item">
        <span class="nav-icon">🧪</span>
        <span>Tests</span>
      </a>
      <a href="/dashboard/analytics" class="nav-item">
        <span class="nav-icon">📈</span>
        <span>Analytics</span>
      </a>
      <a href="/dashboard/settings" class="nav-item">
        <span class="nav-icon">⚙️</span>
        <span>Settings</span>
      </a>
    </nav>
    
    <div class="sidebar-footer">
      <div class="user-info">
        <div class="user-avatar">
          {user?.email?.charAt(0).toUpperCase() || 'U'}
        </div>
        <div class="user-details">
          <div class="user-name">{user?.email?.split('@')[0] || 'User'}</div>
          <div class="user-email">{user?.email || ''}</div>
        </div>
      </div>
    </div>
  </aside>

  <!-- Main Content -->
  <main class="main-content">
    
    <!-- Top Bar -->
    <header class="top-bar">
      <h1>Welcome back, {user?.email?.split('@')[0] || 'User'}!</h1>
      
      <div class="top-bar-actions">
        <button class="notification-btn">
          <span>🔔</span>
        </button>
        <button class="sign-out-btn" on:click={handleSignOut}>
          Sign Out
        </button>
      </div>
    </header>

    <!-- Dashboard Content -->
    {#if loading}
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Loading your dashboard...</p>
      </div>
    {:else if error}
      <div class="error-state">
        <h3>Error Loading Dashboard</h3>
        <p>{error}</p>
        <button on:click={() => window.location.reload()}>Try Again</button>
      </div>
    {:else}
      
      <!-- Stats Grid -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon blue">🔄</div>
          <div class="stat-content">
            <h3>Total Sessions</h3>
            <p class="stat-value">{stats.totalSessions}</p>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon green">⚡</div>
          <div class="stat-content">
            <h3>Active Sessions</h3>
            <p class="stat-value">{stats.activeSessions}</p>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon purple">✅</div>
          <div class="stat-content">
            <h3>Completed Tests</h3>
            <p class="stat-value">{stats.completedTests}</p>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon orange">📊</div>
          <div class="stat-content">
            <h3>Success Rate</h3>
            <p class="stat-value">{stats.successRate}%</p>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="action-bar">
        <button class="btn primary" on:click={createNewSession}>
          <span>+</span>
          New Session
        </button>
        <button class="btn secondary" on:click={viewAllSessions}>
          View All Sessions
        </button>
      </div>

      <!-- Recent Activity -->
      <div class="activity-section">
        <h2>Recent Activity</h2>
        
        <div class="activity-list">
          {#each recentActivity as activity}
            <div class="activity-item">
              <div class="activity-info">
                <h4>{activity.action}</h4>
                <span class="activity-time">{activity.time}</span>
              </div>
              <span 
                class="status-badge"
                style="background: {getStatusColor(activity.status)}20; color: {getStatusColor(activity.status)}"
              >
                {activity.status}
              </span>
            </div>
          {/each}
        </div>
      </div>

      <!-- Quick Actions Grid -->
      <div class="quick-actions">
        <h2>Quick Actions</h2>
        <div class="actions-grid">
          <button class="action-card">
            <span class="action-icon">📝</span>
            <span>New Test</span>
          </button>
          <button class="action-card">
            <span class="action-icon">📊</span>
            <span>Report</span>
          </button>
          <button class="action-card">
            <span class="action-icon">⚙️</span>
            <span>Settings</span>
          </button>
          <button class="action-card">
            <span class="action-icon">📚</span>
            <span>Docs</span>
          </button>
        </div>
      </div>
    {/if}
  </main>
</div>

<style>
  .dashboard {
    display: flex;
    min-height: 100vh;
    background: #f3f4f6;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  /* Sidebar Styles */
  .sidebar {
    width: 260px;
    background: white;
    display: flex;
    flex-direction: column;
    box-shadow: 2px 0 10px rgba(0,0,0,0.05);
  }

  .sidebar-header {
    padding: 1.5rem;
    border-bottom: 1px solid #e5e7eb;
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1.25rem;
    font-weight: 600;
  }

  .logo-icon {
    font-size: 1.5rem;
  }

  .logo-text {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .nav-menu {
    flex: 1;
    padding: 1.5rem 0;
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1.5rem;
    color: #6b7280;
    text-decoration: none;
    transition: all 0.2s;
    margin: 0.25rem 0;
  }

  .nav-item:hover {
    background: #f9fafb;
    color: #667eea;
  }

  .nav-item.active {
    background: #f3f4f6;
    color: #667eea;
    border-left: 3px solid #667eea;
  }

  .nav-icon {
    font-size: 1.25rem;
  }

  .sidebar-footer {
    padding: 1.5rem;
    border-top: 1px solid #e5e7eb;
  }

  .user-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .user-avatar {
    width: 40px;
    height: 40px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 600;
  }

  .user-details {
    overflow: hidden;
  }

  .user-name {
    font-weight: 600;
    font-size: 0.875rem;
    color: #1f2937;
  }

  .user-email {
    font-size: 0.75rem;
    color: #6b7280;
  }

  /* Main Content Styles */
  .main-content {
    flex: 1;
    padding: 2rem;
    overflow-y: auto;
  }

  .top-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
  }

  .top-bar h1 {
    font-size: 1.5rem;
    font-weight: 600;
    color: #1f2937;
  }

  .top-bar-actions {
    display: flex;
    gap: 1rem;
  }

  .notification-btn {
    background: white;
    border: 1px solid #e5e7eb;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.25rem;
  }

  .sign-out-btn {
    padding: 0.5rem 1rem;
    background: #ef4444;
    color: white;
    border: none;
    border-radius: 0.375rem;
    cursor: pointer;
    font-size: 0.875rem;
    transition: background 0.2s;
  }

  .sign-out-btn:hover {
    background: #dc2626;
  }

  /* Loading State */
  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 400px;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid #e5e7eb;
    border-top: 3px solid #667eea;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  /* Error State */
  .error-state {
    text-align: center;
    padding: 3rem;
    background: white;
    border-radius: 0.5rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }

  .error-state button {
    margin-top: 1rem;
    padding: 0.5rem 1rem;
    background: #667eea;
    color: white;
    border: none;
    border-radius: 0.375rem;
    cursor: pointer;
  }

  /* Stats Grid */
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
  }

  .stat-card {
    background: white;
    padding: 1.5rem;
    border-radius: 0.5rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    display: flex;
    align-items: center;
    gap: 1rem;
    transition: transform 0.2s;
  }

  .stat-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
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

  .stat-content h3 {
    font-size: 0.875rem;
    color: #6b7280;
    margin-bottom: 0.25rem;
  }

  .stat-value {
    font-size: 1.5rem;
    font-weight: 600;
    color: #1f2937;
  }

  /* Action Bar */
  .action-bar {
    display: flex;
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .btn {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 0.375rem;
    font-weight: 500;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    transition: all 0.2s;
  }

  .btn.primary {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
  }

  .btn.primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 6px rgba(102,126,234,0.3);
  }

  .btn.secondary {
    background: white;
    color: #4b5563;
    border: 1px solid #e5e7eb;
  }

  .btn.secondary:hover {
    background: #f9fafb;
  }

  /* Activity Section */
  .activity-section {
    background: white;
    border-radius: 0.5rem;
    padding: 1.5rem;
    margin-bottom: 2rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }

  .activity-section h2 {
    font-size: 1.125rem;
    font-weight: 600;
    color: #1f2937;
    margin-bottom: 1rem;
  }

  .activity-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .activity-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem;
    border-radius: 0.375rem;
    transition: background 0.2s;
  }

  .activity-item:hover {
    background: #f9fafb;
  }

  .activity-info h4 {
    font-size: 0.875rem;
    font-weight: 500;
    color: #1f2937;
    margin-bottom: 0.25rem;
  }

  .activity-time {
    font-size: 0.75rem;
    color: #6b7280;
  }

  .status-badge {
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 500;
    text-transform: capitalize;
  }

  /* Quick Actions */
  .quick-actions {
    background: white;
    border-radius: 0.5rem;
    padding: 1.5rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }

  .quick-actions h2 {
    font-size: 1.125rem;
    font-weight: 600;
    color: #1f2937;
    margin-bottom: 1rem;
  }

  .actions-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 1rem;
  }

  .action-card {
    padding: 1rem;
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 0.375rem;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }

  .action-card:hover {
    background: #f3f4f6;
    border-color: #d1d5db;
    transform: translateY(-2px);
  }

  .action-icon {
    font-size: 1.5rem;
  }

  .action-card span:last-child {
    font-size: 0.75rem;
    color: #4b5563;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .sidebar {
      display: none;
    }
    
    .stats-grid {
      grid-template-columns: 1fr;
    }
    
    .action-bar {
      flex-direction: column;
    }
    
    .actions-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
</style>
