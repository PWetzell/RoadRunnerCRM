/**
 * Convenience API for firing toasts from anywhere in the app.
 *
 * Usage:
 *   import { toast } from '@/lib/toast';
 *   toast.success('Contact saved', { description: 'Linus Torvalds added.' });
 *   toast.error('Network error', { description: 'Could not reach GitHub.' });
 *   toast.warning('Missing field', { description: 'Email not provided.' });
 *   toast.info('Resume parsed', { description: '8 fields extracted.' });
 *
 * With action:
 *   toast.success('Contact deleted', {
 *     description: 'Sarah Chen removed.',
 *     action: { label: 'Undo', onClick: () => restore(id) },
 *   });
 */

import { useToastStore, ToastAction, ToastSeverity } from '@/stores/toast-store';

interface ToastOpts {
  description?: string;
  action?: ToastAction;
  /** 0 = sticky (no auto-dismiss). Default varies by severity. */
  duration?: number;
}

/** Default dismiss timings — errors linger longer, info goes quicker. */
const DEFAULT_DURATION: Record<ToastSeverity, number> = {
  success: 4000,
  info: 4000,
  warning: 6000,
  error: 8000,
};

function fire(severity: ToastSeverity, title: string, opts: ToastOpts = {}): string {
  return useToastStore.getState().push({
    severity,
    title,
    description: opts.description,
    action: opts.action,
    duration: opts.duration ?? DEFAULT_DURATION[severity],
  });
}

export const toast = {
  success: (title: string, opts?: ToastOpts) => fire('success', title, opts),
  error:   (title: string, opts?: ToastOpts) => fire('error', title, opts),
  warning: (title: string, opts?: ToastOpts) => fire('warning', title, opts),
  info:    (title: string, opts?: ToastOpts) => fire('info', title, opts),
  dismiss: (id: string) => useToastStore.getState().dismiss(id),
  clear:   () => useToastStore.getState().clear(),
};
