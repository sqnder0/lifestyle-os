import { useState, useEffect } from 'react';

/**
 * useDarkMode
 * Reads user preference from localStorage, respects OS preference as
 * the initial default, and toggles the `dark` class on <html>.
 */
export function useDarkMode() {
  const [dark, setDark] = useState(() => {
    try {
      const stored = window.localStorage.getItem('os-dark-mode');
      if (stored !== null) return stored === 'true';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      window.localStorage.setItem('os-dark-mode', String(dark));
    } catch { /* noop */ }
  }, [dark]);

  // Also react to OS-level preference changes (e.g. auto mode at sunset)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => {
      // Only follow OS if user hasn't set a manual preference
      const stored = window.localStorage.getItem('os-dark-mode');
      if (stored === null) setDark(e.matches);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const toggle = () => setDark((v) => !v);
  const setMode = (value) => setDark(value);

  return { dark, toggle, setMode };
}
