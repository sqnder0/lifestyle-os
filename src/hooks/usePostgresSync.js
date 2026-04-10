import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { api } from '../lib/api';
import { DEFAULT_REFERENCE, uid } from '../utils/schema';

const DAY_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const toDateKey = (value) => {
  const d = new Date(value);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

function mapFromServer(seedState, payload) {
  const next = {
    ...seedState,
    settings: { ...seedState.settings },
  };

  const profile = payload.profile ?? null;
  if (profile) {
    const { reference, habits, principles, ...profileSettings } = profile.settings ?? {};
    const googleCalendar = {
      connected: Boolean(profile?.google_access_token ?? false),
      email: profile?.google_email ?? profileSettings?.googleCalendar?.email ?? '',
      selectedCalendarIds: profileSettings?.googleCalendar?.selectedCalendarIds ?? [],
      lastSyncedAt: profile?.google_last_synced_at ?? profileSettings?.googleCalendar?.lastSyncedAt ?? null,
    };
    next.settings = {
      ...next.settings,
      ...profileSettings,
      googleCalendar,
      name: profile.username ?? (profile.settings?.name ?? next.settings.name),
      onboarded: Boolean(profile.onboarded),
    };
    next.reference = reference ?? next.reference ?? DEFAULT_REFERENCE;
    next.habits = habits ?? next.habits;
    next.principles = principles ?? next.principles;
  }

  if (Array.isArray(payload.captureInbox)) {
    next.capture = payload.captureInbox.map((row) => ({
      id: row.id,
      text: row.content,
      createdAt: row.created_at,
      processed: row.status === 'processed',
    }));
  }

  if (Array.isArray(payload.metrics)) {
    next.metrics = Object.fromEntries(payload.metrics.map((row) => {
      const key = toDateKey(row.date);
      return [key, {
        id: row.id,
        date: key,
        energy: row.energy,
        sleep: row.sleep,
        mood: row.mood,
      }];
    }));
  }

  if (Array.isArray(payload.cycleTemplates)) {
    const grouped = {
      A: { workoutsByDay: {}, mealProtocolId: null },
      B: { workoutsByDay: {}, mealProtocolId: null },
      C: { workoutsByDay: {}, mealProtocolId: null },
    };

    for (const row of payload.cycleTemplates) {
      if (!grouped[row.week_type]) continue;
      grouped[row.week_type].workoutsByDay[row.day_of_week] = row.workout_id;
      if (row.meal_protocol_id && !grouped[row.week_type].mealProtocolId) {
        grouped[row.week_type].mealProtocolId = row.meal_protocol_id;
      }
    }

    next.cyclePlans = {
      ...next.cyclePlans,
      ...grouped,
    };
  }

  if (Array.isArray(payload.syncedEvents)) {
    next.syncedEvents = payload.syncedEvents.map((row) => ({
      google_event_id: row.google_event_id,
      calendar_id: row.calendar_id,
      start_time: row.start_time,
      end_time: row.end_time,
      summary: row.summary,
      raw_rrule: row.raw_rrule,
      source_status: row.source_status,
      created_by_email: row.created_by_email,
      attendee_emails: Array.isArray(row.attendee_emails) ? row.attendee_emails : [],
      synced_at: row.synced_at,
    }));
  }

  return next;
}

function toServerPayload(state) {
  const profile = {
    username: state.settings?.name ?? '',
    onboarded: Boolean(state.settings?.onboarded),
    settings: {
      ...(state.settings ?? {}),
      reference: state.reference ?? DEFAULT_REFERENCE,
      habits: state.habits ?? {},
      principles: state.principles ?? {},
    },
  };

  const captureInbox = (state.capture ?? []).map((item) => ({
    id: item.id,
    content: item.text,
    created_at: item.createdAt,
    status: item.processed ? 'processed' : 'open',
  }));

  const metrics = Object.values(state.metrics ?? {}).map((metric) => ({
    id: metric.id ?? uid(),
    date: metric.date,
    energy: metric.energy,
    sleep: metric.sleep,
    mood: metric.mood,
  }));

  const cycleTemplates = [];
  for (const weekType of ['A', 'B', 'C']) {
    const plan = state.cyclePlans?.[weekType];
    if (!plan) continue;

    for (const day of DAY_ORDER) {
      cycleTemplates.push({
        id: uid(),
        week_type: weekType,
        day_of_week: day,
        workout_id: plan.workoutsByDay?.[day] ?? null,
        meal_protocol_id: plan.mealProtocolId ?? null,
      });
    }
  }

  const syncedEvents = (state.syncedEvents ?? []).map((event) => ({
    google_event_id: event.google_event_id,
    calendar_id: event.calendar_id ?? null,
    start_time: event.start_time,
    end_time: event.end_time,
    summary: event.summary ?? '',
    raw_rrule: event.raw_rrule ?? null,
    source_status: event.source_status ?? null,
    created_by_email: event.created_by_email ?? null,
    attendee_emails: event.attendee_emails ?? [],
    synced_at: event.synced_at ?? null,
  }));

  return { profile, captureInbox, metrics, cycleTemplates, syncedEvents };
}

export function usePostgresSync({ initialState, token }) {
  const [state, setState] = useState(initialState);
  const [loading, setLoading] = useState(Boolean(token));
  const [syncError, setSyncError] = useState(null);
  const [dirty, setDirty] = useState(false);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!token) {
      setState(initialState);
      setLoading(false);
      setSyncError(null);
      initializedRef.current = false;
      return;
    }

    let cancelled = false;
    setLoading(true);

    api.get('/state', token)
      .then((payload) => {
        if (cancelled) return;
        setState(mapFromServer(initialState, payload));
        initializedRef.current = true;
        setDirty(false);
        setSyncError(null);
      })
      .catch((error) => {
        if (cancelled) return;
        setSyncError(error.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token, initialState]);

  const setSyncedState = useCallback((updater) => {
    setState((prev) => (typeof updater === 'function' ? updater(prev) : updater));
    if (initializedRef.current) {
      setDirty(true);
    }
  }, []);

  useEffect(() => {
    if (!token || !initializedRef.current || !dirty) return;

    const timer = setTimeout(async () => {
      try {
        await api.put('/state', toServerPayload(state), token);
        setDirty(false);
        setSyncError(null);
      } catch (error) {
        setSyncError(error.message);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [state, token, dirty]);

  useEffect(() => {
    if (!token || !initializedRef.current) return undefined;

    const timer = setInterval(async () => {
      if (dirty) return;
      try {
        const payload = await api.get('/state', token);
        setState((prev) => mapFromServer(prev, payload));
      } catch {
        // Best-effort polling; failures are ignored and retried on next tick.
      }
    }, 8000);

    return () => clearInterval(timer);
  }, [token, dirty]);

  return useMemo(() => ({
    state,
    setState: setSyncedState,
    loading,
    syncError,
  }), [state, setSyncedState, loading, syncError]);
}
