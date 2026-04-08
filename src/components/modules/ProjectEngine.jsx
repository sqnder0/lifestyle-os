import { useState } from 'react';
import { useOS } from '../../context/OSContext';
import { PROJECT_STATUS_COLORS, TASK_STATUS_COLORS, formatRelative } from '../../utils/helpers';

const TASK_STATUSES = ['Todo', 'In Progress', 'Done', 'Blocked'];
const STATUS_RING = {
  Active:    { stroke: '#6366f1', bg: 'bg-[var(--fill-indigo)]' },
  Paused:    { stroke: '#f59e0b', bg: 'bg-[var(--fill-amber)]'  },
  Completed: { stroke: '#10b981', bg: 'bg-[var(--fill-emerald)]'},
  Archived:  { stroke: '#a1a1aa', bg: 'bg-surface-inset'  },
};

// ── Donut progress ring ────────────────────────────────────────────────────
function DonutRing({ pct, status, size = 56 }) {
  const r = (size / 2) - 5;
  const circ = 2 * Math.PI * r;
  const { stroke } = STATUS_RING[status] ?? STATUS_RING.Active;
  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f4f4f5" strokeWidth="4.5" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={stroke} strokeWidth="4.5"
        strokeDasharray={`${pct * circ} ${circ}`} strokeLinecap="round"
        className="transition-all duration-700" />
      <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central"
        fontSize="11" fontWeight="600" fill={stroke}
        style={{ transform: `rotate(90deg)`, transformOrigin: `${size/2}px ${size/2}px` }}>
        {Math.round(pct * 100)}%
      </text>
    </svg>
  );
}

// ── Linked Focus tasks ─────────────────────────────────────────────────────
function FocusBadges({ projectId, focus3 }) {
  const linked = (focus3 ?? []).filter((f) => f.projectId === projectId && f.text.trim());
  if (!linked.length) return null;
  return (
    <div className="flex items-center gap-1.5 flex-wrap mt-1">
      <span className="text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-wider">Focus:</span>
      {linked.map((f, i) => (
        <span key={i} className={`text-[10px] px-2 py-0.5 rounded-full border font-medium
          ${f.done ? 'bg-[var(--surface-inset)] text-[var(--text-muted)] border-[var(--border)] line-through' : 'bg-[var(--fill-indigo)] text-indigo-600 border-indigo-100'}`}>
          {f.text}
        </span>
      ))}
    </div>
  );
}

