import { useOS } from '../../context/OSContext';
import {
  resolveDay, parseKey, toKey, addDays, getCycleLetter,
  formatTime, formatDuration, blockColors, CYCLE_BADGE,
} from '../../utils/cycleEngine';

const _localToKey = (d) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/**
 * Walk forward from tomorrow (or rest-of-today) collecting resolved events
 * until we have `limit` of them, scanning at most `scanDays` days ahead.
 */
function getNextEvents(cycles, overrides, cycleStartDate, limit = 2, scanDays = 21) {
  const now = new Date();
  const currentHour = now.getHours();
  const results = [];

  for (let offset = 0; offset < scanDays && results.length < limit; offset++) {
    const d = addDays(now, offset);
    const key = _localToKey(d);
    const events = resolveDay(key, cycles, overrides, parseKey(cycleStartDate));
    const letter = getCycleLetter(d, parseKey(cycleStartDate));

    for (const ev of events) {
      if (results.length >= limit) break;
      // On today (offset 0), skip events that have already passed
      if (offset === 0 && ev.hour < currentHour) continue;
      results.push({ ...ev, dateKey: key, date: new Date(d), letter });
    }
  }
  return results;
}

// ── Day label helper ────────────────────────────────────────────────────────
const relativeDay = (dateKey) => {
  const todayStr = _localToKey(new Date());
  const tomorrowStr = _localToKey(addDays(new Date(), 1));
  if (dateKey === todayStr) return 'Today';
  if (dateKey === tomorrowStr) return 'Tomorrow';
  const d = parseKey(dateKey);
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
};

// ── Single upcoming card ────────────────────────────────────────────────────
function UpcomingCard({ event }) {
  const c = blockColors(event.type);
  const isToday = event.dateKey === _localToKey(new Date());

  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl border ${c.bg} ${c.border} ${c.text}`}>
      {/* Left: time column */}
      <div className="shrink-0 text-right min-w-[52px]">
        <p className="text-xs font-semibold leading-tight">
          {formatTime(event.hour, event.minute ?? 0)}
        </p>
        <p className="text-[11px] opacity-60 mt-0.5">{formatDuration(event.duration)}</p>
      </div>

      {/* Dot */}
      <div className="mt-1.5 shrink-0">
        <div className={`w-2 h-2 rounded-full ${c.dot}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-tight truncate">{event.label}</p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${CYCLE_BADGE[event.letter]}`}>
            Wk {event.letter}
          </span>
          <span className="text-[11px] opacity-60">{relativeDay(event.dateKey)}</span>
          {event.source !== 'template' && (
            <span className="text-[10px] opacity-50 italic">
              {event.source === 'added' ? '+ added' : '~ modified'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── UpcomingEvents ──────────────────────────────────────────────────────────
export default function UpcomingEvents() {
  const { state } = useOS();
  const { cycles, overrides = {}, cycleStartDate } = state;

  const events = getNextEvents(cycles, overrides, cycleStartDate, 2, 21);

  return (
    <div className="bg-[var(--surface-raised)] rounded-2xl border border-[var(--border)] px-5 py-4 space-y-3">
      <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">
        Upcoming
      </h2>

      {events.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)] text-center py-4">
          No events in the next 3 weeks
        </p>
      ) : (
        <div className="space-y-2">
          {events.map((ev) => (
            <UpcomingCard key={`${ev.dateKey}-${ev.id}`} event={ev} />
          ))}
        </div>
      )}
    </div>
  );
}
