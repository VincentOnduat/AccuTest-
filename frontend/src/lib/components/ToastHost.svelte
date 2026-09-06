<script lang="ts">
  import { toasts, dismissToast } from '$lib/stores/toast';
  import { fly, fade } from 'svelte/transition';

  const ICONS = { success: '✅', error: '⚠️', info: 'ℹ️' } as const;
</script>

<!-- aria-live so screen readers announce new toasts without needing to focus this region -->
<div class="toast-host" aria-live="polite" role="status">
  {#each $toasts as t (t.id)}
    <div class="toast toast-{t.kind}" in:fly={{ y: 12, duration: 180 }} out:fade={{ duration: 120 }}>
      <span class="toast-icon">{ICONS[t.kind]}</span>
      <p class="toast-message">{t.message}</p>
      <button type="button" class="toast-dismiss" on:click={() => dismissToast(t.id)} aria-label="Dismiss notification">✕</button>
    </div>
  {/each}
</div>

<style>
  .toast-host {
    position: fixed;
    bottom: 1.5rem;
    right: 1.5rem;
    z-index: 1000;
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
    max-width: min(380px, calc(100vw - 2rem));
  }

  .toast {
    display: flex;
    align-items: flex-start;
    gap: 0.625rem;
    background: white;
    border: 1px solid var(--border-color, #e4e7ed);
    border-left: 4px solid var(--text-tertiary, #64748b);
    border-radius: 10px;
    padding: 0.75rem 0.875rem;
    box-shadow: 0 4px 16px rgba(15, 23, 42, 0.12);
  }
  .toast-success { border-left-color: var(--success, #10b981); }
  .toast-error { border-left-color: var(--danger, #ef4444); }
  .toast-info { border-left-color: var(--primary, #3b82f6); }

  .toast-icon {
    font-size: 1rem;
    line-height: 1.4;
    flex-shrink: 0;
  }

  .toast-message {
    flex: 1;
    margin: 0;
    font-size: 0.8125rem;
    line-height: 1.45;
    color: var(--text-primary, #1e293b);
    white-space: pre-wrap;
  }

  .toast-dismiss {
    flex-shrink: 0;
    background: none;
    border: none;
    color: var(--text-muted, #94a3b8);
    cursor: pointer;
    font-size: 0.75rem;
    line-height: 1;
    padding: 0.125rem;
  }
  .toast-dismiss:hover {
    color: var(--text-secondary, #475569);
  }
  .toast-dismiss:focus-visible {
    outline: 2px solid var(--primary, #3b82f6);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    .toast { transition: none; }
  }

  @media (max-width: 640px) {
    .toast-host {
      left: 1rem;
      right: 1rem;
      bottom: 1rem;
      max-width: none;
    }
  }
</style>
