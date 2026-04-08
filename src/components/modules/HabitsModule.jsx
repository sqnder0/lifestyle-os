import { useState, useMemo } from 'react';
import { useOS } from '../../context/OSContext';

// ── Schema helpers (local — no persistence needed beyond state) ────────────
const d2 = (n) => String(n).padStart(2, '0');
const toKey = (d) => `${d.getFullYear()}-${d2(d.getMonth()+1)}-${d2(d.getDate())}`;
const todayKey = () => toKey(new Date());
const addDays  = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };

// ── Context helpers (habits live in state.habits) ─────────────────────────
const DEFAULT_HABITS = {
  'hb-001': { id:'hb-001', name:'Morning movement', emoji:'🏃', color:'#6366f1', logs:{}, createdAt:new Date().toISOString() },
  'hb-002': { id:'hb-002', name:'Read 20 min',      emoji:'📚', color:'#10b981', logs:{}, createdAt:new Date().toISOString() },
  'hb-003': { id:'hb-003', name:'No phone first hr', emoji:'📵', color:'#f59e0b', logs:{}, createdAt:new Date().toISOString() },
};

// ── Streak calculator ──────────────────────────────────────────────────────
function calcStreak(logs) {
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 366; i++) {
    const key = toKey(addDays(today, -i));
    if (logs[key]) streak++;
    else if (i > 0) break; // allow today to be incomplete without breaking yesterday streak
  }
  return streak;
}

function calcLongestStreak(logs) {
  const keys = Object.keys(logs).filter(k => logs[k]).sort();
  if (!keys.length) return 0;
  let best = 1, run = 1;
  for (let i = 1; i < keys.length; i++) {
    const prev = new Date(keys[i-1]);
    const curr = new Date(keys[i]);
    const diff = Math.round((curr - prev) / 86400000);
    if (diff === 1) { run++; best = Math.max(best, run); }
    else run = 1;
  }
  return best;
}

