import { useState } from 'react';
import { useOS } from '../../context/OSContext';
import { getCycleLetter, parseKey, todayKey, CYCLE_BADGE } from '../../utils/cycleEngine';
import WeekView      from './WeekView';
import TodayView     from './TodayView';
import TemplateEditor from './TemplateEditor';

const TABS = [
  { id: 'week',     label: 'Week View'  },
  { id: 'today',    label: 'Today'      },
  { id: 'template', label: 'Templates'  },
];

export default function CycleModule() {
  const { state, applyGoogleRecurringImports } = useOS();
  const { cycleStartDate } = state;
  const [tab, setTab] = useState('week');
  const pendingRecurringImports = state.ui?.pendingGoogleRecurringImports ?? [];

  const currentLetter = getCycleLetter(new Date(), parseKey(cycleStartDate));

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Module header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Cycle Calendar</h1>
          <span className={`text-sm px-3 py-1 rounded-full border font-semibold ${CYCLE_BADGE[currentLetter]}`}>
            Week {currentLetter} this week
          </span>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 bg-[var(--surface-inset)] rounded-xl p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all
                ${tab === t.id
                  ? 'bg-[var(--surface-raised)] text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-secondary'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {pendingRecurringImports.length > 0 ? (
          <div className="mb-3 rounded-xl border border-amber-200 bg-[var(--fill-amber)] px-4 py-3 flex items-center justify-between gap-3">
            <p className="text-xs text-amber-700">
              {pendingRecurringImports.length} recurring Google event{pendingRecurringImports.length === 1 ? '' : 's'} ready to import into cycle templates.
            </p>
            <button
              onClick={applyGoogleRecurringImports}
              className="text-xs px-3 py-1.5 rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors"
            >
              Import Recurring
            </button>
          </div>
        ) : null}
        {tab === 'week'     && <div className="h-full overflow-y-auto"><WeekView /></div>}
        {tab === 'today'    && (
          <div className="bg-[var(--surface-raised)] rounded-2xl border border-[var(--border)] p-6 h-full overflow-y-auto">
            <TodayView dateKey={todayKey()} />
          </div>
        )}
        {tab === 'template' && (
          <div className="bg-[var(--surface-raised)] rounded-2xl border border-[var(--border)] p-6 h-full overflow-y-auto">
            <TemplateEditor />
          </div>
        )}
      </div>
    </div>
  );
}
