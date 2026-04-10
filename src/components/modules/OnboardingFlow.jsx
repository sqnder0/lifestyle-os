import { useMemo, useState } from 'react';
import { Check, Droplets, Footprints, Sparkles, Target, Zap } from 'lucide-react';
import { useOS } from '../../context/OSContext';
import { uid } from '../../utils/schema';

const STEPS = [
  { id: 'identity', title: 'What should we call you?', subtitle: 'Name is the only required field for setup.' },
  { id: 'habits', title: 'Optional: Seed hard-mode habits', subtitle: 'Pick any habits you want to start with, or skip this step.' },
  { id: 'goals', title: 'Optional: Add cycle goals', subtitle: 'Use this freeform area for as many goals as you want.' },
  { id: 'principles', title: 'Optional: Seed core principles', subtitle: 'Pick any principles now, or add them later.' },
  { id: 'launch', title: 'Launch Lifestyle OS', subtitle: 'Confirm setup and enter the dashboard.' },
];

const HABIT_LIBRARY = [
  { key: 'cold-shower', name: 'Cold shower', emoji: '🧊', color: '#0ea5e9', icon: Droplets },
  { key: 'no-phone-30', name: 'No phone first 30 mins of the day', emoji: '📵', color: '#f97316', icon: Zap },
  { key: 'morning-sunlight', name: 'Morning Sunlight', emoji: '☀️', color: '#f59e0b', icon: Footprints },
  { key: 'daily-deep-work', name: 'Daily Deep Work', emoji: '🧠', color: '#6366f1', icon: Target },
];

const STARTER_PRINCIPLES = [
  {
    key: 'two-minute-rule',
    title: 'The 2 Minute Rule',
    body: 'If it takes less than two minutes, do it now.',
    category: 'Productivity',
  },
  {
    key: 'extreme-ownership',
    title: 'Extreme Ownership',
    body: 'Take full responsibility for outcomes and standards.',
    category: 'General',
  },
  {
    key: 'done-over-perfect',
    title: 'Done is better than perfect',
    body: 'Ship and iterate instead of waiting for flawless.',
    category: 'Productivity',
  },
  {
    key: 'seek-discomfort',
    title: 'Seek discomfort',
    body: 'Choose growth over convenience when it matters.',
    category: 'General',
  },
];

function StepDots({ current }) {
  return (
    <div className="flex items-center gap-1.5">
      {STEPS.map((step, idx) => (
        <div
          key={step.id}
          className={`rounded-full transition-all duration-300 ${idx === current ? 'w-7 h-1.5 bg-[var(--accent-indigo)]' : idx < current ? 'w-4 h-1.5 bg-[var(--accent-indigo)]' : 'w-1.5 h-1.5 bg-[var(--border-strong)]'}`}
        />
      ))}
    </div>
  );
}

