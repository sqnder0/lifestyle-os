import { useMemo, useState } from 'react';
import { Check, Target, UserRound } from 'lucide-react';
import { useOS } from '../../context/OSContext';

const HABIT_OPTIONS = [
  { id: 'habit-drink-water', name: 'Drink Water', emoji: '💧', color: '#0ea5e9' },
  { id: 'habit-morning-walk', name: 'Morning Walk', emoji: '🚶', color: '#10b981' },
  { id: 'habit-deep-work', name: 'Deep Work', emoji: '🧠', color: '#6366f1' },
  { id: 'habit-reading', name: 'Reading', emoji: '📚', color: '#f59e0b' },
  { id: 'habit-journaling', name: 'Journaling', emoji: '✍️', color: '#f43f5e' },
  { id: 'habit-mobility', name: 'Mobility', emoji: '🧘', color: '#8b5cf6' },
  { id: 'habit-sunlight', name: 'Sunlight', emoji: '☀️', color: '#f97316' },
  { id: 'habit-evening-reflection', name: 'Evening Reflection', emoji: '🌙', color: '#64748b' },
];

const STARTER_PRINCIPLES = [
  'Quality over Quantity',
  'Extreme Ownership',
  'Slow is Smooth',
  'Consistency Beats Intensity',
  'Protect Deep Work',
  'Bias for Completion',
  'Clarity Before Speed',
  'Do the Hard Thing First',
];

const STEPS = ['identity', 'habits', 'goals', 'principles', 'launch'];

function StepDots({ current }) {
  return (
    <div className="flex items-center gap-1.5">
      {STEPS.map((step, idx) => (
        <div
          key={step}
          className={[
            'rounded-full transition-all duration-300',
            idx === current
              ? 'w-6 h-1.5 bg-[var(--accent-indigo)]'
              : idx < current
                ? 'w-4 h-1.5 bg-[var(--accent-indigo)]'
                : 'w-1.5 h-1.5 bg-[var(--border-strong)]',
          ].join(' ')}
        />
      ))}
    </div>
  );
}

