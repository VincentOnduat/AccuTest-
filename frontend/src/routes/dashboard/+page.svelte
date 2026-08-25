<script lang="ts">
  import { supabase } from '$lib/supabase';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import IntegratedTestGenerator from '$lib/components/IntegratedTestGenerator.svelte';
  import DynamicATRDParser from '$lib/components/DynamicATRDParser.svelte';
  import BusinessReportView from '$lib/components/BusinessReportView.svelte';
  import { isOnline } from '$lib/stores/network';
  import { fade } from 'svelte/transition';

  type DashboardTab = 'quick' | 'atrd' | 'reports';
  function tabFromUrl(): DashboardTab {
    const t = $page.url.searchParams.get('tab');
    return t === 'atrd' || t === 'reports' ? t : 'quick';
  }

  let user: any = null;
  let loading = true;
  let error = '';
  // Other pages deep-link here with e.g. /dashboard?tab=atrd — honor that
  // instead of always landing on Quick Generate regardless of the link.
  let activeTab: DashboardTab = tabFromUrl();
  let parsedRequirements: any = null;
  let generatedReport: any = null;
  let atrdSaveMessage = '';
  let atrdSaving = false;
  
  type TestDomainId = 'functional' | 'performance' | 'security' | 'accessibility' | 'visual' | 'dataQuality';

  // Track selected test domain
  let selectedTestDomain: TestDomainId = 'functional';
  
  // Dashboard stats
  let stats = {
    totalSessions: 0,
    activeSessions: 0,
    totalTests: 0,
    successRate: 0
  };
  let recentSessions: any[] = [];
  let upcomingTasks: any[] = [];
  let recentPackages: any[] = [];
  let recentATRDs: any[] = [];

  // Domain configuration. `short` is what fits on a compact chip; `name` is
  // the fuller label used in descriptions/tooltips.
  const testDomains: { id: TestDomainId; icon: string; short: string; name: string; description: string }[] = [
    { id: 'functional', icon: '🤖', short: 'Functional', name: 'Functional Testing', description: 'Web, mobile, desktop, API, ERP automation' },
    { id: 'performance', icon: '⚡', short: 'Performance', name: 'Performance & Load', description: 'Load, stress, APM, SaaS labs' },
    { id: 'security', icon: '🛡️', short: 'Security', name: 'Security / DevSecOps', description: 'DAST, SAST, secrets, SBOM' },
    { id: 'accessibility', icon: '♿', short: 'Accessibility', name: 'Accessibility Testing', description: 'WCAG, screen readers, compliance' },
    { id: 'visual', icon: '👁️', short: 'Visual', name: 'Visual Testing', description: 'Visual diff, UI comparison, screenshots' },
    { id: 'dataQuality', icon: '📊', short: 'Data/ETL', name: 'Data/ETL Validation', description: 'Data pipelines, data quality, migration' }
  ];

  // Auth fetch helper with auto token refresh
  async function authFetch(url: string, options: RequestInit = {}) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      console.log(`🔑 authFetch: ${url} - Token present: ${!!token}`);
      
      const headers: any = {
        'Content-Type': 'application/json',
        ...options.headers
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(url, {
        ...options,
        headers
      });
      
      // If 401, try to refresh the session
      if (response.status === 401) {
        console.log(`🔄 authFetch: 401 on ${url}, refreshing session...`);
        const { data: { session: refreshed }, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError) {
          console.error('❌ authFetch: Refresh failed:', refreshError);
          return response;
        }
        
        if (refreshed?.access_token) {
          console.log('✅ authFetch: Session refreshed, retrying...');
          headers['Authorization'] = `Bearer ${refreshed.access_token}`;
          return fetch(url, {
            ...options,
            headers
          });
        }
      }
      
      return response;
    } catch (err) {
      console.error('❌ authFetch error:', err);
      throw err;
    }
  }

  onMount(async () => {
    // Set when we're bouncing an unauthenticated visitor to '/' — `goto` is
    // async, so the component keeps rendering for a frame after it's called.
    // Leaving `loading` true until navigation actually completes keeps the
    // template out of the authenticated branch, which otherwise dereferences
    // `user.id` while `user` is still null and crashes.
    let redirecting = false;

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        const { data: { session: refreshed } } = await supabase.auth.refreshSession();
        if (!refreshed) {
          redirecting = true;
          await goto('/');
          return;
        }
      }

      const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !currentUser) {
        redirecting = true;
        await goto('/');
        return;
      }
      user = currentUser;
      await Promise.all([
        fetchDashboardData(),
        fetchRecentPackages(),
        fetchRecentATRDs()
      ]);
    } catch (err: any) {
      error = err.message;
    } finally {
      if (!redirecting) loading = false;
    }
  });

  async function fetchDashboardData() {
    try {
      const { count: sessionsCount } = await supabase
        .from('sessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      const { count: activeCount } = await supabase
        .from('sessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'running');

      const { count: testsCount } = await supabase
        .from('tests')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      const { data: sessions } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, title, description, priority, due_date, status')
        .eq('user_id', user.id)
        .in('status', ['pending', 'in-progress'])
        .order('due_date', { ascending: true })
        .limit(5);

      stats = {
        totalSessions: sessionsCount || 0,
        activeSessions: activeCount || 0,
        totalTests: testsCount || 0,
        successRate: 94
      };

      recentSessions = sessions || [];
      
      upcomingTasks = tasks?.map(task => ({
        id: task.id,
        title: task.title,
        due: formatDueDate(task.due_date),
        priority: task.priority
      })) || [];

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    }
  }

  async function fetchRecentPackages() {
    try {
      const response = await authFetch('/api/packages?limit=3');
      if (response.ok) {
        const { data } = await response.json();
        recentPackages = data || [];
        console.log('📦 Recent packages loaded:', recentPackages.length);
      } else {
        console.error('❌ Failed to fetch packages:', response.status);
      }
    } catch (err) {
      console.error('Error fetching packages:', err);
    }
  }

  async function fetchRecentATRDs() {
    try {
      console.log('📋 Fetching recent ATRDs...');
      const response = await authFetch('/api/atrd/list');
      console.log('📋 ATRD response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📋 ATRD data received:', data);
        recentATRDs = data || [];
        console.log(`✅ Loaded ${recentATRDs.length} ATRDs`);
        
        // Log each ATRD for debugging
        if (recentATRDs.length > 0) {
          recentATRDs.forEach((atrd, index) => {
            console.log(`   ${index + 1}. ${atrd.name || 'Unnamed'} (${atrd.domain || 'No domain'})`);
          });
        }
      } else {
        console.error('❌ Failed to fetch ATRDs:', response.status);
        const errorText = await response.text();
        console.error('Error details:', errorText);
        recentATRDs = [];
      }
    } catch (err) {
      console.error('❌ Error fetching ATRDs:', err);
      recentATRDs = [];
    }
  }

  function formatDueDate(dateString: string | null) {
    if (!dateString) return 'No due date';
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dueDate = new Date(date);
    dueDate.setHours(0, 0, 0, 0);
    
    if (dueDate.getTime() === today.getTime()) return 'Today';
    if (dueDate.getTime() === tomorrow.getTime()) return 'Tomorrow';
    const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays < 0 ? `${Math.abs(diffDays)} days overdue` : `In ${diffDays} days`;
  }

  async function handleParsedRequirements(event: CustomEvent<any>) {
    // Svelte's on:eventName directive calls the handler with the raw
    // CustomEvent, not its payload — the actual data dispatched by
    // DynamicATRDParser is in event.detail. Using `event` directly here used
    // to save the Event object itself (JSON.stringify'd down to
    // {"isTrusted": false}) as the ATRD content.
    const data = event.detail;
    parsedRequirements = data;
    console.log('Parsed requirements:', data);
    
    atrdSaving = true;
    atrdSaveMessage = 'Saving ATRD to database...';
    
    try {
      const saveResponse = await authFetch('/api/atrd/save', {
        method: 'POST',
        body: JSON.stringify({
          name: `ATRD ${new Date().toLocaleString()}`,
          content: data,
          domain: data.metadata?.domain || 'general'
        })
      });
      
      const saveResult = await saveResponse.json();
      
      if (saveResult.success) {
        const detectedUrl = data.metadata?.detectedUrl;
        atrdSaveMessage = detectedUrl
          ? `✅ ATRD saved! Found "${detectedUrl}" in the document — it'll be pre-filled as the site to test.`
          : `✅ ATRD saved successfully! ID: ${saveResult.id}`;
        await fetchRecentATRDs();
        
        setTimeout(() => {
          atrdSaveMessage = '';
        }, 3000);
      } else {
        atrdSaveMessage = `❌ Failed to save: ${saveResult.error}`;
      }
    } catch (err: any) {
      console.error('Save error:', err);
      atrdSaveMessage = `❌ Error saving: ${err.message}`;
    } finally {
      atrdSaving = false;
    }
    
    activeTab = 'quick';
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    goto('/');
  }
  
  // Function to switch to quick generate with selected domain
  function selectTestDomain(domainId: TestDomainId) {
    selectedTestDomain = domainId;
    activeTab = 'quick';
  }

</script>

<svelte:head>
  <title>Dashboard - AccuTest</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300;14..32,400;14..32,500;14..32,600;14..32,700;14..32,800&display=swap" rel="stylesheet" />
</svelte:head>

<div class="dashboard">
  <header class="header">
    <div>
      <h1>Welcome back, {user?.email?.split('@')[0] || 'User'}!</h1>
      <p class="date">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
    </div>
    <button class="sign-out" on:click={handleSignOut}>Sign Out</button>
  </header>

  {#if loading}
    <div class="loading-state">Loading...</div>
  {:else if error}
    <div class="error-state">{error}</div>
  {:else}
    <!-- PRIMARY ACTION: one focused panel for the thing you came here to do -->
    <div class="action-panel">
      <div class="tabs">
        <button class="tab-btn" class:active={activeTab === 'quick'} on:click={() => activeTab = 'quick'}>⚡ Quick Generate</button>
        <button class="tab-btn" class:active={activeTab === 'atrd'} on:click={() => activeTab = 'atrd'}>📄 Import ATRD</button>
        <button class="tab-btn" class:active={activeTab === 'reports'} on:click={() => activeTab = 'reports'}>📊 Reports</button>
      </div>

      {#if activeTab === 'quick'}
        <div class="tab-panel" in:fade={{ duration: 150 }}>
          <!-- Domain picker lives here, where it's actually used — not as a
               separate section competing for attention above the tabs. -->
          <div class="domain-picker">
            {#each testDomains as domain}
              <button
                type="button"
                class="domain-chip"
                class:selected={selectedTestDomain === domain.id}
                on:click={() => selectTestDomain(domain.id)}
                title={domain.description}
              >
                <span>{domain.icon}</span>
                {domain.short}
              </button>
            {/each}
          </div>

          <IntegratedTestGenerator userId={user.id} initialDomain={selectedTestDomain} />
        </div>
      {/if}

      {#if activeTab === 'atrd'}
        <div class="tab-panel" in:fade={{ duration: 150 }}>
          <DynamicATRDParser on:requirementParsed={handleParsedRequirements} />
          {#if atrdSaveMessage}
            <div class="save-message {atrdSaving ? 'saving' : 'saved'}">{atrdSaveMessage}</div>
          {/if}
        </div>
      {/if}

      {#if activeTab === 'reports'}
        <div class="tab-panel" in:fade={{ duration: 150 }}>
          <BusinessReportView />
        </div>
      {/if}
    </div>

    <!-- AT A GLANCE: compact, secondary to the action panel above -->
    <div class="stats-grid">
      <button class="stat-card" type="button" on:click={() => goto('/dashboard/sessions')}>
        <div class="stat-icon blue">🔄</div>
        <div class="stat-content">
          <span class="stat-label">Total Sessions</span>
          <span class="stat-value">{stats.totalSessions}</span>
        </div>
      </button>
      <button class="stat-card" type="button" on:click={() => goto('/dashboard/sessions')}>
        <div class="stat-icon green">⚡</div>
        <div class="stat-content">
          <span class="stat-label">Active Sessions</span>
          <span class="stat-value">{stats.activeSessions}</span>
        </div>
      </button>
      <button class="stat-card" type="button" on:click={() => goto('/dashboard/tests')}>
        <div class="stat-icon purple">🧪</div>
        <div class="stat-content">
          <span class="stat-label">Total Tests</span>
          <span class="stat-value">{stats.totalTests}</span>
        </div>
      </button>
      <button class="stat-card" type="button" on:click={() => goto('/dashboard/atrd')}>
        <div class="stat-icon orange">📋</div>
        <div class="stat-content">
          <span class="stat-label">ATRDs</span>
          <span class="stat-value">{recentATRDs.length}</span>
        </div>
      </button>
    </div>

    <!-- RECENT ACTIVITY: everything you've already done, grouped and labeled
         so it reads as history, not more decisions to make. -->
    <div class="activity-heading">Recent Activity</div>

    {#if recentPackages.length > 0}
      <div class="recent-packages">
        <div class="section-header">
          <h2>📦 Test Packages</h2>
          <a href="/dashboard/packages" class="view-all">View All →</a>
        </div>
        <div class="packages-grid">
          {#each recentPackages as pkg}
            <button type="button" class="package-card" on:click={() => goto(`/dashboard/packages/${pkg.id}`)}>
              <div class="package-icon">📦</div>
              <div class="package-info">
                <h3>{pkg.name}</h3>
                <p class="package-meta">{pkg.description || 'No description'}</p>
                <div class="package-stats">
                  <span>✅ {pkg.automated_test_count || 0}</span>
                  <span>📝 {pkg.manual_test_count || 0}</span>
                  <span>📅 {new Date(pkg.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </button>
          {/each}
        </div>
      </div>
    {/if}

    <div class="content-grid">
      <div class="card">
        <div class="card-header">
          <h2>Recent Sessions</h2>
          <a href="/dashboard/sessions">View All →</a>
        </div>
        <div class="card-content">
          {#if recentSessions.length === 0}
            <p class="empty-message">No sessions yet. Create your first session!</p>
          {:else}
            {#each recentSessions as session}
              <button type="button" class="list-item" on:click={() => goto(`/dashboard/sessions/${session.id}`)}>
                <div>
                  <h3>{session.name || 'Untitled Session'}</h3>
                  <p class="item-meta">{new Date(session.created_at).toLocaleDateString()}</p>
                </div>
                <span class="status-badge {session.status || 'pending'}">{session.status || 'pending'}</span>
              </button>
            {/each}
          {/if}
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h2>Upcoming Tasks</h2>
          <a href="/dashboard/tasks">View All →</a>
        </div>
        <div class="card-content">
          {#if upcomingTasks.length === 0}
            <p class="empty-message">No pending tasks. Great job! 🎉</p>
          {:else}
            {#each upcomingTasks as task}
              <button type="button" class="task-item" on:click={() => goto(`/dashboard/tasks/${task.id}`)}>
                <div class="task-info">
                  <h3>{task.title}</h3>
                  <p class="task-meta"><span class="due-date">📅 {task.due}</span></p>
                </div>
                <span class="priority-badge {task.priority}">{task.priority}</span>
              </button>
            {/each}
          {/if}
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .dashboard { max-width: 1200px; margin: 0 auto; padding: 2rem; }
  .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
  .header h1 { font-size: 2rem; color: #1f2937; margin-bottom: 0.25rem; }
  .date { color: #6b7280; }
  .sign-out { padding: 0.5rem 1rem; background: #ef4444; color: white; border: none; border-radius: 0.375rem; cursor: pointer; }
  .tabs { display: flex; gap: 0.5rem; margin-bottom: 2rem; border-bottom: 1px solid #e5e7eb; }
  .tab-btn { padding: 0.75rem 1.5rem; background: none; border: none; border-bottom: 2px solid transparent; cursor: pointer; font-size: 1rem; color: #6b7280; }
  .tab-btn.active { border-bottom-color: #667eea; color: #667eea; font-weight: 500; }

  /* Primary action panel — one focused card that holds the tabs + their content,
     visually separated from the "at a glance" and "recent activity" sections below. */
  .action-panel {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 0.75rem;
    padding: 1.5rem;
    margin-bottom: 2rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  }
  .action-panel .tabs { margin-bottom: 1.5rem; }
  .tab-panel { min-height: 4rem; }

  .domain-picker {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 1.25rem;
  }

  .domain-chip {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.4rem 0.85rem;
    background: #f9fafb;
    border: 1.5px solid #e5e7eb;
    border-radius: 999px;
    cursor: pointer;
    font-size: 0.8125rem;
    color: #374151;
    transition:
      border-color 0.15s,
      background 0.15s,
      color 0.15s;
  }

  .domain-chip:hover {
    border-color: #a5b4fc;
  }

  .domain-chip.selected {
    background: #667eea;
    border-color: #667eea;
    color: white;
    font-weight: 500;
  }

  .save-message { margin-top: 1rem; padding: 0.75rem; border-radius: 0.375rem; text-align: center; }
  .save-message.saving { background: #dbeafe; color: #1e40af; }
  .save-message.saved { background: #d1fae5; color: #065f46; }

  .activity-heading {
    font-size: 0.8125rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #9ca3af;
    margin-bottom: 1rem;
  }

  .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 2rem; }
  .stat-card { background: white; padding: 1rem 1.25rem; border-radius: 0.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); display: flex; align-items: center; gap: 0.75rem; cursor: pointer; transition: transform 0.2s; border: none; width: 100%; }
  .stat-card:hover { transform: translateY(-2px); box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
  .stat-icon { width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; }
  .stat-icon.blue { background: #dbeafe; color: #1e40af; }
  .stat-icon.green { background: #d1fae5; color: #065f46; }
  .stat-icon.purple { background: #ede9fe; color: #5b21b6; }
  .stat-icon.orange { background: #fed7aa; color: #92400e; }
  .stat-content { flex: 1; }
  .stat-label { display: block; font-size: 0.875rem; color: #6b7280; margin-bottom: 0.25rem; }
  .stat-value { display: block; font-size: 1.5rem; font-weight: 600; color: #1f2937; }
  .recent-packages { margin-bottom: 2rem; }
  .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
  .section-header h2 { font-size: 1.125rem; color: #1f2937; }
  .view-all { color: #667eea; text-decoration: none; font-size: 0.875rem; }
  .packages-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
  .package-card { background: white; padding: 1rem; border-radius: 0.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); display: flex; align-items: center; gap: 0.75rem; cursor: pointer; transition: transform 0.2s; border: none; width: 100%; text-align: left; }
  .package-card:hover { transform: translateY(-2px); box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
  .package-icon { font-size: 2rem; }
  .package-info { flex: 1; }
  .package-info h3 { font-size: 0.875rem; font-weight: 600; margin: 0 0 0.25rem 0; }
  .package-meta { font-size: 0.75rem; color: #6b7280; margin-bottom: 0.25rem; }
  .package-stats { display: flex; gap: 0.5rem; font-size: 0.7rem; color: #9ca3af; }
  .content-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
  .card { background: white; border-radius: 0.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
  .card-header { padding: 1rem 1.5rem; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; }
  .card-header h2 { font-size: 1rem; font-weight: 600; color: #1f2937; }
  .card-header a { color: #667eea; text-decoration: none; }
  .card-content { padding: 1rem; }
  .list-item, .task-item { width: 100%; padding: 0.75rem; border-radius: 0.375rem; cursor: pointer; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f3f4f6; background: none; border: none; text-align: left; }
  .list-item:hover, .task-item:hover { background: #f9fafb; }
  .list-item h3, .task-item h3 { font-size: 0.875rem; font-weight: 500; margin-bottom: 0.25rem; }
  .item-meta, .task-meta { font-size: 0.75rem; color: #6b7280; }
  .status-badge { padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-size: 0.7rem; font-weight: 500; text-transform: capitalize; }
  .status-badge.completed { background: #d1fae5; color: #065f46; }
  .status-badge.running { background: #dbeafe; color: #1e40af; }
  .status-badge.pending { background: #f3f4f6; color: #4b5563; }
  .priority-badge { padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-size: 0.7rem; font-weight: 500; text-transform: capitalize; }
  .priority-badge.high { background: #fee2e2; color: #991b1b; }
  .priority-badge.medium { background: #fed7aa; color: #92400e; }
  .priority-badge.low { background: #d1fae5; color: #065f46; }
  .empty-message { text-align: center; color: #6b7280; padding: 2rem; }
  .loading-state, .error-state { text-align: center; padding: 3rem; }
  
  @media (max-width: 768px) {
    .dashboard { padding: 1rem; }
    .stats-grid { grid-template-columns: repeat(2, 1fr); }
    .packages-grid { grid-template-columns: 1fr; }
    .content-grid { grid-template-columns: 1fr; }
    .tabs { flex-wrap: wrap; }
    .action-panel { padding: 1rem; }
  }
</style>