export default function OnboardingFlow() {
  const {
    state,
    setProfileName,
    setHabits,
    setCycleGoals,
    setPrinciples,
    setOnboarded,
    setActiveModule,
  } = useOS();

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [firstName, setFirstNameInput] = useState(state.settings?.name ?? '');
  const [selectedHabitKeys, setSelectedHabitKeys] = useState([]);
  const [goalsText, setGoalsText] = useState(typeof state.settings?.cycleGoals === 'string' ? state.settings.cycleGoals : '');
  const [selectedPrincipleKeys, setSelectedPrincipleKeys] = useState([]);

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const selectedHabits = useMemo(
    () => HABIT_LIBRARY.filter((habit) => selectedHabitKeys.includes(habit.key)),
    [selectedHabitKeys],
  );

  const selectedPrinciples = useMemo(
    () => STARTER_PRINCIPLES.filter((principle) => selectedPrincipleKeys.includes(principle.key)),
    [selectedPrincipleKeys],
  );

  const canContinue = () => {
    if (current.id === 'identity') return Boolean(firstName.trim());
    return true;
  };

  const commitStep = async () => {
    if (current.id === 'identity') {
      setProfileName(firstName.trim());
      return;
    }

    if (current.id === 'habits') {
      const mappedHabits = selectedHabits.map((habit) => ({
        id: uid(),
        name: habit.name,
        emoji: habit.emoji,
        color: habit.color,
        logs: {},
        createdAt: new Date().toISOString(),
      }));
      if (mappedHabits.length) setHabits(mappedHabits);
      return;
    }

    if (current.id === 'goals') {
      setCycleGoals(goalsText);
      return;
    }

    if (current.id === 'principles') {
      const mappedPrinciples = selectedPrinciples.map((principle, index) => ({
        id: uid(),
        title: principle.title,
        body: principle.body,
        category: principle.category,
        order: index,
        createdAt: new Date().toISOString(),
      }));
      if (mappedPrinciples.length) setPrinciples(mappedPrinciples);
    }
  };

  const goNext = async () => {
    if (!canContinue()) return;

    setError('');

    if (isLast) {
      setSaving(true);
      try {
        await setOnboarded(true);
        setActiveModule('dashboard');
      } catch (nextError) {
        setError(nextError?.message || 'Failed to complete onboarding.');
      } finally {
        setSaving(false);
      }
      return;
    }

    await commitStep();
    setStep((prev) => prev + 1);
  };

  const toggleHabit = (key) => {
    setSelectedHabitKeys((prev) => (
      prev.includes(key) ? prev.filter((value) => value !== key) : [...prev, key]
    ));
  };

  const togglePrinciple = (key) => {
    setSelectedPrincipleKeys((prev) => (
      prev.includes(key) ? prev.filter((value) => value !== key) : [...prev, key]
    ));
  };

  const skipStep = () => {
    if (isLast) return;
    if (current.id === 'identity') return;
    setStep((prev) => prev + 1);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[var(--surface-page)] overflow-y-auto">
      <div className="w-full max-w-2xl space-y-8">
        <div className="flex items-center justify-between">
          <StepDots current={step} />
          <div className="flex items-center gap-3">
            {current.id !== 'identity' && !isLast ? (
              <button
                onClick={skipStep}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                Skip
              </button>
            ) : null}
            {step > 0 ? (
              <button
                onClick={() => setStep((prev) => prev - 1)}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                Back
              </button>
            ) : null}
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <h1 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight leading-tight">{current.title}</h1>
            <p className="text-[var(--text-muted)] mt-2 leading-relaxed">{current.subtitle}</p>
          </div>

          {current.id === 'identity' ? (
            <input
              autoFocus
              type="text"
              value={firstName}
              onChange={(e) => setFirstNameInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && goNext()}
              placeholder="First name"
              className="input-base text-lg py-3"
            />
          ) : null}

          {current.id === 'habits' ? (
            <div className="grid sm:grid-cols-2 gap-3">
              {HABIT_LIBRARY.map((habit) => {
                const selected = selectedHabitKeys.includes(habit.key);
                const Icon = habit.icon;
                return (
                  <button
                    key={habit.key}
                    onClick={() => toggleHabit(habit.key)}
                    className={`text-left rounded-2xl border p-4 transition-all ${selected ? 'border-[var(--accent-indigo)] bg-[var(--fill-indigo)]' : 'border-[var(--border)] bg-[var(--surface-raised)] hover:bg-[var(--surface-inset)]'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="inline-flex items-center gap-2">
                        <span className="w-9 h-9 rounded-xl bg-white/80 flex items-center justify-center text-lg">{habit.emoji}</span>
                        <div>
                          <p className="text-sm font-semibold text-[var(--text-primary)]">{habit.name}</p>
                          <p className="text-[11px] text-[var(--text-muted)] inline-flex items-center gap-1"><Icon size={12} /> Hard mode habit</p>
                        </div>
                      </div>
                      {selected ? <Check size={16} className="text-[var(--accent-indigo)]" /> : null}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : null}

          {current.id === 'goals' ? (
            <textarea
              rows={6}
              value={goalsText}
              onChange={(e) => setGoalsText(e.target.value)}
              placeholder={'Examples:\n- Close all inbox items\n- 20 deep work blocks\n- Sleep before 11pm'}
              className="input-base resize-y leading-relaxed"
            />
          ) : null}

          {current.id === 'principles' ? (
            <div className="space-y-3">
              <p className="text-xs text-[var(--text-muted)]">Selected {selectedPrincipleKeys.length}</p>
              <div className="grid gap-2">
                {STARTER_PRINCIPLES.map((principle) => {
                  const selected = selectedPrincipleKeys.includes(principle.key);
                  return (
                    <button
                      key={principle.key}
                      onClick={() => togglePrinciple(principle.key)}
                      className={`text-left rounded-xl border px-4 py-3 transition-colors ${selected ? 'border-[var(--accent-indigo)] bg-[var(--fill-indigo)]' : 'border-[var(--border)] hover:bg-[var(--surface-inset)]'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-[var(--text-primary)]">{principle.title}</p>
                          <p className="text-xs text-[var(--text-secondary)] mt-0.5">{principle.body}</p>
                        </div>
                        {selected ? <Check size={16} className="text-[var(--accent-indigo)]" /> : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {current.id === 'launch' ? (
            <div className="card px-4 py-4 space-y-3">
              <p className="text-sm text-[var(--text-secondary)]">Name: {firstName.trim() || 'Not set'}</p>
              <p className="text-sm text-[var(--text-secondary)]">Habits selected: {selectedHabitKeys.length}</p>
              <p className="text-sm text-[var(--text-secondary)]">Goals added: {goalsText.trim() ? 'Yes' : 'No'}</p>
              <p className="text-sm text-[var(--text-secondary)]">Principles selected: {selectedPrincipleKeys.length}</p>
              <p className="text-xs text-[var(--text-muted)] inline-flex items-center gap-1"><Sparkles size={12} /> Everything is persisted to your account state.</p>
            </div>
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
            {isLast ? (saving ? 'Launching...' : 'Launch OS') : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
