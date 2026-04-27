'use client';

import { create } from 'zustand';

/**
 * Toast severity — maps to the four notification types in the design system
 * (Critical/error, Warning, Informational, Success). Each has its own
 * icon + color token.
 */
export type ToastSeverity = 'success' | 'error' | 'warning' | 'info';

export interface ToastAction {
  /** Button label, e.g. "Undo", "View", "Refresh" */
  label: string;
  /** Called when the user clicks the action. Return nothing. */
  onClick: () => void;
}

export interface Toast {
  id: string;
  severity: ToastSeverity;
  /** Bold first line. */
  title: string;
  /** Optional second line with the detail. */
  description?: string;
  /** Optional footer action button/link. */
  action?: ToastAction;
  /** Auto-dismiss delay in ms. 0 = sticky (manual close only). Default 3000. */
  duration?: number;
  /** When this toast was pushed. Used to drive the auto-dismiss timer. */
  createdAt: number;
}

interface ToastStore {
  toasts: Toast[];
  /** Push a new toast. Returns its id for later dismissal. */
  push: (t: Omit<Toast, 'id' | 'createdAt'>) => string;
  /** Dismiss a specific toast by id. */
  dismiss: (id: string) => void;
  /** Dismiss all active toasts. */
  clear: () => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  push: (t) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    // Apply the documented default duration (3000ms) if the caller didn't
    // pass one. Without this, undefined falls through to Toast.tsx which
    // treats `!t.duration` as "sticky" and never schedules auto-dismiss —
    // every call site that omits duration would hang on screen forever.
    // Pass `duration: 0` explicitly to opt into sticky behavior.
    const duration = t.duration === undefined ? 3000 : t.duration;
    const full: Toast = { ...t, duration, id, createdAt: Date.now() };
    set((s) => ({ toasts: [...s.toasts, full] }));
    return id;
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  clear: () => set({ toasts: [] }),
}));
