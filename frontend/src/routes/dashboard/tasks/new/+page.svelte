<script lang="ts">
  import { supabase } from '$lib/supabase';
  import { goto } from '$app/navigation';

  let formData = {
    title: '',
    description: '',
    priority: 'medium',
    due_date: '',
    assigned_to: ''
  };

  let loading = false;
  let error = '';

  async function handleCreateTask() {
    loading = true;
    error = '';

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        goto('/login');
        return;
      }

      const { error: insertError } = await supabase
        .from('tasks')
        .insert([
          {
            title: formData.title,
            description: formData.description || null,
            priority: formData.priority,
            due_date: formData.due_date || null,
            assigned_to: formData.assigned_to || null,
            status: 'pending',
            user_id: user.id
          }
        ])
        .select()
        .single();

      if (insertError) throw insertError;

      goto('/dashboard/tasks');
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to create task';
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>New Task - AccuTest</title>
</svelte:head>

<div class="container">
  <button class="back-btn" on:click={() => goto('/dashboard/tasks')}>
    ← Back to Tasks
  </button>

  <div class="form-card">
    <h1>Create New Task</h1>

    <form on:submit|preventDefault={handleCreateTask}>
      <div class="form-group">
        <label for="title">Task Title *</label>
        <input
          type="text"
          id="title"
          bind:value={formData.title}
          placeholder="e.g., Review test results"
          required
        />
      </div>

      <div class="form-group">
        <label for="description">Description</label>
        <textarea
          id="description"
          bind:value={formData.description}
          placeholder="Describe the task..."
          rows="4"
        ></textarea>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label for="priority">Priority</label>
          <select id="priority" bind:value={formData.priority}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>

        <div class="form-group">
          <label for="due_date">Due Date</label>
          <input
            type="date"
            id="due_date"
            bind:value={formData.due_date}
          />
        </div>
      </div>

      <div class="form-group">
        <label for="assigned_to">Assigned To</label>
        <input
          type="text"
          id="assigned_to"
          bind:value={formData.assigned_to}
          placeholder="Optional — defaults to you"
        />
      </div>

      {#if error}
        <div class="error">{error}</div>
      {/if}

      <div class="actions">
        <button type="button" class="secondary-btn" on:click={() => goto('/dashboard/tasks')}>
          Cancel
        </button>
        <button type="submit" class="primary-btn" disabled={loading}>
          {loading ? 'Creating...' : 'Create Task'}
        </button>
      </div>
    </form>
  </div>
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

  @media (max-width: 640px) {
    .form-row {
      grid-template-columns: 1fr;
    }
  }
</style>
