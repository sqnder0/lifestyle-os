import { useState } from 'react';
import { useOS } from '../../context/OSContext';

const STEPS = [
  { id: 'welcome',  title: 'Welcome to your OS',         subtitle: 'A personal operating system for how you actually live.' },
  { id: 'name',     title: 'What should I call you?',    subtitle: "I'll use this in your daily greeting." },
  { id: 'schedule', title: 'Set your daily anchor',      subtitle: "Your wake time anchors the whole day's structure." },
  { id: 'habits',   title: 'Pick your first habits',     subtitle: 'Start with 2–3. You can always add more later.' },
  { id: 'done',     title: "You're set up.",              subtitle: 'Your OS is ready. Here\'s what to do first.' },
];

const HABIT_SUGGESTIONS = [
  { id:'h-1', name:'Morning movement',   emoji:'🏃', color:'#6366f1' },
  { id:'h-2', name:'Read 20 min',        emoji:'📚', color:'#10b981' },
  { id:'h-3', name:'No phone first hour',emoji:'📵', color:'#f59e0b' },
  { id:'h-4', name:'Drink 8 glasses',    emoji:'💧', color:'#0ea5e9' },
  { id:'h-5', name:'10 min walk',        emoji:'🚶', color:'#8b5cf6' },
  { id:'h-6', name:'Journal',            emoji:'✍️', color:'#f43f5e' },
  { id:'h-7', name:'Meditate',           emoji:'🧘', color:'#10b981' },
  { id:'h-8', name:'Cold shower',        emoji:'🚿', color:'#0ea5e9' },
];

// ── Step indicator ─────────────────────────────────────────────────────────
function StepDots({ steps, current }) {
  return (
    <div className="flex items-center gap-1.5">
      {steps.map((s, i) => (
        <div
          key={s.id}
          className={`rounded-full transition-all duration-300 ${
            i < current ? 'w-4 h-1.5 bg-[var(--accent-indigo)]' :
            i === current ? 'w-6 h-1.5 bg-[var(--accent-indigo)]' :
            'w-1.5 h-1.5 bg-[var(--border-strong)]'
          }`}
        />
      ))}
    </div>
  );
}

