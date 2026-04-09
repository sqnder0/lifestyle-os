import { useOS } from '../../context/OSContext';
import { WORKOUT_LIBRARY, MEAL_PROTOCOLS, RECIPES } from '../../utils/schema';

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

function intensityBadge(score) {
  if (score >= 3) return 'bg-[var(--fill-red)] text-red-600 border-red-100';
  if (score === 2) return 'bg-[var(--fill-amber)] text-amber-700 border-amber-100';
  return 'bg-[var(--fill-emerald)] text-emerald-700 border-emerald-100';
}

export default function ReferenceModule() {
  const { state } = useOS();

  const reference = state.reference ?? {};
  const workouts = reference.workoutLibrary ?? WORKOUT_LIBRARY;
  const mealProtocols = reference.mealProtocols ?? MEAL_PROTOCOLS;
  const recipes = reference.recipes ?? RECIPES;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto space-y-4 pb-10">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Health</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Workout library, meal protocols, and recipe book
          </p>
        </div>

        <Section title="Workout Library" sub="Assign routines by day in Cycle Templates.">
          <div className="space-y-2">
            {workouts.map((workout) => (
              <div key={workout.id} className="flex items-start justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface-inset)] px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">{workout.name}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5 leading-relaxed">{workout.note}</p>
                  {workout.hevyUrl ? (
                    <a
                      href={workout.hevyUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-[var(--accent-indigo)] hover:underline mt-1 inline-block"
                    >
                      Open in Hevy
                    </a>
                  ) : null}
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full border ${intensityBadge(workout.intensity_score ?? 1)}`}>
                  I{workout.intensity_score ?? 1}
                </span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Meal Protocols" sub="Choose one protocol per cycle week.">
          <div className="space-y-2">
            {mealProtocols.map((protocol) => (
              <div key={protocol.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-inset)] px-4 py-3 space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm font-medium text-[var(--text-primary)]">{protocol.name}</p>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Protocol</span>
                </div>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">{protocol.description}</p>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Key focus: {protocol.keyFocus || 'No key focus set.'}
                </p>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Recipe Book" sub="Simple execution-first recipes linked to protocols.">
          <div className="space-y-2">
            {recipes.map((recipe) => (
              <div key={recipe.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-inset)] px-4 py-3 space-y-2">
                <p className="text-sm font-semibold text-[var(--text-primary)]">{recipe.name}</p>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Ingredients</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">{(recipe.ingredients ?? []).join(' · ')}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Steps</p>
                  <ol className="text-xs text-[var(--text-secondary)] mt-1 space-y-0.5 list-decimal list-inside">
                    {(recipe.steps ?? []).map((step, idx) => (
                      <li key={`${recipe.id}-step-${idx}`}>{step}</li>
                    ))}
                  </ol>
                </div>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}
