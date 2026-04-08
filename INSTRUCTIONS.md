# Lifestyle OS - Project Instructions

## 1. What this project is

Lifestyle OS is a single-page React app that acts like a personal operating system for planning and execution. It combines:

- Dashboard daily briefing and focus tools
- Capture inbox and project/task management
- Rotating A/B/C weekly cycle templates
- Metrics, habits, journaling, CRM, principles, and weekly review workflows
- Vitality strategy routing (workout routines + meal protocols)

The app is user-first and persists signed-in user data in PostgreSQL through a small Express API. Theme and token preferences remain browser-local where appropriate.

## 2. Stack and runtime

- Framework: React 18
- Build tool: Vite 5
- Styling: Tailwind CSS + CSS variable design tokens
- Icons: lucide-react
- State: React Context + custom hooks
- Persistence: PostgreSQL-backed API for signed-in data, browser-local storage for auth token/theme

Core dependencies are defined in package.json.

## 3. Setup and run

### Prerequisites

- Node.js 18+ (Node 20 recommended)
- npm

### Install

```bash
npm install
```

### Start development server

```bash
npm run dev
```

### Build production bundle

```bash
npm run build
```

### Start backend API

```bash
npm run api
```

### Start full app in development

```bash
npm run dev:full
```

### Start production server after build

```bash
npm start
```

### Preview production build

```bash
npm run preview
```

## 4. Project structure

```text
index.html
package.json
vite.config.js
tailwind.config.js
postcss.config.js
src/
  main.jsx
  App.jsx
  index.css
  context/
    OSContext.jsx
  hooks/
    useDarkMode.js
    useKeyboard.js
    useLocalStorage.js
    useOSState.js
  utils/
    schema.js
    cycleEngine.js
    helpers.js
  components/
    modules/
      ...feature modules...
```

## 5. Application architecture

### Root flow

1. src/main.jsx renders App.
2. App wraps AppShell with OSProvider.
3. OSProvider exposes global state and all mutations through context.
4. AppShell selects the active module and renders desktop/mobile navigation.

### Module system

Modules are registered in src/App.jsx in two arrays:

- CORE_MODULES
- SYSTEM_MODULES

Each module entry defines:

- id
- label
- icon
- Component

This registry controls navigation, active module rendering, and command palette targeting.

### State model

Single global state object lives in OSContext and includes:

- capture
- projects
- tasks
- metrics
- crm
- cycles
- cyclePlans
- overrides
- focus3
- principles
- reviews
- habits
- reference
- settings
- ui

Seed/default shape is defined in src/utils/schema.js (SEED_STATE).

## 6. Persistence and data lifecycle

### Auth and persistence

- Signed-in data is fetched from and written to PostgreSQL through the Express API.
- The auth token is stored in browser localStorage under a token key.
- Theme preference remains browser-local.
- The API uses `DATABASE_URL` and `JWT_SECRET` from `.env`.
- The server honors `PORT` first, then `API_PORT`, so production builders can inject their own runtime port.
- `CLIENT_ORIGIN` is optional for same-origin production deployments.
- Enable `DATABASE_SSL=true` only when the Postgres server requires TLS.

### Backend run modes

- Development API only: `npm run api`
- Full development stack: `npm run dev:full`
- Production server after frontend build: `npm start`

### Production builder guidance

- Use the repo `Dockerfile` as the production builder when the platform supports it.
- The Docker image builds the frontend and serves both the UI and API from the same Express process.
- If a hosting platform only allows a static publish directory, `dist/` is the frontend output, but you will still need a separate backend service.

### Persistence behavior

- `useApiAuth` bootstraps the current user session from a browser token.
- `usePostgresSync` hydrates state from the API after login.
- Writes are optimistic and flushed to the API in the background.
- The sync hook periodically refreshes from the server to pick up external changes.

### Important merge behavior

When loading API state, the app merges the server payload into the current seed shape so schema additions remain safe across releases.

