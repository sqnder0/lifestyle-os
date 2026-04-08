# Lifestyle OS - Project Instructions

## 1. What this project is

Lifestyle OS is a single-page React app that acts like a personal operating system for planning and execution. It combines:

- Dashboard daily briefing and focus tools
- Capture inbox and project/task management
- Rotating A/B/C weekly cycle templates
- Metrics, habits, journaling, CRM, principles, and weekly review workflows
- Vitality strategy routing (workout routines + meal protocols)

The app is local-first and persists all state in browser localStorage.

## 2. Stack and runtime

- Framework: React 18
- Build tool: Vite 5
- Styling: Tailwind CSS + CSS variable design tokens
- Icons: lucide-react
- State: React Context + custom hooks
- Persistence: browser localStorage

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

### Storage key

The app persists under localStorage key:

- lifestyle-os-v5

### Persistence behavior

- useLocalStorage initializes from localStorage or falls back to SEED_STATE.
- Writes are debounced (~100ms).
- Storage errors are caught and ignored.
- Cross-tab sync is handled via the storage event.

### Important merge behavior

When loading stored data, top-level keys from initialValue are merged in so new schema keys can appear after updates.

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

## 11. Onboarding behavior

AppShell checks state.settings.onboarded.

- If not true, OnboardingFlow is shown.
- On completion, onboarding should persist user setup and mark onboarded true.

If onboarding appears repeatedly, verify state.settings.onboarded is being saved to localStorage.

## 12. How to add a new module

1. Create a new component in src/components/modules.
2. Register it in src/App.jsx inside CORE_MODULES or SYSTEM_MODULES.
3. Add any required state/actions in OSContext if it mutates shared state.
4. Extend SEED_STATE in src/utils/schema.js for new persisted data.
5. If needed, add selectors in OSContext.
6. Add command palette entries if discoverability is needed.
7. Ensure desktop, mobile header, drawer, and bottom-nav behavior remains coherent.

## 13. How to add new persisted data safely

1. Add default key in SEED_STATE.
2. Make all reads null-safe for older saved payloads.
3. Add mutation functions in OSContext.
4. Prefer immutable updates and preserve existing object keys.
5. Test reload, tab sync, and import/export in DataPortal.

## 14. Operational notes and risks

- localStorage can fail in private mode or due to quota limits.
- useLocalStorage catches failures; data may not persist if browser storage is blocked.
- Full reset in DataPortal or sidebar reset restores seed state.
- Importing malformed JSON can break runtime assumptions; validate imported structure before use if extending DataPortal.

## 15. Developer workflow recommendations

### When editing global state

- Keep all state writes inside OSContext actions.
- Avoid direct mutation in module components.
- Update seed schema and selectors together.

### When editing UI

- Use tokenized colors from src/index.css variables.
- Avoid hardcoded colors unless semantically justified.
- Verify light/dark contrast in both themes.

### When editing cycles

- Preserve pure utility behavior in cycleEngine.
- Keep date handling local-time based and deterministic.
- Add tests for week transitions and override precedence.

## 16. Suggested test checklist (manual)

- App loads with seed data on first run.
- Reload keeps changes from previous session.
- cmd+k opens command palette and navigation works.
- Mobile drawer and bottom navigation are usable.
- Theme toggle updates html.dark and persists.
- Capture to project promotion creates tasks correctly.
- Cycle day overrides appear in week and today views.
- Cycle template editor saves workout-per-day + meal protocol mappings.
- Dashboard shows: Today's Session + workout note + weekly meal protocol.
- If energy is below threshold and scheduled routine is High intensity, dashboard shows recovery protocol instead.
- Reference module lists workouts, meal protocols, recovery protocols, and pantry essentials.
- Data export creates valid JSON; import restores state.
- Reset returns app to seed defaults.

## 17. Build and deployment notes

- Vite build output is static and can be hosted on any static hosting platform.
- No backend or server runtime is required for core functionality.
- Since data is localStorage-based, state is browser/device specific unless export/import is used.

## 18. Quick file map for key maintenance points

- src/App.jsx: app shell, module registry, global navigation, shortcut wiring
- src/context/OSContext.jsx: single source of truth for state and mutations
- src/utils/schema.js: data factories, constants, seed defaults
- src/utils/cycleEngine.js: cycle week/date/block resolution utilities + daily physical briefing resolver
- src/hooks/useLocalStorage.js: persistence and cross-tab sync
- src/index.css: design tokens, utility aliases, animation definitions
- src/components/modules/TemplateEditor.jsx: cycle events + vitality mapping editor
- src/components/modules/ReferenceModule.jsx: static strategy references (workouts, meals, pantry)
- src/components/modules/DashboardModule.jsx: daily briefing surface

---

Use this file as the primary orientation and contributor guide when expanding the app.
