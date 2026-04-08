import { useState, useEffect, useRef } from 'react';

/**
 * useLocalStorage
 * Drop-in replacement for useState that syncs to localStorage.
 *
 * Features:
 * - Reads initial value from storage on mount (cold start)
 * - Debounces writes (100ms) to avoid thrashing on rapid state changes
 * - Gracefully handles storage quota errors and private mode
 * - Cross-tab sync via the 'storage' event
 */
export function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return initialValue;
      const parsed = JSON.parse(raw);
      // Deep merge: keep initialValue structure as schema template,
      // overlay with stored values so new top-level keys auto-appear
      if (typeof initialValue === 'object' && initialValue !== null && !Array.isArray(initialValue)) {
        return { ...initialValue, ...parsed };
      }
      return parsed;
    } catch {
      return initialValue;
    }
  });

  // Debounce timer ref — avoids writing on every keystroke
  const timer = useRef(null);

  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      try {
        window.localStorage.setItem(key, JSON.stringify(storedValue));
      } catch (e) {
        // QuotaExceededError or SecurityError in private mode — silently ignore
        if (process.env.NODE_ENV === 'development') {
          console.warn('[useLocalStorage] write failed:', e.message);
        }
      }
    }, 100);
    return () => clearTimeout(timer.current);
  }, [key, storedValue]);

  // Cross-tab synchronisation
  useEffect(() => {
    const handler = (event) => {
      if (event.key !== key || event.storageArea !== window.localStorage) return;
      try {
        const newValue = event.newValue ? JSON.parse(event.newValue) : initialValue;
        setStoredValue(newValue);
      } catch {
        // JSON parse error — ignore stale value
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [key, initialValue]);

  return [storedValue, setStoredValue];
}
