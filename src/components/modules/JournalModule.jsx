import { useState, useMemo, useRef, useEffect } from 'react';
import { useOS } from '../../context/OSContext';

// ── Helpers ────────────────────────────────────────────────────────────────
const d2 = (n) => String(n).padStart(2, '0');
const toKey = (d = new Date()) =>
  `${d.getFullYear()}-${d2(d.getMonth()+1)}-${d2(d.getDate())}`;
const todayKey = () => toKey();
const parseKey = (k) => { const [y,m,d] = k.split('-'); return new Date(+y,+m-1,+d); };
const fmtDate  = (k) => parseKey(k).toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
const fmtShort = (k) => parseKey(k).toLocaleDateString('en-GB', { day:'numeric', month:'short' });

const MOOD_OPTIONS = [
  { id:'great',     label:'Great',     emoji:'😄', colour:'var(--accent-emerald)' },
  { id:'good',      label:'Good',      emoji:'🙂', colour:'var(--accent-indigo)'  },
  { id:'neutral',   label:'Neutral',   emoji:'😐', colour:'var(--text-muted)'     },
  { id:'difficult', label:'Difficult', emoji:'😔', colour:'var(--accent-amber)'   },
  { id:'tough',     label:'Tough',     emoji:'😣', colour:'var(--accent-red)'     },
];

// ── Word count ─────────────────────────────────────────────────────────────
const wordCount = (text) => text.trim().split(/\s+/).filter(Boolean).length;

// ── CalendarStrip — last 30 days ───────────────────────────────────────────
function CalendarStrip({ entries, selectedKey, onSelect }) {
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (29 - i));
    return toKey(d);
  });
  const scrollRef = useRef(null);
  useEffect(() => {
    // Scroll to end (today) on mount
    if (scrollRef.current) scrollRef.current.scrollLeft = 9999;
  }, []);

  return (
    <div ref={scrollRef} className="flex gap-1 overflow-x-auto pb-1 no-scrollbar">
      {days.map(key => {
        const entry   = entries[key];
        const isToday = key === todayKey();
        const isSelected = key === selectedKey;
        const mood    = entry?.mood ? MOOD_OPTIONS.find(m => m.id === entry.mood) : null;
        return (
          <button
            key={key}
            onClick={() => onSelect(key)}
            className={[
              'flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg shrink-0 transition-all',
              'border text-[10px]',
              isSelected
                ? 'bg-[var(--sidebar-active)] text-[var(--sidebar-active-text)] border-[var(--sidebar-active)]'
                : isToday
                  ? 'border-[var(--border-strong)] text-[var(--text-primary)]'
                  : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)]',
            ].join(' ')}
          >
            <span className="font-bold">{parseKey(key).getDate()}</span>
            <span className="opacity-60">{parseKey(key).toLocaleDateString('en-GB',{weekday:'narrow'})}</span>
            {mood
              ? <span className="text-[11px]">{mood.emoji}</span>
              : entry?.body
                ? <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--accent-indigo)', display: 'inline-block' }} />
                : <span style={{ width: 4, height: 4 }} />
            }
          </button>
        );
      })}
    </div>
  );
}

// ── MoodPicker ─────────────────────────────────────────────────────────────
function MoodPicker({ value, onChange }) {
  return (
    <div className="flex gap-2">
      {MOOD_OPTIONS.map(m => (
        <button
          key={m.id}
          onClick={() => onChange(value === m.id ? null : m.id)}
          title={m.label}
          className={[
            'flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-xl border transition-all text-[11px] font-medium',
            value === m.id
              ? 'bg-[var(--surface-inset)] border-[var(--border-strong)] scale-110'
              : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)]',
          ].join(' ')}
        >
          <span className="text-lg leading-none">{m.emoji}</span>
          <span>{m.label}</span>
        </button>
      ))}
    </div>
  );
}

// ── EntryCard (history view) ───────────────────────────────────────────────
function EntryCard({ entryKey, entry, onSelect }) {
  const mood = MOOD_OPTIONS.find(m => m.id === entry.mood);
  const words = wordCount(entry.body ?? '');
  return (
    <button
      onClick={() => onSelect(entryKey)}
      className="w-full text-left card px-4 py-3 hover:border-[var(--border-strong)] transition-all active:scale-[0.99]"
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold text-[var(--text-secondary)]">{fmtShort(entryKey)}</span>
        <div className="flex items-center gap-2">
          {mood && <span title={mood.label}>{mood.emoji}</span>}
          <span className="text-[11px] text-[var(--text-muted)]">{words}w</span>
        </div>
      </div>
      <p className="text-sm text-[var(--text-primary)] line-clamp-2 leading-relaxed">
        {entry.body || <span className="text-[var(--text-muted)] italic">No content</span>}
      </p>
    </button>
  );
}

