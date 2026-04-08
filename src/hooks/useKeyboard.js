import { useEffect, useCallback } from 'react';

/**
 * useKeyboard
 * Registers global keyboard shortcuts. Handles modifier keys cleanly.
 *
 * @param {Record<string, (e: KeyboardEvent) => void>} shortcuts
 *   Keys are strings like 'cmd+k', 'ctrl+k', 'escape', 'g d'
 * @param {boolean} enabled  – can be toggled off when a modal is open etc.
 *
 * Usage:
 *   useKeyboard({
 *     'cmd+k':   () => openCommandPalette(),
 *     'escape':  () => closeModal(),
 *     'g d':     () => navigateTo('dashboard'),
 *   });
 */
export function useKeyboard(shortcuts, enabled = true) {
  // Sequence buffer for 2-key combos like "g d"
  const buffer = { keys: [], timer: null };

  const handler = useCallback((e) => {
    if (!enabled) return;

    // Don't fire inside text inputs unless it's a meta-key combo
    const tag = e.target?.tagName ?? '';
    const isEditing = ['INPUT','TEXTAREA','SELECT'].includes(tag);
    const hasMeta = e.metaKey || e.ctrlKey;
    if (isEditing && !hasMeta) return;

    // Build the canonical key string
    const parts = [];
    if (e.metaKey || e.ctrlKey) parts.push('cmd');
    if (e.shiftKey) parts.push('shift');
    if (e.altKey) parts.push('alt');
    const key = e.key === ' ' ? 'space' : e.key.toLowerCase();
    parts.push(key);
    const combo = parts.join('+');

    // Check direct matches
    if (shortcuts[combo]) {
      e.preventDefault();
      shortcuts[combo](e);
      return;
    }

    // Check "escape" alone
    if (key === 'escape' && shortcuts['escape']) {
      shortcuts['escape'](e);
      return;
    }

    // 2-key sequence: buffer single-char non-modifier keys
    if (!hasMeta && !e.shiftKey && key.length === 1) {
      clearTimeout(buffer.timer);
      buffer.keys.push(key);
      if (buffer.keys.length > 2) buffer.keys.shift();
      const seq = buffer.keys.join(' ');
      if (shortcuts[seq]) {
        e.preventDefault();
        shortcuts[seq](e);
        buffer.keys = [];
      } else {
        buffer.timer = setTimeout(() => { buffer.keys = []; }, 800);
      }
    }
  }, [shortcuts, enabled]);

  useEffect(() => {
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [handler]);
}
