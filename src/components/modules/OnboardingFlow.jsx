import { useMemo, useState } from 'react';
import { BookOpen, Check, Droplets, Footprints, Sparkles, Target } from 'lucide-react';
import { useOS } from '../../context/OSContext';
import { uid } from '../../utils/schema';

const STEPS = [
  { id: 'identity', title: 'What should we call you?', subtitle: 'This is used in your dashboard and account profile.' },
  { id: 'habits', title: 'Pick your starter habits', subtitle: 'Select as many as you want. These are seeded into habit tracking.' },
  { id: 'goals', title: 'Top 3 goals for this cycle', subtitle: 'Keep goals short and actionable.' },
  { id: 'principles', title: 'Choose exactly 3 core principles', subtitle: 'These will seed your Principles module.' },
  { id: 'launch', title: 'Launch Lifestyle OS', subtitle: 'Confirm your setup and enter the dashboard.' },
];

const HABIT_LIBRARY = [
  { key: 'drink-water', name: 'Drink Water', emoji: '💧', color: '#0ea5e9', icon: Droplets },
  { key: 'morning-walk', name: 'Morning Walk', emoji: '🚶', color: '#10b981', icon: Footprints },
  { key: 'deep-work', name: 'Deep Work', emoji: '🧠', color: '#6366f1', icon: Target },
  { key: 'reading', name: 'Reading', emoji: '📚', color: '#f59e0b', icon: BookOpen },
];

const STARTER_PRINCIPLES = [
  { key: 'quality', title: 'Quality over Quantity', body: 'Do fewer things with complete attention and high standards.', category: 'Productivity' },
  { key: 'ownership', title: 'Extreme Ownership', body: 'Assume responsibility for outcomes instead of blaming context.', category: 'General' },
  { key: 'slow-smooth', title: 'Slow is Smooth', body: 'Move deliberately first; speed follows from consistency.', category: 'Productivity' },
  { key: 'sleep-weapon', title: 'Sleep is a Performance Tool', body: 'Protect sleep like a strategic asset.', category: 'Health' },
  { key: 'hard-conversations', title: 'Hard Conversations Early', body: 'Address tension while it is still small and solvable.', category: 'Relationships' },
  { key: 'systems-win', title: 'Systems Beat Motivation', body: 'Design defaults that make the right action easier.', category: 'Productivity' },
  { key: 'single-task', title: 'Single-task First', body: 'Work one meaningful thing to completion before switching.', category: 'General' },
  { key: 'long-term', title: 'Long-term over Immediate', body: 'Optimize for compounding outcomes, not quick relief.', category: 'Finance' },
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
  const [firstName, setFirstNameInput] = useState(state.settings?.name ?? '');
  const [selectedHabitKeys, setSelectedHabitKeys] = useState([]);
  const [goals, setGoals] = useState(() => {
    const existing = Array.isArray(state.settings?.cycleGoals) ? state.settings.cycleGoals.slice(0, 3) : [];
    while (existing.length < 3) existing.push('');
    return existing;
  });
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
    if (current.id === 'goals') return goals.every((goal) => Boolean(goal.trim()));
    if (current.id === 'principles') return selectedPrincipleKeys.length === 3;
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
      setHabits(mappedHabits);
      return;
    }

    if (current.id === 'goals') {
      setCycleGoals(goals);
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
      setPrinciples(mappedPrinciples);
    }
  };

  const goNext = async () => {
    if (!canContinue()) return;

    if (isLast) {
      setSaving(true);
      setOnboarded(true);
      setActiveModule('dashboard');
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
    setSelectedPrincipleKeys((prev) => {
      if (prev.includes(key)) return prev.filter((value) => value !== key);
      if (prev.length >= 3) return prev;
      return [...prev, key];
    });
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[var(--surface-page)] overflow-y-auto">
      <div className="w-full max-w-2xl space-y-8">
        <div className="flex items-center justify-between">
          <StepDots current={step} />
          {step > 0 ? (
            <button
              onClick={() => setStep((prev) => prev - 1)}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              Back
            </button>
          ) : null}
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
                          <p className="text-[11px] text-[var(--text-muted)] inline-flex items-center gap-1"><Icon size={12} /> Starter habit</p>
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
            <div className="space-y-2.5">
              {goals.map((goal, idx) => (
                <input
                  key={`goal-${idx + 1}`}
                  type="text"
                  value={goal}
                  onChange={(e) => {
                    const next = [...goals];
                    next[idx] = e.target.value;
                    setGoals(next);
                  }}
                  placeholder={`Goal ${idx + 1}`}
                  className="input-base"
                />
              ))}
            </div>
          ) : null}

          {current.id === 'principles' ? (
            <div className="space-y-3">
              <p className="text-xs text-[var(--text-muted)]">Selected {selectedPrincipleKeys.length}/3</p>
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
              <p className="text-sm text-[var(--text-secondary)]">Goals set: {goals.filter((goal) => goal.trim()).length}/3</p>
              <p className="text-sm text-[var(--text-secondary)]">Principles selected: {selectedPrincipleKeys.length}/3</p>
              <p className="text-xs text-[var(--text-muted)] inline-flex items-center gap-1"><Sparkles size={12} /> Everything is persisted to your account state.</p>
            </div>
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
