import { writable } from 'svelte/store';

/**
 * A shared, non-blocking notification queue for the dashboard — replaces the
 * native browser alert() the dashboard used to rely on for every success and
 * error message. alert() halts the whole page until dismissed and looks
 * different in every browser; a toast doesn't block anything, can show more
 * than one message at once, and matches the rest of the UI.
 *
 * Rendered by ToastHost.svelte, mounted once in dashboard/+layout.svelte —
 * any page just calls `toast.success(...)` / `toast.error(...)` / `toast.info(...)`.
 */

export type ToastKind = 'success' | 'error' | 'info';

export interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

export const toasts = writable<ToastItem[]>([]);

let nextId = 1;
const DEFAULT_DURATION_MS = 5000;

function push(kind: ToastKind, message: string, durationMs = DEFAULT_DURATION_MS) {
  const id = nextId++;
  toasts.update((list) => [...list, { id, kind, message }]);
  setTimeout(() => dismissToast(id), durationMs);
  return id;
}

export function dismissToast(id: number) {
  toasts.update((list) => list.filter((t) => t.id !== id));
}

export const toast = {
  success: (message: string) => push('success', message),
  error: (message: string) => push('error', message, 7000), // errors stay a bit longer — there's usually more to read
  info: (message: string) => push('info', message)
};
