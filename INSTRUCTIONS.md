# Lifestyle OS - Project Instructions

## 1. What this project is

Lifestyle OS is a single-page React app for personal planning and execution with a cycle-based schedule, daily metrics, habits, journaling, principles, and a health-oriented briefing surface.

Current architecture uses Google OAuth for authentication and an Express + PostgreSQL API for persisted app state and Google Calendar sync.

## 2. Stack and runtime

- Frontend: React 18 + Vite 5
- Mobile: Expo (React Native)
- Styling: Tailwind CSS + CSS variable design tokens
- Icons: lucide-react
- State: React Context + custom hooks
- Primary persistence: Express API + PostgreSQL (`pg`)
- Auth: Google OAuth + JWT session tokens
- Shared domain logic: `packages/shared` (cycle engine + schema)

## 3. Setup and run

### Prerequisites

- Node.js 18+
- npm
- PostgreSQL (required for Express server routes)
- Google Cloud OAuth client (required for app auth + calendar access)

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

### Mobile app (Expo)

```bash
npm run mobile
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

The project requires frontend API configuration and backend OAuth/Postgres env vars.

### Frontend env vars

- `VITE_API_URL` (optional, defaults to `/api` and used by `src/lib/api.js`)

### Mobile env vars

- `EXPO_PUBLIC_API_URL` (required for native clients to reach the API)

### Backend env vars

- `API_PORT` (or `PORT` in production)
- `CLIENT_ORIGIN`
- `DATABASE_URL`
- `JWT_SECRET`
- `DATABASE_SSL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`

Reference values are in `.env.example`.

## 5. Project structure

```text
index.html
package.json
README.md
INSTRUCTIONS.md
apps/
  mobile/
    App.js
    app.json
    index.js
    src/
      hooks/
        useMobileAuth.js
      lib/
        api.js
packages/
  shared/
    src/
      cycleEngine.js
      schema.js
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
2. `App` initializes auth via `useSupabaseAuth` (Google OAuth + JWT session).
3. If no JWT session, `AuthScreen` is shown.
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

Primary seed shape is `SEED_STATE` in `packages/shared/src/schema.js` and is re-exported by `src/utils/schema.js`.

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

- Auth: Google OAuth + JWT (`useSupabaseAuth`)
- State hydration/sync: API-backed reads and writes (`usePostgresSync` -> `/api/state`)
- App does optimistic local updates and flushes changes with a short debounce
- Polling refresh runs periodically when state is clean

### PostgreSQL tables actively used by frontend sync

- `profiles`
- `capture_inbox`
- `metrics`
- `cycle_templates`
- `synced_events`
- `habits`
- `principles`

### Mapping behavior

- `mapFromServer` merges database payload into seed state
- `toServerPayload` composes complete payload slices before persistence
- Sync currently uses delete-and-reinsert for several table slices (capture, metrics, cycle templates, synced events)

## 9. Backend and API notes

`server/index.js` currently provides:

- `/api/health`
- Auth routes (`/api/auth/google/start`, `/api/auth/google/callback`, `/api/auth/me`)
- Bulk state routes (`/api/state` GET/PUT)
- Google integration routes:
  - `/api/google/status`
  - `/api/google/connect`
  - `/api/google/disconnect`
  - `/api/google/calendars`
  - `/api/google/sync`

Important: the frontend auth token is JWT-based and used across both state sync and Google Calendar routes.

## 10. Cycle engine rules

Implemented in `packages/shared/src/cycleEngine.js` and re-exported by `src/utils/cycleEngine.js`.

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

- Missing Google OAuth env vars will block authentication and calendar sync.
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
- Sign in with Google works.
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
- `src/hooks/usePostgresSync.js`: API hydration, optimistic writes, refresh
- `src/lib/supabase.js`: legacy Supabase client bootstrap (unused in current auth flow)
- `src/lib/api.js`: API helper (currently used for google endpoints)
- `src/utils/schema.js`: seed defaults, factories, constants
- `src/utils/cycleEngine.js`: cycle/day resolution and briefing logic
- `src/components/modules/SettingsModule.jsx`: settings and integration controls
- `server/index.js`: Express API and production static hosting
- `server/sql/001_phase7_core.sql`: PostgreSQL schema

---

Use this file as the authoritative contributor orientation document for the current codebase state.
