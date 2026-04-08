import { useState, useRef } from 'react';
import { useOS } from '../../context/OSContext';

export default function QuickCapture() {
  const { addCapture, state } = useOS();
  const [text, setText]         = useState('');
  const [flash, setFlash]       = useState(false);   // brief confirmation pulse
  const inputRef                = useRef(null);

  const inboxCount = state.capture.filter((c) => !c.processed).length;

  const commit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    addCapture(trimmed);
    setText('');
    // trigger a brief green flash on the border
    setFlash(true);
    setTimeout(() => setFlash(false), 600);
    inputRef.current?.focus();
  };

  const handleKey = (e) => {
    if (e.key === 'Enter') commit();
    if (e.key === 'Escape') { setText(''); inputRef.current?.blur(); }
  };

  return (
    <div className="space-y-1.5">
      {/* Main capture row */}
      <div className={`
        flex items-center gap-3 px-4 py-3 rounded-2xl border-2 bg-[var(--surface-raised)]
        transition-all duration-300
        ${flash
          ? 'border-emerald-400 shadow-[0_0_0_3px_rgba(52,211,153,0.15)]'
          : 'border-[var(--border)] focus-within:border-[var(--border-strong)] focus-within:shadow-[0_0_0_3px_rgba(0,0,0,0.05)]'}
      `}>
        {/* Capture glyph */}
        <span className="text-[var(--text-muted)] text-lg select-none shrink-0">⌘</span>

        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Capture a thought, task, or idea…"
          className="flex-1 bg-transparent text-base text-[var(--text-primary)] placeholder:text-[var(--text-muted)]
                     focus:outline-none caret-zinc-600"
        />

        {/* Character hint & send button */}
        {text.length > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-[var(--text-muted)]">{text.length}</span>
            <button
              onClick={commit}
              className="text-xs bg-[var(--sidebar-active)] text-[var(--sidebar-active-text)] px-3 py-1 rounded-lg
                         hover:bg-[var(--text-secondary)] transition-colors font-medium"
            >
              Save ↵
            </button>
          </div>
        )}
      </div>

      {/* Inbox count hint */}
      {inboxCount > 0 && (
        <p className="text-xs text-[var(--text-muted)] pl-1">
          {inboxCount} item{inboxCount !== 1 ? 's' : ''} waiting in inbox
        </p>
      )}
    </div>
  );
}
