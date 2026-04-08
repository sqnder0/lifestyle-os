import { useState, useEffect } from 'react';
import { useOS } from '../../context/OSContext';
import { REVIEW_PROMPTS } from '../../utils/schema';

// ── Week key helpers ───────────────────────────────────────────────────────
const getWeekKey = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((d - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
};

const formatWeekKey = (wk) => {
  // Parse YYYY-Www → "Week N, YYYY"
  const [year, w] = wk.split('-W');
  return `Week ${w}, ${year}`;
};

const weekRange = (wk) => {
  // Get Mon–Sun date range for a week key
  const [year, w] = wk.split('-W');
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = (jan4.getDay() + 6) % 7;
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - dayOfWeek + (Number(w) - 1) * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = d => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  return `${fmt(monday)} – ${fmt(sunday)}`;
};

// ── Rating stars ───────────────────────────────────────────────────────────
function RatingStars({ value, onChange }) {
  const [hover, setHover] = useState(null);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(null)}
          onClick={() => onChange(n === value ? null : n)}
          className="text-xl transition-all hover:scale-110"
          title={['Terrible','Poor','Okay','Good','Excellent'][n - 1]}>
          <span className={(hover ?? value ?? 0) >= n ? 'text-amber-400' : 'text-[var(--text-muted)]'}>★</span>
        </button>
      ))}
      {value && (
        <span className="text-xs text-[var(--text-muted)] ml-1">
          {['','Terrible','Poor','Okay','Good','Excellent'][value]}
        </span>
      )}
    </div>
  );
}

// ── Prompt textarea ────────────────────────────────────────────────────────
function PromptField({ prompt, value, onChange, readOnly }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
        {prompt.label}
      </label>
      {readOnly ? (
        <div className="min-h-[60px] text-sm text-[var(--text-secondary)] leading-relaxed bg-[var(--surface-inset)] rounded-xl px-4 py-3 border border-[var(--border)]">
          {value || <span className="text-[var(--text-muted)] italic">Not answered</span>}
        </div>
      ) : (
        <textarea
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}
          placeholder={prompt.placeholder}
          rows={3}
          className="w-full text-sm text-[var(--text-primary)] leading-relaxed border border-[var(--border)] rounded-xl px-4 py-3
                     resize-none focus:outline-none focus:ring-2 focus:ring-zinc-300 placeholder:text-[var(--text-muted)]
                     bg-[var(--surface-raised)] transition-all"
        />
      )}
    </div>
  );
}

