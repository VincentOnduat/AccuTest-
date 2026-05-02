<script lang="ts">
  import { supabase } from '$lib/supabase';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  let tasks: any[] = [];
  let loading = true;
  let error = '';
  let filter = 'all';

  // Mock tasks data - replace with actual Supabase queries when you create a tasks table
  onMount(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        goto('/');
        return;
      }

      // TODO: Replace with actual tasks table query
      // For now, using mock data
      await new Promise(resolve => setTimeout(resolve, 500));
      
      tasks = [
        { 
          id: 1, 
          title: 'Review test results', 
          description: 'Review the results from the latest test run and identify any issues',
          due: '2024-03-10', 
          priority: 'high',
          status: 'pending',
          assigned_to: user.email,
          created_at: '2024-03-05'
        },
        { 
          id: 2, 
          title: 'Schedule regression tests', 
          description: 'Schedule the weekly regression test suite for the staging environment',
          due: '2024-03-11', 
          priority: 'medium',
          status: 'in-progress',
          assigned_to: user.email,
          created_at: '2024-03-05'
        },
        { 
          id: 3, 
          title: 'Update test suites', 
          description: 'Update the test suites with new test cases for the recent features',
          due: '2024-03-13', 
          priority: 'low',
          status: 'pending',
          assigned_to: user.email,
          created_at: '2024-03-04'
        },
        { 
          id: 4, 
          title: 'Fix flaky tests', 
          description: 'Investigate and fix the flaky tests in the payment flow',
          due: '2024-03-09', 
          priority: 'high',
          status: 'pending',
          assigned_to: user.email,
          created_at: '2024-03-04'
        },
        { 
          id: 5, 
          title: 'Document test procedures', 
          description: 'Create documentation for the test procedures and best practices',
          due: '2024-03-15', 
          priority: 'medium',
          status: 'completed',
          assigned_to: user.email,
          created_at: '2024-03-03'
        }
      ];
    } catch (err) {
      error = err instanceof Error ? err.message : 'An unknown error occurred';
    } finally {
      loading = false;
    }
  });

  $: filteredTasks = tasks.filter(task => {
    if (filter === 'all') return true;
    return task.status === filter;
  });

  function getPriorityColor(priority: string) {
    const colors: { [key: string]: string } = {
      high: '#ef4444',
      medium: '#f59e0b',
      low: '#10b981'
    };
    return colors[priority] || '#6b7280';
  }

  function getStatusColor(status: string) {
    const colors: { [key: string]: string } = {
      pending: '#6b7280',
      'in-progress': '#3b82f6',
      completed: '#10b981'
    };
    return colors[status] || '#6b7280';
  }

  function createNewTask() {
    goto('/dashboard/tasks/new');
  }

  function viewTask(id: number) {
    goto(`/dashboard/tasks/${id}`);
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  }

  function isOverdue(dueDate: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    return due < today;
  }
</script>

<svelte:head>
  <title>Tasks - Aether Automate</title>
</svelte:head>

