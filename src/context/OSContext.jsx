import { createContext, useContext, useCallback } from 'react';
import { usePostgresSync } from '../hooks/usePostgresSync';
import {
  SEED_STATE,
  uid,
  todayKey,
  makeCapture,
  makeMetricLog,
  makeCycleBlock,
  makePrinciple,
  makeReviewEntry,
} from '../utils/schema';
import {
  cancelDay,
  restoreDay,
  overrideBlock,
  deleteTemplateBlock,
  addDateBlock,
  removeDateBlock,
  setDayNote,
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

  const addCapture = (text) => {
    const value = text?.trim();
    if (!value) return;
    update((s) => ({ ...s, capture: [makeCapture(value), ...(s.capture ?? [])] }));
  };

  const updateCapture = (id, patch) =>
    update((s) => ({
      ...s,
      capture: (s.capture ?? []).map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));

  const deleteCapture = (id) =>
    update((s) => ({ ...s, capture: (s.capture ?? []).filter((c) => c.id !== id) }));

  const markCaptureProcessed = (id) => {
    const target = (state.capture ?? []).find((c) => c.id === id);
    if (!target) return;
    updateCapture(id, { processed: !target.processed });
  };

  const logMetric = (date = todayKey(), patch = {}) =>
    update((s) => ({
      ...s,
      metrics: {
        ...(s.metrics ?? {}),
        [date]: { ...((s.metrics ?? {})[date] ?? makeMetricLog(date)), ...patch },
      },
    }));

  const logToday = (patch) => logMetric(todayKey(), patch);

  const deleteMetric = (date) =>
    update((s) => {
      const { [date]: _removed, ...metrics } = s.metrics ?? {};
      return { ...s, metrics };
    });

  const getMetricsRange = (days = 30) => {
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      result.push((state.metrics ?? {})[key] ?? makeMetricLog(key));
    }
    return result;
  };

  const setCycleStartDate = (dateKey) => update((s) => ({ ...s, cycleStartDate: dateKey }));

  const addCycleBlock = (letter, blockData = {}) => {
    const block = { ...makeCycleBlock(), ...blockData, id: uid() };
    update((s) => ({
      ...s,
      cycles: {
        ...(s.cycles ?? {}),
        [letter]: {
          ...(s.cycles?.[letter] ?? { letter, label: `Week ${letter}`, blocks: [] }),
          blocks: [...(s.cycles?.[letter]?.blocks ?? []), block],
        },
      },
    }));
    return block;
  };

  const updateCycleBlock = (letter, blockId, patch) =>
    update((s) => ({
      ...s,
      cycles: {
        ...(s.cycles ?? {}),
        [letter]: {
          ...(s.cycles?.[letter] ?? {}),
          blocks: (s.cycles?.[letter]?.blocks ?? []).map((b) => (b.id === blockId ? { ...b, ...patch } : b)),
        },
      },
    }));

  const deleteCycleBlock = (letter, blockId) =>
    update((s) => ({
      ...s,
      cycles: {
        ...(s.cycles ?? {}),
        [letter]: {
          ...(s.cycles?.[letter] ?? {}),
          blocks: (s.cycles?.[letter]?.blocks ?? []).filter((b) => b.id !== blockId),
        },
      },
    }));

  const duplicateCycle = (from, to) =>
    update((s) => ({
      ...s,
      cycles: {
        ...(s.cycles ?? {}),
        [to]: {
          ...(s.cycles?.[to] ?? {}),
          blocks: (s.cycles?.[from]?.blocks ?? []).map((b) => ({ ...b, id: uid() })),
        },
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

  const _setOverrides = (fn) => update((s) => ({ ...s, overrides: fn(s.overrides ?? {}) }));

  const cancelDayOverride = (dateKey) => _setOverrides((ov) => cancelDay(ov, dateKey));
  const restoreDayOverride = (dateKey) => _setOverrides((ov) => restoreDay(ov, dateKey));
  const overrideBlockOnDate = (dateKey, templateBlockId, patch) =>
    _setOverrides((ov) => overrideBlock(ov, dateKey, templateBlockId, patch));
  const deleteBlockOnDate = (dateKey, templateBlockId) =>
    _setOverrides((ov) => deleteTemplateBlock(ov, dateKey, templateBlockId));
  const addBlockOnDate = (dateKey, block) =>
    _setOverrides((ov) => addDateBlock(ov, dateKey, { ...block, id: uid() }));
  const removeAddedBlock = (dateKey, blockId) => _setOverrides((ov) => removeDateBlock(ov, dateKey, blockId));
  const setOverrideNote = (dateKey, note) => _setOverrides((ov) => setDayNote(ov, dateKey, note));
  const clearDateOverride = (dateKey) =>
    _setOverrides((ov) => {
      const { [dateKey]: _removed, ...rest } = ov;
      return rest;
    });

  const addPrinciple = (title, body, category = 'General') => {
    const principle = makePrinciple(title, body, category);
    update((s) => ({
      ...s,
      principles: { ...(s.principles ?? {}), [principle.id]: principle },
    }));
    return principle;
  };

  const updatePrinciple = (id, patch) =>
    update((s) => ({
      ...s,
      principles: {
        ...(s.principles ?? {}),
        [id]: { ...(s.principles?.[id] ?? {}), ...patch },
      },
    }));

  const deletePrinciple = (id) =>
    update((s) => {
      const { [id]: _removed, ...principles } = s.principles ?? {};
      return { ...s, principles };
    });

  const reorderPrinciple = (id, newOrder) => updatePrinciple(id, { order: newOrder });

  const currentWeekKey = (date = new Date()) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
    const week1 = new Date(d.getFullYear(), 0, 4);
    const weekNum = 1 + Math.round(((d - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
    return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
  };

  const saveReview = (weekKey, answers, rating = null) => {
    update((s) => {
      const existing = s.reviews?.[weekKey];
      const entry = existing
        ? {
            ...existing,
            answers: { ...existing.answers, ...answers },
            rating: rating ?? existing.rating,
            completedAt: new Date().toISOString(),
          }
        : { ...makeReviewEntry(weekKey), answers, rating };

      return { ...s, reviews: { ...(s.reviews ?? {}), [weekKey]: entry } };
    });
  };

  const deleteReview = (weekKey) =>
    update((s) => {
      const { [weekKey]: _removed, ...reviews } = s.reviews ?? {};
      return { ...s, reviews };
    });

  const setActiveModule = (module) =>
    update((s) => ({ ...s, ui: { ...(s.ui ?? {}), activeModule: module } }));

  const toggleSidebar = () =>
    update((s) => ({ ...s, ui: { ...(s.ui ?? {}), sidebarOpen: !s.ui?.sidebarOpen } }));

  const selectors = {
    inbox: () => (state.capture ?? []).filter((c) => !c.processed),
    todayMetric: () => state.metrics?.[todayKey()] ?? makeMetricLog(),
    dailyBriefing: (date = todayKey()) =>
      resolvePhysicalBriefing(
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
    resetToSeed,
    addCapture,
    updateCapture,
    deleteCapture,
    markCaptureProcessed,
    logMetric,
    logToday,
    deleteMetric,
    getMetricsRange,
    setCycleStartDate,
    addCycleBlock,
    updateCycleBlock,
    deleteCycleBlock,
    duplicateCycle,
    updateCyclePlan,
    setCycleWorkoutForDay,
    setCycleMealProtocol,
    cancelDayOverride,
    restoreDayOverride,
    overrideBlockOnDate,
    deleteBlockOnDate,
    addBlockOnDate,
    removeAddedBlock,
    setOverrideNote,
    clearDateOverride,
    addPrinciple,
    updatePrinciple,
    deletePrinciple,
    reorderPrinciple,
    saveReview,
    deleteReview,
    currentWeekKey,
    setActiveModule,
    toggleSidebar,
    selectors,
  };

  return <OSContext.Provider value={value}>{children}</OSContext.Provider>;
}

export function useOS() {
  const ctx = useContext(OSContext);
  if (!ctx) throw new Error('useOS must be used inside <OSProvider>');
  return ctx;
}
