import { useState, useEffect, useRef, useCallback } from 'react';
import { useOS } from '../../context/OSContext';

// ── Timer presets ──────────────────────────────────────────────────────────
const PRESETS = [
  { label: '25m', minutes: 25, type: 'focus' },
  { label: '50m', minutes: 50, type: 'focus' },
  { label: '90m', minutes: 90, type: 'focus' },
  { label: '5m',  minutes: 5,  type: 'break' },
  { label: '15m', minutes: 15, type: 'break' },
];

const pad = (n) => String(n).padStart(2, '0');
const fmtTime = (s) => `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;

// ── Circular progress arc (SVG) ────────────────────────────────────────────
function TimerRing({ pct, type, size = 220 }) {
  const r        = size / 2 - 12;
  const circ     = 2 * Math.PI * r;
  const dash     = pct * circ;
  const color    = type === 'break' ? 'var(--accent-emerald)' : 'var(--accent-indigo)';
  const trackClr = 'var(--surface-inset)';

  return (
    <svg width={size} height={size} className="-rotate-90 absolute inset-0">
      <circle cx={size/2} cy={size/2} r={r}
        fill="none" stroke={trackClr} strokeWidth="8" />
      <circle cx={size/2} cy={size/2} r={r}
        fill="none" stroke={color} strokeWidth="8"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 1s linear' }} />
    </svg>
  );
}

// ── Session log entry ──────────────────────────────────────────────────────
function SessionRow({ session }) {
  const elapsed = Math.round((session.endMs - session.startMs) / 60000);
  return (
    <div className="flex items-center gap-3 py-2 border-b border-[var(--border)] last:border-0">
      <span className={`w-2 h-2 rounded-full shrink-0
        ${session.type === 'focus' ? 'bg-[var(--accent-indigo)]' : 'bg-[var(--accent-emerald)]'}`} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-[var(--text-primary)] truncate">
          {session.label || (session.type === 'focus' ? 'Focus session' : 'Break')}
        </p>
        {session.taskTitle && (
          <p className="text-[11px] text-[var(--text-muted)] truncate">↳ {session.taskTitle}</p>
        )}
      </div>
      <span className="text-[11px] text-[var(--text-muted)] tabular-nums shrink-0">{elapsed}m</span>
    </div>
  );
}

// ── FocusTimer ─────────────────────────────────────────────────────────────
export default function FocusTimer() {
  const { state } = useOS();
  const tasks = Object.values(state.tasks ?? {}).filter(t => t.status !== 'Done');

  const [preset, setPreset]         = useState(PRESETS[0]);
  const [remaining, setRemaining]   = useState(PRESETS[0].minutes * 60);
  const [running, setRunning]       = useState(false);
  const [started, setStarted]       = useState(false);
  const [linkedTask, setLinkedTask] = useState('');
  const [sessions, setSessions]     = useState([]);
  const [sessionStart, setSessionStart] = useState(null);
  const [notified, setNotified]     = useState(false);

  const intervalRef = useRef(null);
  const totalSecs   = preset.minutes * 60;
  const pct         = remaining / totalSecs;

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Tick
  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setRemaining(r => {
          if (r <= 1) {
            clearInterval(intervalRef.current);
            setRunning(false);
            handleComplete();
            return 0;
          }
          return r - 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running]);

  // Tab title
  useEffect(() => {
    if (started) {
      document.title = `${fmtTime(remaining)} — ${preset.type === 'focus' ? 'Focus' : 'Break'} · OS`;
    } else {
      document.title = 'Lifestyle OS';
    }
    return () => { document.title = 'Lifestyle OS'; };
  }, [remaining, started, preset.type]);

  const handleComplete = useCallback(() => {
    const now = Date.now();
    const task = tasks.find(t => t.id === linkedTask);
    setSessions(s => [...s, {
      type: preset.type,
      label: preset.label,
      startMs: sessionStart ?? now - totalSecs * 1000,
      endMs: now,
      taskTitle: task?.title ?? null,
    }]);
    setStarted(false);
    setNotified(false);

    // Browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(preset.type === 'focus' ? '🎯 Focus session complete!' : '☀️ Break over', {
        body: preset.type === 'focus'
          ? `${preset.label} session done. Time for a break.`
          : 'Back to work. You got this.',
        icon: '/favicon.ico',
      });
    }
  }, [preset, sessionStart, totalSecs, linkedTask, tasks]);

  const handleStart = () => {
    setRunning(true);
    setStarted(true);
    setSessionStart(Date.now());
  };

  const handlePause = () => setRunning(false);

  const handleReset = () => {
    clearInterval(intervalRef.current);
    setRunning(false);
    setStarted(false);
    setRemaining(preset.minutes * 60);
    setSessionStart(null);
  };

  const selectPreset = (p) => {
    if (running) return;
    setPreset(p);
    setRemaining(p.minutes * 60);
    setStarted(false);
  };

  const todaySessions = sessions.filter(s => {
    const d = new Date(s.startMs);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  });
  const focusMinutes = todaySessions
    .filter(s => s.type === 'focus')
    .reduce((acc, s) => acc + Math.round((s.endMs - s.startMs) / 60000), 0);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-md mx-auto space-y-6 pb-10">

        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Focus Timer</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            {focusMinutes > 0 ? `${focusMinutes}m of focus today` : 'No sessions yet today'}
          </p>
        </div>

        {/* Timer face */}
        <div className="flex flex-col items-center gap-6">
          <div className="relative" style={{ width: 220, height: 220 }}>
            <TimerRing pct={pct} type={preset.type} size={220} />
            {/* Inner content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
              <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                {preset.type}
              </span>
              <span className="text-5xl font-mono font-bold text-[var(--text-primary)] tabular-nums leading-none">
                {fmtTime(remaining)}
              </span>
              {linkedTask && (
                <span className="text-[11px] text-[var(--text-muted)] text-center px-4 truncate max-w-[160px]">
                  ↳ {tasks.find(t => t.id === linkedTask)?.title}
                </span>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3">
            {started && (
              <button
                onClick={handleReset}
                className="w-11 h-11 rounded-full border border-[var(--border)] text-[var(--text-muted)]
                           hover:bg-[var(--surface-inset)] transition-colors flex items-center justify-center text-lg"
              >
                ↺
              </button>
            )}
            <button
              onClick={running ? handlePause : handleStart}
              className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold
                         transition-all active:scale-95 shadow-token"
              style={{
                background: preset.type === 'break' ? 'var(--accent-emerald)' : 'var(--accent-indigo)',
                color: '#fff',
              }}
            >
              {running ? '⏸' : started ? '▶' : '▶'}
            </button>
            {started && (
              <div className="w-11 h-11" /> /* Spacer to keep button centred */
            )}
          </div>
        </div>

        {/* Preset selector */}
        <div className="card-sm px-4 py-3 space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Duration</p>
          <div className="flex gap-2 flex-wrap">
            {PRESETS.map(p => (
              <button
                key={p.label}
                onClick={() => selectPreset(p)}
                disabled={running}
                className={[
                  'text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all disabled:opacity-40',
                  preset.label === p.label
                    ? p.type === 'focus'
                      ? 'bg-[var(--fill-indigo)] border-[var(--accent-indigo)] text-[var(--accent-indigo)]'
                      : 'bg-[var(--fill-emerald)] border-[var(--accent-emerald)] text-[var(--accent-emerald)]'
                    : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]',
                ].join(' ')}
              >
                {p.label}
                <span className="ml-1 opacity-50 capitalize text-[10px]">{p.type}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Link to task */}
        {tasks.length > 0 && (
          <div className="card-sm px-4 py-3 space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
              Link to task (optional)
            </p>
            <select
              value={linkedTask}
              onChange={e => setLinkedTask(e.target.value)}
              disabled={running}
              className="input-base disabled:opacity-50"
            >
              <option value="">No task linked</option>
              {tasks.map(t => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
          </div>
        )}

        {/* Session log */}
        {sessions.length > 0 && (
          <div className="card-sm px-4 py-3 space-y-1">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                Session log
              </p>
              <button
                onClick={() => setSessions([])}
                className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                Clear
              </button>
            </div>
            {[...sessions].reverse().map((s, i) => (
              <SessionRow key={i} session={s} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
