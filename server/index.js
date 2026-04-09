import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getClient, query } from './db.js';
import { authMiddleware, signToken } from './auth.js';

dotenv.config();

const app = express();
const port = Number(process.env.PORT || process.env.API_PORT || 4000);
const clientOrigin = process.env.CLIENT_ORIGIN || '';
const isProduction = process.env.NODE_ENV === 'production';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, '..', 'dist');
const schemaPath = path.resolve(__dirname, 'sql', '001_phase7_core.sql');

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

app.post('/api/auth/signup', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  try {
    const existing = await query('select id from auth_users where lower(email) = lower($1)', [email]);
    if (existing.rowCount) {
      return res.status(409).json({ error: 'Email already in use.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const insertUser = await query(
      'insert into auth_users (email, password_hash) values (lower($1), $2) returning id, email, created_at',
      [email, passwordHash],
    );

    const user = insertUser.rows[0];
    await query(
      'insert into profiles (id, username, settings, onboarded) values ($1, $2, $3::jsonb, false)',
      [user.id, null, JSON.stringify({})],
    );

    const token = signToken(user.id);
    return res.status(201).json({ token, user: { id: user.id, email: user.email } });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const result = await query('select id, email, password_hash from auth_users where lower(email) = lower($1)', [email]);
    if (!result.rowCount) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const user = result.rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const token = signToken(user.id);
    return res.json({ token, user: { id: user.id, email: user.email } });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const result = await query(
      `select u.id, u.email, p.username, p.settings, p.onboarded
       from auth_users u
       left join profiles p on p.id = u.id
       where u.id = $1`,
      [req.userId],
    );

    if (!result.rowCount) {
      return res.status(404).json({ error: 'User not found.' });
    }

    return res.json({ user: result.rows[0] });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/state', authMiddleware, async (req, res) => {
  try {
    const [profile, capture, metrics, cycleTemplates] = await Promise.all([
      query('select username, settings, onboarded from profiles where id = $1', [req.userId]),
      query('select id, content, created_at, status from capture_inbox where user_id = $1 order by created_at desc', [req.userId]),
      query('select id, date, energy, sleep, mood from metrics where user_id = $1 order by date asc', [req.userId]),
      query('select id, week_type, day_of_week, workout_id, meal_protocol_id from cycle_templates where user_id = $1', [req.userId]),
    ]);

    return res.json({
      profile: profile.rows[0] || null,
      captureInbox: capture.rows,
      metrics: metrics.rows,
      cycleTemplates: cycleTemplates.rows,
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
  } = payload;

  const client = await getClient();
  try {
    await client.query('begin');

    if (profile) {
      await client.query(
        `insert into profiles (id, username, settings, onboarded)
         values ($1, $2, $3::jsonb, $4)
         on conflict (id) do update
         set username = excluded.username,
             settings = excluded.settings,
             onboarded = excluded.onboarded`,
        [req.userId, profile.username ?? null, JSON.stringify(profile.settings ?? {}), Boolean(profile.onboarded)],
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