## 7. Styling and theme system

- Global design tokens are in src/index.css using CSS variables.
- Light theme tokens are under :root.
- Dark theme tokens are under html.dark.
- useDarkMode toggles html.dark and stores preference in localStorage key os-dark-mode.
- Tailwind config safelists token-related utility classes and dynamic status colors.

## 8. Keyboard shortcuts

Global shortcuts are wired through useKeyboard in AppShell:

- cmd+k: open/close command palette
- escape: close palette and mobile drawer
- g d: dashboard
- g i: inbox/capture
- g c: cycles
- g p: projects
- g m: metrics
- g r: CRM
- g h: habits
- g w: weekly review
- g t: focus timer
- cmd+,: settings
- g j: journal

Note: cmd also accepts ctrl via the hook implementation.

## 9. Feature module reference

### Main navigation modules

- DashboardModule: simplified daily briefing for physical focus and quick capture
- CaptureModule: inbox capture and processing
- CycleModule: week/today/template views for cycle planning
- ProjectsModule: project and task management
- MetricsModule: daily tracking and trends
- CRMModule: contact tracking and overdue follow-up

### System modules

- ProjectEngine: alternate project execution board
- PrinciplesModule: personal principles knowledge base
- ReferenceModule: workout library, meal protocols, recovery protocols, pantry essentials
- WeeklyReviewModule: structured weekly reflection
- HabitsModule: habit tracking and streaks
- DataPortal: import/export/reset and storage insights
- FocusTimer: timer with task linking and logs
- SettingsModule: user and notification preferences
- JournalModule: date-based journaling with mood

### Sub-components used by modules

- QuickCapture
- WeekView
- TodayView
- TemplateEditor
- EventBlock
- CommandPalette
- OnboardingFlow

## 10. Cycle engine rules

Cycle logic is implemented in src/utils/cycleEngine.js.

### Core concepts

- Three-week rotating cycle letters: A, B, C
- cycleStartDate defines origin of Week A
- Week alignment is Monday-based

### Resolution precedence for a day

1. Full-day delete override
2. Full replacement override blocks
3. Template blocks for cycle letter/day, then block-level overrides, then added blocks

Resolved events are sorted by start time.

### Physical briefing resolver (Phase 6)

Cycle logic also resolves a daily physical briefing in src/utils/cycleEngine.js via resolvePhysicalBriefing:

- Determines current cycle letter/day from cycleStartDate
- Maps day -> scheduled workout routine from cyclePlans
- Maps week letter -> meal protocol from cyclePlans
- Applies dynamic energy override:
  - if energy is below settings.energyLowThreshold
  - and scheduled workout intensity is High
  - dashboard/today briefing shows a recovery protocol instead

This resolver is exposed through OSContext selector: selectors.dailyBriefing(dateKey).

### Vitality strategy data model

Reference data is stored in state.reference and seeded in src/utils/schema.js:

- workoutLibrary
- mealProtocols
- recoveryProtocols
- pantryEssentials

Cycle mapping data is stored in state.cyclePlans:

- A/B/C week keys
- workoutsByDay (Mon-Sun -> workout id)
- mealProtocolId (per week)

### Backend migration notes (Phase 7)

- Authentication is email/password through the Express API.
- User data is scoped by authenticated user ID in API queries.
- The production server serves the built frontend from `dist/` and the API from the same process.
- The app now uses PostgreSQL as the source of truth for signed-in user state.
- Production containers should set `PORT` if the platform provides one; otherwise the server falls back to `API_PORT`.

## 11. Authentication and onboarding behavior

App startup checks for a valid auth session first.

- If no session exists, the Login/Signup screen is shown.
- Once authenticated, AppShell checks `state.settings.onboarded`.
- If not true, OnboardingFlow is shown.
- On completion, onboarding persists user setup to the API and marks onboarded true.

If onboarding appears repeatedly, verify the `profiles` row is being updated in PostgreSQL.

