import { useState } from 'react';
import { useOS } from '../../context/OSContext';
import { LOW_ENERGY_PROTOCOL } from '../../utils/schema';
import { todayKey } from '../../utils/schema';

// ── Helpers ────────────────────────────────────────────────────────────────
const energyMeta = (n) => {
  if (!n)    return { label: 'Not logged', color: 'text-[var(--text-muted)]', bar: 'bg-surface-inset' };
  if (n <= 3) return { label: 'Low',       color: 'text-red-400',    bar: 'bg-red-400'    };
  if (n <= 5) return { label: 'Moderate',  color: 'text-amber-500',  bar: 'bg-amber-400'  };
  if (n <= 7) return { label: 'Good',      color: 'text-yellow-500', bar: 'bg-yellow-400' };
  return       { label: 'High',           color: 'text-emerald-500', bar: 'bg-emerald-400' };
};

// ── Low Energy Protocol card ───────────────────────────────────────────────
function LowEnergyCard() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="bg-[var(--fill-red)] border border-red-100 rounded-2xl px-5 py-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">🔋</span>
          <h3 className="text-xs font-bold uppercase tracking-widest text-red-400">
            Low Energy Protocol
          </h3>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-xs text-red-200 hover:text-red-400 transition-colors"
          title="Dismiss"
        >
          ✕
        </button>
      </div>

      <p className="text-xs text-red-400 leading-relaxed">
        Your energy is below 4 today. The system is switching to a gentler mode.
        Pick one or two of the following:
      </p>

      {/* Protocol tips */}
      <div className="grid grid-cols-1 gap-2">
        {LOW_ENERGY_PROTOCOL.map((tip) => (
          <div
            key={tip.id}
            className="flex gap-3 bg-white/70 rounded-xl px-3 py-2.5 border border-red-100"
          >
            <span className="text-base shrink-0 mt-0.5">{tip.icon}</span>
            <div>
              <p className="text-xs font-semibold text-red-700">{tip.title}</p>
              <p className="text-[11px] text-red-400 mt-0.5 leading-relaxed">{tip.body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── EnergyWidget ──────────────────────────────────────────────────────────
export default function EnergyWidget() {
  const { state, logToday } = useOS();
  const todayMetric = state.metrics?.[todayKey()] ?? { energy: null, sleep: null };
  const energy      = todayMetric.energy;
  const sleep       = todayMetric.sleep;
  const meta        = energyMeta(energy);
  const isLow       = energy !== null && energy <= 3;

  return (
    <div className="space-y-3">
      {/* Energy + Sleep panel */}
      <div className="bg-[var(--surface-raised)] rounded-2xl border border-[var(--border)] px-5 py-4 space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">
          Today's Vitals
        </h2>

        {/* ── Energy ─── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--text-secondary)]">Energy</span>
            <span className={`text-sm font-semibold tabular-nums ${meta.color}`}>
              {energy !== null ? `${energy} / 10 — ${meta.label}` : meta.label}
            </span>
          </div>

          {/* Bar track */}
          <div className="relative h-1.5 bg-[var(--surface-inset)] rounded-full overflow-hidden">
            <div
              className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${meta.bar}`}
              style={{ width: energy ? `${(energy / 10) * 100}%` : '0%' }}
            />
          </div>

          {/* 1–10 buttons */}
          <div className="flex gap-1 pt-0.5">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => logToday({ energy: n })}
                className={`
                  flex-1 text-[11px] py-1.5 rounded-lg font-medium transition-all
                  ${energy === n
                    ? `${meta.bar} text-white scale-105 shadow-sm`
                    : 'bg-[var(--surface-inset)] text-[var(--text-muted)] hover:bg-[var(--surface-inset)] hover:text-[var(--text-secondary)]'}
                `}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* ── Sleep ─── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--text-secondary)]">Sleep</span>
            <span className="text-sm font-semibold text-secondary tabular-nums">
              {sleep !== null ? `${sleep} hrs` : 'Not logged'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={3} max={12} step={0.5}
              value={sleep ?? 7}
              onChange={(e) => logToday({ sleep: parseFloat(e.target.value) })}
              className="flex-1 accent-zinc-800 h-1.5"
            />
            <span className="text-xs text-[var(--text-muted)] w-10 text-right tabular-nums">
              {(sleep ?? 7).toFixed(1)} h
            </span>
          </div>
          {/* Quick sleep presets */}
          <div className="flex gap-1.5">
            {[5, 6, 7, 7.5, 8, 9].map((h) => (
              <button
                key={h}
                onClick={() => logToday({ sleep: h })}
                className={`
                  flex-1 text-[11px] py-1 rounded-lg transition-all font-medium
                  ${sleep === h
                    ? 'bg-[var(--sidebar-active)] text-[var(--sidebar-active-text)]'
                    : 'bg-[var(--surface-inset)] text-[var(--text-muted)] hover:bg-[var(--surface-inset)] hover:text-[var(--text-secondary)]'}
                `}
              >
                {h}h
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Conditional low-energy card */}
      {isLow && <LowEnergyCard />}
    </div>
  );
}