export default function OnboardingFlow() {
  const {
    state,
    setProfileName,
    seedHabits,
    setCycleGoals,
    setStarterPrinciples,
    completeOnboarding,
  } = useOS();

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [firstName, setFirstNameInput] = useState(state.settings?.name || '');
  const [selectedHabits, setSelectedHabits] = useState(new Set(Object.keys(state.habits ?? {})));
  const [goals, setGoals] = useState(() => {
    const existing = state.settings?.cycleGoals;
    if (Array.isArray(existing) && existing.length >= 3) return existing.slice(0, 3);
    return ['', '', ''];
  });
  const [selectedPrinciples, setSelectedPrinciples] = useState(new Set());

  const selectedPrinciplesList = useMemo(() => [...selectedPrinciples], [selectedPrinciples]);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const canContinue = () => {
    if (current === 'identity') return Boolean(firstName.trim());
    if (current === 'principles') return selectedPrinciples.size === 3;
    return true;
  };

  const goBack = () => {
    setError('');
    setStep((prev) => Math.max(0, prev - 1));
  };

  const toggleHabit = (habitId) => {
    setSelectedHabits((prev) => {
      const next = new Set(prev);
      if (next.has(habitId)) next.delete(habitId);
      else next.add(habitId);
      return next;
    });
  };

  const togglePrinciple = (title) => {
    setSelectedPrinciples((prev) => {
      const next = new Set(prev);
      if (next.has(title)) {
        next.delete(title);
        return next;
      }
      if (next.size >= 3) return prev;
      next.add(title);
      return next;
    });
  };

  const saveStep = async () => {
    if (current === 'identity') {
      setProfileName(firstName.trim());
      return;
    }

    if (current === 'habits') {
      const habitsToSeed = HABIT_OPTIONS.filter((option) => selectedHabits.has(option.id)).map((option) => ({
        id: option.id,
        name: option.name,
        emoji: option.emoji,
        color: option.color,
        logs: {},
      }));
      seedHabits(habitsToSeed);
      return;
    }

    if (current === 'goals') {
      setCycleGoals(goals);
      return;
    }

    if (current === 'principles') {
      setStarterPrinciples(selectedPrinciplesList);
      return;
    }

    if (current === 'launch') {
      completeOnboarding();
    }
  };

  const goNext = async () => {
    if (!canContinue()) return;

    setSaving(true);
    setError('');
    try {
      await saveStep();
      if (!isLast) {
        setStep((prev) => prev + 1);
      }
    } catch (nextError) {
      setError(nextError?.message || 'Unable to save onboarding progress.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[var(--surface-page)]">
      <div className="w-full max-w-2xl space-y-7">
        <div className="flex items-center justify-between">
          <StepDots current={step} />
          {step > 0 ? (
            <button
              onClick={goBack}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              Back
            </button>
          ) : null}
        </div>

        <div className="card px-6 py-6 space-y-5">
          {current === 'identity' ? (
            <>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">Step 1 · Identity</p>
                <h1 className="text-2xl font-semibold text-[var(--text-primary)] mt-1">What should OS call you?</h1>
                <p className="text-sm text-[var(--text-muted)] mt-2">This is stored on your profile and used in greetings.</p>
              </div>
              <label className="block">
                <span className="text-xs text-[var(--text-muted)]">First name</span>
                <div className="mt-1 relative">
                  <UserRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    autoFocus
                    type="text"
                    value={firstName}
                    onChange={(event) => setFirstNameInput(event.target.value)}
                    className="input-base pl-9"
                    placeholder="First name"
                  />
                </div>
              </label>
            </>
          ) : null}

          {current === 'habits' ? (
            <>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">Step 2 · Habits</p>
                <h1 className="text-2xl font-semibold text-[var(--text-primary)] mt-1">Pick your starter habits</h1>
                <p className="text-sm text-[var(--text-muted)] mt-2">Select as many as you want. These seed your habits module.</p>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {HABIT_OPTIONS.map((habit) => {
                  const selected = selectedHabits.has(habit.id);
                  return (
                    <button
                      type="button"
                      key={habit.id}
                      onClick={() => toggleHabit(habit.id)}
                      className={[
                        'rounded-xl border px-3 py-3 text-left transition-all',
                        selected
                          ? 'border-[var(--sidebar-active)] bg-[var(--surface-inset)]'
                          : 'border-[var(--border)] hover:border-[var(--border-strong)]',
                      ].join(' ')}
                    >
                      <p className="text-lg">{habit.emoji}</p>
                      <p className="text-sm font-medium text-[var(--text-primary)] mt-1">{habit.name}</p>
                    </button>
                  );
                })}
              </div>
            </>
          ) : null}

          {current === 'goals' ? (
            <>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">Step 3 · Goals</p>
                <h1 className="text-2xl font-semibold text-[var(--text-primary)] mt-1">Top 3 goals for this cycle</h1>
                <p className="text-sm text-[var(--text-muted)] mt-2">These are stored in your settings for cycle planning context.</p>
              </div>
              <div className="space-y-2.5">
                {[0, 1, 2].map((index) => (
                  <label key={index} className="block">
                    <span className="text-xs text-[var(--text-muted)]">Goal {index + 1}</span>
                    <div className="mt-1 relative">
                      <Target size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                      <input
                        type="text"
                        value={goals[index]}
                        onChange={(event) => {
                          const value = event.target.value;
                          setGoals((prev) => prev.map((goal, i) => (i === index ? value : goal)));
                        }}
                        className="input-base pl-9"
                        placeholder={`Top goal ${index + 1}`}
                      />
                    </div>
                  </label>
                ))}
              </div>
            </>
          ) : null}

          {current === 'principles' ? (
            <>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">Step 4 · Principles</p>
                <h1 className="text-2xl font-semibold text-[var(--text-primary)] mt-1">Select exactly 3 core principles</h1>
                <p className="text-sm text-[var(--text-muted)] mt-2">Chosen principles are added to your principles library.</p>
              </div>
              <div className="space-y-2">
                {STARTER_PRINCIPLES.map((title) => {
                  const selected = selectedPrinciples.has(title);
                  return (
                    <button
                      type="button"
                      key={title}
                      onClick={() => togglePrinciple(title)}
                      className={[
                        'w-full rounded-xl border px-3 py-2 text-left flex items-center justify-between transition-all',
                        selected
                          ? 'border-[var(--sidebar-active)] bg-[var(--surface-inset)]'
                          : 'border-[var(--border)] hover:border-[var(--border-strong)]',
                      ].join(' ')}
                    >
                      <span className="text-sm text-[var(--text-primary)]">{title}</span>
                      <span className={selected ? 'text-[var(--sidebar-active)]' : 'text-[var(--text-muted)]'}>
                        <Check size={16} />
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-[var(--text-muted)]">Selected {selectedPrinciples.size}/3</p>
            </>
          ) : null}

          {current === 'launch' ? (
            <>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">Step 5 · Completion</p>
                <h1 className="text-2xl font-semibold text-[var(--text-primary)] mt-1">Launch Lifestyle OS</h1>
                <p className="text-sm text-[var(--text-muted)] mt-2">This marks your profile as onboarded and opens your dashboard.</p>
              </div>
              <div className="rounded-xl border border-[var(--border)] p-4 space-y-1.5 text-sm text-[var(--text-secondary)]">
                <p>Name: {firstName.trim() || 'Not set'}</p>
                <p>Starter habits: {selectedHabits.size}</p>
                <p>Cycle goals captured: {goals.filter((goal) => goal.trim()).length}/3</p>
                <p>Core principles: {selectedPrinciples.size}/3</p>
              </div>
            </>
          ) : null}

          {error ? (
            <p className="text-xs text-red-500 bg-[var(--fill-red)] px-3 py-2 rounded-lg border border-red-100">{error}</p>
          ) : null}

          <button
            onClick={goNext}
            disabled={!canContinue() || saving}
            className="w-full py-3.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]
                       bg-[var(--sidebar-active)] text-[var(--sidebar-active-text)] hover:opacity-90 disabled:opacity-40"
          >
            {isLast ? (saving ? 'Launching...' : 'Launch OS') : (saving ? 'Saving...' : 'Continue')}
          </button>
        </div>
      </div>
    </div>
  );
}
