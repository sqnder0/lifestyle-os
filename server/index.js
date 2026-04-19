import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import crypto from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getClient, query } from './db.js';
import { authMiddleware, signAuthState, signToken, verifyAuthState } from './auth.js';
import {
  listCalendars,
  listEvents,
  shouldPersistEvent,
  parseRecurringCadence,
} from './googleCalendarService.js';

dotenv.config();

const app = express();
const port = Number(process.env.PORT || process.env.API_PORT || 4000);
const clientOrigin = process.env.CLIENT_ORIGIN || '';
const isProduction = process.env.NODE_ENV === 'production';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, '..', 'dist');
const schemaPath = path.resolve(__dirname, 'sql', '001_phase7_core.sql');

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';
const GOOGLE_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/calendar.readonly',
].join(' ');

app.use(clientOrigin ? cors({ origin: clientOrigin, credentials: false }) : cors());
app.use(express.json());

if (isProduction) {
  app.use(express.static(distPath));
}

app.get('/api/health', async (_req, res) => {
  try {
    await query('select 1');
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

async function ensureSchema() {
  const client = await getClient();
  try {
    await client.query('begin');
    const schemaSql = await readFile(schemaPath, 'utf8');
    await client.query(schemaSql);
    await client.query('commit');
    console.log('Database schema ready');
  } catch (error) {
    try {
      await client.query('rollback');
    } catch {
      // ignore rollback errors when the transaction never started cleanly
    }
    throw error;
  } finally {
    client.release();
  }
}

function resolveRedirectTarget(req, redirect) {
  const fallback = clientOrigin || `${req.protocol}://${req.get('host')}`;
  if (!redirect) return fallback;
  try {
    const target = new URL(redirect);
    const allowedOrigins = new Set([
      clientOrigin,
      req.headers.origin,
      `${req.protocol}://${req.get('host')}`,
    ].filter(Boolean));
    return allowedOrigins.has(target.origin) ? redirect : fallback;
  } catch {
    return fallback;
  }
}

function getGoogleRedirectUri(req) {
  return process.env.GOOGLE_REDIRECT_URI || `${req.protocol}://${req.get('host')}/api/auth/google/callback`;
}

async function exchangeGoogleCode(code, redirectUri) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Missing Google OAuth client configuration');
  }

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload.error_description || 'Failed to exchange Google auth code');
  }

  return res.json();
}

async function fetchGoogleUserInfo(accessToken) {
  const res = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload.error_description || 'Failed to fetch Google user info');
  }

  return res.json();
}

async function upsertGoogleUser({ email, subject, name }) {
  const normalizedEmail = (email || '').toLowerCase();
  if (!normalizedEmail || !subject) {
    throw new Error('Missing Google identity payload');
  }

  const bySubject = await query('select id, email, google_subject from auth_users where google_subject = $1', [subject]);
  if (bySubject.rowCount) {
    return bySubject.rows[0];
  }

  const byEmail = await query('select id, email, google_subject from auth_users where lower(email) = lower($1)', [normalizedEmail]);
  if (byEmail.rowCount) {
    const existing = byEmail.rows[0];
    if (existing.google_subject && existing.google_subject !== subject) {
      throw new Error('Google account already linked to a different user.');
    }

    await query('update auth_users set google_subject = $1 where id = $2', [subject, existing.id]);
    return { ...existing, google_subject: subject };
  }

  const inserted = await query(
    'insert into auth_users (email, password_hash, google_subject) values (lower($1), $2, $3) returning id, email',
    [normalizedEmail, null, subject],
  );
  return inserted.rows[0];
}

app.get('/api/auth/google/start', async (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return res.status(500).json({ error: 'Missing Google OAuth configuration.' });
  }

  const redirect = resolveRedirectTarget(req, req.query.redirect);
  const stateToken = signAuthState({
    redirect,
    nonce: crypto.randomBytes(16).toString('hex'),
  });

  const authUrl = new URL(GOOGLE_AUTH_URL);
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', getGoogleRedirectUri(req));
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', GOOGLE_SCOPES);
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');
  authUrl.searchParams.set('include_granted_scopes', 'true');
  authUrl.searchParams.set('state', stateToken);

  return res.redirect(authUrl.toString());
});

