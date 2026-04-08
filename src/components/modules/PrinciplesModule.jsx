import { useState } from 'react';
import { useOS } from '../../context/OSContext';
import { PRINCIPLE_CATEGORIES } from '../../utils/schema';

const CATEGORY_COLORS = {
  Productivity:  { pill: 'bg-[var(--fill-indigo)] text-indigo-600 border-indigo-100',  dot: 'bg-indigo-400' },
  Health:        { pill: 'bg-[var(--fill-emerald)] text-emerald-600 border-emerald-100',dot: 'bg-emerald-400' },
  Relationships: { pill: 'bg-[var(--fill-rose)] text-rose-600 border-rose-100',        dot: 'bg-rose-400'    },
  Finance:       { pill: 'bg-[var(--fill-amber)] text-amber-600 border-amber-100',     dot: 'bg-amber-400'   },
  General:       { pill: 'bg-[var(--surface-inset)] text-[var(--text-secondary)] border-[var(--border)]',       dot: 'bg-[var(--text-muted)]'    },
};

// ── Principle card ─────────────────────────────────────────────────────────
function PrincipleCard({ principle, editMode, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle]     = useState(principle.title);
  const [body, setBody]       = useState(principle.body);
  const [cat, setCat]         = useState(principle.category);
  const colors = CATEGORY_COLORS[principle.category] ?? CATEGORY_COLORS.General;

  const save = () => {
    onUpdate(principle.id, { title, body, category: cat });
    setEditing(false);
  };

  return (
    <div className={`group relative bg-[var(--surface-raised)] rounded-2xl border px-5 py-4 transition-all
      ${editMode ? 'border-[var(--border)] hover:border-[var(--border-strong)]' : 'border-[var(--border)]'}`}>

      {/* Category dot + pill */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full shrink-0 mt-0.5 ${colors.dot}`} />
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${colors.pill}`}>
            {principle.category}
          </span>
        </div>
        {editMode && !editing && (
          <div className="hidden group-hover:flex items-center gap-1">
            <button onClick={() => setEditing(true)}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors p-1 rounded hover:bg-[var(--surface-inset)]">
              Edit
            </button>
            <button onClick={() => onDelete(principle.id)}
              className="text-xs text-[var(--text-muted)] hover:text-red-400 transition-colors p-1 rounded hover:bg-[var(--fill-red)]">
              ✕
            </button>
          </div>
        )}
      </div>

      {editing ? (
        /* Edit mode form */
        <div className="space-y-2">
          <input value={title} onChange={e => setTitle(e.target.value)}
            className="w-full text-sm font-semibold border border-[var(--border)] rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-zinc-300"
            placeholder="Principle title…" />
          <textarea value={body} onChange={e => setBody(e.target.value)} rows={3}
            className="w-full text-sm border border-[var(--border)] rounded-lg px-2.5 py-1.5 resize-none focus:outline-none focus:ring-2 focus:ring-zinc-300 leading-relaxed"
            placeholder="Explain the principle…" />
          <div className="flex items-center gap-2">
            <select value={cat} onChange={e => setCat(e.target.value)}
              className="text-xs border border-[var(--border)] rounded-lg px-2 py-1 focus:outline-none bg-surface">
              {PRINCIPLE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <button onClick={save}
              className="text-xs bg-[var(--sidebar-active)] text-[var(--sidebar-active-text)] px-3 py-1 rounded-lg hover:bg-[var(--text-secondary)]">Save</button>
            <button onClick={() => { setEditing(false); setTitle(principle.title); setBody(principle.body); setCat(principle.category); }}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] px-2 py-1">Cancel</button>
          </div>
        </div>
      ) : (
        /* Read mode */
        <div onClick={() => editMode && setEditing(true)} className={editMode ? 'cursor-pointer' : ''}>
          <h3 className="text-sm font-semibold text-[var(--text-primary)] leading-snug mb-1">{principle.title}</h3>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{principle.body}</p>
        </div>
      )}
    </div>
  );
}

// ── Add principle form ─────────────────────────────────────────────────────
function AddPrincipleForm({ onAdd, onCancel }) {
  const [title, setTitle]   = useState('');
  const [body, setBody]     = useState('');
  const [cat, setCat]       = useState('General');

  return (
    <div className="bg-[var(--surface-raised)] rounded-2xl border border-[var(--border)] px-5 py-4 space-y-3">
      <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">New Principle</p>
      <input autoFocus value={title} onChange={e => setTitle(e.target.value)}
        placeholder="Title — e.g. The 2-Minute Rule"
        className="w-full text-sm border border-[var(--border)] rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-zinc-300 placeholder:text-[var(--text-muted)]" />
      <textarea value={body} onChange={e => setBody(e.target.value)} rows={3}
        placeholder="Describe the principle and why it matters…"
        className="w-full text-sm border border-[var(--border)] rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-zinc-300 placeholder:text-[var(--text-muted)] leading-relaxed" />
      <div className="flex items-center gap-2 flex-wrap">
        {PRINCIPLE_CATEGORIES.map(c => {
          const col = CATEGORY_COLORS[c] ?? CATEGORY_COLORS.General;
          return (
            <button key={c} onClick={() => setCat(c)}
              className={`text-xs px-3 py-1 rounded-full border font-medium transition-all
                ${cat === c ? `${col.pill} font-semibold` : 'bg-[var(--surface-raised)] border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-inset)]'}`}>
              {c}
            </button>
          );
        })}
      </div>
      <div className="flex gap-2">
        <button onClick={() => { if (title.trim() && body.trim()) onAdd(title.trim(), body.trim(), cat); }}
          className="flex-1 text-sm bg-[var(--sidebar-active)] text-[var(--sidebar-active-text)] rounded-xl py-2 hover:bg-[var(--text-secondary)] font-medium">
          Add principle
        </button>
        <button onClick={onCancel} className="px-4 text-sm border border-[var(--border)] rounded-xl hover:bg-[var(--surface-inset)]">Cancel</button>
      </div>
    </div>
  );
}

