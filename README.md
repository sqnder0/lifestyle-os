# Lifestyle OS

Lifestyle OS is a single-page React application for planning, execution, and daily physical strategy. It combines a cycle-based schedule, an inbox, project management, metrics, habits, CRM, journaling, principles, and a dashboard that now acts as a simple daily briefing.

This version is no longer localStorage-only. It uses a PostgreSQL-backed API with email/password authentication, user-scoped data, optimistic updates, and a lightweight polling-based refresh loop for cross-session sync.

For production deployment, use the included [Dockerfile](Dockerfile). It builds the frontend and runs the Express API in one container, which is the simplest production path for this app.

## Features

- Daily briefing dashboard for workout and meal direction
- A/B/C cycle templates with workout-per-day and meal-protocol-per-week mapping
- Capture inbox and project/task management
- Metrics tracking for energy, sleep, and mood
- Reference library for workouts, meal protocols, recovery protocols, and pantry essentials
- PostgreSQL-backed auth with login/signup and sign out
- Optimistic sync to the API with background persistence
- React + Vite frontend with Tailwind styling

## Architecture

### Frontend

- React 18
- Vite 5
- Tailwind CSS with CSS variables
- App state managed through context and custom hooks
- Auth/session handled in the browser via a JWT stored in localStorage

### Backend

- Node.js + Express
- PostgreSQL via `pg`
- Password hashing with `bcryptjs`
- JWT auth with `jsonwebtoken`
- CORS configured for the frontend origin

### Data model

The PostgreSQL schema is defined in [server/sql/001_phase7_core.sql](server/sql/001_phase7_core.sql) and includes:

- `auth_users` - email/password authentication records
- `profiles` - user profile, settings, onboarding flag
- `capture_inbox` - inbox items
- `projects` - project records plus JSON metadata
- `metrics` - daily energy, sleep, and mood entries
- `cycle_templates` - cycle workout and meal routing

## Requirements

- Node.js 18 or newer
- npm
- PostgreSQL 14+ recommended

## Quick Start

1. Install dependencies.

```bash
npm install
```

2. Create a PostgreSQL database.

3. Copy the example environment file.

```bash
cp .env.example .env
```

4. Edit `.env` with your values.

```bash
VITE_API_URL=http://localhost:4000/api
API_PORT=4000
CLIENT_ORIGIN=http://localhost:5173
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/lifestyle_os
JWT_SECRET=change-me
```

5. Apply the SQL migration in your PostgreSQL database.

Run the contents of [server/sql/001_phase7_core.sql](server/sql/001_phase7_core.sql) in your SQL editor or migration tool.

6. Start the API server.

```bash
npm run api
```

7. Start the frontend dev server.

```bash
npm run dev
```

8. Open the app and sign up with email/password.

## Development Scripts

- `npm run dev` - start the Vite frontend
- `npm run api` - start the Express API
- `npm run dev:full` - run frontend and API together
- `npm run build` - build the frontend for production
- `npm start` - start the production server after building the frontend

## Production Deployment

### Recommended builder

Use **Dockerfile** as the production builder.

Why:

- The app needs both the frontend bundle and the backend API.
- The Dockerfile builds `dist/` and serves it from the same Express process as `/api`.
- This avoids mismatched hostnames or separate static/API deployments.

If your platform requires a publish directory only, use `dist/` for the frontend build, but you will still need a separate API service. For this repository, Dockerfile is the production-ready path.

### 1. Build the frontend

```bash
npm run build
```

This outputs the production bundle to `dist/`.

### 2. Start the backend in production

```bash
NODE_ENV=production npm start
```

The Express server will:

- serve the API under `/api`
- serve the built frontend from `dist/`
- fall back to `index.html` for client-side routing

### 3. Set production environment variables

Use real values for:

- `DATABASE_URL`
- `JWT_SECRET`
 - `CLIENT_ORIGIN` (optional if the frontend and API are same-origin)
- `API_PORT` or `PORT` depending on your host
- `VITE_API_URL` only if the API is hosted separately

If the frontend and backend are hosted on the same origin, you can leave `VITE_API_URL` unset and the browser client will use `/api`.

### 4. Docker build example

```bash
docker build -t lifestyle-os .
docker run -p 8080:8080 \
	-e DATABASE_URL="postgresql://..." \
	-e JWT_SECRET="..." \
	-e CLIENT_ORIGIN="http://localhost:8080" \
	lifestyle-os
```

The container listens on `PORT=8080` by default. Most builders can override that with their own runtime port mapping.

If you serve the frontend and API from the same origin, you can omit `CLIENT_ORIGIN` entirely.

## Database Setup

The provided schema is intentionally compact and production-friendly for the current phase.

### Tables

- `auth_users`
- `profiles`
- `capture_inbox`
- `projects`
- `metrics`
- `cycle_templates`

### Notes

- `profiles.id` is the authenticated user ID.
- All user data is filtered by `user_id` on the API side.
- `cycle_templates` stores workout and meal mappings per week/day.
- For the current phase, the app uses API-level authorization rather than PostgreSQL RLS.

## Authentication Flow

1. User opens the app.
2. If no JWT exists, the login/signup screen is shown.
3. On successful login or signup, the JWT is stored locally.
4. The app fetches the user record and synced state from the API.
5. The dashboard and modules render only after authentication.

## Sync Behavior

- State is fetched after login.
- UI updates happen immediately through optimistic updates.
- Writes are batched to the API in the background.
- The sync hook periodically refreshes from the server so changes made in another session appear automatically.

## Environment Variables

| Variable | Purpose |
| --- | --- |
| `VITE_API_URL` | Frontend base URL for the API |
| `API_PORT` | API server port |
| `CLIENT_ORIGIN` | Allowed browser origin for CORS |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret used to sign auth tokens |

## Troubleshooting

### Blank login screen or auth errors

- Make sure the API server is running.
- Confirm `VITE_API_URL` points to the API server.
- Check `JWT_SECRET` and `DATABASE_URL` in `.env`.

### Database errors on startup

- Confirm PostgreSQL is reachable.
- Make sure the schema from [server/sql/001_phase7_core.sql](server/sql/001_phase7_core.sql) has been applied.
- Verify the database user has permission to create tables and indexes.

### Frontend loads but data is empty

- Sign in with the same account used to save data.
- Check the API `/api/health` endpoint.
- Confirm the sync request to `/api/state` returns data.

## Project Notes

- The app is designed as a personal operating system rather than a generic task manager.
- The dashboard is intentionally minimal and surfaces only the current physical plan.
- PostgreSQL is the source of truth for signed-in users in this version.

## File Map

- [src/App.jsx](src/App.jsx) - auth gating and app shell
- [src/context/OSContext.jsx](src/context/OSContext.jsx) - state mutations and sync integration
- [src/hooks/useApiAuth.js](src/hooks/useApiAuth.js) - login/signup/session management
- [src/hooks/usePostgresSync.js](src/hooks/usePostgresSync.js) - fetch, optimistic writes, refresh loop
- [src/components/modules/AuthScreen.jsx](src/components/modules/AuthScreen.jsx) - login/signup UI
- [server/index.js](server/index.js) - Express API and production static server
- [server/sql/001_phase7_core.sql](server/sql/001_phase7_core.sql) - PostgreSQL schema

## Security Notes

- Never commit `.env`.
- Use a strong `JWT_SECRET` in production.
- Use a restricted PostgreSQL user for application access.
- The current API enforces user scoping; if you later add direct SQL access, add PostgreSQL RLS as well.
