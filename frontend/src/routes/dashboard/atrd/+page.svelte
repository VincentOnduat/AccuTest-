<script lang="ts">
  import { supabase } from '$lib/supabase';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  
  let atrds: any[] = [];
  let loading = true;
  let error = '';
  
  // Auth helper function
  async function authFetch(url: string, options?: RequestInit) {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('Not authenticated');
    }
    
    return fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        ...options?.headers
      }
    });
  }
  
  onMount(async () => {
    await loadATRDs();
  });
  
  async function loadATRDs() {
    loading = true;
    error = '';
    
    try {
      const response = await authFetch('/api/atrd/list');
      
      if (response.ok) {
        const data = await response.json();
        atrds = data || [];
        console.log('✅ Loaded ATRDs:', atrds.length);
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
      const response = await authFetch(`/api/atrd/${id}`, {
        method: 'DELETE'
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
  
  function viewATRD(atrd: any) {
    alert(`📄 ${atrd.name}\n\nDomain: ${atrd.domain || 'General'}\nCreated: ${new Date(atrd.created_at).toLocaleString()}\n\nContent: ${JSON.stringify(atrd.content, null, 2)}`);
  }
</script>

<div style="max-width: 1000px; margin: 0 auto; padding: 2rem;">
  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
    <h1 style="margin: 0; color: #1f2937;">📋 ATRD Documents</h1>
    <button 
      on:click={() => goto('/dashboard?tab=atrd')} 
      style="background: #667eea; color: white; border: none; padding: 0.5rem 1rem; border-radius: 0.375rem; cursor: pointer; font-size: 0.875rem;"
    >
      + New ATRD
    </button>
  </div>
  
  {#if loading}
    <div style="text-align: center; padding: 3rem; color: #6b7280;">
      <div style="display: inline-block; width: 40px; height: 40px; border: 3px solid #f3f4f6; border-top-color: #667eea; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 1rem;"></div>
      <p>Loading ATRDs...</p>
    </div>
  {:else if error}
    <div style="text-align: center; padding: 3rem; color: #dc2626; background: #fef2f2; border-radius: 0.5rem;">
      <p>❌ {error}</p>
      <button on:click={loadATRDs} style="margin-top: 1rem; padding: 0.5rem 1rem; background: #6b7280; color: white; border: none; border-radius: 0.375rem; cursor: pointer;">Retry</button>
    </div>
  {:else if atrds.length === 0}
    <div style="text-align: center; padding: 3rem; background: #f9fafb; border-radius: 0.5rem;">
      <div style="font-size: 4rem; margin-bottom: 1rem;">📋</div>
      <h3 style="margin: 0 0 0.5rem 0; color: #1f2937;">No ATRD Documents Yet</h3>
      <p style="color: #6b7280; margin-bottom: 1.5rem;">Create your first ATRD by importing a requirements document.</p>
      <button on:click={() => goto('/dashboard?tab=atrd')} style="background: #667eea; color: white; border: none; padding: 0.5rem 1rem; border-radius: 0.375rem; cursor: pointer;">
        Create Your First ATRD
      </button>
    </div>
  {:else}
    <div style="display: flex; flex-direction: column; gap: 1rem;">
      {#each atrds as atrd}
        <div style="display: flex; justify-content: space-between; align-items: center; background: white; border: 1px solid #e5e7eb; border-radius: 0.5rem; padding: 1rem; transition: box-shadow 0.2s;">
          <div style="flex: 1; display: flex; align-items: center; gap: 1rem; cursor: pointer;" on:click={() => viewATRD(atrd)}>
            <span style="font-size: 2rem;">📄</span>
            <div>
              <h3 style="margin: 0 0 0.25rem 0; color: #1f2937; font-size: 1rem;">{atrd.name}</h3>
              <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                <span style="background: #f3f4f6; padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-size: 0.7rem; color: #4b5563;">
                  🏷️ {atrd.domain || 'General'}
                </span>
                <span style="background: #f3f4f6; padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-size: 0.7rem; color: #4b5563;">
                  📅 {new Date(atrd.created_at).toLocaleDateString()}
                </span>
                <span style="background: #f3f4f6; padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-size: 0.7rem; color: #4b5563;">
                  🕐 {new Date(atrd.created_at).toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>
          <div style="display: flex; gap: 0.5rem;">
            <button 
              on:click|stopPropagation={() => viewATRD(atrd)}
              style="background: #10b981; color: white; border: none; padding: 0.375rem 0.75rem; border-radius: 0.25rem; cursor: pointer; font-size: 0.75rem;"
            >
              👁️ View
            </button>
            <button 
              on:click|stopPropagation={() => deleteATRD(atrd.id, atrd.name)}
              style="background: #ef4444; color: white; border: none; padding: 0.375rem 0.75rem; border-radius: 0.25rem; cursor: pointer; font-size: 0.75rem;"
            >
              🗑️ Delete
            </button>
          </div>
        </div>
      {/each}
    </div>
    
    <div style="margin-top: 2rem; padding: 1rem; text-align: center; background: #f9fafb; border-radius: 0.5rem; color: #6b7280;">
      Total: <strong>{atrds.length}</strong> ATRD document{atrds.length > 1 ? 's' : ''}
    </div>
  {/if}
</div>

<style>
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
