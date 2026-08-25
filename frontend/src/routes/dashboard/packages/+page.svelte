<script lang="ts">
  import { supabase } from '$lib/supabase';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  let packages: any[] = [];
  // Latest test_executions row per package_id, so each card can show real
  // pass/fail signal instead of just "N test cases" with no indication of
  // whether they've ever actually been run.
  let lastRunByPackage: Record<string, { status: string; executed_at: string }> = {};
  let loading = true;

  let query = '';
  let statusFilter: 'all' | 'passed' | 'failed' | 'not-run' = 'all';
  let sortBy: 'newest' | 'oldest' | 'name' = 'newest';

  $: filteredPackages = packages
    .filter((p) => !query.trim() || p.name?.toLowerCase().includes(query.trim().toLowerCase()))
    .filter((p) => {
      if (statusFilter === 'all') return true;
      const cls = runStatusInfo(p.id).className;
      if (statusFilter === 'failed') return cls === 'failed' || cls === 'errored';
      return cls === statusFilter;
    })
    .sort((a, b) => {
      if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
      const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sortBy === 'oldest' ? diff : -diff;
    });

  onMount(async () => {
    await loadPackages();
  });

  async function loadPackages() {
    loading = true;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch('/api/packages', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const result = await response.json();
        packages = result.data || [];
      }

      if (packages.length > 0) {
        await loadLastRuns(packages.map((p) => p.id));
      }
    } catch (err) {
      console.error('Error loading packages:', err);
    } finally {
      loading = false;
    }
  }

  async function loadLastRuns(packageIds: string[]) {
    const { data } = await supabase
      .from('test_executions')
      .select('package_id, status, executed_at')
      .in('package_id', packageIds)
      .order('executed_at', { ascending: false });

    const byPackage: typeof lastRunByPackage = {};
    for (const row of data || []) {
      // Rows arrive newest-first, so the first one seen per package is its latest run.
      if (!byPackage[row.package_id]) {
        byPackage[row.package_id] = row;
      }
    }
    lastRunByPackage = byPackage;
  }

  function runStatusInfo(pkgId: string) {
    const run = lastRunByPackage[pkgId];
    if (!run) return { icon: '▶️', label: 'Not run yet', className: 'not-run' };
    if (run.status === 'passed') return { icon: '✅', label: 'Passing', className: 'passed' };
    if (run.status === 'failed') return { icon: '❌', label: 'Failing', className: 'failed' };
    return { icon: '⚠️', label: 'Run error', className: 'errored' };
  }
</script>

<svelte:head>
  <title>Test Packages - AccuTest</title>
</svelte:head>

