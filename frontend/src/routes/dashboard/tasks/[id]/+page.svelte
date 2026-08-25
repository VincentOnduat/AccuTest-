<script lang="ts">
  import { supabase } from '$lib/supabase';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';

  let task: any = null;
  let loading = true;
  let error = '';
  let saving = false;

  const taskId = $page.params.id;

  function getErrorMessage(err: unknown) {
    return err instanceof Error ? err.message : String(err);
  }

  onMount(async () => {
    await loadTask();
  });

  async function loadTask() {
    loading = true;
    error = '';
    try {
      const { data, error: fetchError } = await supabase.from('tasks').select('*').eq('id', taskId).single();
      if (fetchError) throw fetchError;
      task = data;
    } catch (err) {
      error = getErrorMessage(err);
    } finally {
      loading = false;
    }
  }

  async function updateField(field: string, value: any) {
    saving = true;
    const patch: Record<string, any> = { [field]: value };
    if (field === 'status') {
      patch.completed_at = value === 'completed' ? new Date().toISOString() : null;
    }

    const { error: updateError } = await supabase.from('tasks').update(patch).eq('id', taskId);
    if (!updateError) {
      task = { ...task, ...patch };
    } else {
      error = updateError.message;
    }
    saving = false;
  }

  async function deleteTask() {
    if (!confirm('Delete this task? This cannot be undone.')) return;
    const { error: deleteError } = await supabase.from('tasks').delete().eq('id', taskId);
    if (deleteError) {
      error = deleteError.message;
      return;
    }
    goto('/dashboard/tasks');
  }

  function formatDate(dateString: string | null) {
    if (!dateString) return 'No due date';
    return new Date(dateString).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  }
</script>

<svelte:head>
  <title>{task?.title || 'Task'} - AccuTest</title>
</svelte:head>

<div class="container">
  <button class="back-btn" on:click={() => goto('/dashboard/tasks')}>← Back to Tasks</button>

  {#if loading}
    <div class="center-message">Loading task...</div>
  {:else if error && !task}
    <div class="center-message error">{error}</div>
  {:else if task}
    <div class="card">
      <div class="task-header">
        <h1>{task.title}</h1>
        <button class="delete-btn" on:click={deleteTask}>Delete</button>
      </div>

      {#if task.description}
        <p class="description">{task.description}</p>
      {/if}

      {#if error}
        <div class="banner error">{error}</div>
      {/if}

      <div class="field-grid">
        <div class="field">
          <label for="status">Status</label>
          <select id="status" value={task.status} disabled={saving} on:change={(e) => updateField('status', e.currentTarget.value)}>
            <option value="pending">Pending</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div class="field">
          <label for="priority">Priority</label>
          <select id="priority" value={task.priority} disabled={saving} on:change={(e) => updateField('priority', e.currentTarget.value)}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>

        <div class="field">
          <label for="due_date">Due Date</label>
          <input
            id="due_date"
            type="date"
            value={task.due_date || ''}
            disabled={saving}
            on:change={(e) => updateField('due_date', e.currentTarget.value || null)}
          />
        </div>
      </div>

      <div class="meta-line">
        <span>Created {new Date(task.created_at).toLocaleDateString()}</span>
        {#if task.assigned_to}<span>· Assigned to {task.assigned_to}</span>{/if}
        {#if task.completed_at}<span>· Completed {new Date(task.completed_at).toLocaleDateString()}</span>{/if}
      </div>

      {#if task.related_session_id || task.related_test_id}
        <div class="linked-items">
          <div class="linked-label">Linked to</div>
          {#if task.related_session_id}
            <a href="/dashboard/sessions/{task.related_session_id}" class="linked-chip">🔄 Session</a>
          {/if}
          {#if task.related_test_id}
            <a href="/dashboard/tests/{task.related_test_id}" class="linked-chip">🧪 Test</a>
          {/if}
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .container {
    max-width: 700px;
    margin: 2rem auto;
    padding: 0 1rem;
  }

  .back-btn {
    background: none;
    border: none;
    color: #667eea;
    cursor: pointer;
    margin-bottom: 1rem;
    padding: 0;
    font-size: 0.875rem;
  }

  .center-message {
    text-align: center;
    padding: 3rem;
    color: #6b7280;
  }
  .center-message.error {
    color: #dc2626;
  }

  .card {
    background: white;
    border-radius: 0.5rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    padding: 1.5rem;
  }

  .task-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
  }

  h1 {
    font-size: 1.375rem;
    color: #1f2937;
    margin: 0;
  }

  .delete-btn {
    padding: 0.4rem 0.85rem;
    background: #fee2e2;
    color: #991b1b;
    border: none;
    border-radius: 0.375rem;
    cursor: pointer;
    font-size: 0.8125rem;
    white-space: nowrap;
  }
  .delete-btn:hover {
    background: #fecaca;
  }

  .description {
    color: #4b5563;
    margin: 0.75rem 0 0 0;
    line-height: 1.5;
  }

  .banner {
    margin-top: 1rem;
    padding: 0.625rem;
    border-radius: 0.375rem;
    font-size: 0.875rem;
  }
  .banner.error {
    background: #fee2e2;
    color: #991b1b;
  }

  .field-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
    margin-top: 1.5rem;
  }

  .field label {
    display: block;
    font-size: 0.8125rem;
    font-weight: 500;
    color: #374151;
    margin-bottom: 0.375rem;
  }

  .field select,
  .field input {
    width: 100%;
    padding: 0.5rem 0.625rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-family: inherit;
  }

  .meta-line {
    margin-top: 1.25rem;
    padding-top: 1rem;
    border-top: 1px solid #f3f4f6;
    color: #9ca3af;
    font-size: 0.8125rem;
    display: flex;
    gap: 0.375rem;
    flex-wrap: wrap;
  }

  .linked-items {
    margin-top: 1rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .linked-label {
    font-size: 0.75rem;
    color: #9ca3af;
    margin-right: 0.25rem;
  }

  .linked-chip {
    padding: 0.25rem 0.625rem;
    background: #f3f4f6;
    border-radius: 999px;
    font-size: 0.8125rem;
    color: #4b5563;
    text-decoration: none;
  }
  .linked-chip:hover {
    background: #e5e7eb;
  }

  @media (max-width: 480px) {
    .field-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
