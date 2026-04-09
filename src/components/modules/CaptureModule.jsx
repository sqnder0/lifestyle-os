import { useState } from 'react';
import { useOS } from '../../context/OSContext';
import { formatRelative } from '../../utils/helpers';

// ── Single capture row ────────────────────────────────────────────────────
function CaptureRow({ item, onProcess, onDelete }) {

  return (
    <div className={`group relative flex items-start gap-3 px-4 py-3 rounded-xl border transition-all
      ${item.processed
        ? 'bg-[var(--surface-inset)] border-[var(--border)] opacity-50'
        : 'bg-[var(--surface-raised)] border-[var(--border)] hover:border-[var(--border)] hover:shadow-sm'}`}
    >
      {/* Processed dot */}
      <button
        onClick={() => onProcess(item.id)}
        title={item.processed ? 'Mark unprocessed' : 'Mark processed'}
        className={`mt-0.5 shrink-0 w-4 h-4 rounded-full border-2 transition-all flex items-center justify-center
          ${item.processed
            ? 'bg-zinc-300 border-zinc-300'
            : 'border-zinc-300 hover:border-emerald-500'}`}
      >
        {item.processed && <span className="text-white text-[9px]">✓</span>}
      </button>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug ${item.processed ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]'}`}>
          {item.text}
        </p>
        <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{formatRelative(item.createdAt)}</p>
      </div>

      {/* Actions */}
      {!item.processed && (
        <div className="hidden group-hover:flex items-center gap-1 shrink-0">
          <button
            onClick={() => onDelete(item.id)}
            title="Delete"
            className="p-1 rounded-lg hover:bg-[var(--fill-red)] text-[var(--text-muted)] hover:text-red-400 transition-colors text-sm"
          >
            ✕
          </button>
        </div>
      )}
      {item.processed && (
        <button
          onClick={() => onDelete(item.id)}
          title="Delete"
          className="hidden group-hover:flex p-1 rounded-lg hover:bg-[var(--fill-red)] text-[var(--text-muted)] hover:text-red-400 transition-colors text-sm shrink-0"
        >
          ✕
        </button>
      )}
    </div>
  );
}

// ── CaptureModule ─────────────────────────────────────────────────────────
export default function CaptureModule() {
  const { state, addCapture, updateCapture, deleteCapture } = useOS();
  const [input, setInput]   = useState('');
  const [filter, setFilter] = useState('inbox'); // inbox | processed | all
  const [flash, setFlash]   = useState(false);

  const { capture = [] } = state;

  const commit = () => {
    const t = input.trim();
    if (!t) return;
    addCapture(t);
    setInput('');
    setFlash(true);
    setTimeout(() => setFlash(false), 500);
  };

  const toggleProcessed = (id) => {
    const item = capture.find((c) => c.id === id);
    if (!item) return;
    updateCapture(id, { processed: !item.processed });
  };

  const filtered = capture.filter((c) => {
    if (filter === 'inbox')     return !c.processed;
    if (filter === 'processed') return c.processed;
    return true;
  });

  const inboxCount     = capture.filter((c) => !c.processed).length;
  const processedCount = capture.filter((c) => c.processed).length;

  const clearProcessed = () => {
    capture.filter((c) => c.processed).forEach((c) => deleteCapture(c.id));
  };

  return (
    <div className="h-full flex flex-col gap-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Inbox</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            {inboxCount} unprocessed · {processedCount} done
          </p>
        </div>
        {processedCount > 0 && (
          <button
            onClick={clearProcessed}
            className="text-xs text-[var(--text-muted)] hover:text-red-500 transition-colors border border-[var(--border)] hover:border-red-200 px-3 py-1.5 rounded-lg"
          >
            Clear processed
          </button>
        )}
      </div>

      {/* Quick add */}
      <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border-2 bg-[var(--surface-raised)] transition-all duration-300
        ${flash ? 'border-emerald-400' : 'border-[var(--border)] focus-within:border-[var(--border-strong)]'}`}>
        <span className="text-[var(--text-muted)] select-none">+</span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setInput(''); }}
          placeholder="Add to inbox…"
          className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
        />
        {input && (
          <button
            onClick={commit}
            className="text-xs bg-[var(--sidebar-active)] text-[var(--sidebar-active-text)] px-3 py-1 rounded-lg hover:bg-[var(--text-secondary)] transition-colors"
          >
            Add ↵
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-[var(--surface-inset)] rounded-xl p-1 self-start">
        {[
          { id: 'inbox',     label: `Inbox (${inboxCount})` },
          { id: 'processed', label: `Done (${processedCount})` },
          { id: 'all',       label: 'All' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all
              ${filter === tab.id ? 'bg-[var(--surface-raised)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-secondary)] hover:text-secondary'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pb-6">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-[var(--text-muted)]">
            <p className="text-4xl mb-3">✦</p>
            <p className="text-sm">
              {filter === 'inbox' ? 'Inbox zero. Nice.' : 'Nothing here.'}
            </p>
          </div>
        ) : (
          filtered.map((item) => (
            <CaptureRow
              key={item.id}
              item={item}
              onProcess={toggleProcessed}
              onDelete={deleteCapture}
            />
          ))
        )}
      </div>
    </div>
  );
}
