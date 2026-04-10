import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { DEFAULT_REFERENCE, uid } from '../utils/schema';

const DAY_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const isMissingHabitsRelation = (error) =>
  Boolean(error?.message && /relation .*habits/i.test(error.message));

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
    const { reference, principles, habits: legacyHabits, ...profileSettings } = profile.settings ?? {};
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
      name: profile.first_name ?? profile.username ?? (profile.settings?.name ?? next.settings.name),
      onboarded: Boolean(profile.onboarded),
    };
    next.reference = reference ?? next.reference ?? DEFAULT_REFERENCE;
    next.habits = legacyHabits ?? next.habits;
    next.principles = principles ?? next.principles;
  }

  if (Array.isArray(payload.habits)) {
    next.habits = Object.fromEntries(payload.habits.map((row) => ([row.id, {
      id: row.id,
      name: row.name,
      emoji: row.emoji,
      color: row.color,
      logs: row.logs ?? {},
      createdAt: row.created_at,
    }])));
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

  const habits = Object.values(state.habits ?? {}).map((habit) => ({
    id: habit.id,
    name: habit.name,
    emoji: habit.emoji ?? null,
    color: habit.color ?? null,
    logs: habit.logs ?? {},
    created_at: habit.createdAt ?? new Date().toISOString(),
  }));

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

  return { profile, captureInbox, metrics, cycleTemplates, syncedEvents, habits };
}

