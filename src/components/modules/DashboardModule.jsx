import { useEffect, useMemo, useState } from 'react';
import { Calendar } from 'lucide-react';
import { useOS } from '../../context/OSContext';
import QuickCapture from './QuickCapture';
import { todayKey } from '../../utils/schema';
import { getCycleLetter, parseKey } from '../../utils/cycleEngine';

function greetingForHour(hour) {
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function hashString(input) {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function pickDailyPrinciples(principles, dateKey, count = 3) {
  const entries = Object.values(principles ?? {});
  if (entries.length <= count) return entries;

  const seed = hashString(dateKey);
  return [...entries]
    .sort((a, b) => {
      const aScore = hashString(`${seed}-${a.id}`);
      const bScore = hashString(`${seed}-${b.id}`);
      return aScore - bScore;
    })
    .slice(0, count);
}

function HeaderBlock() {
  const { state } = useOS();
  const name = state.settings?.name?.trim();
  const now = new Date();
  const salutation = greetingForHour(now.getHours());
  const dayLabel = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const letter = getCycleLetter(now, parseKey(state.cycleStartDate));

  return (
    <section className="card px-5 py-4 space-y-1.5">
      <h1 className="text-xl md:text-2xl font-semibold text-[var(--text-primary)] tracking-tight">
        {name ? `${salutation}, ${name}.` : `${salutation}.`}
      </h1>
      <p className="text-xs text-[var(--text-muted)]">
        {dayLabel} - Week {letter}
      </p>
    </section>
  );
}

function VitalityBriefing() {
  const { selectors, setActiveModule } = useOS();
  const briefing = selectors.dailyBriefing(todayKey());
  const workout = briefing.workout;
  const meal = briefing.mealProtocol;
  const hevyLink = workout?.hevyUrl || workout?.hevy_link || null;

  return (
    <section className="card px-5 py-4 space-y-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--text-muted)]">Vitality Briefing</p>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-inset)] px-4 py-3 space-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Today's workout</p>
          <p className="text-sm font-semibold text-[var(--text-primary)]">{workout?.name ?? 'No routine assigned'}</p>
          <p className="text-xs text-[var(--text-secondary)]">
            Intensity: {workout?.intensity || (workout?.intensity_score ? `I${workout.intensity_score}` : 'None')}
          </p>
          {briefing.isRecoveryOverride ? (
            <p className="text-[11px] text-emerald-600">Energy override active: recovery protocol substituted.</p>
          ) : null}
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-inset)] px-4 py-3 space-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Today's meal protocol</p>
          <p className="text-sm font-semibold text-[var(--text-primary)]">{meal?.name ?? 'No protocol assigned'}</p>
          <p className="text-xs text-[var(--text-secondary)]">{meal?.keyFocus || meal?.description || 'Add a meal protocol in Health.'}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {hevyLink ? (
          <a
            href={hevyLink}
            target="_blank"
            rel="noreferrer"
            className="text-xs px-3 py-1.5 rounded-lg bg-[var(--sidebar-active)] text-[var(--sidebar-active-text)] hover:opacity-90 transition-opacity"
          >
            Launch Hevy
          </a>
        ) : null}
        <button
          onClick={() => setActiveModule('health')}
          className="text-xs px-3 py-1.5 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-inset)]"
        >
          Open Health
        </button>
      </div>
    </section>
  );
}

