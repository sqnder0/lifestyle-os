const GOOGLE_CAL_BASE = 'https://www.googleapis.com/calendar/v3';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

const parseIso = (value) => {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const eventDateTime = (value) => {
  if (!value) return null;
  if (value.dateTime) return parseIso(value.dateTime);
  if (value.date) return parseIso(`${value.date}T00:00:00`);
  return null;
};

const splitRRule = (rrule) => {
  if (!rrule || typeof rrule !== 'string') return {};
  return rrule
    .replace(/^RRULE:/i, '')
    .split(';')
    .map((pair) => pair.split('='))
    .filter(([k, v]) => k && v)
    .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {});
};

export function parseRecurringCadence(rawRRule) {
  const rrule = splitRRule(rawRRule);
  const freq = rrule.FREQ;
  const interval = Number.parseInt(rrule.INTERVAL || '1', 10);

  if (!freq || Number.isNaN(interval) || interval <= 0) {
    return { allowed: false, frequency: null, interval: null };
  }

  if (freq === 'MONTHLY' || freq === 'YEARLY') {
    return { allowed: false, frequency: freq, interval };
  }

  if (freq !== 'WEEKLY') {
    return { allowed: false, frequency: freq, interval };
  }

  if (interval > 3) {
    return { allowed: false, frequency: freq, interval };
  }

  return { allowed: true, frequency: freq, interval };
}

function isUserOwnedOrParticipating(event, userEmail) {
  const creatorEmail = event?.creator?.email?.toLowerCase?.() || '';
  const attendees = Array.isArray(event?.attendees) ? event.attendees : [];
  const userAttendee = attendees.find((attendee) => {
    const email = attendee?.email?.toLowerCase?.();
    return email === userEmail;
  });

  if (creatorEmail === userEmail) return true;
  if (!userAttendee) return false;
  return userAttendee.responseStatus !== 'declined';
}

export function shouldPersistEvent(event, userEmail) {
  if (!event || event.status === 'cancelled') return false;
  if (!userEmail) return false;

  return isUserOwnedOrParticipating(event, userEmail);
}

async function refreshAccessToken(refreshToken) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!refreshToken || !clientId || !clientSecret) {
    throw new Error('Missing Google OAuth refresh configuration');
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload.error_description || 'Failed to refresh Google access token');
  }

  return res.json();
}

async function googleRequest(path, accessToken) {
  const res = await fetch(`${GOOGLE_CAL_BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (res.status === 401) {
    const e = new Error('Google access token expired');
    e.code = 'TOKEN_EXPIRED';
    throw e;
  }

  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload.error?.message || `Google API error (${res.status})`);
  }

  return res.json();
}

async function withGoogleAuth(profile, run, persistTokens) {
  try {
    return await run(profile.google_access_token);
  } catch (error) {
    if (error?.code !== 'TOKEN_EXPIRED') throw error;

    const refreshed = await refreshAccessToken(profile.google_refresh_token);
    const nextAccessToken = refreshed.access_token;
    const expiresIn = Number(refreshed.expires_in || 3600);
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    await persistTokens({
      accessToken: nextAccessToken,
      expiresAt,
    });

    return run(nextAccessToken);
  }
}

export async function listCalendars(profile, persistTokens) {
  const payload = await withGoogleAuth(
    profile,
    (token) => googleRequest('/users/me/calendarList', token),
    persistTokens,
  );

  return (payload.items || []).map((item) => ({
    id: item.id,
    summary: item.summary || item.id,
    primary: Boolean(item.primary),
    selected: item.selected !== false,
  }));
}

export async function listEvents(profile, { calendarId = 'primary', timeMin, timeMax }, persistTokens) {
  const params = new URLSearchParams({
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '250',
  });

  if (timeMin) params.set('timeMin', timeMin);
  if (timeMax) params.set('timeMax', timeMax);

  const payload = await withGoogleAuth(
    profile,
    (token) => googleRequest(`/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`, token),
    persistTokens,
  );

  return (payload.items || []).map((event) => ({
    id: event.id,
    calendarId,
    summary: event.summary || '(No title)',
    status: event.status,
    startTime: eventDateTime(event.start),
    endTime: eventDateTime(event.end),
    creatorEmail: event?.creator?.email || null,
    attendees: Array.isArray(event.attendees)
      ? event.attendees.map((a) => ({ email: a.email, responseStatus: a.responseStatus }))
      : [],
    rawRRule: Array.isArray(event.recurrence) ? event.recurrence.find((r) => r.startsWith('RRULE:')) || null : null,
  }));
}
