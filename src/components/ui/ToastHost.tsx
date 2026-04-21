'use client';

import { useToastStore } from '@/stores/toast-store';
import Toast from './Toast';

/**
 * Fixed-position container that renders every active toast. Mounted once
 * in the root layout so any component (or non-React module via the
 * `toast.*` helpers) can fire a notification.
 *
 * Position: bottom-right with stacking, newest on top of the stack.
 */
export default function ToastHost() {
  const toasts = useToastStore((s) => s.toasts);
  if (toasts.length === 0) return null;
  return (
    <div
      aria-live="polite"
      aria-label="Notifications"
      className="fixed bottom-4 right-4 z-[100] flex flex-col-reverse gap-2 pointer-events-none"
    >
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <Toast toast={t} />
        </div>
      ))}
    </div>
  );
}
