# Lifestyle OS - Project Instructions

## 1. What this project is

Lifestyle OS is a single-page React app for personal planning and execution with a cycle-based schedule, daily metrics, habits, journaling, principles, and a health-oriented briefing surface.

Current architecture is Supabase-first for auth and persisted app state. A separate Express server still exists for API endpoints (health checks, legacy auth/state routes, and Google Calendar sync endpoints).

## 2. Stack and runtime

- Frontend: React 18 + Vite 5
- Styling: Tailwind CSS + CSS variable design tokens
- Icons: lucide-react
- State: React Context + custom hooks
- Primary persistence: Supabase client (`@supabase/supabase-js`) from the browser
- Secondary backend: Node.js + Express + PostgreSQL (`pg`) for server routes and Google Calendar sync

## 3. Setup and run

### Prerequisites

- Node.js 18+
- npm
- PostgreSQL (required for Express server routes)
- Supabase project (required for app auth + sync in current UI flow)

### Install

```bash
npm install
```

### Frontend dev server

```bash
npm run dev
```

### Backend API server

```bash
npm run api
```

### Run both in development

```bash
npm run dev:full
```

### Production build

```bash
npm run build
```

### Production server (after build)

```bash
npm start
```

### Preview frontend build only

```bash
npm run preview
```

### Tests

```bash
npm test
```

## 4. Environment configuration

The project currently needs both Supabase frontend env vars and backend env vars if server routes are used.

### Frontend env vars

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_API_URL` (optional, defaults to `/api` and used by `src/lib/api.js`)

### Backend env vars

- `API_PORT` (or `PORT` in production)
- `CLIENT_ORIGIN`
- `DATABASE_URL`
- `JWT_SECRET`
- `DATABASE_SSL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

Reference values are in `.env.example`.

## 5. Project structure

```text
index.html
package.json
README.md
INSTRUCTIONS.md
server/
  index.js
  auth.js
  db.js
  googleCalendarService.js
  sql/
    001_phase7_core.sql
src/
  main.jsx
  App.jsx
  index.css
  context/
    OSContext.jsx
  hooks/
    useSupabaseAuth.js
    usePostgresSync.js
    useDarkMode.js
    useKeyboard.js
  lib/
    supabase.js
    api.js
  utils/
    schema.js
    cycleEngine.js
    cycleEngine.test.js
  components/modules/
    AuthScreen.jsx
    DashboardModule.jsx
    CaptureModule.jsx
    CycleModule.jsx
    MetricsModule.jsx
    ReferenceModule.jsx
    PrinciplesModule.jsx
    WeeklyReviewModule.jsx
    HabitsModule.jsx
    JournalModule.jsx
    SettingsModule.jsx
    OnboardingFlow.jsx
    ...
```

## 6. Application architecture

### Root flow

1. `src/main.jsx` renders `App`.
2. `App` initializes auth via `useSupabaseAuth`.
3. If no Supabase session, `AuthScreen` is shown.
4. If authenticated but not onboarded, `OnboardingFlow` is shown.
5. Otherwise `OSProvider` wraps `AppShell`.

### Module registry (current)

Defined in `src/App.jsx`.

- `CORE_MODULES`
  - dashboard
  - capture
  - cycles
  - metrics
  - health (uses `ReferenceModule`)
  - principles
- `SYSTEM_MODULES`
  - review
  - habits
  - journal
- `HIDDEN_MODULES`
  - settings

Bottom mobile navigation currently includes only:

- dashboard
- capture
- cycles
- health
- principles

### Keyboard shortcuts (current)

Defined through `useKeyboard` in `AppShell`:

- `cmd+k`: toggle command palette
- `escape`: close palette and mobile drawer
- `g d`: dashboard
- `g i`: capture
- `g c`: cycles
- `g p`: principles
- `g m`: metrics
- `g h`: health
- `g w`: weekly review
- `cmd+,`: settings
- `g j`: journal

Note: `cmd` also works with Ctrl.

## 7. State model (source of truth)

Primary seed shape is `SEED_STATE` in `src/utils/schema.js`.

Top-level state keys currently include:

- `cycleStartDate`
- `cycles`
- `overrides`
- `capture`
- `metrics`
- `reference`
- `cyclePlans`
- `ui`
- `principles`
- `reviews`
- `habits`
- `journal`
- `settings`
- `syncedEvents`

State mutations and selectors are centralized in `src/context/OSContext.jsx`.

## 8. Data and persistence lifecycle

### Current primary path

- Auth: Supabase auth (`useSupabaseAuth`)
- State hydration/sync: direct Supabase table reads and writes (`usePostgresSync`)
- App does optimistic local updates and flushes changes with a short debounce
- Polling refresh runs periodically when state is clean

### Supabase tables actively used by frontend sync

- `profiles`
- `capture_inbox`
- `metrics`
- `cycle_templates`
- `synced_events`

### Mapping behavior

- `mapFromServer` merges database payload into seed state
- `toServerPayload` composes complete payload slices before persistence
- Sync currently uses delete-and-reinsert for several table slices (capture, metrics, cycle templates, synced events)

