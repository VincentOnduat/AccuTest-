<script lang="ts">
  import { supabase } from '$lib/supabase.ts.backup';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  let user: any = null;
  let loading = true;
  
  let formData = {
    name: '',
    description: '',
    type: 'ui',
    browser: 'chrome',
    environment: 'staging'
  };

  let submitting = false;
  let error = '';

  onMount(async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        goto('/');
        return;
      }
      user = currentUser;
    } catch (err) {
      console.error('Auth error:', err);
    } finally {
      loading = false;
    }
  });

  async function handleSubmit() {
    if (!formData.name) {
      error = 'Session name is required';
      return;
    }

    submitting = true;
    error = '';

    try {
      const { data, error: insertError } = await supabase
        .from('sessions')
        .insert([
          {
            ...formData,
            user_id: user.id,
            status: 'pending',
            created_at: new Date().toISOString()
          }
        ])
        .select();

      if (insertError) throw insertError;

      if (data && data[0]) {
        goto(`/dashboard/sessions/${data[0].id}`);
      }
    } catch (err: any) {
      error = err.message || 'Failed to create session';
    } finally {
      submitting = false;
    }
  }
</script>

<svelte:head>
  <title>New Session - Aether Automate</title>
</svelte:head>

<div class="container">
  <button class="back-btn" on:click={() => goto('/dashboard/sessions')}>
    ← Back to Sessions
  </button>

  {#if loading}
    <div class="loading">Loading...</div>
  {:else}
    <div class="form-card">
      <h1>Create New Session</h1>
      
      <form on:submit|preventDefault={handleSubmit}>
        <div class="form-group">
          <label for="name">Session Name *</label>
          <input
            type="text"
            id="name"
            bind:value={formData.name}
            placeholder="e.g., Login Flow Test"
            required
            disabled={submitting}
          />
        </div>

        <div class="form-group">
          <label for="description">Description</label>
          <textarea
            id="description"
            bind:value={formData.description}
            placeholder="Describe the purpose of this session"
            rows="3"
            disabled={submitting}
          ></textarea>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="type">Test Type</label>
            <select id="type" bind:value={formData.type} disabled={submitting}>
              <option value="ui">UI Automation</option>
              <option value="api">API Testing</option>
              <option value="integration">Integration Testing</option>
              <option value="performance">Performance Testing</option>
            </select>
          </div>

          <div class="form-group">
            <label for="browser">Browser</label>
            <select id="browser" bind:value={formData.browser} disabled={submitting}>
              <option value="chrome">Chrome</option>
              <option value="firefox">Firefox</option>
              <option value="safari">Safari</option>
              <option value="edge">Edge</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label for="environment">Environment</label>
          <select id="environment" bind:value={formData.environment} disabled={submitting}>
            <option value="development">Development</option>
            <option value="staging">Staging</option>
            <option value="production">Production</option>
          </select>
        </div>

        {#if error}
          <div class="error">{error}</div>
        {/if}

        <div class="actions">
          <button type="button" class="secondary-btn" on:click={() => goto('/dashboard/sessions')} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" class="primary-btn" disabled={submitting}>
            {submitting ? 'Creating...' : 'Create Session'}
          </button>
        </div>
      </form>
    </div>
  {/if}
</div>

<style>
  .container {
    max-width: 600px;
    margin: 2rem auto;
    padding: 0 1rem;
  }

  .back-btn {
    background: none;
    border: none;
    color: #667eea;
    cursor: pointer;
    margin-bottom: 1rem;
    font-size: 0.875rem;
  }

  .back-btn:hover {
    text-decoration: underline;
  }

  .loading {
    text-align: center;
    padding: 3rem;
    color: #6b7280;
  }

  .form-card {
    background: white;
    padding: 2rem;
    border-radius: 0.5rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }

  h1 {
    font-size: 1.5rem;
    color: #1f2937;
    margin-bottom: 2rem;
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  label {
    display: block;
    font-weight: 500;
    color: #374151;
    margin-bottom: 0.5rem;
  }

  input, select, textarea {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 1rem;
    font-family: inherit;
  }

  input:focus, select:focus, textarea:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102,126,234,0.1);
  }

  .error {
    padding: 0.75rem;
    background: #fee2e2;
    color: #991b1b;
    border-radius: 0.375rem;
    margin-bottom: 1rem;
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    margin-top: 2rem;
  }

  .primary-btn, .secondary-btn {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 0.375rem;
    font-weight: 500;
    cursor: pointer;
  }

  .primary-btn {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
  }

  .primary-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 6px rgba(102,126,234,0.3);
  }

  .primary-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .secondary-btn {
    background: #f3f4f6;
    color: #374151;
  }

  .secondary-btn:hover:not(:disabled) {
    background: #e5e7eb;
  }

  @media (max-width: 640px) {
    .form-row {
      grid-template-columns: 1fr;
    }
  }
</style>