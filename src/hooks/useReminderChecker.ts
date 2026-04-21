'use client';

import { useEffect, useRef } from 'react';
import { useAlertStore } from '@/stores/alert-store';

/**
 * Checks reminders every 60 seconds. When a reminder's scheduledAt
 * is in the past and it hasn't fired, creates a standard alert and
 * marks the reminder as fired (or advances it for recurring ones).
 */
export function useReminderChecker() {
  const reminders = useAlertStore((s) => s.reminders);
  const addAlert = useAlertStore((s) => s.addAlert);
  const markReminderFired = useAlertStore((s) => s.markReminderFired);
  const checkedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    function check() {
      const now = Date.now();
      reminders.forEach((rem) => {
        if (!rem.enabled || rem.fired) return;
        if (new Date(rem.scheduledAt).getTime() > now) return;

        // Avoid double-firing within the same mount cycle
        const fireKey = `${rem.id}:${rem.scheduledAt}`;
        if (checkedRef.current.has(fireKey)) return;
        checkedRef.current.add(fireKey);

        addAlert({
          type: 'reminder',
          severity: rem.severity,
          title: rem.title,
          message: rem.message || (rem.entityLink ? `Linked to: ${rem.entityLink.entityName}` : 'Reminder triggered.'),
          href: rem.entityLink?.href,
        });

        markReminderFired(rem.id);
      });
    }

    // Check immediately on mount/change
    check();

    // Then every 60 seconds
    const interval = setInterval(check, 60_000);
    return () => clearInterval(interval);
  }, [reminders, addAlert, markReminderFired]);
}
