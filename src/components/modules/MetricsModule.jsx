import { useState } from 'react';
import { useOS } from '../../context/OSContext';
import { avg } from '../../utils/helpers';
import { todayKey } from '../../utils/schema';

// ── Sparkline (pure SVG, no external deps) ────────────────────────────────
function Sparkline({ data, color, max = 10, height = 40 }) {
  const w = 100, h = height;
  const pts = data.filter((v) => v != null);
  if (pts.length < 2) return <div style={{ height }} className="flex items-center justify-center text-[var(--text-muted)] text-xs">Not enough data</div>;

  const xStep = w / (data.length - 1);
  const points = data.map((v, i) => {
    const x = i * xStep;
    const y = v == null ? null : h - (v / max) * h;
    return { x, y, v };
  }).filter((p) => p.y != null);

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

  // Area fill
  const areaD = `${pathD} L ${points[points.length - 1].x.toFixed(1)} ${h} L ${points[0].x.toFixed(1)} ${h} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
      <defs>
        <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#grad-${color})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Last value dot */}
      <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="2.5" fill={color} />
    </svg>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color }) {
  return (
    <div className="bg-[var(--surface-raised)] rounded-2xl border border-[var(--border)] px-4 py-3 space-y-0.5">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">{label}</p>
      <p className={`text-2xl font-bold tabular-nums ${color}`}>{value ?? '—'}</p>
      {sub && <p className="text-[11px] text-[var(--text-muted)]">{sub}</p>}
    </div>
  );
}

// ── Metric chart panel ────────────────────────────────────────────────────
function MetricChart({ label, data, color, hexColor, max, unit }) {
  const values = data.map((d) => d.value);
  const mean   = avg(values);
  const recent = values.filter((v) => v != null).slice(-7);
  const trend  = recent.length >= 2
    ? recent[recent.length - 1] - recent[0] > 0 ? '↑' : recent[recent.length - 1] - recent[0] < 0 ? '↓' : '→'
    : '—';

  return (
    <div className="bg-[var(--surface-raised)] rounded-2xl border border-[var(--border)] px-5 py-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">{label}</p>
          <p className="text-sm font-semibold text-secondary mt-0.5">
            {mean != null ? `${mean.toFixed(1)} ${unit} avg` : 'No data'}
            <span className="ml-2 text-[var(--text-muted)] font-normal">{trend}</span>
          </p>
        </div>
      </div>
      <Sparkline data={values} color={hexColor} max={max} height={48} />
      {/* Day labels */}
      <div className="flex justify-between text-[10px] text-[var(--text-muted)] px-0.5">
        <span>{data[0]?.label ?? ''}</span>
        <span>14d</span>
        <span>today</span>
      </div>
    </div>
  );
}

// ── Today logger ──────────────────────────────────────────────────────────
function TodayLogger() {
  const { state, logToday } = useOS();
  const today = state.metrics?.[todayKey()] ?? {};

  const logEnergy = (n) => logToday({ energy: n });
  const logSleep  = (v) => logToday({ sleep: v });
  const logMood   = (n) => logToday({ mood: n });

  return (
    <div className="bg-[var(--surface-raised)] rounded-2xl border border-[var(--border)] px-5 py-4 space-y-4">
      <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Log Today</p>

      {/* Energy */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-[var(--text-secondary)]">Energy</span>
          <span className="text-sm font-semibold text-[var(--text-primary)] tabular-nums">
            {today.energy ?? '—'} / 10
          </span>
        </div>
        <div className="flex gap-1">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <button key={n} onClick={() => logEnergy(n)}
              className={`flex-1 text-[11px] py-1.5 rounded-lg font-medium transition-all
                ${today.energy === n
                  ? 'bg-[var(--fill-indigo)]0 text-white scale-105'
                  : 'bg-[var(--surface-inset)] text-[var(--text-muted)] hover:bg-[var(--surface-inset)]'}`}>
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Sleep */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-[var(--text-secondary)]">Sleep</span>
          <span className="text-sm font-semibold text-[var(--text-primary)] tabular-nums">
            {today.sleep != null ? `${today.sleep} h` : '—'}
          </span>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {[4, 5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 10].map((h) => (
            <button key={h} onClick={() => logSleep(h)}
              className={`text-[11px] px-2.5 py-1 rounded-lg font-medium transition-all
                ${today.sleep === h
                  ? 'bg-[var(--fill-sky)]0 text-white'
                  : 'bg-[var(--surface-inset)] text-[var(--text-muted)] hover:bg-[var(--surface-inset)]'}`}>
              {h}h
            </button>
          ))}
        </div>
      </div>

      {/* Mood */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-[var(--text-secondary)]">Mood</span>
          <span className="text-sm font-semibold text-[var(--text-primary)] tabular-nums">
            {today.mood ?? '—'} / 10
          </span>
        </div>
        <div className="flex gap-1">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <button key={n} onClick={() => logMood(n)}
              className={`flex-1 text-[11px] py-1.5 rounded-lg font-medium transition-all
                ${today.mood === n
                  ? 'bg-[var(--fill-emerald)]0 text-white scale-105'
                  : 'bg-[var(--surface-inset)] text-[var(--text-muted)] hover:bg-[var(--surface-inset)]'}`}>
              {n}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── MetricsModule ─────────────────────────────────────────────────────────
export default function MetricsModule() {
  const { state } = useOS();
  const { metrics } = state;

  // Build 14-day dataset
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const m   = metrics?.[key] ?? {};
    return {
      key,
      label: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      energy: m.energy ?? null,
      sleep:  m.sleep  ?? null,
      mood:   m.mood   ?? null,
    };
  });

  const energyAvg = avg(days.map((d) => d.energy));
  const sleepAvg  = avg(days.map((d) => d.sleep));
  const moodAvg   = avg(days.map((d) => d.mood));

  const today = metrics?.[todayKey()] ?? {};

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto space-y-4 pb-12">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Metrics</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">14-day rolling view</p>
        </div>

        {/* Stat summary row */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard
            label="Energy"
            value={energyAvg != null ? energyAvg.toFixed(1) : null}
            sub="14-day avg / 10"
            color={energyAvg == null ? 'text-[var(--text-muted)]' : energyAvg < 4 ? 'text-red-500' : energyAvg < 7 ? 'text-amber-500' : 'text-emerald-500'}
          />
          <StatCard
            label="Sleep"
            value={sleepAvg != null ? sleepAvg.toFixed(1) : null}
            sub="14-day avg hrs"
            color={sleepAvg == null ? 'text-[var(--text-muted)]' : sleepAvg < 6 ? 'text-red-500' : sleepAvg < 7 ? 'text-amber-500' : 'text-sky-500'}
          />
          <StatCard
            label="Mood"
            value={moodAvg != null ? moodAvg.toFixed(1) : null}
            sub="14-day avg / 10"
            color={moodAvg == null ? 'text-[var(--text-muted)]' : moodAvg < 4 ? 'text-red-500' : moodAvg < 7 ? 'text-amber-500' : 'text-emerald-500'}
          />
        </div>

        {/* Today logger */}
        <TodayLogger />

        {/* Sparkline charts */}
        <MetricChart
          label="Energy"
          data={days.map((d) => ({ value: d.energy, label: d.label }))}
          hexColor="#6366f1"
          max={10}
          unit="/ 10"
        />
        <MetricChart
          label="Sleep"
          data={days.map((d) => ({ value: d.sleep, label: d.label }))}
          hexColor="#0ea5e9"
          max={12}
          unit="hrs"
        />
        <MetricChart
          label="Mood"
          data={days.map((d) => ({ value: d.mood, label: d.label }))}
          hexColor="#10b981"
          max={10}
          unit="/ 10"
        />
      </div>
    </div>
  );
}
