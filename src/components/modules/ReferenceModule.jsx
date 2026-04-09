import { useState } from 'react';
import { useOS } from '../../context/OSContext';
import { DEFAULT_REFERENCE, WORKOUT_LIBRARY, MEAL_PROTOCOLS, RECIPES, uid } from '../../utils/schema';

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

function scoreToIntensity(score) {
  if (score >= 3) return 'High';
  if (score === 2) return 'Medium';
  return 'Low';
}

function parseList(value) {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

function WorkoutEditor({ initial, onSave, onCancel }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [note, setNote] = useState(initial?.note ?? '');
  const [intensityScore, setIntensityScore] = useState(initial?.intensity_score ?? 1);
  const [hevyUrl, setHevyUrl] = useState(initial?.hevyUrl ?? '');

  const submit = () => {
    const cleanName = name.trim();
    if (!cleanName) return;
    const score = Number(intensityScore) || 1;
    onSave({
      ...(initial ?? {}),
      id: initial?.id ?? `workout-${uid()}`,
      name: cleanName,
      note: note.trim(),
      intensity_score: Math.min(3, Math.max(1, score)),
      intensity: scoreToIntensity(Math.min(3, Math.max(1, score))),
      hevyUrl: hevyUrl.trim(),
    });
  };

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 space-y-2.5">
      <input
        className="input-base"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Workout name"
      />
      <textarea
        className="textarea-base"
        rows={2}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Workout note"
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <label className="text-xs text-[var(--text-secondary)] space-y-1">
          <span>Intensity score</span>
          <select
            className="input-base"
            value={intensityScore}
            onChange={(e) => setIntensityScore(Number(e.target.value))}
          >
            <option value={1}>I1 (Low)</option>
            <option value={2}>I2 (Medium)</option>
            <option value={3}>I3 (High)</option>
          </select>
        </label>
        <label className="text-xs text-[var(--text-secondary)] space-y-1">
          <span>Hevy URL (optional)</span>
          <input
            className="input-base"
            value={hevyUrl}
            onChange={(e) => setHevyUrl(e.target.value)}
            placeholder="https://"
          />
        </label>
      </div>
      <div className="flex gap-2">
        <button onClick={submit} className="text-xs px-3 py-1.5 rounded-lg bg-[var(--sidebar-active)] text-[var(--sidebar-active-text)] hover:opacity-90">
          Save
        </button>
        <button onClick={onCancel} className="text-xs px-3 py-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--surface-inset)]">
          Cancel
        </button>
      </div>
    </div>
  );
}

function MealProtocolEditor({ initial, onSave, onCancel }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [keyFocus, setKeyFocus] = useState(initial?.keyFocus ?? '');
  const [sampleMeals, setSampleMeals] = useState((initial?.sampleMeals ?? []).join('\n'));

  const submit = () => {
    const cleanName = name.trim();
    if (!cleanName) return;
    onSave({
      ...(initial ?? {}),
      id: initial?.id ?? `meal-${uid()}`,
      name: cleanName,
      description: description.trim(),
      keyFocus: keyFocus.trim(),
      sampleMeals: parseList(sampleMeals),
    });
  };

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 space-y-2.5">
      <input
        className="input-base"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Meal protocol name"
      />
      <textarea
        className="textarea-base"
        rows={2}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description"
      />
      <input
        className="input-base"
        value={keyFocus}
        onChange={(e) => setKeyFocus(e.target.value)}
        placeholder="Key focus"
      />
      <textarea
        className="textarea-base"
        rows={3}
        value={sampleMeals}
        onChange={(e) => setSampleMeals(e.target.value)}
        placeholder="Sample meals, one per line"
      />
      <div className="flex gap-2">
        <button onClick={submit} className="text-xs px-3 py-1.5 rounded-lg bg-[var(--sidebar-active)] text-[var(--sidebar-active-text)] hover:opacity-90">
          Save
        </button>
        <button onClick={onCancel} className="text-xs px-3 py-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--surface-inset)]">
          Cancel
        </button>
      </div>
    </div>
  );
}

