import { useState, useEffect, useMemo } from 'react';
import { useOS } from '../../context/OSContext';

const d2 = (n) => String(n).padStart(2, '0');
const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${d2(d.getMonth()+1)}-${d2(d.getDate())}`; };

// ── Build alerts from state ────────────────────────────────────────────────
function buildAlerts(state) {
  const alerts = [];
  const settings = state.settings ?? {};

  // 1. Overdue CRM contacts (> 30 days since contact)
  if (settings.notifyOverdueCRM !== false) {
    const overdue = Object.values(state.crm ?? {}).filter(c => {
      const days = c.lastContacted
        ? Math.floor((Date.now() - new Date(c.lastContacted)) / 86_400_000)
        : Infinity;
      return days > 30;
    });
    if (overdue.length > 0) {
      alerts.push({
        id: 'crm-overdue',
        type: 'warning',
        icon: '◎',
        title: `${overdue.length} contact${overdue.length > 1 ? 's' : ''} overdue`,
        body: `${overdue[0].name}${overdue.length > 1 ? ` +${overdue.length - 1} more` : ''} — last contact over 30 days ago`,
        action: 'crm',
        actionLabel: 'Open CRM',
      });
    }
  }

  // 2. Inbox growing
  const unprocessed = (state.capture ?? []).filter(c => !c.processed).length;
  if (unprocessed >= 5) {
    alerts.push({
      id: 'inbox-growing',
      type: 'info',
      icon: '↓',
      title: `${unprocessed} items in inbox`,
      body: 'Your capture inbox is building up. Take 5 min to process.',
      action: 'capture',
      actionLabel: 'Process inbox',
    });
  }

  // 3. Weekly review due
  if (settings.notifyReviewReminder !== false) {
    const dayName = new Date().toLocaleDateString('en-GB', { weekday: 'long' });
    const reviewDay = settings.reviewDay ?? 'Friday';
    const reviews = state.reviews ?? {};
    const getWeekKey = () => {
      const d = new Date(); d.setHours(0,0,0,0);
      d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
      const w1 = new Date(d.getFullYear(), 0, 4);
      const wn = 1 + Math.round(((d - w1) / 86400000 - 3 + ((w1.getDay() + 6) % 7)) / 7);
      return `${d.getFullYear()}-W${d2(wn)}`;
    };
    if (dayName === reviewDay && !reviews[getWeekKey()]) {
      alerts.push({
        id: 'review-due',
        type: 'nudge',
        icon: '✐',
        title: "Weekly review time",
        body: `It's ${reviewDay}. Take 10 minutes to reflect on your week.`,
        action: 'review',
        actionLabel: 'Start review',
      });
    }
  }

  // 4. Habit streak at risk (afternoon — no habits logged yet today)
  if (settings.notifyHabitStreak !== false) {
    const hour = new Date().getHours();
    if (hour >= 16) {
      const habits = Object.values(state.habits ?? {});
      const atRisk = habits.filter(h => {
        const logs = h.logs ?? {};
        // Had a streak yesterday
        const yday = new Date(); yday.setDate(yday.getDate() - 1);
        const ydayKey = `${yday.getFullYear()}-${d2(yday.getMonth()+1)}-${d2(yday.getDate())}`;
        return logs[ydayKey] && !logs[todayKey()];
      });
      if (atRisk.length > 0) {
        alerts.push({
          id: 'habit-streak',
          type: 'nudge',
          icon: '◐',
          title: `${atRisk.length} habit streak${atRisk.length > 1 ? 's' : ''} at risk`,
          body: `${atRisk[0].name}${atRisk.length > 1 ? ` and ${atRisk.length - 1} more` : ''} — don't break the chain`,
          action: 'habits',
          actionLabel: 'Log habits',
        });
      }
    }
  }

  // 5. Energy not logged yet (afternoon)
  const hour = new Date().getHours();
  if (hour >= 10 && !state.metrics?.[todayKey()]?.energy) {
    alerts.push({
      id: 'energy-unlogged',
      type: 'info',
      icon: '◈',
      title: "Energy not logged today",
      body: 'Track your energy level to spot patterns over time.',
      action: 'metrics',
      actionLabel: 'Log now',
    });
  }

  return alerts;
}

// ── Type → styles ──────────────────────────────────────────────────────────
const TYPE_STYLES = {
  warning: { bg: 'bg-[var(--fill-amber)] dark:bg-[rgba(245,158,11,0.1)]', border: 'border-amber-200', icon: 'text-amber-500', btn: 'text-amber-700 hover:bg-[var(--fill-amber)]' },
  info:    { bg: 'bg-[var(--fill-indigo)]',                     border: 'border-indigo-100',icon: 'text-[var(--accent-indigo)]', btn: 'text-[var(--accent-indigo)] hover:bg-[var(--fill-indigo)]' },
  nudge:   { bg: 'bg-[var(--fill-emerald)]',                    border: 'border-emerald-100',icon: 'text-[var(--accent-emerald)]', btn: 'text-[var(--accent-emerald)] hover:bg-[var(--fill-emerald)]' },
};

// ── Single alert banner ────────────────────────────────────────────────────
function AlertBanner({ alert, onDismiss, onAction }) {
  const s = TYPE_STYLES[alert.type] ?? TYPE_STYLES.info;
  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-xl border ${s.bg} ${s.border} fade-in`}>
      <span className={`text-base shrink-0 mt-0.5 ${s.icon}`}>{alert.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[var(--text-primary)] leading-tight">{alert.title}</p>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">{alert.body}</p>
        {alert.action && (
          <button
            onClick={() => onAction(alert.action)}
            className={`mt-1.5 text-xs font-semibold ${s.btn} transition-colors px-2 py-0.5 rounded`}
          >
            {alert.actionLabel} →
          </button>
        )}
      </div>
      <button
        onClick={() => onDismiss(alert.id)}
        className="shrink-0 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors text-xs p-0.5 mt-0.5"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}

// ── NotificationBanner ─────────────────────────────────────────────────────
export default function NotificationBanner({ onNavigate }) {
  const { state } = useOS();
  const [dismissed, setDismissed] = useState(new Set());

  const allAlerts = useMemo(() => buildAlerts(state), [state]);
  const visible   = allAlerts.filter(a => !dismissed.has(a.id));

  if (visible.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      {visible.slice(0, 3).map(alert => (
        <AlertBanner
          key={alert.id}
          alert={alert}
          onDismiss={id => setDismissed(d => new Set([...d, id]))}
          onAction={onNavigate}
        />
      ))}
      {visible.length > 3 && (
        <p className="text-[11px] text-[var(--text-muted)] text-center">
          +{visible.length - 3} more alerts
        </p>
      )}
    </div>
  );
}