// ── PrinciplesModule ───────────────────────────────────────────────────────
export default function PrinciplesModule() {
  const { state, addPrinciple, updatePrinciple, deletePrinciple } = useOS();
  const [editMode, setEditMode]   = useState(false);
  const [showForm, setShowForm]   = useState(false);
  const [catFilter, setCatFilter] = useState('All');

  const principles = state.principles ?? {};

  // Group by category, sorted by order
  const allCats = ['All', ...PRINCIPLE_CATEGORIES.filter(c => Object.values(principles).some(p => p.category === c))];

  const filtered = Object.values(principles)
    .filter(p => catFilter === 'All' || p.category === catFilter)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.title.localeCompare(b.title));

  // Group display
  const groupedByCategory = PRINCIPLE_CATEGORIES.reduce((acc, cat) => {
    const items = filtered.filter(p => p.category === cat);
    if (items.length) acc[cat] = items;
    return acc;
  }, {});

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto space-y-5 pb-12">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Personal Principles</h1>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {Object.keys(principles).length} life rules · your operating system
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setEditMode(v => !v)}
              className={`text-xs px-3 py-1.5 rounded-xl border font-medium transition-all
                ${editMode
                  ? 'bg-[var(--sidebar-active)] text-[var(--sidebar-active-text)] border-[var(--text-primary)]'
                  : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'}`}>
              {editMode ? '✓ Done editing' : 'Edit'}
            </button>
            {editMode && (
              <button onClick={() => { setShowForm(true); }}
                className="text-xs bg-[var(--sidebar-active)] text-[var(--sidebar-active-text)] px-3 py-1.5 rounded-xl hover:bg-[var(--text-secondary)] font-medium">
                + Add
              </button>
            )}
          </div>
        </div>

        {/* Add form */}
        {showForm && (
          <AddPrincipleForm
            onAdd={(title, body, cat) => { addPrinciple(title, body, cat); setShowForm(false); }}
            onCancel={() => setShowForm(false)}
          />
        )}

        {/* Category filter */}
        {allCats.length > 2 && (
          <div className="flex gap-1.5 flex-wrap">
            {allCats.map(c => {
              const col = CATEGORY_COLORS[c];
              return (
                <button key={c} onClick={() => setCatFilter(c)}
                  className={`text-[11px] px-3 py-1 rounded-full border font-medium transition-all
                    ${catFilter === c
                      ? (col ? `${col.pill}` : 'bg-[var(--sidebar-active)] text-[var(--sidebar-active-text)] border-[var(--text-primary)]')
                      : 'bg-[var(--surface-raised)] border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)]'}`}>
                  {c}
                </button>
              );
            })}
          </div>
        )}

        {/* Read-only inspirational header (non-edit mode) */}
        {!editMode && catFilter === 'All' && (
          <div className="bg-[var(--surface-inset)] rounded-2xl px-5 py-4 border border-[var(--border)]">
            <p className="text-xs text-[var(--text-muted)] italic leading-relaxed">
              "These are not rules imposed from outside. They are the distillation of everything
              you've learned about how to live well. Read them slowly."
            </p>
          </div>
        )}

        {/* Principles — grouped */}
        {catFilter === 'All' ? (
          Object.entries(groupedByCategory).map(([cat, items]) => (
            <div key={cat} className="space-y-2">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${CATEGORY_COLORS[cat]?.dot ?? 'bg-zinc-300'}`} />
                <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)]">{cat}</p>
              </div>
              {items.map(p => (
                <PrincipleCard key={p.id} principle={p} editMode={editMode} onUpdate={updatePrinciple} onDelete={deletePrinciple} />
              ))}
            </div>
          ))
        ) : (
          <div className="space-y-2">
            {filtered.map(p => (
              <PrincipleCard key={p.id} principle={p} editMode={editMode} onUpdate={updatePrinciple} onDelete={deletePrinciple} />
            ))}
          </div>
        )}

        {Object.keys(principles).length === 0 && (
          <div className="text-center py-16 text-[var(--text-muted)]">
            <p className="text-4xl mb-3">📜</p>
            <p className="text-sm">No principles yet</p>
            <p className="text-xs mt-1">Switch to Edit mode to add your first life rule</p>
          </div>
        )}
      </div>
    </div>
  );
}
