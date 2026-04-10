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
  resolveDay,
  mapEventToCycle,
  parseKey,
} from '../utils/cycleEngine';
import { api } from '../lib/api';

const OSContext = createContext(null);

export function OSProvider({ children, auth }) {
  const { state, setState, loading: syncLoading, syncError } = usePostgresSync({
    initialState: SEED_STATE,
    userId: auth?.user?.id ?? null,
  });

  const update = useCallback((fn) => setState((prev) => fn(prev)), [setState]);
  const resetToSeed = () => setState(SEED_STATE);

  const eventToDisplayBlock = (event) => {
    const start = new Date(event.start_time);
    const end = new Date(event.end_time);
    const duration = Math.max(15, Math.round((end - start) / 60000));
    return {
      id: `google-${event.google_event_id}`,
      label: event.summary || '(No title)',
      hour: start.getHours(),
      minute: start.getMinutes(),
      duration,
      type: 'external',
      source: 'google',
      readOnly: true,
    };
  };

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

  const updateSettings = (patch = {}) => {
    update((s) => ({
      ...s,
      settings: {
        ...(s.settings ?? {}),
        ...patch,
      },
    }));
  };

  const setProfileName = (name) => {
    const cleanName = (name || '').trim();
    updateSettings({ name: cleanName });
  };

  const setCycleGoals = (goals = []) => {
    const nextGoals = Array.isArray(goals) ? goals.slice(0, 3) : [];
    while (nextGoals.length < 3) nextGoals.push('');
    updateSettings({ cycleGoals: nextGoals.map((goal) => String(goal || '').trim()) });
  };

  const setOnboarded = (value) => {
    updateSettings({ onboarded: Boolean(value) });
  };

  const upsertHabit = (habit) => {
    if (!habit?.id) return;
    update((s) => ({
      ...s,
      habits: {
        ...(s.habits ?? {}),
        [habit.id]: {
          ...(s.habits?.[habit.id] ?? {}),
          ...habit,
        },
      },
    }));
  };

  const setHabits = (habits = []) => {
    const entries = Array.isArray(habits)
      ? Object.fromEntries(habits.filter((habit) => habit?.id).map((habit) => [habit.id, habit]))
      : {};
    update((s) => ({ ...s, habits: entries }));
  };

  const setPrinciples = (principles = []) => {
    const entries = Array.isArray(principles)
      ? Object.fromEntries(principles.filter((principle) => principle?.id).map((principle) => [principle.id, principle]))
      : {};
    update((s) => ({ ...s, principles: entries }));
  };

  const connectGoogleCalendar = async ({ accessToken, refreshToken, email, expiresAt }) => {
    if (!auth?.token) throw new Error('Missing authenticated session token.');
    await api.googleConnect(auth.token, { accessToken, refreshToken, email, expiresAt });
    update((s) => ({
      ...s,
      settings: {
        ...(s.settings ?? {}),
        googleCalendar: {
          ...(s.settings?.googleCalendar ?? {}),
          connected: true,
          email,
        },
      },
    }));
  };

  const syncGoogleCalendar = async ({ force = false } = {}) => {
    if (!auth?.token) throw new Error('Missing authenticated session token.');

    const hasConnectedGoogle = Boolean(
      state.settings?.googleCalendar?.connected
      && state.settings?.googleCalendar?.email,
    );

    if (!hasConnectedGoogle && auth?.googleIdentityTokens?.accessToken) {
      const email = auth?.googleIdentityTokens?.email || auth?.user?.email;
      await connectGoogleCalendar({
        accessToken: auth.googleIdentityTokens.accessToken,
        refreshToken: auth.googleIdentityTokens.refreshToken,
        email,
        expiresAt: auth.googleIdentityTokens.expiresAt,
      });
    }

    const response = await api.googleSync(auth.token, { force });
    update((s) => ({
      ...s,
      syncedEvents: response.events ?? s.syncedEvents ?? [],
      settings: {
        ...(s.settings ?? {}),
        googleCalendar: {
          ...(s.settings?.googleCalendar ?? {}),
          connected: true,
          lastSyncedAt: response.lastSyncedAt ?? new Date().toISOString(),
        },
      },
      ui: {
        ...(s.ui ?? {}),
        pendingGoogleRecurringImports: response.recurringCandidates ?? [],
      },
    }));
    return response;
  };

  const saveGoogleCalendarSelection = async (selectedCalendarIds) => {
    update((s) => ({
      ...s,
      settings: {
        ...(s.settings ?? {}),
        googleCalendar: {
          ...(s.settings?.googleCalendar ?? {}),
          selectedCalendarIds,
        },
      },
    }));
  };

  const disconnectGoogleCalendar = async () => {
    if (!auth?.token) throw new Error('Missing authenticated session token.');
    await api.googleDisconnect(auth.token);
    update((s) => ({
      ...s,
      syncedEvents: [],
      settings: {
        ...(s.settings ?? {}),
        googleCalendar: {
          ...(s.settings?.googleCalendar ?? {}),
          connected: false,
          email: '',
          selectedCalendarIds: [],
          lastSyncedAt: null,
        },
      },
      ui: {
        ...(s.ui ?? {}),
        pendingGoogleRecurringImports: [],
      },
    }));
  };

  const fetchGoogleCalendars = async () => {
    if (!auth?.token) throw new Error('Missing authenticated session token.');
    const payload = await api.googleCalendars(auth.token);
    return payload.calendars ?? [];
  };

  const applyGoogleRecurringImports = () => {
    const imports = state.ui?.pendingGoogleRecurringImports ?? [];
    if (!imports.length) return 0;

    let applied = 0;
    update((s) => {
      const nextCycles = { ...(s.cycles ?? {}) };
      for (const candidate of imports) {
        if (!candidate.raw_rrule || !candidate.start_time) continue;
        const mapped = mapEventToCycle(candidate.raw_rrule, candidate.start_time, s.cycleStartDate);
        if (!mapped) continue;

        for (const slot of mapped.slots) {
          const week = slot.week;
          const start = new Date(candidate.start_time);
          const end = new Date(candidate.end_time);
          const duration = Math.max(15, Math.round((end - start) / 60000));
          const exists = (nextCycles?.[week]?.blocks ?? []).some(
            (b) => b.day === slot.day && b.label === candidate.summary && b.hour === start.getHours() && (b.minute ?? 0) === start.getMinutes(),
          );
          if (exists) continue;
          applied += 1;
          nextCycles[week] = {
            ...(nextCycles[week] ?? { letter: week, label: `Week ${week}`, blocks: [] }),
            blocks: [
              ...(nextCycles[week]?.blocks ?? []),
              {
                id: uid(),
                day: slot.day,
                label: candidate.summary,
                hour: start.getHours(),
                minute: start.getMinutes(),
                duration,
                type: 'external',
              },
            ],
          };
        }
      }

      return {
        ...s,
        cycles: nextCycles,
        ui: {
          ...(s.ui ?? {}),
          pendingGoogleRecurringImports: [],
        },
      };
    });
    return applied;
  };

  const selectors = {
    inbox: () => (state.capture ?? []).filter((c) => !c.processed),
    todayMetric: () => state.metrics?.[todayKey()] ?? makeMetricLog(),
    dailyBriefing: (date = todayKey()) => {
      const briefing = resolvePhysicalBriefing(
        date,
        state.cycleStartDate,
        state.cyclePlans ?? {},
        state.reference ?? {},
        state.metrics?.[date]?.energy ?? null,
        state.settings?.energyLowThreshold ?? 4,
      );

      const localEvents = resolveDay(date, state.cycles ?? {}, state.overrides ?? {}, parseKey(state.cycleStartDate))
        .map((event) => ({ ...event, source: event.source || 'template' }));

      const externalEvents = (state.syncedEvents ?? [])
        .filter((event) => {
          const start = new Date(event.start_time);
          const yyyy = String(start.getFullYear());
          const mm = String(start.getMonth() + 1).padStart(2, '0');
          const dd = String(start.getDate()).padStart(2, '0');
          return `${yyyy}-${mm}-${dd}` === date;
        })
        .map(eventToDisplayBlock);

      const mergedEvents = [...localEvents, ...externalEvents].sort((a, b) => {
        const aMin = a.hour * 60 + (a.minute ?? 0);
        const bMin = b.hour * 60 + (b.minute ?? 0);
        return aMin - bMin;
      });

      return { ...briefing, mergedEvents };
    },
  };

  const value = {
    state,
    syncLoading,
    syncError,
    authSession: auth?.session ?? null,
    authUser: auth?.user ?? null,
    linkedProviders: auth?.linkedProviders ?? [],
    linkGoogleIdentity: auth?.linkGoogleIdentity ?? (async () => {}),
    signOut: auth?.signOut ?? (() => {}),
    update,
    updateSettings,
    setProfileName,
    setCycleGoals,
    setOnboarded,
    upsertHabit,
    setHabits,
    setPrinciples,
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
    syncGoogleCalendar,
    saveGoogleCalendarSelection,
    applyGoogleRecurringImports,
    connectGoogleCalendar,
    disconnectGoogleCalendar,
    fetchGoogleCalendars,
    selectors,
  };

  return <OSContext.Provider value={value}>{children}</OSContext.Provider>;
}

export function useOS() {
  const ctx = useContext(OSContext);
  if (!ctx) throw new Error('useOS must be used inside <OSProvider>');
  return ctx;
}
