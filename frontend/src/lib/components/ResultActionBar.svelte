<script lang="ts">
  // The shared "you just did a thing — here's what happened, here's what's next"
  // element proposed in the dashboard UX audit. Replaces three different ad hoc
  // patterns (a modal alert(), a buried collapsible section, and a dead-end page
  // with no CTA at all) with one component so every result screen agrees on what
  // "the one next step" looks like, instead of each page inventing its own button
  // row and its own idea of what counts as primary.
  //
  // Deliberately narrow: one status line, one optional substatus line, at most
  // two buttons, exactly one of which is ever styled as primary (solid fill) —
  // more than that stops reading as "the next step" and back-slides into the
  // same undifferentiated button row this component exists to replace.

  export let tone: 'success' | 'error' = 'success';
  export let status: string;
  export let substatus: string | undefined = undefined;
  export let primaryLabel: string;
  export let primaryAction: () => void;
  export let secondaryLabel: string | undefined = undefined;
  export let secondaryAction: (() => void) | undefined = undefined;
</script>

<div class="result-bar {tone}">
  <div class="result-status">
    <p class="status-line">{status}</p>
    {#if substatus}
      <p class="substatus-line">{substatus}</p>
    {/if}
  </div>
  <div class="result-actions">
    {#if secondaryLabel && secondaryAction}
      <button type="button" class="secondary" on:click={secondaryAction}>{secondaryLabel}</button>
    {/if}
    <button type="button" class="primary" on:click={primaryAction}>{primaryLabel}</button>
  </div>
</div>

<style>
  .result-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1.25rem;
    flex-wrap: wrap;
    background: white;
    border: 1px solid #e5e7eb;
    border-left: 4px solid #10b981;
    border-radius: 0.5rem;
    padding: 1rem 1.25rem;
    margin: 1rem 0;
  }
  .result-bar.error {
    border-left-color: #ef4444;
  }

  .result-status {
    min-width: 0;
  }

  .status-line {
    margin: 0;
    font-weight: 600;
    font-size: 0.9375rem;
    color: #1f2937;
  }
  .result-bar.success .status-line::before {
    content: '✅ ';
  }
  .result-bar.error .status-line::before {
    content: '❌ ';
  }

  .substatus-line {
    margin: 0.25rem 0 0;
    font-size: 0.8125rem;
    color: #6b7280;
  }

  .result-actions {
    display: flex;
    gap: 0.625rem;
    flex-shrink: 0;
  }

  .result-actions button {
    padding: 0.5rem 1.125rem;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    white-space: nowrap;
  }

  .result-actions .primary {
    background: #667eea;
    color: white;
    border: none;
  }
  .result-actions .primary:hover {
    background: #5a67d8;
  }

  .result-actions .secondary {
    background: white;
    color: #4b5563;
    border: 1px solid #d1d5db;
  }
  .result-actions .secondary:hover {
    background: #f9fafb;
  }

  @media (max-width: 560px) {
    .result-bar {
      flex-direction: column;
      align-items: stretch;
    }
    .result-actions {
      justify-content: flex-end;
    }
  }
</style>