// ── JournalModule ──────────────────────────────────────────────────────────
export default function JournalModule() {
  const { state, update } = useOS();
  const [selectedKey, setSelectedKey] = useState(todayKey());
  const [view, setView] = useState('write'); // write | history
  const [search, setSearch] = useState('');
  const [saved, setSaved] = useState(false);
  const textareaRef = useRef(null);

  // Journal entries: state.journal keyed by YYYY-MM-DD
  const journal = state.journal ?? {};
  const current = journal[selectedKey] ?? { body: '', mood: null, tags: [] };

  const mutate = (patch) => {
    setSaved(false);
    update(s => ({
      ...s,
      journal: {
        ...(s.journal ?? {}),
        [selectedKey]: { ...(s.journal?.[selectedKey] ?? { body:'', mood:null, tags:[] }), ...patch },
      }
    }));
  };

  const save = () => {
    // Already saved reactively — just show confirmation
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // Auto-focus textarea when switching to write view
  useEffect(() => {
    if (view === 'write') setTimeout(() => textareaRef.current?.focus(), 50);
  }, [view, selectedKey]);

  // Stats
  const totalEntries = Object.keys(journal).length;
  const totalWords   = Object.values(journal).reduce((acc, e) => acc + wordCount(e.body ?? ''), 0);
  const streak       = (() => {
    let s = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      if (journal[toKey(d)]?.body?.trim()) s++;
      else if (i > 0) break;
    }
    return s;
  })();

  // History filter
  const historyEntries = useMemo(() => {
    return Object.entries(journal)
      .filter(([, e]) => e.body?.trim())
      .filter(([k, e]) => !search || e.body.toLowerCase().includes(search.toLowerCase()) || k.includes(search))
      .sort(([a], [b]) => b.localeCompare(a));
  }, [journal, search]);

  const promptsForTime = () => {
    const h = new Date().getHours();
    if (h < 10) return "What's your intention for today?";
    if (h < 14) return "How's the morning gone? Any wins so far?";
    if (h < 18) return "What's on your mind this afternoon?";
    return "How did today go? What are you grateful for?";
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-xl mx-auto space-y-4 pb-10">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Journal</h1>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {totalEntries} entries · {totalWords.toLocaleString()} words
              {streak > 1 && ` · 🔥 ${streak}-day streak`}
            </p>
          </div>
          <div className="flex gap-1 bg-[var(--surface-inset)] rounded-xl p-1">
            {['write','history'].map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all capitalize
                  ${view === v ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-token' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}>
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* ── Write view ── */}
        {view === 'write' && (
          <>
            {/* Calendar strip */}
            <CalendarStrip
              entries={journal}
              selectedKey={selectedKey}
              onSelect={setSelectedKey}
            />

            {/* Date heading */}
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-[var(--text-primary)]">{fmtDate(selectedKey)}</p>
              {current.body?.trim() && (
                <span className="text-[11px] text-[var(--text-muted)]">{wordCount(current.body)} words</span>
              )}
            </div>

            {/* Mood picker */}
            <div className="card-sm px-4 py-3 space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">How are you feeling?</p>
              <MoodPicker value={current.mood} onChange={mood => mutate({ mood })} />
            </div>

            {/* Main textarea */}
            <div className="card px-4 py-4 space-y-3">
              <textarea
                ref={textareaRef}
                value={current.body ?? ''}
                onChange={e => mutate({ body: e.target.value })}
                placeholder={promptsForTime()}
                rows={12}
                className="textarea-base text-[15px] leading-relaxed resize-none"
                style={{ minHeight: 240 }}
              />
            </div>

            {/* Save bar */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--text-muted)]">
                {current.body?.trim() ? 'Saved automatically' : 'Start writing…'}
              </span>
              <button
                onClick={save}
                className={`text-xs font-semibold px-4 py-2 rounded-xl transition-all
                  ${saved
                    ? 'bg-[var(--fill-emerald)] text-[var(--accent-emerald)]'
                    : 'bg-[var(--sidebar-active)] text-[var(--sidebar-active-text)] hover:opacity-90'}`}
              >
                {saved ? '✓ Saved' : 'Save entry'}
              </button>
            </div>
          </>
        )}

        {/* ── History view ── */}
        {view === 'history' && (
          <>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search entries…"
              className="input-base"
            />
            {historyEntries.length === 0 ? (
              <div className="text-center py-16 text-[var(--text-muted)]">
                <p className="text-4xl mb-3">📓</p>
                <p className="text-sm">{search ? 'No matching entries' : 'No entries yet'}</p>
                <p className="text-xs mt-1 opacity-70">
                  {search ? 'Try a different search' : 'Start writing to build your journal'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {historyEntries.map(([key, entry]) => (
                  <EntryCard
                    key={key}
                    entryKey={key}
                    entry={entry}
                    onSelect={k => { setSelectedKey(k); setView('write'); }}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
