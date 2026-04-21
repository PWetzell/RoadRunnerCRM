'use client';

import { useTheme } from '@/hooks/useTheme';

/** Returns true when the app is in dark mode. */
export function useIsDark(): boolean {
  const { theme } = useTheme();
  return theme === 'dark';
}
