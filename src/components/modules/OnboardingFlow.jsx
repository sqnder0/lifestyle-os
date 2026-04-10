import { useState } from 'react';

const STEPS = [
  {
    id: 'name',
    title: 'What is your first name?',
    subtitle: 'This personalizes your Daily Briefing greeting.',
  },
  {
    id: 'metrics',
    title: 'Set your initial metric target',
    subtitle: 'Start with one target so logging is frictionless.',
  },
  {
    id: 'start',
    title: 'You are ready',
    subtitle: 'Press Get Started to open your Daily Briefing.',
  },
];

function StepDots({ current }) {
  return (
    <div className="flex items-center gap-1.5">
      {STEPS.map((step, idx) => (
        <div
          key={step.id}
          className={`rounded-full transition-all duration-300 ${idx === current ? 'w-6 h-1.5 bg-[var(--accent-indigo)]' : idx < current ? 'w-4 h-1.5 bg-[var(--accent-indigo)]' : 'w-1.5 h-1.5 bg-[var(--border-strong)]'}`}
        />
      ))}
    </div>
  );
}

export default function OnboardingFlow({ onComplete }) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [sleepTarget, setSleepTarget] = useState(8);

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const canContinue = () => {
    if (current.id === 'name') return Boolean(firstName.trim());
    return true;
  };

  const goNext = async () => {
    if (!canContinue()) return;

    if (isLast) {
      setSaving(true);
      await onComplete?.({ firstName: firstName.trim(), sleepTarget });
      return;
    }

    setStep((prev) => prev + 1);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[var(--surface-page)]">
      <div className="w-full max-w-md space-y-8">
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

          {current.id === 'name' ? (
            <input
              autoFocus
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && goNext()}
              placeholder="First name"
              className="input-base text-lg py-3"
            />
          ) : null}

          {current.id === 'metrics' ? (
            <div className="card px-4 py-4 space-y-3">
              <label className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">
                Goal sleep hours: <span className="text-[var(--text-primary)]">{sleepTarget}h</span>
              </label>
              <input
                type="range"
                min={5}
                max={10}
                step={0.5}
                value={sleepTarget}
                onChange={(e) => setSleepTarget(parseFloat(e.target.value))}
                className="w-full accent-[var(--accent-indigo)]"
              />
              <div className="flex justify-between text-[11px] text-[var(--text-muted)]">
                <span>5h</span>
                <span>8h</span>
                <span>10h</span>
              </div>
            </div>
          ) : null}

          {current.id === 'start' ? (
            <div className="card px-4 py-4 space-y-2">
              <p className="text-sm text-[var(--text-secondary)]">Name: {firstName.trim() || 'Not set'}</p>
              <p className="text-sm text-[var(--text-secondary)]">Sleep target: {sleepTarget} hours</p>
              <p className="text-xs text-[var(--text-muted)]">These settings are saved to your profile and synced to your account.</p>
            </div>
          ) : null}

          <button
            onClick={goNext}
            disabled={!canContinue() || saving}
            className="w-full py-3.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]
                       bg-[var(--sidebar-active)] text-[var(--sidebar-active-text)] hover:opacity-90 disabled:opacity-40"
          >
            {isLast ? (saving ? 'Saving...' : 'Get Started') : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