export function usePostgresSync({ initialState, userId }) {
  const [state, setState] = useState(initialState);
  const [loading, setLoading] = useState(Boolean(userId));
  const [syncError, setSyncError] = useState(null);
  const [dirty, setDirty] = useState(false);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!userId) {
      setState(initialState);
      setLoading(false);
      setSyncError(null);
      initializedRef.current = false;
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const [
          profileRes,
          captureRes,
          metricsRes,
          cycleRes,
          syncedRes,
          habitsRes,
        ] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
          supabase.from('capture_inbox').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
          supabase.from('metrics').select('*').eq('user_id', userId).order('date', { ascending: true }),
          supabase.from('cycle_templates').select('*').eq('user_id', userId),
          supabase.from('synced_events').select('*').eq('user_id', userId).order('start_time', { ascending: true }),
          supabase.from('habits').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
        ]);

        if (cancelled) return;

        const normalizedHabitsError = isMissingHabitsRelation(habitsRes.error) ? null : habitsRes.error;
        if (profileRes.error || captureRes.error || metricsRes.error || cycleRes.error || syncedRes.error || normalizedHabitsError) {
          throw profileRes.error || captureRes.error || metricsRes.error || cycleRes.error || syncedRes.error || normalizedHabitsError;
        }

        const payload = {
          profile: profileRes.data,
          captureInbox: captureRes.data ?? [],
          metrics: metricsRes.data ?? [],
          cycleTemplates: cycleRes.data ?? [],
          syncedEvents: syncedRes.data ?? [],
          habits: normalizedHabitsError ? [] : (habitsRes.data ?? []),
        };

        setState(mapFromServer(initialState, payload));
        initializedRef.current = true;
        setDirty(false);
        setSyncError(null);
      } catch (error) {
        if (cancelled) return;
        setSyncError(error.message || 'Failed to load user state');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, initialState]);

  const setSyncedState = useCallback((updater) => {
    setState((prev) => (typeof updater === 'function' ? updater(prev) : updater));
    if (initializedRef.current) {
      setDirty(true);
    }
  }, []);

  useEffect(() => {
    if (!userId || !initializedRef.current || !dirty) return;

    const timer = setTimeout(async () => {
      try {
        const payload = toServerPayload(state);

        const profilePayload = payload.profile;
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: userId,
            first_name: profilePayload.username ?? '',
            username: profilePayload.username ?? '',
            onboarded: Boolean(profilePayload.onboarded),
            settings: profilePayload.settings ?? {},
          }, { onConflict: 'id' });
        if (profileError) throw profileError;

        const { error: captureDeleteError } = await supabase.from('capture_inbox').delete().eq('user_id', userId);
        if (captureDeleteError) throw captureDeleteError;
        if (payload.captureInbox.length) {
          const { error: captureInsertError } = await supabase.from('capture_inbox').insert(
            payload.captureInbox.map((item) => ({ ...item, user_id: userId })),
          );
          if (captureInsertError) throw captureInsertError;
        }

        const { error: metricDeleteError } = await supabase.from('metrics').delete().eq('user_id', userId);
        if (metricDeleteError) throw metricDeleteError;
        if (payload.metrics.length) {
          const { error: metricInsertError } = await supabase.from('metrics').insert(
            payload.metrics.map((item) => ({ ...item, user_id: userId })),
          );
          if (metricInsertError) throw metricInsertError;
        }

        const { error: cycleDeleteError } = await supabase.from('cycle_templates').delete().eq('user_id', userId);
        if (cycleDeleteError) throw cycleDeleteError;
        if (payload.cycleTemplates.length) {
          const { error: cycleInsertError } = await supabase.from('cycle_templates').insert(
            payload.cycleTemplates.map((item) => ({ ...item, user_id: userId })),
          );
          if (cycleInsertError) throw cycleInsertError;
        }

        const { error: syncedDeleteError } = await supabase.from('synced_events').delete().eq('user_id', userId);
        if (syncedDeleteError) throw syncedDeleteError;
        if (payload.syncedEvents.length) {
          const { error: syncedInsertError } = await supabase.from('synced_events').insert(
            payload.syncedEvents.map((item) => ({ ...item, user_id: userId })),
          );
          if (syncedInsertError) throw syncedInsertError;
        }

        const { error: habitsDeleteError } = await supabase.from('habits').delete().eq('user_id', userId);
        if (habitsDeleteError && !isMissingHabitsRelation(habitsDeleteError)) throw habitsDeleteError;
        if (!habitsDeleteError && payload.habits.length) {
          const { error: habitsInsertError } = await supabase.from('habits').insert(
            payload.habits.map((item) => ({ ...item, user_id: userId })),
          );
          if (habitsInsertError && !isMissingHabitsRelation(habitsInsertError)) throw habitsInsertError;
        }

        setDirty(false);
        setSyncError(null);
      } catch (error) {
        setSyncError(error.message);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [state, userId, dirty]);

  useEffect(() => {
    if (!userId || !initializedRef.current) return undefined;

    const timer = setInterval(async () => {
      if (dirty) return;
      try {
        const [
          profileRes,
          captureRes,
          metricsRes,
          cycleRes,
          syncedRes,
          habitsRes,
        ] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
          supabase.from('capture_inbox').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
          supabase.from('metrics').select('*').eq('user_id', userId).order('date', { ascending: true }),
          supabase.from('cycle_templates').select('*').eq('user_id', userId),
          supabase.from('synced_events').select('*').eq('user_id', userId).order('start_time', { ascending: true }),
          supabase.from('habits').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
        ]);

        const normalizedHabitsError = isMissingHabitsRelation(habitsRes.error) ? null : habitsRes.error;
        if (profileRes.error || captureRes.error || metricsRes.error || cycleRes.error || syncedRes.error || normalizedHabitsError) {
          throw profileRes.error || captureRes.error || metricsRes.error || cycleRes.error || syncedRes.error || normalizedHabitsError;
        }

        const payload = {
          profile: profileRes.data,
          captureInbox: captureRes.data ?? [],
          metrics: metricsRes.data ?? [],
          cycleTemplates: cycleRes.data ?? [],
          syncedEvents: syncedRes.data ?? [],
          habits: normalizedHabitsError ? [] : (habitsRes.data ?? []),
        };
        setState((prev) => mapFromServer(prev, payload));
      } catch {
        // Best-effort polling; failures are ignored and retried on next tick.
      }
    }, 8000);

    return () => clearInterval(timer);
  }, [userId, dirty]);

  return useMemo(() => ({
    state,
    setState: setSyncedState,
    loading,
    syncError,
  }), [state, setSyncedState, loading, syncError]);
}