// ── OnboardingFlow ─────────────────────────────────────────────────────────
export default function OnboardingFlow({ onComplete }) {
  const { update } = useOS();
  const [step, setStep]            = useState(0);
  const [name, setName]            = useState('');
  const [wakeTime, setWakeTime]    = useState('07:00');
  const [sleepTarget, setSleep]    = useState(8);
  const [selectedHabits, setHabits] = useState(new Set(['h-1','h-2']));

  const cur = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const toggleHabit = (id) => {
    setHabits(prev => {
      const next = new Set(prev);
      if (next.has(id)) { if (next.size > 1) next.delete(id); }
      else { if (next.size < 5) next.add(id); }
      return next;
    });
  };

  const finish = () => {
    // Build habits map from selection
    const habitsMap = {};
    HABIT_SUGGESTIONS.filter(h => selectedHabits.has(h.id)).forEach(h => {
      const id = `hb-${h.id}`;
      habitsMap[id] = { id, name: h.name, emoji: h.emoji, color: h.color, logs: {}, createdAt: new Date().toISOString() };
    });

    update(s => ({
      ...s,
      settings: {
        ...(s.settings ?? {}),
        name: name.trim(),
        wakeTime,
        sleepTarget,
        onboarded: true,
      },
      habits: { ...(s.habits ?? {}), ...habitsMap },
      ui: { ...s.ui, activeModule: 'dashboard' },
    }));

    onComplete?.();
  };

  const advance = () => {
    if (isLast) { finish(); return; }
    setStep(s => s + 1);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[var(--surface-page)]">
      <div className="w-full max-w-md">

        {/* Progress */}
        <div className="flex items-center justify-between mb-8">
          <StepDots steps={STEPS} current={step} />
          {step > 0 && !isLast && (
            <button onClick={() => setStep(s => s - 1)}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
              ← Back
            </button>
          )}
        </div>

        {/* Step content */}
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight leading-tight">
              {cur.title}
            </h1>
            <p className="text-[var(--text-muted)] mt-2 leading-relaxed">{cur.subtitle}</p>
          </div>

          {/* ── Welcome ── */}
          {cur.id === 'welcome' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: '⌂', label: 'Dashboard',    desc: 'Your daily command centre' },
                  { icon: '↻', label: '3-week cycles', desc: 'Structured recurring schedule' },
                  { icon: '◐', label: 'Habits',        desc: 'Streaks and heatmaps' },
                  { icon: '◈', label: 'Metrics',       desc: 'Energy, sleep, and mood' },
                ].map(f => (
                  <div key={f.label} className="card-sm px-3 py-3 space-y-0.5">
                    <p className="text-lg leading-none">{f.icon}</p>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{f.label}</p>
                    <p className="text-[11px] text-[var(--text-muted)]">{f.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Name ── */}
          {cur.id === 'name' && (
            <input
              autoFocus
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && advance()}
              placeholder="Your name…"
              className="input-base text-lg py-3"
            />
          )}

          {/* ── Schedule ── */}
          {cur.id === 'schedule' && (
            <div className="space-y-4">
              <div className="card-sm px-4 py-4 space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">
                  Wake time
                </label>
                <input
                  type="time"
                  value={wakeTime}
                  onChange={e => setWakeTime(e.target.value)}
                  className="input-base text-2xl font-mono py-3"
                />
              </div>
              <div className="card-sm px-4 py-4 space-y-3">
                <label className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">
                  Sleep target: <span className="text-[var(--text-primary)] font-bold">{sleepTarget}h</span>
                </label>
                <input
                  type="range" min={5} max={10} step={0.5}
                  value={sleepTarget}
                  onChange={e => setSleep(parseFloat(e.target.value))}
                  className="w-full accent-[var(--accent-indigo)]"
                />
                <div className="flex justify-between text-[11px] text-[var(--text-muted)]">
                  <span>5h minimum</span><span>8h recommended</span><span>10h max</span>
                </div>
              </div>
            </div>
          )}

          {/* ── Habits ── */}
          {cur.id === 'habits' && (
            <div className="space-y-2">
              <p className="text-[11px] text-[var(--text-muted)]">
                {selectedHabits.size}/5 selected
              </p>
              <div className="grid grid-cols-2 gap-2">
                {HABIT_SUGGESTIONS.map(h => {
                  const on = selectedHabits.has(h.id);
                  return (
                    <button
                      key={h.id}
                      onClick={() => toggleHabit(h.id)}
                      className={`flex items-center gap-2.5 px-3 py-3 rounded-xl border text-left transition-all
                        ${on
                          ? 'border-[var(--border-strong)] bg-[var(--surface-inset)]'
                          : 'border-[var(--border)] hover:border-[var(--border-strong)]'}`}
                    >
                      <span className="text-xl">{h.emoji}</span>
                      <div>
                        <p className="text-xs font-semibold text-[var(--text-primary)] leading-snug">{h.name}</p>
                        {on && <span className="text-[10px] text-[var(--accent-indigo)]">✓ selected</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Done ── */}
          {cur.id === 'done' && (
            <div className="space-y-3">
              {[
                { icon: '⌂', text: 'Open the Dashboard each morning' },
                { icon: '◐', text: 'Tap habits once logged for the day' },
                { icon: '◈', text: 'Log your energy after breakfast' },
                { icon: '⌘K', text: 'Press ⌘K anytime to search everything' },
              ].map(tip => (
                <div key={tip.icon} className="flex items-center gap-3 py-2 border-b border-[var(--border)] last:border-0">
                  <span className="w-8 h-8 rounded-lg bg-[var(--surface-inset)] flex items-center justify-center text-sm font-bold text-[var(--text-secondary)] shrink-0">
                    {tip.icon}
                  </span>
                  <p className="text-sm text-[var(--text-secondary)]">{tip.text}</p>
                </div>
              ))}
            </div>
          )}

          {/* CTA */}
          <button
            onClick={advance}
            className="w-full py-3.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]
                       bg-[var(--sidebar-active)] text-[var(--sidebar-active-text)] hover:opacity-90"
          >
            {step === 0 ? "Let's go →"
              : step === STEPS.length - 2 ? 'Finish setup →'
              : isLast ? 'Open my OS'
              : 'Continue →'}
          </button>

          {/* Skip for users who don't want setup */}
          {step === 0 && (
            <button onClick={finish}
              className="w-full text-center text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
              Skip setup and jump straight in
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
