import { useState, useRef, useEffect } from 'react';
import { useOS } from '../../context/OSContext';
import { FOCUS3_DEFAULT } from '../../utils/schema';

// ── Single focus row ───────────────────────────────────────────────────────
function FocusRow({ item, index, projects, onTextChange, onDone, onProjectLink, onClear }) {
  const [editing, setEditing]     = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const inputRef                  = useRef(null);
  const isEmpty                   = !item.text.trim();

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const linkedProject = item.projectId ? projects[item.projectId] : null;

  const numberGlyph = ['①', '②', '③'][index];

  return (
    <div className={`
      group relative flex items-start gap-3 py-3
      ${index < 2 ? 'border-b border-[var(--border)]' : ''}
      transition-opacity
      ${item.done ? 'opacity-40' : 'opacity-100'}
    `}>
      {/* Done toggle */}
      <button
        onClick={() => onDone(!item.done)}
        className={`
          mt-0.5 shrink-0 w-5 h-5 rounded-full border-2 transition-all flex items-center justify-center
          ${item.done
            ? 'bg-[var(--fill-emerald)]0 border-emerald-500'
            : 'border-[var(--border)] hover:border-[var(--border-strong)]'}
        `}
        title={item.done ? 'Mark incomplete' : 'Mark done'}
      >
        {item.done && <span className="text-white text-[10px] leading-none">✓</span>}
      </button>

      {/* Text + meta */}
      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            ref={inputRef}
            className="w-full text-sm text-[var(--text-primary)] bg-transparent focus:outline-none
                       placeholder:text-[var(--text-muted)] caret-[var(--text-primary)]"
            value={item.text}
            onChange={(e) => onTextChange(e.target.value)}
            onBlur={() => setEditing(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === 'Escape') {
                e.preventDefault();
                setEditing(false);
              }
            }}
            placeholder={`Priority ${index + 1}…`}
          />
        ) : (
          <p
            onClick={() => !item.done && setEditing(true)}
            className={`text-sm leading-snug cursor-text select-none
              ${item.done      ? 'line-through text-[var(--text-muted)]' :
                isEmpty        ? 'text-[var(--text-muted)] italic'       :
                                 'text-[var(--text-primary)]'}`}
          >
            {isEmpty ? `Priority ${index + 1}…` : item.text}
          </p>
        )}

        {/* Project badge */}
        {linkedProject && (
          <button
            onClick={() => setShowPicker((v) => !v)}
            className="mt-1 text-[11px] bg-[var(--fill-indigo)] text-indigo-600 border border-indigo-100
                       rounded-full px-2 py-0.5 hover:bg-[var(--fill-indigo)] transition-colors"
          >
            ◈ {linkedProject.title}
          </button>
        )}

        {/* Project picker dropdown */}
        {showPicker && (
          <div className="absolute left-8 top-full mt-1 z-20 bg-[var(--surface-raised)] border border-[var(--border)]
                          rounded-xl shadow-lg py-1 min-w-[180px]">
            <button
              onClick={() => { onProjectLink(null); setShowPicker(false); }}
              className="w-full text-left px-3 py-2 text-xs text-[var(--text-muted)] hover:bg-[var(--surface-inset)] transition-colors"
            >
              — No link
            </button>
            {Object.values(projects)
              .filter((p) => p.status === 'Active')
              .map((p) => (
                <button
                  key={p.id}
                  onClick={() => { onProjectLink(p.id); setShowPicker(false); }}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-[var(--surface-inset)] transition-colors
                    ${item.projectId === p.id ? 'text-indigo-600 font-semibold' : 'text-secondary'}`}
                >
                  {p.title}
                </button>
              ))}
          </div>
        )}
      </div>

      {/* Number glyph (visible when row is empty, else show on hover) */}
      <span className={`
        shrink-0 text-[13px] mt-0.5 transition-opacity select-none
        ${isEmpty ? 'opacity-20' : 'opacity-0 group-hover:opacity-20'}
        text-[var(--text-muted)]
      `}>
        {numberGlyph}
      </span>

      {/* Link-to-project & clear (hover) */}
      <div className="hidden group-hover:flex items-center gap-1 shrink-0">
        <button
          onClick={() => setShowPicker((v) => !v)}
          title="Link to project"
          className="p-1 rounded hover:bg-[var(--surface-inset)] text-[var(--text-muted)] hover:text-indigo-500
                     transition-colors text-xs"
        >
          ◈
        </button>
        {!isEmpty && (
          <button
            onClick={onClear}
            title="Clear"
            className="p-1 rounded hover:bg-[var(--surface-inset)] text-[var(--text-muted)] hover:text-red-400
                       transition-colors text-xs"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

// ── Focus3 container ────────────────────────────────────────────────────────
export default function Focus3() {
  const {
    state, setFocusText, setFocusDone, setFocusProject, clearFocusItem, resetFocus3
  } = useOS();

  const focus3   = state.focus3 ?? FOCUS3_DEFAULT;
  const projects = state.projects ?? {};
  const doneCount = focus3.filter((f) => f.done && f.text.trim()).length;
  const totalFilled = focus3.filter((f) => f.text.trim()).length;

  return (
    <div className="bg-[var(--surface-raised)] rounded-2xl border border-[var(--border)] px-5 py-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">
            Focus 3
          </h2>
          {totalFilled > 0 && (
            <span className="text-[11px] text-[var(--text-muted)]">
              {doneCount}/{totalFilled}
            </span>
          )}
        </div>
        {(doneCount > 0 || totalFilled > 0) && (
          <button
            onClick={resetFocus3}
            className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
            title="Clear all priorities"
          >
            reset
          </button>
        )}
      </div>

      {/* Progress bar */}
      {totalFilled > 0 && (
        <div className="h-0.5 bg-[var(--surface-inset)] rounded-full mb-3 overflow-hidden">
          <div
            className="h-full bg-emerald-400 rounded-full transition-all duration-500"
            style={{ width: `${(doneCount / totalFilled) * 100}%` }}
          />
        </div>
      )}

      {/* Three rows */}
      <div className="relative">
        {focus3.map((item, i) => (
          <FocusRow
            key={item.id ?? i}
            item={item}
            index={i}
            projects={projects}
            onTextChange={(text) => setFocusText(i, text)}
            onDone={(done) => setFocusDone(i, done)}
            onProjectLink={(pid) => setFocusProject(i, pid)}
            onClear={() => clearFocusItem(i)}
          />
        ))}
      </div>
    </div>
  );
}