app.get('/api/auth/google/callback', async (req, res) => {
  const { code, state, error } = req.query || {};
  if (error) {
    const redirect = resolveRedirectTarget(req, req.query.redirect);
    const url = new URL(redirect);
    url.hash = `auth_error=${encodeURIComponent(String(error))}`;
    return res.redirect(url.toString());
  }

  if (!code || !state) {
    return res.status(400).json({ error: 'Missing OAuth code or state.' });
  }

  let redirect;
  try {
    const payload = verifyAuthState(String(state));
    redirect = payload?.redirect || resolveRedirectTarget(req, null);
  } catch (stateError) {
    return res.status(400).json({ error: stateError.message || 'Invalid OAuth state.' });
  }

  try {
    const redirectUri = getGoogleRedirectUri(req);
    const tokenPayload = await exchangeGoogleCode(String(code), redirectUri);
    const accessToken = tokenPayload.access_token;
    const refreshToken = tokenPayload.refresh_token ?? null;
    const expiresIn = Number(tokenPayload.expires_in || 3600);
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    const userInfo = await fetchGoogleUserInfo(accessToken);
    const email = userInfo.email;
    const subject = userInfo.sub;
    const displayName = userInfo.given_name || userInfo.name || (email ? email.split('@')[0] : '');

    const user = await upsertGoogleUser({ email, subject, name: displayName });

    await query(
      `insert into profiles (
         id,
         first_name,
         username,
         settings,
         onboarded,
         google_email,
         google_access_token,
         google_refresh_token,
         google_token_expires_at
       ) values ($1,$2,$3,$4::jsonb,false,lower($5),$6,$7,$8)
       on conflict (id) do update
       set google_email = excluded.google_email,
           google_access_token = excluded.google_access_token,
           google_refresh_token = coalesce(excluded.google_refresh_token, profiles.google_refresh_token),
           google_token_expires_at = excluded.google_token_expires_at,
           first_name = coalesce(excluded.first_name, profiles.first_name),
           username = coalesce(excluded.username, profiles.username)`,
      [
        user.id,
        displayName || null,
        displayName || null,
        JSON.stringify({}),
        email,
        accessToken,
        refreshToken,
        expiresAt,
      ],
    );

    const token = signToken(user.id);
    const url = new URL(redirect);
    url.hash = `auth_token=${encodeURIComponent(token)}`;
    return res.redirect(url.toString());
  } catch (authError) {
    const url = new URL(redirect || resolveRedirectTarget(req, null));
    url.hash = `auth_error=${encodeURIComponent(authError.message || 'OAuth failed')}`;
    return res.redirect(url.toString());
  }
});

