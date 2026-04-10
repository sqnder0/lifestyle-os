import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
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
    const { reference, ...profileSettings } = profile.settings ?? {};
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
  }

  if (Array.isArray(payload.habits)) {
    next.habits = Object.fromEntries(payload.habits.map((row) => [row.id, {
      id: row.id,
      name: row.name,
      emoji: row.emoji,
      color: row.color,
      logs: row.logs ?? {},
      createdAt: row.created_at,
    }]));
  }

  if (Array.isArray(payload.principles)) {
    next.principles = Object.fromEntries(payload.principles.map((row) => [row.id, {
      id: row.id,
      title: row.title,
      body: row.body,
      category: row.category,
      order: row.principle_order ?? 0,
      createdAt: row.created_at,
    }]));
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
    },
  };

  const habits = Object.values(state.habits ?? {}).map((habit) => ({
    id: habit.id ?? uid(),
    name: habit.name,
    emoji: habit.emoji ?? null,
    color: habit.color ?? null,
    logs: habit.logs ?? {},
  }));

  const principles = Object.values(state.principles ?? {}).map((principle) => ({
    id: principle.id ?? uid(),
    title: principle.title,
    body: principle.body,
    category: principle.category ?? 'General',
    principle_order: principle.order ?? 0,
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

  return { profile, captureInbox, metrics, cycleTemplates, syncedEvents, habits, principles };
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
          principlesRes,
        ] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
          supabase.from('capture_inbox').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
          supabase.from('metrics').select('*').eq('user_id', userId).order('date', { ascending: true }),
          supabase.from('cycle_templates').select('*').eq('user_id', userId),
          supabase.from('synced_events').select('*').eq('user_id', userId).order('start_time', { ascending: true }),
          supabase.from('habits').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
          supabase.from('principles').select('*').eq('user_id', userId).order('principle_order', { ascending: true }),
        ]);

        if (cancelled) return;

        if (profileRes.error || captureRes.error || metricsRes.error || cycleRes.error || syncedRes.error || habitsRes.error || principlesRes.error) {
          throw profileRes.error || captureRes.error || metricsRes.error || cycleRes.error || syncedRes.error || habitsRes.error || principlesRes.error;
        }

        const payload = {
          profile: profileRes.data,
          captureInbox: captureRes.data ?? [],
          metrics: metricsRes.data ?? [],
          cycleTemplates: cycleRes.data ?? [],
          syncedEvents: syncedRes.data ?? [],
          habits: habitsRes.data ?? [],
          principles: principlesRes.data ?? [],
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
        if (habitsDeleteError) throw habitsDeleteError;
        if (payload.habits.length) {
          const { error: habitsInsertError } = await supabase.from('habits').insert(
            payload.habits.map((item) => ({ ...item, user_id: userId })),
          );
          if (habitsInsertError) throw habitsInsertError;
        }

        const { error: principlesDeleteError } = await supabase.from('principles').delete().eq('user_id', userId);
        if (principlesDeleteError) throw principlesDeleteError;
        if (payload.principles.length) {
          const { error: principlesInsertError } = await supabase.from('principles').insert(
            payload.principles.map((item) => ({ ...item, user_id: userId })),
          );
          if (principlesInsertError) throw principlesInsertError;
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
          principlesRes,
        ] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
          supabase.from('capture_inbox').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
          supabase.from('metrics').select('*').eq('user_id', userId).order('date', { ascending: true }),
          supabase.from('cycle_templates').select('*').eq('user_id', userId),
          supabase.from('synced_events').select('*').eq('user_id', userId).order('start_time', { ascending: true }),
          supabase.from('habits').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
          supabase.from('principles').select('*').eq('user_id', userId).order('principle_order', { ascending: true }),
        ]);

        if (profileRes.error || captureRes.error || metricsRes.error || cycleRes.error || syncedRes.error || habitsRes.error || principlesRes.error) {
          throw profileRes.error || captureRes.error || metricsRes.error || cycleRes.error || syncedRes.error || habitsRes.error || principlesRes.error;
        }

        const payload = {
          profile: profileRes.data,
          captureInbox: captureRes.data ?? [],
          metrics: metricsRes.data ?? [],
          cycleTemplates: cycleRes.data ?? [],
          syncedEvents: syncedRes.data ?? [],
          habits: habitsRes.data ?? [],
          principles: principlesRes.data ?? [],
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