<div class="container">
  <div class="header">
    <div>
      <h1>Tasks</h1>
      <p class="subtitle">Manage and track your automation tasks</p>
    </div>
    <button class="primary-btn" on:click={createNewTask}>
      + New Task
    </button>
  </div>

  <div class="filters">
    <button class:active={filter === 'all'} on:click={() => filter = 'all'}>
      All ({tasks.length})
    </button>
    <button class:active={filter === 'pending'} on:click={() => filter = 'pending'}>
      Pending ({tasks.filter(t => t.status === 'pending').length})
    </button>
    <button class:active={filter === 'in-progress'} on:click={() => filter = 'in-progress'}>
      In Progress ({tasks.filter(t => t.status === 'in-progress').length})
    </button>
    <button class:active={filter === 'completed'} on:click={() => filter = 'completed'}>
      Completed ({tasks.filter(t => t.status === 'completed').length})
    </button>
  </div>

  {#if loading}
    <div class="loading">Loading tasks...</div>
  {:else if error}
    <div class="error">Error: {error}</div>
  {:else if filteredTasks.length === 0}
    <div class="empty-state">
      <span class="empty-icon">📋</span>
      <h3>No tasks found</h3>
      <p>Create your first task to get started</p>
      <button class="primary-btn" on:click={createNewTask}>
        Create Task
      </button>
    </div>
  {:else}
    <div class="tasks-list">
      {#each filteredTasks as task (task.id)}
        <div class="task-card" class:overdue={isOverdue(task.due) && task.status !== 'completed'}>
          <button class="task-content" type="button" on:click={() => viewTask(task.id)}>
            <div class="task-header">
              <h3>{task.title}</h3>
              <span class="task-status" style="background: {getStatusColor(task.status)}20; color: {getStatusColor(task.status)}">
                {task.status}
              </span>
            </div>
            
            <p class="task-description">{task.description}</p>
            
            <div class="task-footer">
              <div class="task-meta">
                <span class="meta-item">
                  <span class="meta-icon">📅</span>
                  Due: {formatDate(task.due)}
                  {#if isOverdue(task.due) && task.status !== 'completed'}
                    <span class="overdue-badge">Overdue</span>
                  {/if}
                </span>
                <span class="meta-item">
                  <span class="meta-icon">⚡</span>
                  <span style="color: {getPriorityColor(task.priority)}">
                    {task.priority} priority
                  </span>
                </span>
              </div>
              
              <div class="task-actions">
                <div 
                  class="action-btn" 
                  role="button"
                  tabindex="0"
                  on:click|stopPropagation={() => {/* Toggle status */}}
                  on:keydown|stopPropagation={(e) => e.key === 'Enter' && {/* Toggle status */}}
                >
                  ✓
                </div>
              </div>
            </div>
          </button>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .container {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
  }

  h1 {
    font-size: 2rem;
    color: #1f2937;
    margin-bottom: 0.5rem;
  }

  .subtitle {
    color: #6b7280;
  }

  .primary-btn {
    padding: 0.75rem 1.5rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 0.375rem;
    font-weight: 600;
    cursor: pointer;
  }

  .filters {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 2rem;
    flex-wrap: wrap;
  }

  .filters button {
    padding: 0.5rem 1rem;
    border: 1px solid #e5e7eb;
    border-radius: 0.375rem;
    background: white;
    color: #4b5563;
    cursor: pointer;
    font-size: 0.875rem;
  }

  .filters button.active {
    background: #667eea;
    color: white;
    border-color: #667eea;
  }

  .tasks-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .task-card {
    background: white;
    border-radius: 0.5rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    transition: all 0.2s;
  }

  .task-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  }

  .task-card.overdue {
    border-left: 4px solid #ef4444;
  }

  .task-content {
    padding: 1.5rem;
    cursor: pointer;
    background: none;
    border: none;
    text-align: left;
    width: 100%;
  }

  .task-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 0.5rem;
  }

  .task-header h3 {
    font-size: 1.125rem;
    font-weight: 600;
    color: #1f2937;
  }

  .task-status {
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 500;
    text-transform: capitalize;
  }

  .task-description {
    color: #6b7280;
    font-size: 0.875rem;
    margin-bottom: 1rem;
    line-height: 1.5;
  }

  .task-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .task-meta {
    display: flex;
    gap: 1rem;
    font-size: 0.875rem;
  }

  .meta-item {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    color: #6b7280;
  }

  .meta-icon {
    font-size: 1rem;
  }

  .overdue-badge {
    margin-left: 0.5rem;
    padding: 0.125rem 0.375rem;
    background: #fee2e2;
    color: #991b1b;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .task-actions {
    display: flex;
    gap: 0.5rem;
  }

  .action-btn {
    width: 32px;
    height: 32px;
    border: 1px solid #e5e7eb;
    border-radius: 0.375rem;
    background: white;
    color: #4b5563;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1rem;
  }

  .action-btn:hover {
    background: #f3f4f6;
  }

  .loading, .error, .empty-state {
    text-align: center;
    padding: 3rem;
    background: white;
    border-radius: 0.5rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }

  .empty-icon {
    font-size: 3rem;
    display: block;
    margin-bottom: 1rem;
  }

  .empty-state h3 {
    font-size: 1.125rem;
    color: #1f2937;
    margin-bottom: 0.5rem;
  }

  .empty-state p {
    color: #6b7280;
    margin-bottom: 1.5rem;
  }
</style>