## 9. Backend and API notes

`server/index.js` currently provides:

- `/api/health`
- Legacy auth routes (`/api/auth/*`)
- Legacy bulk state routes (`/api/state` GET/PUT)
- Google integration routes:
  - `/api/google/status`
  - `/api/google/connect`
  - `/api/google/disconnect`
  - `/api/google/calendars`
  - `/api/google/sync`

Important: the frontend auth token is Supabase session-based. `OSContext` currently guards Google calls with a warning/error message indicating these routes are not fully wired for Supabase session tokens yet. Treat Google sync as partially integrated and validate auth compatibility before expanding this area.

## 10. Cycle engine rules

Implemented in `src/utils/cycleEngine.js`.

Core behavior:

- Rotating cycle weeks: A/B/C
- Monday-based week alignment
- Date resolution precedence:
  1. day cancel override
  2. full replacement override blocks
  3. template blocks + block overrides + added blocks
- Deterministic sorting by start time

Daily physical briefing uses cycle plans + reference data and can downgrade high-intensity training when energy is below threshold.

## 11. Styling and theme system

- Tokens are defined in `src/index.css`
- Light tokens under `:root`
- Dark mode under `html.dark`
- Theme toggle handled by `useDarkMode`
- Prefer CSS variables and existing utility patterns over hardcoded colors

## 12. How to add a new module

1. Add component under `src/components/modules/`.
2. Register in `src/App.jsx` (`CORE_MODULES`, `SYSTEM_MODULES`, or `HIDDEN_MODULES`).
3. Add/adjust state actions in `OSContext` if shared state is needed.
4. Extend `SEED_STATE` in `src/utils/schema.js` for persisted keys.
5. Update command palette behavior if needed.
6. Verify desktop sidebar, mobile drawer, and mobile bottom nav behavior.

## 13. How to add new persisted data safely

1. Extend `SEED_STATE` with defaults.
2. Add null-safe reads for migration resilience.
3. Update both `mapFromServer` and `toServerPayload` in `usePostgresSync`.
4. Keep updates immutable in `OSContext` actions.
5. Test login, reload, optimistic writes, and polling refresh.

## 14. Operational notes and risks

- Missing Supabase env vars does not hard-crash boot, but auth/persistence flows will fail.
- Backend routes depend on PostgreSQL availability and schema setup.
- Express auto-runs `server/sql/001_phase7_core.sql` at startup.
- Google integration stores sensitive tokens in `profiles`; handle carefully in production environments.
- Some docs and historical notes may still reference `useApiAuth`; the active flow is `useSupabaseAuth`.

## 15. Developer workflow recommendations

### When editing global state

- Keep all shared-state writes inside `OSContext` actions.
- Do not mutate state directly in module components.
- Keep schema defaults, sync mappings, and selectors aligned.

### When editing auth/onboarding

- Preserve `useSupabaseAuth` as the entrypoint for session and profile lifecycle.
- Keep onboarding persisted through `profiles` (`onboarded`, settings, first name).

### When editing sync

- Maintain clean mapping boundaries in `usePostgresSync`.
- Preserve debounce + dirty-flag behavior.
- Keep background polling guarded to avoid stomping unsaved local changes.

### When editing cycle logic

- Keep `cycleEngine` functions pure and deterministic.
- Add/update tests in `src/utils/cycleEngine.test.js` for boundary conditions.

### When editing backend routes

- Scope all reads and writes by authenticated user identity.
- Avoid exposing Google tokens in responses or logs.

## 16. Suggested manual test checklist

- App shows auth screen when unauthenticated.
- Sign in/up through Supabase works.
- Onboarding is shown once and persists.
- Reload restores session and state.
- Command palette and shortcut navigation works.
- Mobile drawer and bottom nav are usable.
- Theme toggle persists.
- Capture, metrics, cycle plans, principles, habits, journal, and reviews persist.
- Daily briefing reflects cycle plan and low-energy fallback logic.
- `npm test` passes (`cycleEngine` coverage).
- If using backend routes, `/api/health` is healthy and DB schema initializes.

## 17. Quick file map

- `src/App.jsx`: module registry, shell layout, auth/onboarding gates
- `src/context/OSContext.jsx`: shared state actions and selectors
- `src/hooks/useSupabaseAuth.js`: session/profile lifecycle
- `src/hooks/usePostgresSync.js`: Supabase hydration, optimistic writes, refresh
- `src/lib/supabase.js`: Supabase client bootstrap
- `src/lib/api.js`: API helper (currently used for google endpoints)
- `src/utils/schema.js`: seed defaults, factories, constants
- `src/utils/cycleEngine.js`: cycle/day resolution and briefing logic
- `src/components/modules/SettingsModule.jsx`: settings and integration controls
- `server/index.js`: Express API and production static hosting
- `server/sql/001_phase7_core.sql`: PostgreSQL schema

---

Use this file as the authoritative contributor orientation document for the current codebase state.
