import { useState } from 'react';
import { useOS } from '../../context/OSContext';
import {
  todayKey, getCycleLetter,
  formatDayHeading, CYCLE_BADGE,
  parseKey, DAYS_SHORT,
} from '../../utils/cycleEngine';
import EventBlock from './EventBlock';

// ── AddBlockForm ──────────────────────────────────────────────────────────
function AddBlockForm({ dateKey, onAdd, onCancel }) {
  const [form, setForm] = useState({ label:'', hour:9, minute:0, duration:60, type:'focus' });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="bg-[var(--surface-inset)] border border-[var(--border)] rounded-xl p-4 space-y-3">
      <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Add event to this day</p>

      <input
        className="w-full text-sm border border-[var(--border)] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zinc-300"
        placeholder="Event label…"
        value={form.label}
        onChange={(e) => set('label', e.target.value)}
      />

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-[11px] text-[var(--text-muted)] mb-1 block">Start time</label>
          <div className="flex gap-1">
            <input type="number" min={0} max={23} value={form.hour}
              onChange={(e) => set('hour', Number(e.target.value))}
              className="w-16 text-sm text-center border border-[var(--border)] rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-zinc-300"
            />
            <span className="self-center text-[var(--text-muted)]">:</span>
            <select value={form.minute} onChange={(e) => set('minute', Number(e.target.value))}
              className="w-16 text-sm border border-[var(--border)] rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-zinc-300"
            >
              {[0,15,30,45].map((m) => <option key={m} value={m}>{String(m).padStart(2,'0')}</option>)}
            </select>
          </div>
        </div>

        <div className="flex-1">
          <label className="text-[11px] text-[var(--text-muted)] mb-1 block">Duration (min)</label>
          <input type="number" min={15} step={15} value={form.duration}
            onChange={(e) => set('duration', Number(e.target.value))}
            className="w-full text-sm border border-[var(--border)] rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-zinc-300"
          />
        </div>

        <div className="flex-1">
          <label className="text-[11px] text-[var(--text-muted)] mb-1 block">Type</label>
          <select value={form.type} onChange={(e) => set('type', e.target.value)}
            className="w-full text-sm border border-[var(--border)] rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-zinc-300"
          >
            {['focus','rest','admin','social','health'].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={() => { if (form.label.trim()) { onAdd({ ...form, day: DAYS_SHORT[parseKey(dateKey).getDay()] }); } }}
          className="flex-1 text-sm bg-[var(--sidebar-active)] text-[var(--sidebar-active-text)] rounded-lg py-2 hover:bg-[var(--text-secondary)] transition-colors font-medium"
        >
          Add event
        </button>
        <button
          onClick={onCancel}
          className="px-4 text-sm border border-[var(--border)] rounded-lg py-2 hover:bg-[var(--surface-inset)] transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Main TodayView ────────────────────────────────────────────────────────
export default function TodayView({ dateKey = todayKey() }) {
  const { state, selectors, addBlockOnDate, removeAddedBlock, cancelDayOverride, restoreDayOverride, setOverrideNote } = useOS();
  const [showAddForm, setShowAddForm] = useState(false);
  const [noteEdit, setNoteEdit] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');

  const { overrides = {}, cycleStartDate } = state;
  const letter   = getCycleLetter(parseKey(dateKey), parseKey(cycleStartDate));
  const events   = selectors.dayEvents(dateKey);
  const briefing = selectors.dailyBriefing(dateKey);
  const override = overrides[dateKey];
  const isToday  = dateKey === todayKey();
  const isCancelled = override?.deleted;
  const dayNote  = override?.note ?? '';

  const date = parseKey(dateKey);
  const heading = formatDayHeading(date);

  const handleAddBlock = (block) => {
    addBlockOnDate(dateKey, block);
    setShowAddForm(false);
  };

  const handleDeleteEvent = (event) => {
    if (event.source === 'added') {
      removeAddedBlock(dateKey, event.id);
    }
    // Template block deletion is handled via override in the WeekView context
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">{heading}</h2>
            {isToday && (
              <span className="text-[11px] bg-[var(--sidebar-active)] text-[var(--sidebar-active-text)] rounded-full px-2 py-0.5 font-medium">
                Today
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-0.5 flex items-center gap-1.5">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-medium ${CYCLE_BADGE[letter]}`}>
              Week {letter}
            </span>
            <span>·</span>
            <span>{events.length} events</span>
            {isCancelled && <span className="text-red-500 font-medium">· Day cancelled</span>}
          </p>
        </div>

        <div className="flex gap-2">
          {!isCancelled ? (
            <>
              <button
                onClick={() => setShowAddForm((v) => !v)}
                className="text-xs px-3 py-1.5 border border-[var(--border)] rounded-lg hover:bg-[var(--surface-inset)] transition-colors"
              >
                + Add event
              </button>
              <button
                onClick={() => cancelDayOverride(dateKey)}
                className="text-xs px-3 py-1.5 border border-red-100 text-red-500 rounded-lg hover:bg-[var(--fill-red)] transition-colors"
              >
                Cancel day
              </button>
            </>
          ) : (
            <button
              onClick={() => restoreDayOverride(dateKey)}
              className="text-xs px-3 py-1.5 border border-emerald-200 text-emerald-600 rounded-lg hover:bg-[var(--fill-emerald)] transition-colors"
            >
              Restore day
            </button>
          )}
        </div>
      </div>

      {/* Physical strategy */}
      {(briefing.workout || briefing.mealProtocol) && (
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-inset)] px-4 py-3 space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Today's session</p>
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              {briefing.workout?.name ?? 'No workout scheduled'}
            </p>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              {briefing.isRecoveryOverride ? 'Energy is low, so the high-intensity routine is replaced with recovery.' : (briefing.workout?.note ?? 'Assign a routine in the cycle editor.')}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-inset)] px-4 py-3 space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Fueling</p>
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              {briefing.mealProtocol?.name ?? 'No meal protocol assigned'}
            </p>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              {briefing.mealProtocol?.description ?? 'Assign a weekly meal protocol in the cycle editor.'}
            </p>
          </div>
        </div>
      )}

      {/* Day note */}
      {(dayNote || noteEdit) && (
        <div className="bg-[var(--fill-amber)] border border-amber-200 rounded-xl px-4 py-3">
          {noteEdit ? (
            <div className="space-y-2">
              <textarea
                rows={2}
                className="w-full text-sm bg-transparent resize-none focus:outline-none"
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                placeholder="Day note…"
                autoFocus
              />
              <div className="flex gap-2">
                <button onClick={() => { setOverrideNote(dateKey, noteDraft); setNoteEdit(false); }}
                  className="text-xs px-3 py-1 bg-amber-600 text-white rounded-lg hover:bg-amber-700">
                  Save
                </button>
                <button onClick={() => setNoteEdit(false)}
                  className="text-xs px-3 py-1 border border-amber-200 rounded-lg hover:bg-[var(--fill-amber)]">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p
              className="text-sm text-amber-800 cursor-pointer"
              onClick={() => { setNoteDraft(dayNote); setNoteEdit(true); }}
              title="Click to edit note"
            >
              📝 {dayNote}
            </p>
          )}
        </div>
      )}

      {!dayNote && !noteEdit && (
        <button
          onClick={() => { setNoteDraft(''); setNoteEdit(true); }}
          className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
        >
          + Add day note
        </button>
      )}

      {/* Add form */}
      {showAddForm && (
        <AddBlockForm dateKey={dateKey} onAdd={handleAddBlock} onCancel={() => setShowAddForm(false)} />
      )}

      {/* Events */}
      {isCancelled ? (
        <div className="text-center py-12 text-[var(--text-muted)]">
          <p className="text-3xl mb-2">🚫</p>
          <p className="text-sm font-medium">Day cancelled</p>
          <p className="text-xs mt-1">Restore to see template events</p>
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-12 text-[var(--text-muted)]">
          <p className="text-3xl mb-2">✦</p>
          <p className="text-sm">No events scheduled</p>
          <p className="text-xs mt-1">Add events or configure Week {letter} template</p>
        </div>
      ) : (
        <div className="space-y-2">
          {events.map((event) => (
            <EventBlock
              key={event.id}
              event={event}
              variant="today"
              onDelete={event.source === 'added' ? handleDeleteEvent : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
