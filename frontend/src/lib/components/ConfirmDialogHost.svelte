<script lang="ts">
  import { confirmState, resolveConfirm } from '$lib/stores/confirmDialog';
  import { fade, scale } from 'svelte/transition';

  let confirmButton: HTMLButtonElement;

  // Focus the confirm button as soon as the dialog opens, so keyboard/screen-reader
  // users land somewhere sensible instead of on whatever was focused on the page behind it.
  $: if ($confirmState.open && confirmButton) {
    confirmButton.focus();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (!$confirmState.open) return;
    if (e.key === 'Escape') resolveConfirm(false);
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if $confirmState.open}
  <!-- No click-outside-to-dismiss here: Escape (see svelte:window above) and the
       Cancel button already give every input method a way to back out, and a
       clickable backdrop can't be made keyboard/screen-reader accessible without
       either a confusing extra tab stop or misusing an ARIA role that isn't true. -->
  <div class="confirm-overlay" transition:fade={{ duration: 120 }}>
    <div
      class="confirm-dialog"
      role="alertdialog"
      tabindex="-1"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-message"
      transition:scale={{ duration: 140, start: 0.96 }}
    >
      <h2 id="confirm-dialog-title">{$confirmState.title}</h2>
      <p id="confirm-dialog-message">{$confirmState.message}</p>
      <div class="confirm-actions">
        <button type="button" class="btn-cancel" on:click={() => resolveConfirm(false)}>{$confirmState.cancelLabel}</button>
        <button
          type="button"
          bind:this={confirmButton}
          class="btn-confirm"
          class:danger={$confirmState.danger}
          on:click={() => resolveConfirm(true)}
        >
          {$confirmState.confirmLabel}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .confirm-overlay {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.45);
    backdrop-filter: blur(1px);
    z-index: 2000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
  }

  .confirm-dialog {
    background: white;
    border-radius: 12px;
    padding: 1.5rem;
    max-width: 420px;
    width: 100%;
    box-shadow: 0 20px 48px rgba(15, 23, 42, 0.25);
  }

  .confirm-dialog h2 {
    margin: 0 0 0.625rem 0;
    font-size: 1.0625rem;
    font-weight: 600;
    color: var(--text-primary, #1e293b);
  }

  .confirm-dialog p {
    margin: 0 0 1.5rem 0;
    font-size: 0.875rem;
    line-height: 1.5;
    color: var(--text-secondary, #475569);
  }

  .confirm-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.625rem;
  }

  .btn-cancel,
  .btn-confirm {
    padding: 0.5rem 1.125rem;
    border-radius: 8px;
    font-size: 0.8125rem;
    font-weight: 600;
    cursor: pointer;
    border: 1px solid transparent;
  }

  .btn-cancel {
    background: white;
    border-color: var(--border-color, #e4e7ed);
    color: var(--text-secondary, #475569);
  }
  .btn-cancel:hover {
    background: var(--bg-tertiary, #f8f9fc);
  }

  .btn-confirm {
    background: var(--primary, #3b82f6);
    color: white;
  }
  .btn-confirm:hover {
    background: var(--primary-dark, #2563eb);
  }
  .btn-confirm.danger {
    background: var(--danger, #ef4444);
  }
  .btn-confirm.danger:hover {
    background: #dc2626;
  }

  .btn-cancel:focus-visible,
  .btn-confirm:focus-visible {
    outline: 2px solid var(--primary, #3b82f6);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    .confirm-overlay, .confirm-dialog { transition: none; }
  }
</style>
