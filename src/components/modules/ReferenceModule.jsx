import { useOS } from '../../context/OSContext';
import {
  WORKOUT_LIBRARY,
  MEAL_PROTOCOLS,
  RECOVERY_PROTOCOLS,
  PANTRY_ESSENTIALS,
} from '../../utils/schema';

function Section({ title, sub, children }) {
  return (
    <section className="card px-5 py-4 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
        {sub && <p className="text-xs text-[var(--text-muted)] mt-0.5">{sub}</p>}
      </div>
      {children}
    </section>
  );
}

function IntensityBadge({ intensity }) {
  const classes =
    intensity === 'High'
      ? 'bg-[var(--fill-red)] text-red-600 border-red-100'
      : intensity === 'Medium'
        ? 'bg-[var(--fill-amber)] text-amber-700 border-amber-100'
        : 'bg-[var(--fill-emerald)] text-emerald-700 border-emerald-100';

  return (
    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full border ${classes}`}>
      {intensity}
    </span>
  );
}

export default function ReferenceModule() {
  const { state } = useOS();

  const reference = state.reference ?? {};
  const workouts = reference.workoutLibrary ?? WORKOUT_LIBRARY;
  const mealProtocols = reference.mealProtocols ?? MEAL_PROTOCOLS;
  const recoveryProtocols = reference.recoveryProtocols ?? RECOVERY_PROTOCOLS;
  const pantryEssentials = reference.pantryEssentials ?? PANTRY_ESSENTIALS;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto space-y-4 pb-10">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Reference</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Workout routines, meal protocols, and pantry basics
          </p>
        </div>

        <Section title="Workout Library" sub="Select one of these routines in the 3-week cycle editor.">
          <div className="space-y-2">
            {workouts.map((workout) => (
              <div key={workout.id} className="flex items-start justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface-inset)] px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">{workout.name}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5 leading-relaxed">{workout.note}</p>
                </div>
                <IntensityBadge intensity={workout.intensity} />
              </div>
            ))}
          </div>
        </Section>

        <Section title="Meal Protocols" sub="Mapped to each cycle week.">
          <div className="space-y-2">
            {mealProtocols.map((protocol) => (
              <div key={protocol.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-inset)] px-4 py-3 space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm font-medium text-[var(--text-primary)]">{protocol.name}</p>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Protocol</span>
                </div>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">{protocol.description}</p>
                <div className="flex flex-wrap gap-1.5">
                  {protocol.sampleMeals.map((meal) => (
                    <span key={meal} className="text-[11px] px-2 py-1 rounded-full bg-[var(--surface-raised)] border border-[var(--border)] text-[var(--text-secondary)]">
                      {meal}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Recovery Protocols" sub="Used automatically on low-energy days when the scheduled workout is high intensity.">
          <div className="space-y-2">
            {recoveryProtocols.map((protocol) => (
              <div key={protocol.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-inset)] px-4 py-3 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)]">{protocol.name}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5 leading-relaxed">{protocol.note}</p>
                </div>
                <IntensityBadge intensity={protocol.intensity} />
              </div>
            ))}
          </div>
        </Section>

        <Section title="Pantry Essentials" sub="Static shopping reference.">
          <div className="flex flex-wrap gap-2">
            {pantryEssentials.map((item) => (
              <span key={item} className="text-xs px-3 py-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-inset)] text-[var(--text-secondary)]">
                {item}
              </span>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}
