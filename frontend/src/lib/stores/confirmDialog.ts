import { writable } from 'svelte/store';

/**
 * A shared confirmation dialog — replaces the native browser confirm() the
 * dashboard used to rely on before every destructive action. confirm() can't
 * be styled, gives no room to say what's actually being deleted, and (unlike
 * this) doesn't distinguish a routine confirmation from a destructive one.
 *
 * Rendered by ConfirmDialogHost.svelte, mounted once in dashboard/+layout.svelte.
 * Usage from any page: `if (!(await confirmDialog({ title, message, danger: true }))) return;`
 */

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Styles the confirm button as destructive (red) — use for anything that deletes data. */
  danger?: boolean;
}

interface ConfirmState extends ConfirmOptions {
  open: boolean;
  resolve: ((value: boolean) => void) | null;
}

const CLOSED: ConfirmState = {
  open: false,
  title: '',
  message: '',
  confirmLabel: 'Confirm',
  cancelLabel: 'Cancel',
  danger: false,
  resolve: null
};

export const confirmState = writable<ConfirmState>(CLOSED);

/** Shows the dialog and resolves true/false with the user's choice. Only one can be open at a time. */
export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    confirmState.set({
      confirmLabel: 'Confirm',
      cancelLabel: 'Cancel',
      danger: false,
      ...options,
      open: true,
      resolve
    });
  });
}

/** Called by ConfirmDialogHost when the user picks an option (or dismisses it). */
export function resolveConfirm(value: boolean) {
  confirmState.update((state) => {
    state.resolve?.(value);
    return CLOSED;
  });
}
