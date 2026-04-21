'use client';

import { useAlertAutoGen } from '@/hooks/useAlertAutoGen';
import { useReminderChecker } from '@/hooks/useReminderChecker';

/**
 * Mounts the alert auto-generation hook and reminder checker. Renders
 * nothing — this exists solely so the hooks run at the app layout level
 * without forcing the whole layout to be a client component.
 */
export default function AlertAutoGenMount() {
  useAlertAutoGen();
  useReminderChecker();
  return null;
}
