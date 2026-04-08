import { createContext, useContext, useCallback } from 'react';
import { usePostgresSync } from '../hooks/usePostgresSync';
import {
  SEED_STATE, uid, todayKey,
  makeCapture, makeTask, makeProject, makeContact, makeMetricLog, makeCycleBlock,
  makeFocusItem, FOCUS3_DEFAULT,
  makePrinciple, makeReviewEntry,
} from '../utils/schema';
import {
  cancelDay, restoreDay, overrideBlock, deleteTemplateBlock,
  addDateBlock, removeDateBlock, setDayNote,
  resolvePhysicalBriefing,
} from '../utils/cycleEngine';

const OSContext = createContext(null);

export function OSProvider({ children, auth }) {
  const { state, setState, loading: syncLoading, syncError } = usePostgresSync({
    initialState: SEED_STATE,
    token: auth?.token ?? null,
  });

  const update = useCallback((fn) => setState((prev) => fn(prev)), [setState]);
  const resetToSeed = () => setState(SEED_STATE);

  // ── Capture ──────────────────────────────────────────────────────────
  const addCapture = (text) => {
    if (!text.trim()) return;
    update((s) => ({ ...s, capture: [makeCapture(text.trim()), ...s.capture] }));
  };
  const updateCapture = (id, patch) =>
    update((s) => ({ ...s, capture: s.capture.map((c) => c.id === id ? { ...c, ...patch } : c) }));
  const deleteCapture = (id) =>
    update((s) => ({ ...s, capture: s.capture.filter((c) => c.id !== id) }));
  const markCaptureProcessed = (id) => updateCapture(id, { processed: true });
  const promoteCapture = (id, projectId) => {
    const item = state.capture.find((c) => c.id === id);
    if (!item) return;
    const task = makeTask(item.text, projectId);
    update((s) => {
      const tasks = { ...s.tasks, [task.id]: task };
      const projects = projectId ? {
        ...s.projects,
        [projectId]: { ...s.projects[projectId], taskIds: [...s.projects[projectId].taskIds, task.id] },
      } : s.projects;
      return { ...s, tasks, projects, capture: s.capture.filter((c) => c.id !== id) };
    });
    return task;
  };

  // ── Projects ─────────────────────────────────────────────────────────
  const addProject = (title, description = '') => {
    const p = makeProject(title);
    if (description) p.description = description;
    update((s) => ({ ...s, projects: { ...s.projects, [p.id]: p } }));
    return p;
  };
  const updateProject = (id, patch) =>
    update((s) => ({ ...s, projects: { ...s.projects, [id]: { ...s.projects[id], ...patch } } }));
  const deleteProject = (id) =>
    update((s) => {
      const { [id]: _, ...projects } = s.projects;
      const tasks = Object.fromEntries(
        Object.entries(s.tasks).map(([tid, t]) => t.projectId === id ? [tid, { ...t, projectId: null }] : [tid, t])
      );
      return { ...s, projects, tasks };
    });
  const setProjectStatus = (id, status) => updateProject(id, { status });
  const reorderProjectTasks = (projectId, newTaskIds) => updateProject(projectId, { taskIds: newTaskIds });

  // ── Tasks ─────────────────────────────────────────────────────────────
  const addTask = (title, projectId = null, extras = {}) => {
    const task = { ...makeTask(title, projectId), ...extras };
    update((s) => {
      const tasks = { ...s.tasks, [task.id]: task };
      const projects = projectId ? {
        ...s.projects,
        [projectId]: { ...s.projects[projectId], taskIds: [...s.projects[projectId].taskIds, task.id] },
      } : s.projects;
      return { ...s, tasks, projects };
    });
    return task;
  };
  const updateTask = (id, patch) =>
    update((s) => ({ ...s, tasks: { ...s.tasks, [id]: { ...s.tasks[id], ...patch } } }));
  const deleteTask = (id) =>
    update((s) => {
      const { [id]: _, ...tasks } = s.tasks;
      const projects = Object.fromEntries(
        Object.entries(s.projects).map(([pid, p]) => [pid, { ...p, taskIds: p.taskIds.filter((tid) => tid !== id) }])
      );
      return { ...s, tasks, projects };
    });
  const setTaskStatus = (id, status) => updateTask(id, { status });
  const moveTask = (taskId, fromPid, toPid) =>
    update((s) => {
      const tasks = { ...s.tasks, [taskId]: { ...s.tasks[taskId], projectId: toPid } };
      return {
        ...s, tasks,
        projects: {
          ...s.projects,
          ...(fromPid ? { [fromPid]: { ...s.projects[fromPid], taskIds: s.projects[fromPid].taskIds.filter((id) => id !== taskId) } } : {}),
          ...(toPid   ? { [toPid]:   { ...s.projects[toPid],   taskIds: [...s.projects[toPid].taskIds, taskId] } } : {}),
        },
      };
    });

  // ── Metrics ──────────────────────────────────────────────────────────
  const logMetric = (date = todayKey(), patch = {}) =>
    update((s) => ({ ...s, metrics: { ...s.metrics, [date]: { ...(s.metrics[date] ?? makeMetricLog(date)), ...patch } } }));
  const logToday = (patch) => logMetric(todayKey(), patch);
  const deleteMetric = (date) =>
    update((s) => { const { [date]: _, ...metrics } = s.metrics; return { ...s, metrics }; });
  const getMetricsRange = (days = 30) => {
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      result.push(state.metrics[key] ?? makeMetricLog(key));
    }
    return result;
  };

  // ── CRM ───────────────────────────────────────────────────────────────
  const addContact = (name, extras = {}) => {
    const c = { ...makeContact(name), ...extras };
    update((s) => ({ ...s, crm: { ...s.crm, [c.id]: c } }));
    return c;
  };
  const updateContact = (id, patch) =>
    update((s) => ({ ...s, crm: { ...s.crm, [id]: { ...s.crm[id], ...patch } } }));
  const deleteContact = (id) =>
    update((s) => { const { [id]: _, ...crm } = s.crm; return { ...s, crm }; });
  const touchContact = (id) => updateContact(id, { lastContacted: new Date().toISOString() });
  const daysSince = (id) => {
    const c = state.crm[id];
    if (!c?.lastContacted) return Infinity;
    return Math.floor((Date.now() - new Date(c.lastContacted)) / 86_400_000);
  };
  const getCRMByOverdue = () => Object.values(state.crm).sort((a, b) => daysSince(a.id) - daysSince(b.id));

  // ── Cycle Templates ───────────────────────────────────────────────────
  const setCycleStartDate = (dateKey) =>
    update((s) => ({ ...s, cycleStartDate: dateKey }));

  const addCycleBlock = (letter, blockData = {}) => {
    const block = { ...makeCycleBlock(), ...blockData, id: uid() };
    update((s) => ({
      ...s,
      cycles: { ...s.cycles, [letter]: { ...s.cycles[letter], blocks: [...s.cycles[letter].blocks, block] } },
    }));
    return block;
  };
  const updateCycleBlock = (letter, blockId, patch) =>
    update((s) => ({
      ...s,
      cycles: {
        ...s.cycles,
        [letter]: {
          ...s.cycles[letter],
          blocks: s.cycles[letter].blocks.map((b) => b.id === blockId ? { ...b, ...patch } : b),
        },
      },
    }));
  const deleteCycleBlock = (letter, blockId) =>
    update((s) => ({
      ...s,
      cycles: {
        ...s.cycles,
        [letter]: { ...s.cycles[letter], blocks: s.cycles[letter].blocks.filter((b) => b.id !== blockId) },
      },
    }));
  const duplicateCycle = (from, to) =>
    update((s) => ({
      ...s,
      cycles: {
        ...s.cycles,
        [to]: { ...s.cycles[to], blocks: s.cycles[from].blocks.map((b) => ({ ...b, id: uid() })) },
      },
    }));

  const updateCyclePlan = (letter, patch = {}) =>
    update((s) => ({
      ...s,
      cyclePlans: {
        ...(s.cyclePlans ?? {}),
        [letter]: {
          ...(s.cyclePlans?.[letter] ?? {}),
          ...patch,
          workoutsByDay: {
            ...(s.cyclePlans?.[letter]?.workoutsByDay ?? {}),
            ...(patch.workoutsByDay ?? {}),
          },
        },
      },
    }));

  const setCycleWorkoutForDay = (letter, day, workoutId) =>
    update((s) => ({
      ...s,
      cyclePlans: {
        ...(s.cyclePlans ?? {}),
        [letter]: {
          ...(s.cyclePlans?.[letter] ?? {}),
          workoutsByDay: {
            ...(s.cyclePlans?.[letter]?.workoutsByDay ?? {}),
            [day]: workoutId,
          },
        },
      },
    }));

  const setCycleMealProtocol = (letter, mealProtocolId) =>
    update((s) => ({
      ...s,
      cyclePlans: {
        ...(s.cyclePlans ?? {}),
        [letter]: {
          ...(s.cyclePlans?.[letter] ?? {}),
          mealProtocolId,
        },
      },
    }));

  // ── Override Layer ────────────────────────────────────────────────────
  const _setOverrides = (fn) =>
    update((s) => ({ ...s, overrides: fn(s.overrides ?? {}) }));

  const cancelDayOverride   = (dateKey) => _setOverrides((ov) => cancelDay(ov, dateKey));
  const restoreDayOverride  = (dateKey) => _setOverrides((ov) => restoreDay(ov, dateKey));
  const overrideBlockOnDate = (dateKey, templateBlockId, patch) =>
    _setOverrides((ov) => overrideBlock(ov, dateKey, templateBlockId, patch));
  const deleteBlockOnDate   = (dateKey, templateBlockId) =>
    _setOverrides((ov) => deleteTemplateBlock(ov, dateKey, templateBlockId));
  const addBlockOnDate      = (dateKey, block) =>
    _setOverrides((ov) => addDateBlock(ov, dateKey, { ...block, id: uid() }));
  const removeAddedBlock    = (dateKey, blockId) =>
    _setOverrides((ov) => removeDateBlock(ov, dateKey, blockId));
  const setOverrideNote     = (dateKey, note) =>
    _setOverrides((ov) => setDayNote(ov, dateKey, note));
  const clearDateOverride   = (dateKey) =>
    _setOverrides((ov) => { const { [dateKey]: _, ...rest } = ov; return rest; });

  // ── Focus 3 ──────────────────────────────────────────────────────────
  // focus3 = array of exactly 3 items (slots are always present, text may be empty)
  const _focus3 = (s) => s.focus3 ?? FOCUS3_DEFAULT;

  const setFocusItem = (index, patch) =>
    update((s) => {
      const f3 = [..._focus3(s)];
      f3[index] = { ...f3[index], ...patch };
      return { ...s, focus3: f3 };
    });

  const setFocusText = (index, text) => setFocusItem(index, { text });
  const setFocusDone = (index, done) => setFocusItem(index, { done });
  const setFocusProject = (index, projectId) => setFocusItem(index, { projectId });
  const clearFocusItem = (index) =>
    setFocusItem(index, { text: '', done: false, projectId: null });
  const resetFocus3 = () =>
    update((s) => ({ ...s, focus3: FOCUS3_DEFAULT }));

  // ── Principles ──────────────────────────────────────────────────────
  const addPrinciple = (title, body, category = 'General') => {
    const p = makePrinciple(title, body, category);
    update((s) => ({ ...s, principles: { ...(s.principles ?? {}), [p.id]: p } }));
    return p;
  };
  const updatePrinciple = (id, patch) =>
    update((s) => ({ ...s, principles: { ...s.principles, [id]: { ...s.principles[id], ...patch } } }));
  const deletePrinciple = (id) =>
    update((s) => { const { [id]: _, ...principles } = s.principles; return { ...s, principles }; });
  const reorderPrinciple = (id, newOrder) => updatePrinciple(id, { order: newOrder });

  // ── Weekly Reviews ───────────────────────────────────────────────────
  const _weekKey = (date = new Date()) => {
    // ISO week key: YYYY-Www
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
    const week1 = new Date(d.getFullYear(), 0, 4);
    const weekNum = 1 + Math.round(((d - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
    return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
  };
  const currentWeekKey = () => _weekKey();

  const saveReview = (weekKey, answers, rating = null) => {
    update((s) => {
      const existing = s.reviews?.[weekKey];
      const entry = existing
        ? { ...existing, answers: { ...existing.answers, ...answers }, rating: rating ?? existing.rating, completedAt: new Date().toISOString() }
        : { ...makeReviewEntry(weekKey), answers, rating };
      return { ...s, reviews: { ...(s.reviews ?? {}), [weekKey]: entry } };
    });
  };
  const deleteReview = (weekKey) =>
    update((s) => { const { [weekKey]: _, ...reviews } = (s.reviews ?? {}); return { ...s, reviews }; });

  // ── UI ────────────────────────────────────────────────────────────────
  const setActiveModule = (module) =>
    update((s) => ({ ...s, ui: { ...s.ui, activeModule: module } }));
  const toggleSidebar = () =>
    update((s) => ({ ...s, ui: { ...s.ui, sidebarOpen: !s.ui.sidebarOpen } }));

  // ── Selectors ─────────────────────────────────────────────────────────
  const selectors = {
    projectTasks: (pid) => {
      const p = state.projects[pid]; if (!p) return [];
      return p.taskIds.map((id) => state.tasks[id]).filter(Boolean);
    },
    orphanTasks:    () => Object.values(state.tasks).filter((t) => !t.projectId),
    activeProjects: () => Object.values(state.projects).filter((p) => p.status === 'Active'),
    inbox:          () => state.capture.filter((c) => !c.processed),
    todayMetric:    () => state.metrics[todayKey()] ?? makeMetricLog(),
    projectProgress: (pid) => {
      const tasks = selectors.projectTasks(pid);
      return tasks.length ? tasks.filter((t) => t.status === 'Done').length / tasks.length : 0;
    },
    dailyBriefing: (date = todayKey()) => resolvePhysicalBriefing(
      date,
      state.cycleStartDate,
      state.cyclePlans ?? {},
      state.reference ?? {},
      state.metrics?.[date]?.energy ?? null,
      state.settings?.energyLowThreshold ?? 4,
    ),
  };

  const value = {
    state,
    syncLoading,
    syncError,
    authUser: auth?.user ?? null,
    signOut: auth?.signOut ?? (() => {}),
    update,
    addCapture, updateCapture, deleteCapture, markCaptureProcessed, promoteCapture,
    addProject, updateProject, deleteProject, setProjectStatus, reorderProjectTasks,
    addTask, updateTask, deleteTask, setTaskStatus, moveTask,
    logMetric, logToday, deleteMetric, getMetricsRange,
    addContact, updateContact, deleteContact, touchContact, daysSince, getCRMByOverdue,
    setCycleStartDate, addCycleBlock, updateCycleBlock, deleteCycleBlock, duplicateCycle,
    updateCyclePlan, setCycleWorkoutForDay, setCycleMealProtocol,
    cancelDayOverride, restoreDayOverride, overrideBlockOnDate, deleteBlockOnDate,
    addBlockOnDate, removeAddedBlock, setOverrideNote, clearDateOverride,
    setActiveModule, toggleSidebar,
    setFocusText, setFocusDone, setFocusProject, clearFocusItem, resetFocus3,
    addPrinciple, updatePrinciple, deletePrinciple, reorderPrinciple,
    saveReview, deleteReview, currentWeekKey,
    selectors,
    resetToSeed,
  };

  return <OSContext.Provider value={value}>{children}</OSContext.Provider>;
}

export function useOS() {
  const ctx = useContext(OSContext);
  if (!ctx) throw new Error('useOS must be used inside <OSProvider>');
  return ctx;
}
