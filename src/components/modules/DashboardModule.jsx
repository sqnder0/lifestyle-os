import { useOS } from '../../context/OSContext';
import QuickCapture   from './QuickCapture';
import { todayKey }   from '../../utils/schema';

// ── Greeting ──────────────────────────────────────────────────────────────
function Greeting() {
  const { state } = useOS();
  const name = state.settings?.name?.trim();
  const hour = new Date().getHours();
  const salutation =
    hour < 5  ? 'Still up' :
    hour < 12 ? 'Good morning' :
    hour < 17 ? 'Good afternoon' :
    hour < 21 ? 'Good evening' :
                'Good night';
  const greeting = name ? `${salutation}, ${name}.` : `${salutation}.`;
  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-semibold text-[var(--text-primary)] tracking-tight leading-tight">
        {greeting}
      </h1>
      <p className="text-sm text-[var(--text-muted)] mt-0.5">{today}</p>
    </div>
  );
}

// ── Inbox nudge ────────────────────────────────────────────────────────────
function InboxNudge({ count, onNavigate }) {
  if (!count) return null;
  return (
    <button
      onClick={onNavigate}
      className="flex items-center gap-2 px-3 py-2 rounded-xl border border-amber-200
                 bg-[var(--fill-amber)] text-amber-700 hover:bg-[var(--fill-amber)] transition-colors
                 text-xs font-medium active:scale-95"
      style={{ borderColor: 'rgba(245,158,11,0.25)' }}
    >
      <span className="font-black">{count}</span>
      <span>in inbox →</span>
    </button>
  );
}

function intensityBadge(intensity) {
  if (intensity === 'High') {
    return 'bg-[var(--fill-red)] text-red-600 border-red-100';
  }
  if (intensity === 'Medium') {
    return 'bg-[var(--fill-amber)] text-amber-700 border-amber-100';
  }
  return 'bg-[var(--fill-emerald)] text-emerald-700 border-emerald-100';
}

function BriefingCard() {
  const { state, selectors, setActiveModule } = useOS();
  const briefing = selectors.dailyBriefing(todayKey());
  const todayEnergy = state.metrics?.[todayKey()]?.energy ?? null;
  const workout = briefing.workout;
  const meal = briefing.mealProtocol;

  return (
    <section className="card px-5 py-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--text-muted)]">Daily Briefing</p>
          <h2 className="text-lg md:text-xl font-semibold text-[var(--text-primary)] mt-1">Today's Session</h2>
        </div>
        <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border ${briefing.isRecoveryOverride ? 'bg-[var(--fill-emerald)] text-emerald-700 border-emerald-100' : intensityBadge(workout?.intensity)}`}>
          {briefing.isRecoveryOverride ? 'Recovery mode' : (workout?.intensity ?? 'Planned')}
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-inset)] p-4 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
            {briefing.isRecoveryOverride ? 'Recovery protocol' : 'Today\'s session'}
          </p>
          <p className="text-base font-semibold text-[var(--text-primary)]">
            {workout?.name ?? 'No workout scheduled'}
          </p>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            {workout?.note ?? 'Assign a routine in the cycle editor.'}
          </p>
          {briefing.isRecoveryOverride && briefing.scheduledWorkout && (
            <p className="text-xs text-[var(--text-muted)]">
              Scheduled routine hidden because energy is below threshold: {briefing.scheduledWorkout.name}
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-inset)] p-4 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Fueling</p>
          <p className="text-base font-semibold text-[var(--text-primary)]">
            {meal?.name ?? 'No meal protocol assigned'}
          </p>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            {meal?.description ?? 'Assign a weekly meal protocol in the cycle editor.'}
          </p>
          {meal?.sampleMeals?.length ? (
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Sample meals: {meal.sampleMeals.join(' · ')}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--text-muted)]">
        <span>
          {briefing.letter} / {briefing.day}{todayEnergy != null ? ` · Energy ${todayEnergy}/10` : ''}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveModule('cycles')}
            className="px-3 py-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)] transition-colors"
          >
            Edit cycle
          </button>
          <button
            onClick={() => setActiveModule('reference')}
            className="px-3 py-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)] transition-colors"
          >
            Reference
          </button>
        </div>
      </div>
    </section>
  );
}

// ── DashboardModule ────────────────────────────────────────────────────────
export default function DashboardModule() {
  const { state, setActiveModule } = useOS();
  const inboxCount = state.capture?.filter((c) => !c.processed).length ?? 0;

  return (
    // The outer div scrolls. pb-safe leaves room above the mobile bottom nav.
    <div className="h-full overflow-y-auto">
      <div className="max-w-xl mx-auto space-y-5 py-2 pb-8">

        {/* Greeting + inbox nudge */}
        <div className="flex items-start justify-between gap-3">
          <Greeting />
          <div className="pt-1 shrink-0">
            <InboxNudge count={inboxCount} onNavigate={() => setActiveModule('capture')} />
          </div>
        </div>

        {/* ── Daily briefing ── */}
        <BriefingCard />

        {/* ── Capture bar — thumb-friendly ── */}
        <QuickCapture />

      </div>
    </div>
  );
}