function RecipeEditor({ initial, onSave, onCancel }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [ingredients, setIngredients] = useState((initial?.ingredients ?? []).join('\n'));
  const [steps, setSteps] = useState((initial?.steps ?? []).join('\n'));

  const submit = () => {
    const cleanName = name.trim();
    if (!cleanName) return;
    onSave({
      ...(initial ?? {}),
      id: initial?.id ?? `recipe-${uid()}`,
      name: cleanName,
      ingredients: parseList(ingredients),
      steps: parseList(steps),
      protocolIds: initial?.protocolIds ?? [],
    });
  };

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 space-y-2.5">
      <input
        className="input-base"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Recipe name"
      />
      <textarea
        className="textarea-base"
        rows={3}
        value={ingredients}
        onChange={(e) => setIngredients(e.target.value)}
        placeholder="Ingredients, one per line"
      />
      <textarea
        className="textarea-base"
        rows={4}
        value={steps}
        onChange={(e) => setSteps(e.target.value)}
        placeholder="Steps, one per line"
      />
      <div className="flex gap-2">
        <button onClick={submit} className="text-xs px-3 py-1.5 rounded-lg bg-[var(--sidebar-active)] text-[var(--sidebar-active-text)] hover:opacity-90">
          Save
        </button>
        <button onClick={onCancel} className="text-xs px-3 py-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--surface-inset)]">
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function ReferenceModule() {
  const { state, update } = useOS();

  const [workoutEditor, setWorkoutEditor] = useState(null);
  const [mealEditor, setMealEditor] = useState(null);
  const [recipeEditor, setRecipeEditor] = useState(null);

  const reference = state.reference ?? {};
  const workouts = reference.workoutLibrary ?? WORKOUT_LIBRARY;
  const mealProtocols = reference.mealProtocols ?? MEAL_PROTOCOLS;
  const recipes = reference.recipes ?? RECIPES;

  const updateReference = (patch) => {
    update((s) => {
      const baseReference = s.reference ?? {
        ...DEFAULT_REFERENCE,
        workoutLibrary: WORKOUT_LIBRARY,
        mealProtocols: MEAL_PROTOCOLS,
        recipes: RECIPES,
      };

      return {
        ...s,
        reference: {
          ...baseReference,
          ...patch,
        },
      };
    });
  };

  const saveWorkout = (payload) => {
    const exists = workouts.some((workout) => workout.id === payload.id);
    const next = exists
      ? workouts.map((workout) => (workout.id === payload.id ? payload : workout))
      : [...workouts, payload];
    updateReference({ workoutLibrary: next });
    setWorkoutEditor(null);
  };

  const saveMealProtocol = (payload) => {
    const exists = mealProtocols.some((protocol) => protocol.id === payload.id);
    const next = exists
      ? mealProtocols.map((protocol) => (protocol.id === payload.id ? payload : protocol))
      : [...mealProtocols, payload];
    updateReference({ mealProtocols: next });
    setMealEditor(null);
  };

  const saveRecipe = (payload) => {
    const exists = recipes.some((recipe) => recipe.id === payload.id);
    const next = exists
      ? recipes.map((recipe) => (recipe.id === payload.id ? payload : recipe))
      : [...recipes, payload];
    updateReference({ recipes: next });
    setRecipeEditor(null);
  };

  const deleteWorkout = (id) => {
    updateReference({ workoutLibrary: workouts.filter((workout) => workout.id !== id) });
    if (workoutEditor?.id === id) setWorkoutEditor(null);
  };

  const deleteMealProtocol = (id) => {
    updateReference({ mealProtocols: mealProtocols.filter((protocol) => protocol.id !== id) });
    if (mealEditor?.id === id) setMealEditor(null);
  };

  const deleteRecipe = (id) => {
    updateReference({ recipes: recipes.filter((recipe) => recipe.id !== id) });
    if (recipeEditor?.id === id) setRecipeEditor(null);
  };

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
          {workoutEditor ? (
            <WorkoutEditor
              initial={workoutEditor}
              onSave={saveWorkout}
              onCancel={() => setWorkoutEditor(null)}
            />
          ) : (
            <button
              onClick={() => setWorkoutEditor({})}
              className="text-xs px-3 py-1.5 rounded-lg bg-[var(--sidebar-active)] text-[var(--sidebar-active-text)] hover:opacity-90"
            >
              Add workout
            </button>
          )}
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
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => setWorkoutEditor(workout)}
                    className="text-[11px] px-2 py-1 rounded border border-[var(--border)] hover:bg-[var(--surface)]"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteWorkout(workout.id)}
                    className="text-[11px] px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-[var(--fill-red)]"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Meal Protocols" sub="Choose one protocol per cycle week.">
          {mealEditor ? (
            <MealProtocolEditor
              initial={mealEditor}
              onSave={saveMealProtocol}
              onCancel={() => setMealEditor(null)}
            />
          ) : (
            <button
              onClick={() => setMealEditor({})}
              className="text-xs px-3 py-1.5 rounded-lg bg-[var(--sidebar-active)] text-[var(--sidebar-active-text)] hover:opacity-90"
            >
              Add meal protocol
            </button>
          )}
          <div className="space-y-2">
            {mealProtocols.map((protocol) => (
              <div key={protocol.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-inset)] px-4 py-3 space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm font-medium text-[var(--text-primary)]">{protocol.name}</p>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Protocol</span>
                    <button
                      onClick={() => setMealEditor(protocol)}
                      className="text-[11px] px-2 py-1 rounded border border-[var(--border)] hover:bg-[var(--surface)]"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteMealProtocol(protocol.id)}
                      className="text-[11px] px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-[var(--fill-red)]"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">{protocol.description}</p>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Key focus: {protocol.keyFocus || 'No key focus set.'}
                </p>
                {protocol.sampleMeals?.length ? (
                  <p className="text-xs text-[var(--text-muted)]">Sample meals: {protocol.sampleMeals.join(' · ')}</p>
                ) : null}
              </div>
            ))}
          </div>
        </Section>

        <Section title="Recipe Book" sub="Simple execution-first recipes linked to protocols.">
          {recipeEditor ? (
            <RecipeEditor
              initial={recipeEditor}
              onSave={saveRecipe}
              onCancel={() => setRecipeEditor(null)}
            />
          ) : (
            <button
              onClick={() => setRecipeEditor({})}
              className="text-xs px-3 py-1.5 rounded-lg bg-[var(--sidebar-active)] text-[var(--sidebar-active-text)] hover:opacity-90"
            >
              Add recipe
            </button>
          )}
          <div className="space-y-2">
            {recipes.map((recipe) => (
              <div key={recipe.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-inset)] px-4 py-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{recipe.name}</p>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setRecipeEditor(recipe)}
                      className="text-[11px] px-2 py-1 rounded border border-[var(--border)] hover:bg-[var(--surface)]"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteRecipe(recipe.id)}
                      className="text-[11px] px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-[var(--fill-red)]"
                    >
                      Remove
                    </button>
                  </div>
                </div>
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