app.post('/api/auth/logout', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const result = await query(
      `select
         u.id,
         u.email,
         p.first_name,
         p.username,
         p.settings,
         p.onboarded
       from auth_users u
       left join profiles p on p.id = u.id
       where u.id = $1`,
      [req.userId],
    );

    if (!result.rowCount) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const row = result.rows[0];
    return res.json({
      user: { id: row.id, email: row.email },
      profile: {
        first_name: row.first_name,
        username: row.username,
        settings: row.settings ?? {},
        onboarded: Boolean(row.onboarded),
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/state', authMiddleware, async (req, res) => {
  try {
    const [profile, capture, metrics, cycleTemplates, syncedEvents, habits, principles] = await Promise.all([
      query(
        `select first_name, username, settings, onboarded, google_email, google_access_token, google_refresh_token, google_token_expires_at, google_last_synced_at
         from profiles where id = $1`,
        [req.userId],
      ),
      query('select id, content, created_at, status from capture_inbox where user_id = $1 order by created_at desc', [req.userId]),
      query('select id, date, energy, sleep, mood from metrics where user_id = $1 order by date asc', [req.userId]),
      query('select id, week_type, day_of_week, workout_id, meal_protocol_id from cycle_templates where user_id = $1', [req.userId]),
      query(
        `select google_event_id, calendar_id, start_time, end_time, summary, raw_rrule, source_status, created_by_email, attendee_emails, synced_at
         from synced_events
         where user_id = $1
         order by start_time asc`,
        [req.userId],
      ),
      query('select id, name, emoji, color, logs, created_at from habits where user_id = $1 order by created_at asc', [req.userId]),
      query(
        `select id, title, body, category, principle_order, created_at
         from principles
         where user_id = $1
         order by principle_order asc, created_at asc`,
        [req.userId],
      ),
    ]);

    return res.json({
      profile: profile.rows[0] || null,
      captureInbox: capture.rows,
      metrics: metrics.rows,
      cycleTemplates: cycleTemplates.rows,
      syncedEvents: syncedEvents.rows,
      habits: habits.rows,
      principles: principles.rows,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.put('/api/state', authMiddleware, async (req, res) => {
  const payload = req.body || {};
  const {
    profile = null,
    captureInbox = [],
    metrics = [],
    cycleTemplates = [],
    syncedEvents = [],
    habits = [],
    principles = [],
  } = payload;

  const client = await getClient();
  try {
    await client.query('begin');

    if (profile) {
      await client.query(
        `insert into profiles (id, first_name, username, settings, onboarded)
         values ($1, $2, $3, $4::jsonb, $5)
         on conflict (id) do update
         set first_name = excluded.first_name,
             username = excluded.username,
             settings = excluded.settings,
             onboarded = excluded.onboarded`,
        [
          req.userId,
          profile.username ?? null,
          profile.username ?? null,
          JSON.stringify(profile.settings ?? {}),
          Boolean(profile.onboarded),
        ],
      );
    }

    await client.query('delete from capture_inbox where user_id = $1', [req.userId]);
    for (const item of captureInbox) {
      await client.query(
        'insert into capture_inbox (id, user_id, content, created_at, status) values ($1, $2, $3, $4, $5)',
        [item.id, req.userId, item.content, item.created_at, item.status],
      );
    }

    await client.query('delete from metrics where user_id = $1', [req.userId]);
    for (const item of metrics) {
      await client.query(
        'insert into metrics (id, user_id, date, energy, sleep, mood) values ($1, $2, $3, $4, $5, $6)',
        [item.id, req.userId, item.date, item.energy, item.sleep, item.mood],
      );
    }

    await client.query('delete from cycle_templates where user_id = $1', [req.userId]);
    for (const row of cycleTemplates) {
      await client.query(
        `insert into cycle_templates (id, user_id, week_type, day_of_week, workout_id, meal_protocol_id)
         values ($1, $2, $3, $4, $5, $6)`,
        [row.id, req.userId, row.week_type, row.day_of_week, row.workout_id, row.meal_protocol_id],
      );
    }

    await client.query('delete from synced_events where user_id = $1', [req.userId]);
    for (const event of syncedEvents) {
      await client.query(
        `insert into synced_events (
          user_id,
          google_event_id,
          calendar_id,
          start_time,
          end_time,
          summary,
          raw_rrule,
          source_status,
          created_by_email,
          attendee_emails,
          synced_at
        ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, coalesce($11::timestamptz, now()))`,
        [
          req.userId,
          event.google_event_id,
          event.calendar_id ?? null,
          event.start_time,
          event.end_time,
          event.summary ?? '',
          event.raw_rrule ?? null,
          event.source_status ?? null,
          event.created_by_email ?? null,
          JSON.stringify(event.attendee_emails ?? []),
          event.synced_at ?? null,
        ],
      );
    }

    await client.query('delete from habits where user_id = $1', [req.userId]);
    for (const habit of habits) {
      await client.query(
        `insert into habits (id, user_id, name, emoji, color, logs)
         values ($1, $2, $3, $4, $5, $6::jsonb)`,
        [habit.id, req.userId, habit.name, habit.emoji ?? null, habit.color ?? null, JSON.stringify(habit.logs ?? {})],
      );
    }

    await client.query('delete from principles where user_id = $1', [req.userId]);
    for (const principle of principles) {
      await client.query(
        `insert into principles (id, user_id, title, body, category, principle_order)
         values ($1, $2, $3, $4, $5, $6)`,
        [principle.id, req.userId, principle.title, principle.body, principle.category ?? 'General', principle.principle_order ?? 0],
      );
    }

    await client.query('commit');
    return res.json({ ok: true });
  } catch (error) {
    try {
      await client.query('rollback');
    } catch {
      // ignore rollback errors
    }
    return res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

app.get('/api/google/status', authMiddleware, async (req, res) => {
  try {
    const profile = await query(
      `select google_email, google_access_token, google_refresh_token, google_last_synced_at, settings
       from profiles where id = $1`,
      [req.userId],
    );
    const row = profile.rows[0];
    const integration = row?.settings?.googleCalendar ?? {};
    return res.json({
      connected: Boolean(row?.google_access_token && row?.google_refresh_token),
      email: row?.google_email ?? null,
      lastSyncedAt: row?.google_last_synced_at ?? null,
      selectedCalendarIds: integration.selectedCalendarIds ?? [],
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/google/connect', authMiddleware, async (req, res) => {
  const {
    accessToken,
    refreshToken,
    email,
    expiresAt,
  } = req.body || {};

  if (!accessToken || !email) {
    return res.status(400).json({ error: 'accessToken and email are required.' });
  }

  try {
    await query(
      `update profiles
       set google_access_token = $2,
           google_refresh_token = coalesce($3, google_refresh_token),
           google_email = lower($4),
           google_token_expires_at = $5
       where id = $1`,
      [req.userId, accessToken, refreshToken, email, expiresAt ?? null],
    );
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/google/disconnect', authMiddleware, async (req, res) => {
  try {
    await query(
      `update profiles
       set google_access_token = null,
           google_refresh_token = null,
           google_email = null,
           google_token_expires_at = null,
           google_last_synced_at = null
       where id = $1`,
      [req.userId],
    );
    await query('delete from synced_events where user_id = $1', [req.userId]);
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/google/calendars', authMiddleware, async (req, res) => {
  try {
    const profileRes = await query(
      'select google_access_token, google_refresh_token, google_email, google_token_expires_at from profiles where id = $1',
      [req.userId],
    );
    const profile = profileRes.rows[0];

    if (!profile?.google_access_token || !profile?.google_refresh_token || !profile?.google_email) {
      return res.status(400).json({ error: 'Google Calendar is not connected.' });
    }

    const calendars = await listCalendars(profile, async ({ accessToken, expiresAt }) => {
      await query(
        `update profiles
         set google_access_token = $2,
             google_token_expires_at = $3
         where id = $1`,
        [req.userId, accessToken, expiresAt],
      );
    });

    return res.json({ calendars });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/google/sync', authMiddleware, async (req, res) => {
  const { force = false } = req.body || {};

  try {
    const profileRes = await query(
      'select google_access_token, google_refresh_token, google_email, google_token_expires_at, google_last_synced_at, settings from profiles where id = $1',
      [req.userId],
    );
    const profile = profileRes.rows[0];

    if (!profile?.google_access_token || !profile?.google_refresh_token || !profile?.google_email) {
      return res.status(400).json({ error: 'Google Calendar is not connected.' });
    }

    const selectedCalendarIds = profile.settings?.googleCalendar?.selectedCalendarIds;
    const calendarIds = Array.isArray(selectedCalendarIds) && selectedCalendarIds.length
      ? selectedCalendarIds
      : ['primary'];

    const now = Date.now();
    const lastSyncedMs = profile.google_last_synced_at ? new Date(profile.google_last_synced_at).getTime() : 0;
    if (!force && lastSyncedMs && now - lastSyncedMs < 5 * 60 * 1000) {
      const existing = await query(
        `select google_event_id, calendar_id, start_time, end_time, summary, raw_rrule, source_status, created_by_email, attendee_emails, synced_at
         from synced_events where user_id = $1 order by start_time asc`,
        [req.userId],
      );
      return res.json({
        events: existing.rows,
        throttled: true,
        lastSyncedAt: profile.google_last_synced_at,
        syncDebug: {
          calendarIds,
          fetchedCount: null,
          filteredCount: null,
          persistedCount: existing.rows.length,
          reason: 'throttled',
        },
      });
    }

    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - 7);
    const windowEnd = new Date();
    windowEnd.setDate(windowEnd.getDate() + 35);

    const allEvents = [];
    for (const calendarId of calendarIds) {
      const events = await listEvents(
        profile,
        {
          calendarId,
          timeMin: windowStart.toISOString(),
          timeMax: windowEnd.toISOString(),
        },
        async ({ accessToken, expiresAt }) => {
          await query(
            `update profiles
             set google_access_token = $2,
                 google_token_expires_at = $3
             where id = $1`,
            [req.userId, accessToken, expiresAt],
          );
        },
      );
      for (const event of events) {
        allEvents.push(event);
      }
    }

    const userEmail = profile.google_email.toLowerCase();
    const filtered = allEvents.filter((event) => shouldPersistEvent(event, userEmail));

    const client = await getClient();
    try {
      await client.query('begin');
      await client.query('delete from synced_events where user_id = $1', [req.userId]);

      for (const event of filtered) {
        if (!event.startTime || !event.endTime) continue;

        await client.query(
          `insert into synced_events (
             user_id,
             google_event_id,
             calendar_id,
             start_time,
             end_time,
             summary,
             raw_rrule,
             source_status,
             created_by_email,
             attendee_emails,
             synced_at
           ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,now())
           on conflict (user_id, google_event_id)
           do update set
             calendar_id = excluded.calendar_id,
             start_time = excluded.start_time,
             end_time = excluded.end_time,
             summary = excluded.summary,
             raw_rrule = excluded.raw_rrule,
             source_status = excluded.source_status,
             created_by_email = excluded.created_by_email,
             attendee_emails = excluded.attendee_emails,
             synced_at = now()`,
          [
            req.userId,
            event.id,
            event.calendarId,
            event.startTime,
            event.endTime,
            event.summary,
            event.rawRRule,
            event.status,
            event.creatorEmail ?? event.organizerEmail,
            JSON.stringify(event.attendees.map((a) => a.email).filter(Boolean)),
          ],
        );
      }

      await client.query(
        'update profiles set google_last_synced_at = now() where id = $1',
        [req.userId],
      );
      await client.query('commit');
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }

    const rows = await query(
      `select google_event_id, calendar_id, start_time, end_time, summary, raw_rrule, source_status, created_by_email, attendee_emails, synced_at
       from synced_events where user_id = $1 order by start_time asc`,
      [req.userId],
    );

    const recurringCandidates = rows.rows
      .filter((event) => parseRecurringCadence(event.raw_rrule).allowed)
      .map((event) => ({
        ...event,
        cadence: parseRecurringCadence(event.raw_rrule),
      }));

    return res.json({
      events: rows.rows,
      recurringCandidates,
      lastSyncedAt: new Date().toISOString(),
      throttled: false,
      syncDebug: {
        calendarIds,
        fetchedCount: allEvents.length,
        filteredCount: filtered.length,
        persistedCount: rows.rows.length,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

if (isProduction) {
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api')) {
      return next();
    }
    return res.sendFile(path.join(distPath, 'index.html'));
  });
}

async function main() {
  await ensureSchema();
  app.listen(port, () => {
    console.log(`API running on http://localhost:${port}`);
  });
}

main().catch((error) => {
  console.error('Startup failed:', error);
  process.exit(1);
});
