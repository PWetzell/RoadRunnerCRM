'use client';

import { useState, useEffect, useCallback } from 'react';

export function useTheme() {
  const [theme, setThemeState] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const saved = localStorage.getItem('navigator-theme') as 'light' | 'dark' | null;
    if (saved) {
      setThemeState(saved);
      document.documentElement.setAttribute('data-theme', saved === 'dark' ? 'dark' : '');
    }
  }, []);

  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setThemeState(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme === 'dark' ? 'dark' : '');
    localStorage.setItem('navigator-theme', newTheme);
  }, [theme]);

  return { theme, toggleTheme };
}