// ── 12-week heatmap grid ──────────────────────────────────────────────────
function HeatmapGrid({ logs, color }) {
  const weeks = 12;
  const today = new Date();
  const startDate = addDays(today, -(weeks * 7 - 1));

  const cells = [];
  for (let i = 0; i < weeks * 7; i++) {
    const d = addDays(startDate, i);
    const key = toKey(d);
    const done = !!logs[key];
    const isToday = key === todayKey();
    cells.push({ key, done, isToday, day: d.getDay() });
  }

  // Group into weeks
  const weekGroups = [];
  for (let w = 0; w < weeks; w++) {
    weekGroups.push(cells.slice(w * 7, (w + 1) * 7));
  }

  return (
    <div className="flex gap-0.5">
      {weekGroups.map((week, wi) => (
        <div key={wi} className="flex flex-col gap-0.5">
          {week.map((cell) => (
            <div
              key={cell.key}
              title={cell.key}
              className={`w-2.5 h-2.5 rounded-[2px] transition-all ${cell.isToday ? 'ring-1 ring-offset-[1px] ring-current' : ''}`}
              style={{
                backgroundColor: cell.done
                  ? color
                  : 'var(--surface-inset)',
                opacity: cell.done ? 1 : 0.5,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Completion ring ────────────────────────────────────────────────────────
function Ring({ pct, color, size = 40 }) {
  const r = size / 2 - 4;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className="-rotate-90 shrink-0">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--surface-inset)" strokeWidth="3.5" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="3.5"
        strokeDasharray={`${pct * circ} ${circ}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.5s ease' }} />
    </svg>
  );
}

// ── Habit card ─────────────────────────────────────────────────────────────
function HabitCard({ habit, onToggle, onDelete, onRename }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(habit.name);

  const logs    = habit.logs ?? {};
  const streak  = calcStreak(logs);
  const longest = calcLongestStreak(logs);
  const doneToday = !!logs[todayKey()];

  // Last 7 days completion rate for ring
  const last7 = Array.from({ length: 7 }, (_, i) => toKey(addDays(new Date(), -i)));
  const pct7   = last7.filter(k => logs[k]).length / 7;

  return (
    <div className={`card px-4 py-3 space-y-3 transition-all ${doneToday ? 'border-[var(--accent-emerald)]/30' : ''}`}>
      {/* Header row */}
      <div className="flex items-center gap-3">
        {/* Emoji + toggle */}
        <button
          onClick={() => onToggle(habit.id, todayKey())}
          className={`w-10 h-10 rounded-xl text-lg flex items-center justify-center shrink-0
            border-2 transition-all active:scale-95
            ${doneToday
              ? 'border-[var(--accent-emerald)] bg-[var(--fill-emerald)]'
              : 'border-[var(--border)] bg-[var(--surface-inset)] hover:border-[var(--border-strong)]'}`}
          title={doneToday ? 'Mark incomplete' : 'Mark done'}
        >
          {habit.emoji}
        </button>

        {/* Name */}
        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              autoFocus
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onBlur={() => { onRename(habit.id, draft); setEditing(false); }}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') { onRename(habit.id, draft); setEditing(false); } }}
              className="w-full text-sm font-semibold bg-transparent border-b border-[var(--border-strong)] focus:outline-none text-[var(--text-primary)]"
            />
          ) : (
            <p
              className={`text-sm font-semibold cursor-pointer text-[var(--text-primary)] ${doneToday ? 'line-through opacity-60' : ''}`}
              onClick={() => setEditing(true)}
            >
              {habit.name}
            </p>
          )}
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[11px] text-[var(--text-muted)]">
              {streak > 0 ? `🔥 ${streak} day streak` : 'No streak yet'}
            </span>
            {longest > streak && (
              <span className="text-[11px] text-[var(--text-muted)]">· best {longest}</span>
            )}
          </div>
        </div>

        {/* Ring (7-day %) */}
        <div className="relative shrink-0">
          <Ring pct={pct7} color={habit.color} size={36} />
          <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold"
            style={{ color: habit.color }}>
            {Math.round(pct7 * 100)}
          </span>
        </div>

        {/* Delete */}
        <button
          onClick={() => onDelete(habit.id)}
          className="opacity-0 group-hover:opacity-100 p-1 text-[var(--text-muted)] hover:text-red-400 transition-colors text-xs shrink-0"
        >
          ✕
        </button>
      </div>

      {/* Heatmap */}
      <HeatmapGrid logs={logs} color={habit.color} />
    </div>
  );
}

// ── Add habit form ─────────────────────────────────────────────────────────
const COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#0ea5e9','#8b5cf6','#f43f5e'];
const EMOJIS = ['🏃','📚','💧','🧘','🥗','💪','📵','✍️','🎸','🌿','😴','🧠','🙏','🎯'];

function AddHabitForm({ onAdd, onCancel }) {
  const [name, setName]   = useState('');
  const [emoji, setEmoji] = useState('🏃');
  const [color, setColor] = useState('#6366f1');

  return (
    <div className="card px-4 py-4 space-y-3">
      <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)]">New Habit</p>

      <input
        autoFocus
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && name.trim()) onAdd({ name: name.trim(), emoji, color }); if (e.key === 'Escape') onCancel(); }}
        placeholder="Habit name…"
        className="input-base"
      />

      {/* Emoji picker */}
      <div>
        <p className="text-[11px] text-[var(--text-muted)] mb-1.5">Icon</p>
        <div className="flex gap-1.5 flex-wrap">
          {EMOJIS.map(e => (
            <button key={e} onClick={() => setEmoji(e)}
              className={`w-8 h-8 rounded-lg text-base flex items-center justify-center transition-all
                ${emoji === e ? 'bg-[var(--surface-inset)] ring-2 ring-[var(--border-strong)] scale-110' : 'hover:bg-[var(--surface-inset)]'}`}>
              {e}
            </button>
          ))}
        </div>
      </div>

      {/* Color picker */}
      <div>
        <p className="text-[11px] text-[var(--text-muted)] mb-1.5">Color</p>
        <div className="flex gap-2">
          {COLORS.map(c => (
            <button key={c} onClick={() => setColor(c)}
              className={`w-6 h-6 rounded-full transition-all ${color === c ? 'scale-125 ring-2 ring-offset-2 ring-[var(--border-strong)]' : 'hover:scale-110'}`}
              style={{ background: c }} />
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={() => { if (name.trim()) onAdd({ name: name.trim(), emoji, color }); }}
          className="flex-1 text-sm font-medium py-2 rounded-xl bg-[var(--sidebar-active)] text-[var(--sidebar-active-text)] hover:opacity-90 transition-opacity"
        >
          Create habit
        </button>
        <button onClick={onCancel} className="px-4 text-sm border border-[var(--border)] rounded-xl hover:bg-[var(--surface-inset)] transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Today's summary bar ────────────────────────────────────────────────────
function TodaySummary({ habits }) {
  const total = habits.length;
  const done  = habits.filter(h => !!h.logs?.[todayKey()]).length;
  const pct   = total ? done / total : 0;

  return (
    <div className="card-sm px-4 py-3 flex items-center gap-4">
      <div className="flex-1 space-y-1.5">
        <div className="flex justify-between items-center">
          <span className="text-xs font-semibold text-[var(--text-secondary)]">Today</span>
          <span className="text-xs text-[var(--text-muted)]">{done}/{total} habits</span>
        </div>
        <div className="h-1.5 bg-[var(--surface-inset)] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pct * 100}%`, background: pct === 1 ? '#10b981' : '#6366f1' }}
          />
        </div>
      </div>
      <div className="shrink-0 text-center">
        <p className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">{Math.round(pct * 100)}</p>
        <p className="text-[10px] text-[var(--text-muted)]">%</p>
      </div>
    </div>
  );
}

// ── HabitsModule ───────────────────────────────────────────────────────────
export default function HabitsModule() {
  const { state, update } = useOS();
  const [showForm, setShowForm] = useState(false);

  // Habits live in state.habits — init from state or seed
  const habits = useMemo(() => {
    const raw = state.habits ?? DEFAULT_HABITS;
    return Object.values(raw).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }, [state.habits]);

  const mutateHabits = (fn) => {
    update(s => {
      const current = s.habits ?? DEFAULT_HABITS;
      return { ...s, habits: fn(current) };
    });
  };

  const addHabit = ({ name, emoji, color }) => {
    const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
    mutateHabits(h => ({
      ...h,
      [id]: { id, name, emoji, color, logs: {}, createdAt: new Date().toISOString() },
    }));
    setShowForm(false);
  };

  const toggleLog = (habitId, dateKey) => {
    mutateHabits(h => {
      const habit = h[habitId];
      const logs = { ...habit.logs };
      if (logs[dateKey]) delete logs[dateKey];
      else logs[dateKey] = true;
      return { ...h, [habitId]: { ...habit, logs } };
    });
  };

  const deleteHabit = (habitId) => {
    mutateHabits(h => {
      const { [habitId]: _, ...rest } = h;
      return rest;
    });
  };

  const renameHabit = (habitId, name) => {
    mutateHabits(h => ({ ...h, [habitId]: { ...h[habitId], name } }));
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-xl mx-auto space-y-4 pb-10">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Habits</h1>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {habits.length} tracked · tap to log today
            </p>
          </div>
          <button
            onClick={() => setShowForm(v => !v)}
            className="text-sm font-medium px-4 py-2 rounded-xl bg-[var(--sidebar-active)] text-[var(--sidebar-active-text)] hover:opacity-90 transition-opacity"
          >
            + Habit
          </button>
        </div>

        {/* Today summary */}
        {habits.length > 0 && <TodaySummary habits={habits} />}

        {/* New habit form */}
        {showForm && (
          <AddHabitForm
            onAdd={addHabit}
            onCancel={() => setShowForm(false)}
          />
        )}

        {/* Habit cards */}
        {habits.length === 0 && !showForm ? (
          <div className="text-center py-20 text-[var(--text-muted)]">
            <p className="text-4xl mb-3">◐</p>
            <p className="text-sm font-medium">No habits yet</p>
            <p className="text-xs mt-1 opacity-70">Add your first habit to start building streaks</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 text-xs text-[var(--accent-indigo)] hover:underline"
            >
              + Add first habit
            </button>
          </div>
        ) : (
          <div className="space-y-3 group">
            {habits.map(habit => (
              <HabitCard
                key={habit.id}
                habit={habit}
                onToggle={toggleLog}
                onDelete={deleteHabit}
                onRename={renameHabit}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
