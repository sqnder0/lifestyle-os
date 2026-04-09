import { useState } from 'react';
import { useOS } from '../../context/OSContext';
import { blockColors, DAYS_SHORT, formatTime, formatDuration } from '../../utils/cycleEngine';
import { CYCLE_BADGE } from '../../utils/cycleEngine';
import { WORKOUT_LIBRARY, MEAL_PROTOCOLS, DEFAULT_CYCLE_PLANS } from '../../utils/schema';

const TYPES = ['focus','rest','admin','social','health'];
const LETTERS = ['A','B','C'];

function BlockRow({ block, letter, onEdit, onDelete }) {
  const c = blockColors(block.type);
  return (
    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${c.bg} ${c.border} ${c.text} group`}>
      <div className={`w-2 h-2 rounded-full shrink-0 ${c.dot}`} />
      <span className="text-xs font-semibold w-8 shrink-0">{block.day}</span>
      <span className="text-xs opacity-70 w-16 shrink-0">{formatTime(block.hour, block.minute ?? 0)}</span>
      <span className="text-xs opacity-70 w-14 shrink-0">{formatDuration(block.duration)}</span>
      <span className="flex-1 text-sm font-medium truncate">{block.label}</span>
      <span className="text-[10px] opacity-60 capitalize shrink-0">{block.type}</span>
      <div className="hidden group-hover:flex gap-1 shrink-0">
        <button onClick={() => onEdit(block)}
          className="p-1 rounded hover:bg-black/10 text-xs opacity-70 hover:opacity-100 transition-all">✎</button>
        <button onClick={() => onDelete(block.id)}
          className="p-1 rounded hover:bg-[var(--fill-red)] text-xs text-red-600 opacity-70 hover:opacity-100 transition-all">✕</button>
      </div>
    </div>
  );
}

function BlockForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial ?? {
    day: 'Mon', hour: 9, minute: 0, duration: 60, label: '', type: 'focus',
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="bg-[var(--surface-inset)] border border-[var(--border)] rounded-xl p-4 space-y-3">
      <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
        {initial ? 'Edit block' : 'New template block'}
      </p>

      <input
        className="w-full text-sm border border-[var(--border)] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zinc-300 bg-surface"
        placeholder="Label…"
        value={form.label}
        onChange={(e) => set('label', e.target.value)}
      />

      <div className="grid grid-cols-4 gap-2">
        <div>
          <label className="text-[11px] text-[var(--text-muted)] block mb-1">Day</label>
          <select value={form.day} onChange={(e) => set('day', e.target.value)}
            className="w-full text-sm border border-[var(--border)] rounded-lg px-2 py-1.5 bg-[var(--surface-raised)] focus:outline-none focus:ring-2 focus:ring-zinc-300">
            {DAYS_SHORT.map((d) => <option key={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[11px] text-[var(--text-muted)] block mb-1">Hour</label>
          <input type="number" min={0} max={23} value={form.hour}
            onChange={(e) => set('hour', Number(e.target.value))}
            className="w-full text-sm border border-[var(--border)] rounded-lg px-2 py-1.5 bg-[var(--surface-raised)] text-center focus:outline-none focus:ring-2 focus:ring-zinc-300" />
        </div>
        <div>
          <label className="text-[11px] text-[var(--text-muted)] block mb-1">Minute</label>
          <select value={form.minute} onChange={(e) => set('minute', Number(e.target.value))}
            className="w-full text-sm border border-[var(--border)] rounded-lg px-2 py-1.5 bg-[var(--surface-raised)] focus:outline-none focus:ring-2 focus:ring-zinc-300">
            {[0,15,30,45].map((m) => <option key={m} value={m}>{String(m).padStart(2,'0')}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[11px] text-[var(--text-muted)] block mb-1">Duration (m)</label>
          <input type="number" min={15} step={15} value={form.duration}
            onChange={(e) => set('duration', Number(e.target.value))}
            className="w-full text-sm border border-[var(--border)] rounded-lg px-2 py-1.5 bg-[var(--surface-raised)] text-center focus:outline-none focus:ring-2 focus:ring-zinc-300" />
        </div>
      </div>

      <div>
        <label className="text-[11px] text-[var(--text-muted)] block mb-1">Type</label>
        <div className="flex gap-1.5 flex-wrap">
          {TYPES.map((t) => {
            const c = blockColors(t);
            return (
              <button key={t} onClick={() => set('type', t)}
                className={`text-xs px-3 py-1 rounded-full border font-medium capitalize transition-all
                  ${form.type === t ? `${c.bg} ${c.border} ${c.text}` : 'bg-[var(--surface-raised)] border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-inset)]'}`}>
                {t}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={() => { if (form.label.trim()) onSave(form); }}
          className="flex-1 text-sm bg-[var(--sidebar-active)] text-[var(--sidebar-active-text)] rounded-lg py-2 hover:bg-[var(--text-secondary)] transition-colors font-medium">
          {initial ? 'Save changes' : 'Add block'}
        </button>
        <button onClick={onCancel}
          className="px-4 text-sm border border-[var(--border)] rounded-lg py-2 hover:bg-[var(--surface-inset)] transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function TemplateEditor() {
  const {
    state,
    addCycleBlock,
    updateCycleBlock,
    deleteCycleBlock,
    duplicateCycle,
    setCycleStartDate,
    setCycleWorkoutForDay,
    setCycleMealProtocol,
  } = useOS();
  const { cycles, cycleStartDate } = state;
  const reference = state.reference ?? {};
  const workoutLibrary = reference.workoutLibrary ?? WORKOUT_LIBRARY;
  const mealProtocols = reference.mealProtocols ?? MEAL_PROTOCOLS;
  const cyclePlans = state.cyclePlans ?? DEFAULT_CYCLE_PLANS;

  const [activeLetter, setActiveLetter] = useState('A');
  const [showForm, setShowForm]         = useState(false);
  const [editBlock, setEditBlock]       = useState(null);
  const [showDupModal, setShowDupModal] = useState(false);
  const [dupTarget, setDupTarget]       = useState('B');

  const activeBlocks = cycles[activeLetter]?.blocks ?? [];
  const activePlan = cyclePlans[activeLetter] ?? DEFAULT_CYCLE_PLANS[activeLetter];

  // Group by day for display
  const byDay = DAYS_SHORT.reduce((acc, d) => {
    acc[d] = activeBlocks.filter((b) => b.day === d);
    return acc;
  }, {});

  const intensityClass = (intensity) => {
    if (intensity >= 3) return 'bg-[var(--fill-red)] text-red-600 border-red-100';
    if (intensity === 2) return 'bg-[var(--fill-amber)] text-amber-700 border-amber-100';
    if (intensity === 1) return 'bg-[var(--fill-emerald)] text-emerald-700 border-emerald-100';
    return 'bg-[var(--surface-inset)] text-[var(--text-muted)] border-[var(--border)]';
  };

  const handleSave = (form) => {
    if (editBlock) {
      updateCycleBlock(activeLetter, editBlock.id, form);
      setEditBlock(null);
    } else {
      addCycleBlock(activeLetter, form);
      setShowForm(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Template Editor</h3>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Define the recurring blocks for each week</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[11px] text-[var(--text-muted)]">Cycle start</label>
          <input
            type="date"
            value={cycleStartDate}
            onChange={(e) => setCycleStartDate(e.target.value)}
            className="text-xs border border-[var(--border)] rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-zinc-300"
          />
        </div>
      </div>

      {/* Physical strategy */}
      <div className="card px-5 py-4 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Physical Strategy</h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Assign a routine for each day and one meal protocol for the week.
            </p>
          </div>
          <div className="w-full max-w-xs">
            <label className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-1 block">
              Meal protocol for Week {activeLetter}
            </label>
            <select
              value={activePlan.mealProtocolId ?? ''}
              onChange={(e) => setCycleMealProtocol(activeLetter, e.target.value)}
              className="input-base text-sm"
            >
              {mealProtocols.map((protocol) => (
                <option key={protocol.id} value={protocol.id}>
                  {protocol.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          {DAYS_SHORT.map((day) => {
            const workoutId = activePlan.workoutsByDay?.[day] ?? '';
            const selected = workoutLibrary.find((item) => item.id === workoutId);

            return (
              <div key={day} className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-inset)] px-3 py-2.5">
                <span className="w-10 shrink-0 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-widest">
                  {day}
                </span>
                <select
                  value={workoutId}
                  onChange={(e) => setCycleWorkoutForDay(activeLetter, day, e.target.value)}
                  className="input-base flex-1 text-sm"
                >
                  <option value="">No workout</option>
                  {workoutLibrary.map((workout) => (
                    <option key={workout.id} value={workout.id}>
                      {workout.name}
                    </option>
                  ))}
                </select>
                <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full border ${intensityClass(selected?.intensity_score)}`}>
                  {selected ? `I${selected.intensity_score ?? 1}` : 'None'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Week tabs */}
      <div className="flex gap-1.5">
        {LETTERS.map((l) => (
          <button key={l} onClick={() => setActiveLetter(l)}
            className={`text-sm font-semibold px-4 py-1.5 rounded-full border transition-all
              ${activeLetter === l
                ? CYCLE_BADGE[l] + ' border-current'
                : 'bg-[var(--surface-raised)] border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-inset)]'}`}>
            Week {l}
            <span className="ml-1.5 text-[10px] opacity-60">
              ({cycles[l]?.blocks?.length ?? 0})
            </span>
          </button>
        ))}

        <div className="flex-1" />

        {/* Duplicate */}
        <button onClick={() => setShowDupModal(true)}
          className="text-xs px-3 py-1.5 border border-[var(--border)] rounded-lg hover:bg-[var(--surface-inset)] transition-colors text-[var(--text-secondary)]">
          Duplicate →
        </button>
        {/* Add block */}
        <button onClick={() => { setShowForm(true); setEditBlock(null); }}
          className="text-xs px-3 py-1.5 bg-[var(--sidebar-active)] text-[var(--sidebar-active-text)] rounded-lg hover:bg-[var(--text-secondary)] transition-colors">
          + Add block
        </button>
      </div>

      {/* Dup modal */}
      {showDupModal && (
        <div className="bg-[var(--surface-inset)] border border-[var(--border)] rounded-xl p-4 flex items-center gap-3">
          <span className="text-sm text-[var(--text-secondary)]">Copy Week {activeLetter} →</span>
          <select value={dupTarget} onChange={(e) => setDupTarget(e.target.value)}
            className="text-sm border border-[var(--border)] rounded-lg px-2 py-1 bg-surface">
            {LETTERS.filter((l) => l !== activeLetter).map((l) => (
              <option key={l} value={l}>Week {l}</option>
            ))}
          </select>
          <button onClick={() => { duplicateCycle(activeLetter, dupTarget); setShowDupModal(false); }}
            className="text-xs px-3 py-1.5 bg-[var(--sidebar-active)] text-[var(--sidebar-active-text)] rounded-lg hover:bg-[var(--text-secondary)]">
            Copy
          </button>
          <button onClick={() => setShowDupModal(false)}
            className="text-xs px-3 py-1.5 border border-[var(--border)] rounded-lg hover:bg-[var(--surface-inset)]">
            Cancel
          </button>
        </div>
      )}

      {/* Forms */}
      {showForm && !editBlock && (
        <BlockForm onSave={handleSave} onCancel={() => setShowForm(false)} />
      )}
      {editBlock && (
        <BlockForm initial={editBlock} onSave={handleSave} onCancel={() => setEditBlock(null)} />
      )}

      {/* Blocks by day */}
      {activeBlocks.length === 0 ? (
        <div className="text-center py-10 text-[var(--text-muted)]">
          <p className="text-2xl mb-2">📋</p>
          <p className="text-sm">No blocks in Week {activeLetter} yet</p>
          <p className="text-xs mt-1">Add your first recurring event above</p>
        </div>
      ) : (
        <div className="space-y-3">
          {DAYS_SHORT.filter((d) => byDay[d].length > 0).map((day) => (
            <div key={day}>
              <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-1.5 pl-1">{day}</p>
              <div className="space-y-1">
                {byDay[day]
                  .slice().sort((a,b) => a.hour*60+(a.minute??0) - (b.hour*60+(b.minute??0)))
                  .map((block) => (
                    <BlockRow
                      key={block.id}
                      block={block}
                      letter={activeLetter}
                      onEdit={(b) => { setEditBlock(b); setShowForm(false); }}
                      onDelete={(id) => deleteCycleBlock(activeLetter, id)}
                    />
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
