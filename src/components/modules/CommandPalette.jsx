import { useState, useEffect, useRef, useMemo } from 'react';
import { useOS } from '../../context/OSContext';

const ALL_MODULES = [
  { id: 'dashboard', label: 'Dashboard',      icon: '⌂',  type: 'nav' },
  { id: 'capture',   label: 'Inbox',          icon: '↓',  type: 'nav' },
  { id: 'cycles',    label: 'Cycles',         icon: '↻',  type: 'nav' },
  { id: 'projects',  label: 'Projects',       icon: '▦',  type: 'nav' },
  { id: 'metrics',   label: 'Metrics',        icon: '◈',  type: 'nav' },
  { id: 'crm',       label: 'CRM',            icon: '◎',  type: 'nav' },
  { id: 'engine',    label: 'Project Engine', icon: '◉',  type: 'nav' },
  { id: 'principles',label: 'Principles',     icon: '✦',  type: 'nav' },
  { id: 'reference', label: 'Reference',      icon: '▣',  type: 'nav' },
  { id: 'review',    label: 'Weekly Review',  icon: '✐',  type: 'nav' },
  { id: 'habits',    label: 'Habits',         icon: '◐',  type: 'nav' },
];

// Build a flat searchable index from all app state
function buildIndex(state) {
  const items = [];

  // Navigation
  ALL_MODULES.forEach((m) => {
    items.push({ id: `nav-${m.id}`, label: m.label, subtitle: 'Navigate', icon: m.icon, action: 'nav', payload: m.id });
  });

  // Projects
  Object.values(state.projects ?? {}).forEach((p) => {
    if (p.status === 'Active') {
      items.push({ id: `proj-${p.id}`, label: p.title, subtitle: `Project · ${p.status}`, icon: '▦', action: 'nav', payload: 'projects' });
    }
  });

  // Tasks
  Object.values(state.tasks ?? {}).forEach((t) => {
    if (t.status !== 'Done') {
      items.push({ id: `task-${t.id}`, label: t.title, subtitle: `Task · ${t.status}`, icon: '☐', action: 'nav', payload: 'projects' });
    }
  });

  // Inbox
  (state.capture ?? []).filter((c) => !c.processed).forEach((c) => {
    items.push({ id: `cap-${c.id}`, label: c.text, subtitle: 'Inbox item', icon: '↓', action: 'nav', payload: 'capture' });
  });

  // Contacts
  Object.values(state.crm ?? {}).forEach((c) => {
    items.push({ id: `crm-${c.id}`, label: c.name, subtitle: 'Contact', icon: '◎', action: 'nav', payload: 'crm' });
  });

  // Principles
  Object.values(state.principles ?? {}).forEach((p) => {
    items.push({ id: `prin-${p.id}`, label: p.title, subtitle: `Principle · ${p.category}`, icon: '✦', action: 'nav', payload: 'principles' });
  });

  // Quick actions
  items.push({ id: 'action-capture',  label: 'Quick Capture',        subtitle: 'Add to inbox',     icon: '+', action: 'nav', payload: 'capture'  });
  items.push({ id: 'action-review',   label: 'Start Weekly Review',  subtitle: 'Reflection',       icon: '✐', action: 'nav', payload: 'review'   });
  items.push({ id: 'action-metrics',  label: 'Log Today\'s Metrics', subtitle: 'Energy & sleep',   icon: '◈', action: 'nav', payload: 'metrics'  });

  return items;
}

function score(item, query) {
  const q = query.toLowerCase();
  const label = item.label.toLowerCase();
  const sub = (item.subtitle ?? '').toLowerCase();
  if (label.startsWith(q)) return 3;
  if (label.includes(q)) return 2;
  if (sub.includes(q)) return 1;
  return 0;
}

// ── ResultRow ──────────────────────────────────────────────────────────────
function ResultRow({ item, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={[
        'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
        active
          ? 'bg-[var(--sidebar-active)] text-[var(--sidebar-active-text)]'
          : 'hover:bg-[var(--surface-inset)]',
      ].join(' ')}
    >
      <span className="text-lg shrink-0 leading-none w-6 text-center">{item.icon}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${active ? '' : 'text-[var(--text-primary)]'}`}>
          {item.label}
        </p>
        <p className={`text-xs truncate ${active ? 'opacity-60' : 'text-[var(--text-muted)]'}`}>
          {item.subtitle}
        </p>
      </div>
      {active && <kbd className="text-[10px] opacity-50 shrink-0">↵</kbd>}
    </button>
  );
}

// ── CommandPalette ─────────────────────────────────────────────────────────
export default function CommandPalette({ open, onClose, onNavigate }) {
  const { state, addCapture } = useOS();
  const [query, setQuery]   = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef            = useRef(null);

  const index = useMemo(() => buildIndex(state), [state]);

  const results = useMemo(() => {
    if (!query.trim()) return index.filter((i) => i.action === 'nav' && i.id.startsWith('nav-')).slice(0, 8);
    return index
      .map((item) => ({ ...item, _score: score(item, query) }))
      .filter((i) => i._score > 0)
      .sort((a, b) => b._score - a._score)
      .slice(0, 10);
  }, [query, index]);

  // Reset on open
  useEffect(() => {
    if (open) {
      setQuery('');
      setCursor(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  // Keyboard inside the palette
  const handleKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => Math.min(c + 1, results.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
    if (e.key === 'Enter') {
      e.preventDefault();
      const item = results[cursor];
      if (!item) {
        // Treat as quick-capture if text entered but no match
        if (query.trim()) { addCapture(query.trim()); onNavigate('capture'); onClose(); }
        return;
      }
      onNavigate(item.payload);
      onClose();
    }
    if (e.key === 'Escape') onClose();
  };

  if (!open) return null;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4"
      onClick={onClose}
    >
      {/* Blur backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative w-full max-w-lg bg-[var(--surface)] rounded-2xl border border-[var(--border-strong)] shadow-[0_24px_80px_rgba(0,0,0,0.25)] overflow-hidden animate-[pageIn_160ms_ease-out_both]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[var(--border)]">
          <span className="text-[var(--text-muted)] text-lg shrink-0">⌘</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setCursor(0); }}
            onKeyDown={handleKey}
            placeholder="Search anything, or type to capture…"
            className="flex-1 bg-transparent text-[var(--text-primary)] text-sm focus:outline-none placeholder:text-[var(--text-muted)]"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-[var(--text-muted)] text-xs hover:text-[var(--text-primary)] transition-colors">
              clear
            </button>
          )}
          <kbd className="hidden md:flex text-[10px] text-[var(--text-muted)] border border-[var(--border)] rounded px-1.5 py-0.5">
            esc
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-1">
          {results.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">
              <p>No results</p>
              <p className="text-xs mt-1 opacity-60">Press ↵ to capture "{query}" to inbox</p>
            </div>
          ) : (
            results.map((item, i) => (
              <ResultRow
                key={item.id}
                item={item}
                active={i === cursor}
                onClick={() => { onNavigate(item.payload); onClose(); }}
              />
            ))
          )}
        </div>

        {/* Footer hints */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-[var(--border)] text-[10px] text-[var(--text-muted)]">
          <span>↑↓ navigate · ↵ open · esc close</span>
          <span>⌘K to open</span>
        </div>
      </div>
    </div>
  );
}
