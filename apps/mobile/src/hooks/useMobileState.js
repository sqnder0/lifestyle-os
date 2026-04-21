import { useCallback, useEffect, useMemo, useState } from 'react';

import { makeCapture, SEED_STATE } from '@lifestyle-os/shared/schema';
import { api } from '../lib/api';

const DAY_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const toDateKey = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toCaptureItem = (row) => ({
  id: row.id,
  text: row.content,
  createdAt: row.created_at,
  processed: row.status === 'processed',
});

const toMetricMap = (rows = []) =>
  Object.fromEntries(
    rows
      .map((row) => {
        const dateKey = toDateKey(row.date);
        if (!dateKey) return null;
        return [dateKey, {
          id: row.id,
          date: dateKey,
          energy: row.energy,
          sleep: row.sleep,
          mood: row.mood,
        }];
      })
      .filter(Boolean),
  );

const toCyclePlans = (rows = []) => {
  const grouped = {
    A: { workoutsByDay: {}, mealProtocolId: null },
    B: { workoutsByDay: {}, mealProtocolId: null },
    C: { workoutsByDay: {}, mealProtocolId: null },
  };

  for (const row of rows) {
    if (!grouped[row.week_type]) continue;
    grouped[row.week_type].workoutsByDay[row.day_of_week] = row.workout_id;
    if (row.meal_protocol_id && !grouped[row.week_type].mealProtocolId) {
      grouped[row.week_type].mealProtocolId = row.meal_protocol_id;
    }
  }

  // Keep all days present for stable rendering.
  for (const letter of ['A', 'B', 'C']) {
    for (const day of DAY_ORDER) {
      if (!Object.prototype.hasOwnProperty.call(grouped[letter].workoutsByDay, day)) {
        grouped[letter].workoutsByDay[day] = null;
      }
    }
  }

  return grouped;
};

const mapFromServer = (payload) => {
  const profile = payload?.profile ?? null;
  const settings = profile?.settings ?? {};

  return {
    profile,
    settings,
    reference: settings.reference ?? SEED_STATE.reference,
    capture: Array.isArray(payload?.captureInbox) ? payload.captureInbox.map(toCaptureItem) : [],
    metrics: toMetricMap(payload?.metrics ?? []),
    cyclePlans: toCyclePlans(payload?.cycleTemplates ?? []),
    syncedEvents: Array.isArray(payload?.syncedEvents) ? payload.syncedEvents : [],
    lastLoadedAt: new Date().toISOString(),
  };
};

export function useMobileState(token) {
  const [data, setData] = useState(() => ({
    profile: null,
    settings: {},
    reference: SEED_STATE.reference,
    capture: [],
    metrics: {},
    cyclePlans: SEED_STATE.cyclePlans,
    syncedEvents: [],
    lastLoadedAt: null,
  }));
  const [loading, setLoading] = useState(Boolean(token));
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(async ({ silent = false } = {}) => {
    if (!token) return null;

    if (!silent) {
      setRefreshing(true);
    }

    try {
      const payload = await api.getState(token);
      const mapped = mapFromServer(payload);
      setData(mapped);
      setError(null);
      return mapped;
    } catch (nextError) {
      setError(nextError.message || 'Failed to load mobile state.');
      throw nextError;
    } finally {
      if (!silent) {
        setRefreshing(false);
      }
    }
  }, [token]);

  useEffect(() => {
    let active = true;

    if (!token) {
      setLoading(false);
      setError(null);
      setData({
        profile: null,
        settings: {},
        reference: SEED_STATE.reference,
        capture: [],
        metrics: {},
        cyclePlans: SEED_STATE.cyclePlans,
        syncedEvents: [],
        lastLoadedAt: null,
      });
      return () => {
        active = false;
      };
    }

    setLoading(true);
    refresh({ silent: true })
      .catch(() => {
        // Error state handled in refresh.
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [token, refresh]);

  const addCapture = useCallback(async (text) => {
    if (!token) {
      throw new Error('Sign in required.');
    }

    const value = String(text ?? '').trim();
    if (!value) {
      return null;
    }

    const optimistic = makeCapture(value);
    setData((prev) => ({ ...prev, capture: [optimistic, ...prev.capture] }));

    try {
      const response = await api.createCapture(token, {
        content: optimistic.text,
        createdAt: optimistic.createdAt,
        status: optimistic.processed ? 'processed' : 'open',
      });

      const persisted = toCaptureItem(response.item);
      setData((prev) => ({
        ...prev,
        capture: prev.capture.map((entry) => (entry.id === optimistic.id ? persisted : entry)),
      }));
      setError(null);
      return persisted;
    } catch (nextError) {
      setData((prev) => ({
        ...prev,
        capture: prev.capture.filter((entry) => entry.id !== optimistic.id),
      }));
      setError(nextError.message || 'Failed to save capture.');
      throw nextError;
    }
  }, [token]);

  return useMemo(() => ({
    data,
    loading,
    refreshing,
    error,
    refresh,
    addCapture,
  }), [data, loading, refreshing, error, refresh, addCapture]);
}