// ── Task kanban mini strip ─────────────────────────────────────────────────
function TaskStrip({ tasks, onStatusCycle, onAdd, onDelete }) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft]   = useState('');

  const byStatus = TASK_STATUSES.reduce((a, s) => { a[s] = tasks.filter(t => t.status === s); return a; }, {});

  return (
    <div className="space-y-2">
      {/* Column labels + counts */}
      <div className="grid grid-cols-4 gap-1.5 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider px-0.5">
        {TASK_STATUSES.map(s => (
          <span key={s}>{s} <span className="font-normal opacity-60">({byStatus[s].length})</span></span>
        ))}
      </div>

      {/* Task rows by status */}
      {tasks.length === 0 && !adding ? (
        <p className="text-xs text-[var(--text-muted)] italic py-1">No tasks — add one below</p>
      ) : (
        <div className="space-y-1">
          {tasks.map(task => {
            const colors = TASK_STATUS_COLORS[task.status] ?? 'bg-[var(--surface-inset)] text-[var(--text-secondary)]';
            const next = TASK_STATUSES[(TASK_STATUSES.indexOf(task.status) + 1) % TASK_STATUSES.length];
            return (
              <div key={task.id} className="group flex items-center gap-2 py-1.5 border-b border-[var(--border)] last:border-0">
                <button onClick={() => onStatusCycle(task.id, next)}
                  className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full transition-all hover:scale-105 ${colors}`}
                  title={`→ ${next}`}>
                  {task.status}
                </button>
                <span className={`flex-1 text-xs min-w-0 truncate
                  ${task.status === 'Done' ? 'line-through text-[var(--text-muted)]' : 'text-secondary'}`}>
                  {task.title}
                </span>
                <button onClick={() => onDelete(task.id)}
                  className="hidden group-hover:block text-[var(--text-muted)] hover:text-red-400 transition-colors text-xs shrink-0 p-0.5">
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add task inline */}
      {adding ? (
        <div className="flex items-center gap-2 pt-1">
          <input autoFocus value={draft} onChange={e => setDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && draft.trim()) { onAdd(draft.trim()); setDraft(''); }
              if (e.key === 'Escape') { setAdding(false); setDraft(''); }
            }}
            placeholder="Task title…"
            className="flex-1 text-xs border border-[var(--border)] rounded-lg px-2 py-1.5 bg-[var(--surface-raised)] focus:outline-none focus:ring-2 focus:ring-zinc-300 placeholder:text-[var(--text-muted)]"
          />
          <button onClick={() => { if (draft.trim()) { onAdd(draft.trim()); setDraft(''); } }}
            className="text-xs bg-[var(--sidebar-active)] text-[var(--sidebar-active-text)] px-2.5 py-1.5 rounded-lg hover:bg-[var(--text-secondary)]">Add</button>
          <button onClick={() => { setAdding(false); setDraft(''); }}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)]">✕</button>
        </div>
      ) : (
        <button onClick={() => setAdding(true)}
          className="text-xs text-[var(--text-muted)] hover:text-indigo-500 transition-colors mt-0.5">
          + Add task
        </button>
      )}
    </div>
  );
}

// ── Project engine card ────────────────────────────────────────────────────
function ProjectEngineCard({ project, tasks, focus3, onStatusChange, onAddTask, onTaskStatus, onDeleteTask, onUpdateProject }) {
  const [expanded, setExpanded] = useState(project.status === 'Active');
  const [editDesc, setEditDesc] = useState(false);
  const [descDraft, setDescDraft] = useState(project.description);

  const done = tasks.filter(t => t.status === 'Done').length;
  const pct  = tasks.length ? done / tasks.length : 0;
  const statusColors = PROJECT_STATUS_COLORS[project.status] ?? 'bg-[var(--surface-inset)] text-[var(--text-secondary)]';
  const ringBg = STATUS_RING[project.status]?.bg ?? 'bg-surface-inset';

  return (
    <div className={`rounded-2xl border transition-all overflow-hidden
      ${project.status === 'Active' ? 'border-[var(--border)] bg-surface' : 'border-[var(--border)] bg-zinc-50/50'}`}>

      {/* Card header */}
      <div className="flex items-start gap-4 px-5 py-4">
        {/* Ring */}
        <div className={`rounded-2xl p-1 ${ringBg}`}>
          <DonutRing pct={pct} status={project.status} size={56} />
        </div>

        {/* Meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-semibold text-[var(--text-primary)] leading-tight">{project.title}</h3>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColors}`}>
                  {project.status}
                </span>
              </div>

              {/* Description — click to edit */}
              {editDesc ? (
                <div className="mt-1.5 space-y-1.5">
                  <input value={descDraft} onChange={e => setDescDraft(e.target.value)}
                    onBlur={() => { onUpdateProject(project.id, { description: descDraft }); setEditDesc(false); }}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') { onUpdateProject(project.id, { description: descDraft }); setEditDesc(false); } }}
                    autoFocus
                    className="w-full text-xs border border-[var(--border)] rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-zinc-300 bg-surface"
                  />
                </div>
              ) : (
                <p className="text-xs text-[var(--text-muted)] mt-0.5 leading-snug cursor-pointer hover:text-[var(--text-secondary)] transition-colors"
                  onClick={() => { setDescDraft(project.description); setEditDesc(true); }}>
                  {project.description || <span className="italic text-[var(--text-muted)]">Add description…</span>}
                </p>
              )}

              {/* Focus 3 linked badges */}
              <FocusBadges projectId={project.id} focus3={focus3} />
            </div>

            {/* Controls */}
            <div className="flex items-center gap-1 shrink-0">
              <select value={project.status} onChange={e => onStatusChange(project.id, e.target.value)}
                className="text-[11px] border border-[var(--border)] rounded-lg px-1.5 py-1 bg-[var(--surface-inset)] text-[var(--text-secondary)]
                           focus:outline-none hover:bg-[var(--surface-inset)] transition-colors">
                {['Active','Paused','Completed','Archived'].map(s => <option key={s}>{s}</option>)}
              </select>
              <button onClick={() => setExpanded(v => !v)}
                className="p-1.5 rounded-lg hover:bg-[var(--surface-inset)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors text-xs">
                {expanded ? '▲' : '▼'}
              </button>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-1">
              <div className="h-1.5 w-24 bg-[var(--surface-inset)] rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${pct * 100}%`, background: STATUS_RING[project.status]?.stroke ?? '#6366f1' }} />
              </div>
              <span className="text-[11px] text-[var(--text-muted)] tabular-nums">{done}/{tasks.length}</span>
            </div>
            <span className="text-[11px] text-[var(--text-muted)]">·</span>
            <span className="text-[11px] text-[var(--text-muted)]">{formatRelative(project.createdAt)}</span>
          </div>
        </div>
      </div>

      {/* Task strip */}
      {expanded && (
        <div className="px-5 pb-4 pt-1 border-t border-[var(--border)]">
          <TaskStrip
            tasks={tasks}
            onStatusCycle={onTaskStatus}
            onAdd={title => onAddTask(title, project.id)}
            onDelete={onDeleteTask}
          />
        </div>
      )}
    </div>
  );
}

// ── ProjectEngine ──────────────────────────────────────────────────────────
export default function ProjectEngine() {
  const { state, setProjectStatus, updateProject, addTask, setTaskStatus, deleteTask, addProject } = useOS();
  const { projects, tasks, focus3 } = state;

  const [statusFilter, setFilter] = useState('Active');
  const [showNew, setShowNew]     = useState(false);
  const [newTitle, setNewTitle]   = useState('');
  const [newDesc, setNewDesc]     = useState('');

  const getProjectTasks = p => p.taskIds.map(id => tasks[id]).filter(Boolean);

  const filtered = Object.values(projects)
    .filter(p => statusFilter === 'All' || p.status === statusFilter)
    .sort((a, b) => {
      // Active first, then by creation date desc
      if (a.status === 'Active' && b.status !== 'Active') return -1;
      if (b.status === 'Active' && a.status !== 'Active') return 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

  // Summary stats
  const active    = Object.values(projects).filter(p => p.status === 'Active');
  const allTasks  = Object.values(tasks);
  const doneTasks = allTasks.filter(t => t.status === 'Done').length;

  return (
    <div className="h-full flex flex-col gap-5 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Project Engine</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            {active.length} active · {doneTasks}/{allTasks.length} tasks done
          </p>
        </div>
        <button onClick={() => setShowNew(v => !v)}
          className="text-sm bg-[var(--sidebar-active)] text-[var(--sidebar-active-text)] px-4 py-2 rounded-xl hover:bg-[var(--text-secondary)] transition-colors font-medium">
          + New project
        </button>
      </div>

      {/* New project form */}
      {showNew && (
        <div className="bg-[var(--surface-raised)] rounded-2xl border border-[var(--border)] px-5 py-4 space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">New Project</p>
          <input autoFocus value={newTitle} onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && newTitle.trim()) { addProject(newTitle.trim(), newDesc); setNewTitle(''); setNewDesc(''); setShowNew(false); } if (e.key === 'Escape') setShowNew(false); }}
            placeholder="Project title…"
            className="w-full text-sm border border-[var(--border)] rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-zinc-300 placeholder:text-[var(--text-muted)]" />
          <input value={newDesc} onChange={e => setNewDesc(e.target.value)}
            placeholder="Description (optional)…"
            className="w-full text-xs border border-[var(--border)] rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zinc-300 placeholder:text-[var(--text-muted)] text-[var(--text-secondary)]" />
          <div className="flex gap-2">
            <button onClick={() => { if (newTitle.trim()) { addProject(newTitle.trim(), newDesc); setNewTitle(''); setNewDesc(''); setShowNew(false); } }}
              className="flex-1 text-sm bg-[var(--sidebar-active)] text-[var(--sidebar-active-text)] rounded-xl py-2 hover:bg-[var(--text-secondary)] font-medium">Create</button>
            <button onClick={() => setShowNew(false)} className="px-4 border border-[var(--border)] rounded-xl hover:bg-[var(--surface-inset)] text-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 bg-[var(--surface-inset)] rounded-xl p-1 self-start">
        {['Active','Paused','Completed','All'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all
              ${statusFilter === s ? 'bg-[var(--surface-raised)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-secondary)] hover:text-secondary'}`}>
            {s}
          </button>
        ))}
      </div>

      {/* Project cards */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-8">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-[var(--text-muted)]">
            <p className="text-4xl mb-3">📋</p>
            <p className="text-sm">No {statusFilter !== 'All' ? statusFilter.toLowerCase() + ' ' : ''}projects</p>
          </div>
        ) : filtered.map(p => (
          <ProjectEngineCard
            key={p.id}
            project={p}
            tasks={getProjectTasks(p)}
            focus3={focus3}
            onStatusChange={setProjectStatus}
            onUpdateProject={updateProject}
            onAddTask={addTask}
            onTaskStatus={setTaskStatus}
            onDeleteTask={deleteTask}
          />
        ))}
      </div>
    </div>
  );
}
