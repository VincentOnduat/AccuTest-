<script lang="ts">
  import { supabase } from '$lib/supabase';
  import { goto } from '$app/navigation';

  let formData = {
    name: '',
    description: '',
    type: 'ui',
    code: '',
    framework: 'playwright',
    assertions: [] as string[]
  };

  let loading = false;
  let error = '';

  async function handleCreateTest() {
    loading = true;
    error = '';

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        goto('/');
        return;
      }

      const { data, error: insertError } = await supabase
        .from('tests')
        .insert([
          {
            ...formData,
            user_id: user.id,
            status: 'draft',
            created_at: new Date().toISOString()
          }
        ])
        .select();

      if (insertError) throw insertError;

      if (data && data[0]) {
        goto(`/dashboard/tests/${data[0].id}`);
      }
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>New Test - Aether Automate</title>
</svelte:head>

<div class="container">
  <button class="back-btn" on:click={() => goto('/dashboard/tests')}>
    ← Back to Tests
  </button>

  <div class="form-card">
    <h1>Create New Test</h1>
    
    <form on:submit|preventDefault={handleCreateTest}>
      <div class="form-group">
        <label for="name">Test Name *</label>
        <input
          type="text"
          id="name"
          bind:value={formData.name}
          placeholder="e.g., Login Flow Test"
          required
        />
      </div>

      <div class="form-group">
        <label for="type">Test Type</label>
        <select id="type" bind:value={formData.type}>
          <option value="ui">UI Automation</option>
          <option value="api">API Test</option>
          <option value="unit">Unit Test</option>
          <option value="integration">Integration Test</option>
        </select>
      </div>

      <div class="form-group">
        <label for="framework">Framework</label>
        <select id="framework" bind:value={formData.framework}>
          <option value="playwright">Playwright</option>
          <option value="puppeteer">Puppeteer</option>
          <option value="selenium">Selenium</option>
          <option value="cypress">Cypress</option>
        </select>
      </div>

      <div class="form-group">
        <label for="description">Description</label>
        <textarea
          id="description"
          bind:value={formData.description}
          placeholder="Describe what this test does..."
          rows="3"
        ></textarea>
      </div>

      <div class="form-group">
        <label for="code">Test Code</label>
        <textarea
          id="code"
          bind:value={formData.code}
          placeholder="Write your test code here..."
          rows="10"
          class="code-editor"
        ></textarea>
      </div>

      {#if error}
        <div class="error">{error}</div>
      {/if}

      <div class="actions">
        <button type="button" class="secondary-btn" on:click={() => goto('/dashboard/tests')}>
          Cancel
        </button>
        <button type="submit" class="primary-btn" disabled={loading}>
          {loading ? 'Creating...' : 'Create Test'}
        </button>
      </div>
    </form>
  </div>
</div>

<style>
  .container {
    max-width: 800px;
    margin: 2rem auto;
    padding: 0 1rem;
  }

  .back-btn {
    background: none;
    border: none;
    color: #667eea;
    cursor: pointer;
    margin-bottom: 1rem;
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

  .code-editor {
    font-family: monospace;
    background: #1f2937;
    color: #e5e7eb;
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

  .primary-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .secondary-btn {
    background: #f3f4f6;
    color: #374151;
  }
</style>
