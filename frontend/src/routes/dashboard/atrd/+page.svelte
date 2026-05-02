<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  
  let atrds: any[] = [];
  let loading = true;
  let error = '';
  
  onMount(async () => {
    await loadATRDs();
  });
  
  async function loadATRDs() {
    loading = true;
    error = '';
    
    try {
      const response = await fetch('/api/atrd/list', { credentials: 'include' });
      if (response.ok) {
        atrds = await response.json();
        console.log('Loaded ATRDs:', atrds);
      } else {
        error = 'Failed to load ATRDs';
      }
    } catch (err) {
      console.error('Error loading ATRDs:', err);
      error = 'Network error';
    } finally {
      loading = false;
    }
  }
  
  async function deleteATRD(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    
    try {
      const response = await fetch(`/api/atrd/${id}`, { 
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (response.ok) {
        await loadATRDs();
      } else {
        alert('Failed to delete');
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert('Error deleting');
    }
  }
</script>

<svelte:head>
  <title>ATRD Documents - Aether Automate</title>
</svelte:head>

<div class="container">
  <div class="header">
    <h1>📋 ATRD Documents</h1>
    <button class="btn-primary" on:click={() => goto('/dashboard?tab=atrd')}>
      + New ATRD
    </button>
  </div>
  
  {#if loading}
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Loading...</p>
    </div>
  {:else if error}
    <div class="error-state">
      <p>❌ {error}</p>
      <button class="btn-secondary" on:click={loadATRDs}>Retry</button>
    </div>
  {:else if atrds.length === 0}
    <div class="empty-state">
      <div class="empty-icon">📄</div>
      <h3>No ATRD Documents Yet</h3>
      <p>Create your first ATRD by importing a requirements document.</p>
      <button class="btn-primary" on:click={() => goto('/dashboard?tab=atrd')}>
        Create Your First ATRD
      </button>
    </div>
  {:else}
    <div class="atrds-list">
      {#each atrds as atrd}
        <div class="atrd-item">
          <div class="atrd-info" on:click={() => goto(`/dashboard/atrd/${atrd.id}`)} role="button" tabindex="0" on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { goto(`/dashboard/atrd/${atrd.id}`); e.preventDefault(); } }}>
            <div class="atrd-icon">📄</div>
            <div class="atrd-details">
              <h3>{atrd.name}</h3>
              <div class="meta">
                <span class="badge">🏷️ Domain: {atrd.domain || 'General'}</span>
                <span class="badge">📅 {new Date(atrd.created_at).toLocaleDateString()}</span>
                <span class="badge">🕐 {new Date(atrd.created_at).toLocaleTimeString()}</span>
              </div>
            </div>
          </div>
          <div class="atrd-actions">
            <button class="btn-view" on:click={() => goto(`/dashboard/atrd/${atrd.id}`)}>
              View
            </button>
            <button class="btn-delete" on:click={() => deleteATRD(atrd.id, atrd.name)}>
              Delete
            </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .container {
    max-width: 1000px;
    margin: 0 auto;
    padding: 2rem;
  }
  
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
  }
  
  .header h1 {
    margin: 0;
    color: #1f2937;
    font-size: 1.875rem;
  }
  
  .btn-primary {
    background: #667eea;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    cursor: pointer;
    font-size: 0.875rem;
    transition: background 0.2s;
  }
  
  .btn-primary:hover {
    background: #5a67d8;
  }
  
  .btn-secondary {
    background: #6b7280;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    cursor: pointer;
  }
  
  .btn-view {
    background: #10b981;
    color: white;
    border: none;
    padding: 0.375rem 0.75rem;
    border-radius: 0.25rem;
    cursor: pointer;
    font-size: 0.75rem;
    transition: background 0.2s;
  }
  
  .btn-view:hover {
    background: #059669;
  }
  
  .btn-delete {
    background: #ef4444;
    color: white;
    border: none;
    padding: 0.375rem 0.75rem;
    border-radius: 0.25rem;
    cursor: pointer;
    font-size: 0.75rem;
    transition: background 0.2s;
  }
  
  .btn-delete:hover {
    background: #dc2626;
  }
  
  .atrds-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .atrd-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    padding: 1rem;
    transition: all 0.2s;
  }
  
  .atrd-item:hover {
    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
    border-color: #d1d5db;
  }
  
  .atrd-info {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 1rem;
    cursor: pointer;
  }
  
  .atrd-icon {
    font-size: 2rem;
  }
  
  .atrd-details {
    flex: 1;
  }
  
  .atrd-details h3 {
    margin: 0 0 0.5rem 0;
    color: #1f2937;
    font-size: 1rem;
  }
  
  .meta {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  
  .badge {
    background: #f3f4f6;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.7rem;
    color: #4b5563;
  }
  
  .atrd-actions {
    display: flex;
    gap: 0.5rem;
  }
  
  .loading-state, .error-state, .empty-state {
    text-align: center;
    padding: 3rem;
  }
  
  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid #f3f4f6;
    border-top-color: #667eea;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 1rem;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  .error-state {
    color: #dc2626;
    background: #fef2f2;
    border-radius: 0.5rem;
  }
  
  .empty-state {
    background: #f9fafb;
    border-radius: 0.5rem;
  }
  
  .empty-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
  }
  
  .empty-state h3 {
    margin: 0 0 0.5rem 0;
    color: #1f2937;
  }
  
  .empty-state p {
    color: #6b7280;
    margin-bottom: 1.5rem;
  }
  
  @media (max-width: 640px) {
    .container {
      padding: 1rem;
    }
    
    .atrd-item {
      flex-direction: column;
      gap: 1rem;
    }
    
    .atrd-actions {
      width: 100%;
      justify-content: flex-end;
    }
  }
</style>