## 12. How to add a new module

1. Create a new component in src/components/modules.
2. Register it in src/App.jsx inside CORE_MODULES or SYSTEM_MODULES.
4. Add any required state/actions in OSContext if it mutates shared state.
4. Extend SEED_STATE in src/utils/schema.js for new persisted data.
5. If needed, add selectors in OSContext.
6. Add command palette entries if discoverability is needed.
7. Ensure desktop, mobile header, drawer, and bottom-nav behavior remains coherent.

## 13. How to add new persisted data safely

1. Add default key in SEED_STATE.
2. Make all reads null-safe for older saved payloads.
3. Add mutation functions in OSContext.
4. Prefer immutable updates and preserve existing object keys.
5. Test login, reload, sync refresh, and API persistence.

## 14. Operational notes and risks

- localStorage is still used for auth token storage and theme preference, so browser storage can still affect sign-in behavior.
- The API depends on PostgreSQL being reachable and initialized.
- SSL is off by default; turn it on with `DATABASE_SSL=true` only for managed TLS-enabled databases.
- Full reset in DataPortal or sidebar reset now only resets the current app state; production data remains in PostgreSQL.
- If you later re-enable import/export, validate structure before sending it to the API.

## 15. Developer workflow recommendations

### When editing global state

- Keep all state writes inside OSContext actions.
- Avoid direct mutation in module components.
- Update seed schema, API mappings, and selectors together.

### When editing UI

- Use tokenized colors from src/index.css variables.
- Avoid hardcoded colors unless semantically justified.
- Verify light/dark contrast in both themes.

### When editing cycles

- Preserve pure utility behavior in cycleEngine.
- Keep date handling local-time based and deterministic.
- Add tests for week transitions and override precedence.

### When editing backend or auth

- Keep all user-scoped data filtered by the authenticated user ID.
- Store passwords hashed with bcrypt.
- Serve the frontend from Express in production after running `npm run build`.

## 16. Suggested test checklist (manual)

- App loads to the login screen when unauthenticated.
- Login and signup both create authenticated sessions.
- Reload keeps the session and shows synced data.
- cmd+k opens command palette and navigation works.
- Mobile drawer and bottom navigation are usable.
- Theme toggle updates html.dark and persists.
- Capture to project promotion creates tasks correctly.
- Cycle day overrides appear in week and today views.
- Cycle template editor saves workout-per-day + meal protocol mappings.
- Dashboard shows: Today's Session + workout note + weekly meal protocol.
- If energy is below threshold and scheduled routine is High intensity, dashboard shows recovery protocol instead.
- Reference module lists workouts, meal protocols, recovery protocols, and pantry essentials.
- API writes persist after refresh.
- Sign out returns to the login screen.

## 17. Build and deployment notes

- Vite build output is served by the Express server in production.
- The backend API and PostgreSQL database are required for authenticated use.
- The production entrypoint is `npm start` after `npm run build`.

## 18. Quick file map for key maintenance points

- src/App.jsx: app shell, module registry, global navigation, shortcut wiring
- src/context/OSContext.jsx: single source of truth for state and mutations
- src/utils/schema.js: data factories, constants, seed defaults
- src/utils/cycleEngine.js: cycle week/date/block resolution utilities + daily physical briefing resolver
- src/hooks/useApiAuth.js: login/signup/session bootstrap
- src/hooks/usePostgresSync.js: API hydration and optimistic syncing
- src/index.css: design tokens, utility aliases, animation definitions
- src/components/modules/TemplateEditor.jsx: cycle events + vitality mapping editor
- src/components/modules/ReferenceModule.jsx: static strategy references (workouts, meals, pantry)
- src/components/modules/DashboardModule.jsx: daily briefing surface
- server/index.js: PostgreSQL API and production static server
- server/sql/001_phase7_core.sql: database schema

---

Use this file as the primary orientation and contributor guide when expanding the app.