function QuickLogs() {
  const { state, logToday } = useOS();
  const today = state.metrics?.[todayKey()] ?? {};

  return (
    <section className="card px-5 py-4 space-y-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--text-muted)]">Frictionless Logging</p>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[var(--text-secondary)]">Energy</span>
          <div className="flex gap-1">
            {Array.from({ length: 10 }, (_, idx) => idx + 1).map((value) => (
              <button
                key={`energy-${value}`}
                onClick={() => logToday({ energy: value })}
                className={`w-6 h-6 text-[10px] rounded-md border transition-colors ${today.energy === value ? 'bg-[var(--sidebar-active)] text-[var(--sidebar-active-text)] border-[var(--sidebar-active)]' : 'border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-inset)]'}`}
              >
                {value}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <label className="text-xs text-[var(--text-secondary)]" htmlFor="sleep-hours-input">Sleep</label>
          <input
            id="sleep-hours-input"
            type="number"
            min={0}
            max={16}
            step={0.5}
            value={today.sleep ?? ''}
            onChange={(e) => logToday({ sleep: e.target.value === '' ? null : Number(e.target.value) })}
            className="w-20 input-base text-xs py-1.5"
            placeholder="hrs"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[var(--text-secondary)]">Mood</span>
          <div className="flex gap-1">
            {Array.from({ length: 10 }, (_, idx) => idx + 1).map((value) => (
              <button
                key={`mood-${value}`}
                onClick={() => logToday({ mood: value })}
                className={`w-6 h-6 text-[10px] rounded-md border transition-colors ${today.mood === value ? 'bg-[var(--sidebar-active)] text-[var(--sidebar-active-text)] border-[var(--sidebar-active)]' : 'border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-inset)]'}`}
                title={`Mood ${value}`}
              >
                {value}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function DailyEvents() {
  const { selectors, syncGoogleCalendar, state } = useOS();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const briefing = selectors.dailyBriefing(todayKey());
  const events = briefing.mergedEvents ?? [];

  const syncNow = async () => {
    setLoading(true);
    setError('');
    try {
      await syncGoogleCalendar({ force: true });
    } catch (err) {
      setError(err.message || 'Sync failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!state.settings?.googleCalendar?.connected) return;
    const lastSynced = state.settings?.googleCalendar?.lastSyncedAt;
    const lastSyncedMs = lastSynced ? new Date(lastSynced).getTime() : 0;
    if (lastSyncedMs && Date.now() - lastSyncedMs < 5 * 60 * 1000) return;

    setLoading(true);
    setError('');
    syncGoogleCalendar({ force: false })
      .catch((err) => {
        setError(err.message || 'Sync failed');
      })
      .finally(() => setLoading(false));
  }, [state.settings?.googleCalendar?.lastSyncedAt]);

  return (
    <section className="card px-5 py-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--text-muted)]">Today Schedule</p>
        <button
          onClick={syncNow}
          disabled={loading}
          className="text-xs px-3 py-1.5 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-inset)] disabled:opacity-60"
        >
          {loading ? 'Syncing...' : 'Sync Now'}
        </button>
      </div>
      {error ? <p className="text-[11px] text-red-500">{error}</p> : null}
      {!events.length ? (
        <p className="text-xs text-[var(--text-muted)]">No events for today.</p>
      ) : (
        <div className="space-y-2">
          {events.map((event) => (
            <div key={event.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-inset)] px-3 py-2.5 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--text-primary)] truncate">{event.label}</p>
                <p className="text-[11px] text-[var(--text-muted)]">
                  {String(event.hour).padStart(2, '0')}:{String(event.minute ?? 0).padStart(2, '0')} · {event.duration}m
                </p>
              </div>
              {event.source === 'google' ? (
                <span className="inline-flex items-center gap-1 text-[10px] text-[var(--text-muted)]" title="Read-only Google Calendar event">
                  <Calendar size={12} />
                  Read only
                </span>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function DailyPrinciples() {
  const { state, setActiveModule } = useOS();
  const principles = state.principles ?? {};
  const picks = useMemo(() => pickDailyPrinciples(principles, todayKey(), 3), [principles]);

  return (
    <section className="card px-5 py-4 space-y-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--text-muted)]">Daily Principles</p>
      {picks.length ? (
        <div className="grid gap-2 md:grid-cols-3">
          {picks.map((principle) => (
            <article key={principle.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-inset)] px-3 py-3 space-y-1">
              <p className="text-xs font-semibold text-[var(--text-primary)]">{principle.title}</p>
              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">{principle.body}</p>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-inset)] px-4 py-4 flex items-center justify-between gap-3">
          <p className="text-sm text-[var(--text-secondary)]">No principles yet. Add your first principle to surface it here.</p>
          <button
            onClick={() => setActiveModule('principles')}
            className="text-xs px-3 py-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--surface-raised)]"
          >
            Open Principles
          </button>
        </div>
      )}
    </section>
  );
}

function EmptyHealthState() {
  const { state, setActiveModule } = useOS();
  const hasWorkouts = (state.reference?.workoutLibrary ?? []).length > 0;
  const hasPrinciples = Object.keys(state.principles ?? {}).length > 0;

  if (hasWorkouts && hasPrinciples) return null;

  return (
    <section className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-inset)] px-4 py-4 flex items-center justify-between gap-3">
      <p className="text-sm text-[var(--text-secondary)]">Set up your Health Strategy to unlock a complete daily briefing.</p>
      <button
        onClick={() => setActiveModule('health')}
        className="text-xs px-3 py-1.5 rounded-lg bg-[var(--sidebar-active)] text-[var(--sidebar-active-text)] hover:opacity-90"
      >
        Set up Health
      </button>
    </section>
  );
}

export default function DashboardModule() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto space-y-4 py-2 pb-8">
        <QuickCapture />
        <HeaderBlock />
        <EmptyHealthState />
        <VitalityBriefing />
        <DailyEvents />
        <QuickLogs />
        <DailyPrinciples />
      </div>
    </div>
  );
}
