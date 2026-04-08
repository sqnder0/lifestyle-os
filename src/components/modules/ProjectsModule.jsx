import { useState } from 'react';
import { useOS } from '../../context/OSContext';
import { PROJECT_STATUS_COLORS, TASK_STATUS_COLORS, formatRelative } from '../../utils/helpers';

const STATUS_ORDER = ['Active', 'Paused', 'Completed', 'Archived'];
const TASK_STATUSES = ['Todo', 'In Progress', 'Done', 'Blocked'];

// ── Progress ring (SVG) ────────────────────────────────────────────────────
function ProgressRing({ pct }) {
  const r = 14, circ = 2 * Math.PI * r;
  const dash = pct * circ;
  return (
    <svg width="36" height="36" className="shrink-0 -rotate-90">
      <circle cx="18" cy="18" r={r} fill="none" stroke="#f4f4f5" strokeWidth="3" />
      <circle cx="18" cy="18" r={r} fill="none" stroke={pct === 1 ? '#10b981' : '#6366f1'}
        strokeWidth="3" strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round" className="transition-all duration-500" />
    </svg>
  );
}

// ── Task row ──────────────────────────────────────────────────────────────
function TaskRow({ task, onStatusCycle, onDelete }) {
  const statusKeys = TASK_STATUSES;
  const nextStatus = statusKeys[(statusKeys.indexOf(task.status) + 1) % statusKeys.length];
  const colors = TASK_STATUS_COLORS[task.status] ?? 'bg-[var(--surface-inset)] text-[var(--text-secondary)]';

  return (
    <div className="group flex items-center gap-2.5 py-2 border-b border-[var(--border)] last:border-0">
      {/* Status cycle button */}
      <button
        onClick={() => onStatusCycle(task.id, nextStatus)}
        className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full transition-all hover:scale-105 ${colors}`}
        title={`Click → ${nextStatus}`}
      >
        {task.status}
      </button>

      {/* Title */}
      <span className={`flex-1 text-xs leading-snug min-w-0
        ${task.status === 'Done' ? 'line-through text-[var(--text-muted)]' : 'text-secondary'}`}>
        {task.title}
      </span>

      {/* Delete */}
      <button
        onClick={() => onDelete(task.id)}
        className="hidden group-hover:flex p-0.5 text-[var(--text-muted)] hover:text-red-400 transition-colors text-xs shrink-0"
      >
        ✕
      </button>
    </div>
  );
}

// ── Add task inline form ──────────────────────────────────────────────────
function AddTaskInline({ projectId, onAdd, onCancel }) {
  const [text, setText] = useState('');
  return (
    <div className="flex items-center gap-2 pt-1">
      <input
        autoFocus
        className="flex-1 text-xs border border-[var(--border)] rounded-lg px-2 py-1.5 bg-[var(--surface-raised)] focus:outline-none focus:ring-2 focus:ring-zinc-300 placeholder:text-[var(--text-muted)]"
        placeholder="Task title…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && text.trim()) { onAdd(text.trim()); setText(''); }
          if (e.key === 'Escape') onCancel();
        }}
      />
      <button
        onClick={() => { if (text.trim()) { onAdd(text.trim()); setText(''); } }}
        className="text-xs bg-[var(--sidebar-active)] text-[var(--sidebar-active-text)] px-2.5 py-1.5 rounded-lg hover:bg-[var(--text-secondary)] transition-colors"
      >
        Add
      </button>
      <button onClick={onCancel} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)]">✕</button>
    </div>
  );
}

// ── Project card ──────────────────────────────────────────────────────────
function ProjectCard({ project, tasks, onStatusChange, onDelete, onAddTask, onTaskStatus, onDeleteTask }) {
  const [expanded, setExpanded]   = useState(project.status === 'Active');
  const [addingTask, setAddingTask] = useState(false);

  const progress = tasks.length ? tasks.filter((t) => t.status === 'Done').length / tasks.length : 0;
  const statusColor = PROJECT_STATUS_COLORS[project.status] ?? 'bg-[var(--surface-inset)] text-[var(--text-secondary)]';
  const statuses = STATUS_ORDER;

  return (
    <div className={`bg-[var(--surface-raised)] rounded-2xl border transition-all
      ${project.status === 'Active' ? 'border-[var(--border)]' : 'border-[var(--border)] opacity-70'}`}>
      {/* Card header */}
      <div className="flex items-start gap-3 px-4 pt-4 pb-3">
        <ProgressRing pct={progress} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] leading-tight">{project.title}</h3>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColor}`}>
              {project.status}
            </span>
          </div>
          {project.description && (
            <p className="text-xs text-[var(--text-muted)] mt-0.5 leading-snug">{project.description}</p>
          )}
          <p className="text-[11px] text-[var(--text-muted)] mt-1">
            {tasks.length} task{tasks.length !== 1 ? 's' : ''} ·{' '}
            {Math.round(progress * 100)}% done
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Status cycle */}
          <select
            value={project.status}
            onChange={(e) => onStatusChange(project.id, e.target.value)}
            className="text-[11px] border border-[var(--border)] rounded-lg px-1.5 py-1 bg-[var(--surface-inset)] text-[var(--text-secondary)] focus:outline-none hover:bg-[var(--surface-inset)] transition-colors"
          >
            {statuses.map((s) => <option key={s}>{s}</option>)}
          </select>

          <button
            onClick={() => setExpanded((v) => !v)}
            className="p-1.5 rounded-lg hover:bg-[var(--surface-inset)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors text-xs"
          >
            {expanded ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {/* Task list */}
      {expanded && (
        <div className="px-4 pb-3 border-t border-[var(--border)] pt-2">
          {tasks.length === 0 && !addingTask ? (
            <p className="text-xs text-[var(--text-muted)] py-1 italic">No tasks yet</p>
          ) : (
            tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onStatusCycle={onTaskStatus}
                onDelete={onDeleteTask}
              />
            ))
          )}
          {addingTask ? (
            <AddTaskInline
              projectId={project.id}
              onAdd={(title) => { onAddTask(title, project.id); }}
              onCancel={() => setAddingTask(false)}
            />
          ) : (
            <button
              onClick={() => setAddingTask(true)}
              className="mt-1 text-xs text-[var(--text-muted)] hover:text-indigo-500 transition-colors"
            >
              + Add task
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── New project form ──────────────────────────────────────────────────────
function NewProjectForm({ onAdd, onCancel }) {
  const [title, setTitle]       = useState('');
  const [description, setDesc]  = useState('');
  return (
    <div className="bg-[var(--surface-raised)] rounded-2xl border border-[var(--border)] px-5 py-4 space-y-3">
      <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">New Project</p>
      <input
        autoFocus
        className="w-full text-sm border border-[var(--border)] rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-zinc-300 placeholder:text-[var(--text-muted)]"
        placeholder="Project title…"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && title.trim()) onAdd(title.trim(), description); if (e.key === 'Escape') onCancel(); }}
      />
      <input
        className="w-full text-xs border border-[var(--border)] rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zinc-300 placeholder:text-[var(--text-muted)] text-[var(--text-secondary)]"
        placeholder="Description (optional)…"
        value={description}
        onChange={(e) => setDesc(e.target.value)}
      />
      <div className="flex gap-2">
        <button
          onClick={() => { if (title.trim()) onAdd(title.trim(), description); }}
          className="flex-1 text-sm bg-[var(--sidebar-active)] text-[var(--sidebar-active-text)] rounded-xl py-2 hover:bg-[var(--text-secondary)] transition-colors font-medium"
        >
          Create project
        </button>
        <button onClick={onCancel} className="px-4 text-sm border border-[var(--border)] rounded-xl py-2 hover:bg-[var(--surface-inset)] transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── ProjectsModule ────────────────────────────────────────────────────────
export default function ProjectsModule() {
  const { state, addProject, setProjectStatus, deleteProject, addTask, setTaskStatus, deleteTask } = useOS();
  const [showForm, setShowForm]   = useState(false);
  const [statusFilter, setFilter] = useState('Active');

  const { projects, tasks } = state;

  const projectList = Object.values(projects)
    .filter((p) => statusFilter === 'All' || p.status === statusFilter)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const getProjectTasks = (p) =>
    p.taskIds.map((id) => tasks[id]).filter(Boolean);

  const totalActive = Object.values(projects).filter((p) => p.status === 'Active').length;

  return (
    <div className="h-full flex flex-col gap-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Projects</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            {totalActive} active · {Object.keys(projects).length} total
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="text-sm bg-[var(--sidebar-active)] text-[var(--sidebar-active-text)] px-4 py-2 rounded-xl hover:bg-[var(--text-secondary)] transition-colors font-medium"
        >
          + New project
        </button>
      </div>

      {/* New project form */}
      {showForm && (
        <NewProjectForm
          onAdd={(title, desc) => { addProject(title, desc); setShowForm(false); }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 bg-[var(--surface-inset)] rounded-xl p-1 self-start">
        {['Active', 'Paused', 'Completed', 'All'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all
              ${statusFilter === s ? 'bg-[var(--surface-raised)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-secondary)] hover:text-secondary'}`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Project cards */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-6">
        {projectList.length === 0 ? (
          <div className="text-center py-16 text-[var(--text-muted)]">
            <p className="text-4xl mb-3">📋</p>
            <p className="text-sm">No {statusFilter !== 'All' ? statusFilter.toLowerCase() + ' ' : ''}projects yet</p>
          </div>
        ) : (
          projectList.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              tasks={getProjectTasks(project)}
              onStatusChange={setProjectStatus}
              onDelete={deleteProject}
              onAddTask={addTask}
              onTaskStatus={setTaskStatus}
              onDeleteTask={deleteTask}
            />
          ))
        )}
      </div>
    </div>
  );
}
