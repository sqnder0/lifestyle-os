import { useState } from 'react';
import { useOS } from '../../context/OSContext';
import {
  getCycleWeekOf, resolveWeek, parseKey, toKey,
  formatDayHeading, CYCLE_BADGE, todayKey,
  DAYS_SHORT,
} from '../../utils/cycleEngine';
import EventBlock from './EventBlock';
import TodayView from './TodayView';

// ── DayColumn ─────────────────────────────────────────────────────────────
function DayColumn({ dayInfo, events, override, onSelectDay, isSelected }) {
  const isToday   = dayInfo.isToday;
  const cancelled = override?.deleted;
  const hasOv     = !cancelled && override && (
    Object.keys(override.blockOverrides ?? {}).length > 0 ||
    (override.addedBlocks?.length ?? 0) > 0
  );

  return (
    <div
      onClick={() => onSelectDay(dayInfo.key)}
      className={`
        flex flex-col gap-1.5 p-2 rounded-xl cursor-pointer transition-all min-h-[120px]
        ${isSelected ? 'bg-[var(--sidebar-active)] text-[var(--sidebar-active-text)] ring-2 ring-[var(--sidebar-active)]' :
          isToday    ? 'bg-[var(--fill-indigo)] ring-2 ring-indigo-200' :
                       'bg-[var(--surface-raised)] hover:bg-[var(--surface-inset)]'}
        border ${isSelected ? 'border-[var(--text-primary)]' : 'border-[var(--border)]'}
      `}
    >
      {/* Column header */}
      <div className="flex items-center justify-between px-0.5">
        <div>
          <p className={`text-[11px] font-semibold uppercase tracking-widest
            ${isSelected ? 'text-[var(--text-muted)]' : isToday ? 'text-indigo-500' : 'text-[var(--text-muted)]'}`}>
            {dayInfo.label}
          </p>
          <p className={`text-base font-bold leading-none mt-0.5
            ${isSelected ? 'text-white' : isToday ? 'text-indigo-700' : 'text-[var(--text-primary)]'}`}>
            {parseKey(dayInfo.key).getDate()}
          </p>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          {isToday && !isSelected && (
            <span className="text-[9px] bg-[var(--fill-indigo)]0 text-white rounded-full px-1.5 py-0.5 font-bold">
              TODAY
            </span>
          )}
          {hasOv && (
            <span title="Has overrides" className={`text-[9px] rounded-full px-1.5 py-0.5 font-semibold
              ${isSelected ? 'bg-amber-400 text-amber-900' : 'bg-amber-100 text-amber-600'}`}>
              MODIFIED
            </span>
          )}
          {cancelled && (
            <span className={`text-[9px] rounded-full px-1.5 py-0.5 font-semibold
              ${isSelected ? 'bg-red-400 text-white' : 'bg-red-100 text-red-600'}`}>
              CANCELLED
            </span>
          )}
        </div>
      </div>

      {/* Events */}
      {cancelled ? (
        <div className={`text-[10px] text-center py-3 opacity-40 ${isSelected ? 'text-white' : 'text-[var(--text-secondary)]'}`}>
          Day cancelled
        </div>
      ) : events.length === 0 ? (
        <div className={`text-[10px] text-center py-3 opacity-30 ${isSelected ? 'text-white' : 'text-[var(--text-muted)]'}`}>
          Free
        </div>
      ) : (
        <div className="space-y-1 overflow-hidden">
          {events.slice(0, 4).map((ev) => (
            isSelected ? (
              /* White-on-dark chip when selected */
              <div key={ev.id} className="text-[10px] bg-white/10 rounded-lg px-2 py-1 truncate text-white/90">
                {ev.label}
              </div>
            ) : (
              <EventBlock key={ev.id} event={ev} variant="week" />
            )
          ))}
          {events.length > 4 && (
            <p className={`text-[10px] pl-1 opacity-60 ${isSelected ? 'text-white' : 'text-[var(--text-muted)]'}`}>
              +{events.length - 4} more
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main WeekView ─────────────────────────────────────────────────────────
export default function WeekView() {
  const { state } = useOS();
  const { cycles, overrides = {}, cycleStartDate } = state;

  const [viewDate, setViewDate]     = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(todayKey());

  const week      = getCycleWeekOf(viewDate, parseKey(cycleStartDate));
  const resolved  = resolveWeek(week.days, cycles, overrides, parseKey(cycleStartDate));

  const goPrev = () => setViewDate((d) => { const n = new Date(d); n.setDate(n.getDate()-7); return n; });
  const goNext = () => setViewDate((d) => { const n = new Date(d); n.setDate(n.getDate()+7); return n; });
  const goToday = () => { setViewDate(new Date()); setSelectedDay(todayKey()); };

  const monthLabel = viewDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Navigation bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button onClick={goPrev}
              className="p-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--surface-inset)] text-[var(--text-secondary)] transition-colors text-sm">
              ‹
            </button>
            <button onClick={goNext}
              className="p-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--surface-inset)] text-[var(--text-secondary)] transition-colors text-sm">
              ›
            </button>
          </div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">{monthLabel}</h3>
          <span className={`text-xs px-2.5 py-1 rounded-full border font-semibold ${CYCLE_BADGE[week.letter]}`}>
            Week {week.letter}
          </span>
        </div>

        <button onClick={goToday}
          className="text-xs px-3 py-1.5 border border-[var(--border)] rounded-lg hover:bg-[var(--surface-inset)] transition-colors text-[var(--text-secondary)]">
          Today
        </button>
      </div>

      {/* 7-column grid */}
      <div className="grid grid-cols-7 gap-2">
        {week.days.map((day) => (
          <DayColumn
            key={day.key}
            dayInfo={day}
            events={resolved[day.key] ?? []}
            override={overrides[day.key]}
            onSelectDay={setSelectedDay}
            isSelected={selectedDay === day.key}
          />
        ))}
      </div>

      {/* Selected day detail panel */}
      {selectedDay && (
        <div className="flex-1 bg-[var(--surface-raised)] rounded-2xl border border-[var(--border)] p-5 overflow-y-auto">
          <TodayView dateKey={selectedDay} />
        </div>
      )}
    </div>
  );
}