// ── History entry ──────────────────────────────────────────────────────────
function HistoryEntry({ entry, onDelete, onReopen }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-[var(--surface-raised)] rounded-2xl border border-[var(--border)] overflow-hidden">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-[var(--surface-inset)] transition-colors text-left">
        <div className="flex items-center gap-3">
          <div className="space-y-0">
            <p className="text-sm font-semibold text-[var(--text-primary)]">{formatWeekKey(entry.weekKey)}</p>
            <p className="text-[11px] text-[var(--text-muted)]">{weekRange(entry.weekKey)}</p>
          </div>
          {entry.rating && (
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }, (_, i) => (
                <span key={i} className={`text-sm ${i < entry.rating ? 'text-amber-400' : 'text-[var(--text-muted)]'}`}>★</span>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[var(--text-muted)]">
            {Object.values(entry.answers ?? {}).filter(v => v?.trim()).length}/{REVIEW_PROMPTS.length} answered
          </span>
          <span className="text-[var(--text-muted)] text-sm">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-5 pt-1 border-t border-[var(--border)] space-y-4">
          {REVIEW_PROMPTS.map(prompt => (
            <PromptField
              key={prompt.id}
              prompt={prompt}
              value={entry.answers?.[prompt.key]}
              onChange={() => {}}
              readOnly={true}
            />
          ))}
          <div className="flex gap-2 pt-2">
            <button onClick={() => onReopen(entry.weekKey)}
              className="text-xs border border-[var(--border)] text-[var(--text-secondary)] px-3 py-1.5 rounded-lg hover:bg-[var(--surface-inset)] transition-colors">
              Re-open & edit
            </button>
            <button onClick={() => onDelete(entry.weekKey)}
              className="text-xs border border-red-100 text-red-400 px-3 py-1.5 rounded-lg hover:bg-[var(--fill-red)] transition-colors">
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── WeeklyReviewModule ─────────────────────────────────────────────────────
export default function WeeklyReviewModule() {
  const { state, saveReview, deleteReview } = useOS();
  const reviews = state.reviews ?? {};
  const [view, setView] = useState('write'); // write | history
  const [weekKey, setWeekKey] = useState(getWeekKey());
  const [answers, setAnswers] = useState({});
  const [rating, setRating]   = useState(null);
  const [saved, setSaved]     = useState(false);

  // Hydrate from existing entry if present
  useEffect(() => {
    const existing = reviews[weekKey];
    if (existing) {
      setAnswers(existing.answers ?? {});
      setRating(existing.rating ?? null);
    } else {
      setAnswers({});
      setRating(null);
    }
  }, [weekKey]);

  const setAnswer = (key, value) => {
    setSaved(false);
    setAnswers(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    saveReview(weekKey, answers, rating);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const answeredCount = Object.values(answers).filter(v => v?.trim()).length;
  const totalCount    = REVIEW_PROMPTS.length;
  const historyList   = Object.values(reviews).sort((a, b) => b.weekKey.localeCompare(a.weekKey));

  const reopenEntry = (wk) => {
    setWeekKey(wk);
    setView('write');
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto space-y-5 pb-12">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Weekly Review</h1>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {historyList.length} past review{historyList.length !== 1 ? 's' : ''} saved
            </p>
          </div>
          <div className="flex gap-1 bg-[var(--surface-inset)] rounded-xl p-1">
            <button onClick={() => setView('write')}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all
                ${view === 'write' ? 'bg-[var(--surface-raised)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-secondary)] hover:text-secondary'}`}>
              Write
            </button>
            <button onClick={() => setView('history')}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all
                ${view === 'history' ? 'bg-[var(--surface-raised)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-secondary)] hover:text-secondary'}`}>
              History {historyList.length > 0 && `(${historyList.length})`}
            </button>
          </div>
        </div>

        {/* ── Write view ── */}
        {view === 'write' && (
          <>
            {/* Week selector */}
            <div className="bg-[var(--surface-raised)] rounded-2xl border border-[var(--border)] px-5 py-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{formatWeekKey(weekKey)}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">{weekRange(weekKey)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() - 7);
                      setWeekKey(getWeekKey(d));
                    }}
                    className="text-xs border border-[var(--border)] px-2.5 py-1.5 rounded-lg hover:bg-[var(--surface-inset)] transition-colors text-[var(--text-secondary)]">
                    ‹ Prev week
                  </button>
                  <button onClick={() => setWeekKey(getWeekKey())}
                    className="text-xs border border-[var(--border)] px-2.5 py-1.5 rounded-lg hover:bg-[var(--surface-inset)] transition-colors text-[var(--text-secondary)]">
                    This week
                  </button>
                </div>
              </div>

              {/* Progress */}
              <div className="mt-3 space-y-1">
                <div className="flex justify-between text-[11px] text-[var(--text-muted)]">
                  <span>{answeredCount}/{totalCount} prompts answered</span>
                  {reviews[weekKey] && <span className="text-emerald-500 font-medium">✓ Saved</span>}
                </div>
                <div className="h-1 bg-[var(--surface-inset)] rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-400 rounded-full transition-all duration-500"
                    style={{ width: `${(answeredCount / totalCount) * 100}%` }} />
                </div>
              </div>
            </div>

            {/* Rating */}
            <div className="bg-[var(--surface-raised)] rounded-2xl border border-[var(--border)] px-5 py-4">
              <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">Overall week rating</p>
              <RatingStars value={rating} onChange={r => { setRating(r); setSaved(false); }} />
            </div>

            {/* Prompts */}
            <div className="bg-[var(--surface-raised)] rounded-2xl border border-[var(--border)] px-5 py-5 space-y-5">
              {REVIEW_PROMPTS.map(prompt => (
                <PromptField
                  key={prompt.id}
                  prompt={prompt}
                  value={answers[prompt.key]}
                  onChange={val => setAnswer(prompt.key, val)}
                  readOnly={false}
                />
              ))}
            </div>

            {/* Save bar */}
            <div className="sticky bottom-0 bg-[var(--surface)]/95 backdrop-blur border-t border-[var(--border)] -mx-6 px-6 py-3 flex items-center justify-between">
              <span className="text-xs text-[var(--text-muted)]">
                {saved ? '✓ Saved to history' : 'Unsaved changes'}
              </span>
              <button onClick={handleSave}
                className={`text-sm font-medium px-5 py-2 rounded-xl transition-all
                  ${saved
                    ? 'bg-[var(--fill-emerald)]0 text-white'
                    : 'bg-[var(--sidebar-active)] text-[var(--sidebar-active-text)] hover:bg-[var(--text-secondary)]'}`}>
                {saved ? '✓ Saved' : 'Save review'}
              </button>
            </div>
          </>
        )}

        {/* ── History view ── */}
        {view === 'history' && (
          <>
            {historyList.length === 0 ? (
              <div className="text-center py-16 text-[var(--text-muted)]">
                <p className="text-4xl mb-3">📓</p>
                <p className="text-sm">No reviews saved yet</p>
                <p className="text-xs mt-1">Complete your first weekly review to build your history</p>
              </div>
            ) : (
              <div className="space-y-2">
                {historyList.map(entry => (
                  <HistoryEntry
                    key={entry.weekKey}
                    entry={entry}
                    onDelete={deleteReview}
                    onReopen={reopenEntry}
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