<div class="page">
  <div class="header">
    <div>
      <h1>📦 Test Packages</h1>
      <p class="subtitle">Generated test code, and whether it's actually passing.</p>
    </div>
    <button class="primary-btn" on:click={() => goto('/dashboard?tab=quick')}>+ Generate New</button>
  </div>

  {#if loading}
    <div class="empty-state">Loading packages…</div>
  {:else if packages.length === 0}
    <div class="empty-state">
      <p>No test packages yet.</p>
      <button class="primary-btn" on:click={() => goto('/dashboard?tab=quick')}>Create your first test package</button>
    </div>
  {:else}
    <div class="toolbar">
      <input class="search-input" type="search" placeholder="Search packages…" bind:value={query} />

      <div class="filter-chips">
        <button class="chip" class:active={statusFilter === 'all'} on:click={() => (statusFilter = 'all')}>All</button>
        <button class="chip" class:active={statusFilter === 'passed'} on:click={() => (statusFilter = 'passed')}>✅ Passing</button>
        <button class="chip" class:active={statusFilter === 'failed'} on:click={() => (statusFilter = 'failed')}>❌ Failing</button>
        <button class="chip" class:active={statusFilter === 'not-run'} on:click={() => (statusFilter = 'not-run')}>▶️ Not Run</button>
      </div>

      <select class="sort-select" bind:value={sortBy}>
        <option value="newest">Newest first</option>
        <option value="oldest">Oldest first</option>
        <option value="name">Name (A–Z)</option>
      </select>
    </div>

    {#if filteredPackages.length === 0}
      <div class="empty-state">No packages match this filter.</div>
    {:else}
      <div class="packages-grid">
        {#each filteredPackages as pkg}
          {@const run = runStatusInfo(pkg.id)}
        <button class="package-card" on:click={() => goto(`/dashboard/packages/${pkg.id}`)}>
          <div class="card-top">
            <span class="pkg-name">{pkg.name}</span>
            <span class="run-badge {run.className}">{run.icon} {run.label}</span>
          </div>

          <div class="card-meta">
            <span>{pkg.test_cases?.framework || 'playwright'}</span>
            <span>·</span>
            <span>{pkg.test_cases?.testCases?.length || 0} test cases</span>
            <span>·</span>
            <span>{new Date(pkg.created_at).toLocaleDateString()}</span>
          </div>

          {#if pkg.test_cases?.summary?.critical || pkg.test_cases?.summary?.high}
            <div class="priority-badges">
              {#if pkg.test_cases.summary.critical}
                <span class="priority critical">Critical: {pkg.test_cases.summary.critical}</span>
              {/if}
              {#if pkg.test_cases.summary.high}
                <span class="priority high">High: {pkg.test_cases.summary.high}</span>
              {/if}
            </div>
          {/if}
        </button>
        {/each}
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

  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 2rem;
    gap: 1rem;
    flex-wrap: wrap;
  }

  h1 {
    margin: 0 0 0.25rem 0;
    font-size: 1.5rem;
    color: #1f2937;
  }

  .subtitle {
    margin: 0;
    color: #6b7280;
    font-size: 0.875rem;
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

  .primary-btn:hover {
    background: #5a67d8;
  }

  .empty-state {
    text-align: center;
    padding: 3rem;
    background: #f9fafb;
    border-radius: 0.5rem;
    color: #6b7280;
  }

  .empty-state .primary-btn {
    margin-top: 1rem;
  }

  .toolbar {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
    margin-bottom: 1.5rem;
  }

  .search-input {
    padding: 0.5rem 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    min-width: 200px;
    flex: 1 1 200px;
  }

  .filter-chips {
    display: flex;
    gap: 0.375rem;
    flex-wrap: wrap;
  }

  .chip {
    padding: 0.375rem 0.75rem;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 999px;
    font-size: 0.8125rem;
    color: #4b5563;
    cursor: pointer;
    white-space: nowrap;
  }
  .chip:hover {
    border-color: #a5b4fc;
  }
  .chip.active {
    background: #667eea;
    border-color: #667eea;
    color: white;
    font-weight: 500;
  }

  .sort-select {
    padding: 0.5rem 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    color: #374151;
    background: white;
  }

  .packages-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 1rem;
  }

  .package-card {
    text-align: left;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    padding: 1rem;
    cursor: pointer;
    transition:
      transform 0.15s,
      box-shadow 0.15s;
    width: 100%;
  }

  .package-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }

  .card-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .pkg-name {
    font-weight: 600;
    color: #1f2937;
  }

  .run-badge {
    flex-shrink: 0;
    font-size: 0.7rem;
    font-weight: 500;
    padding: 0.2rem 0.5rem;
    border-radius: 999px;
    white-space: nowrap;
  }

  .run-badge.not-run { background: #f3f4f6; color: #6b7280; }
  .run-badge.passed { background: #d1fae5; color: #065f46; }
  .run-badge.failed { background: #fee2e2; color: #991b1b; }
  .run-badge.errored { background: #fef3c7; color: #92400e; }

  .card-meta {
    display: flex;
    gap: 0.375rem;
    flex-wrap: wrap;
    font-size: 0.8125rem;
    color: #6b7280;
    margin-bottom: 0.5rem;
  }

  .priority-badges {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .priority {
    font-size: 0.7rem;
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
  }

  .priority.critical { background: #fee2e2; color: #dc2626; }
  .priority.high { background: #fed7aa; color: #f97316; }
</style>
