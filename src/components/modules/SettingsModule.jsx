import { useState, useEffect } from 'react';
import { useOS } from '../../context/OSContext';
import { useDarkMode } from '../../hooks/useDarkMode';

// ── Default settings shape ─────────────────────────────────────────────────
export const DEFAULT_SETTINGS = {
  name:           '',
  wakeTime:       '07:00',
  sleepTarget:    8,
  reviewDay:      'Friday',
  reviewTime:     '17:00',
  energyLowThreshold: 4,
  focusBlockMins: 90,
  showStreakBadges: true,
  compactSidebar:  false,
  notifyReviewReminder: true,
  notifyHabitStreak: true,
  firstDayOfWeek: 'Monday',
  timeFormat:     '12h',
  dateFormat:     'DD/MM/YYYY',
};

// ── Toggle component ───────────────────────────────────────────────────────
function Toggle({ value, onChange }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={[
        'relative w-10 h-5.5 rounded-full transition-colors shrink-0',
        'flex items-center',
        value ? 'bg-[var(--accent-indigo)]' : 'bg-[var(--surface-inset)]',
      ].join(' ')}
      style={{ height: '22px' }}
    >
      <span
        className="absolute w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-200"
        style={{ left: value ? 'calc(100% - 18px)' : '2px' }}
      />
    </button>
  );
}

// ── Setting row ────────────────────────────────────────────────────────────
function SettingRow({ label, sub, children }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-[var(--border)] last:border-0">
      <div className="min-w-0">
        <p className="text-sm text-[var(--text-primary)] font-medium">{label}</p>
        {sub && <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{sub}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

// ── Section card ───────────────────────────────────────────────────────────
function SettingSection({ title, children }) {
  return (
    <div className="card px-5 py-1">
      <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] pt-3 pb-1">
        {title}
      </p>
      {children}
      <div className="pb-1" />
    </div>
  );
}

// ── SettingsModule ─────────────────────────────────────────────────────────
export default function SettingsModule() {
  const {
    state,
    update,
    signOut,
    syncGoogleCalendar,
    connectGoogleCalendar,
    disconnectGoogleCalendar,
    fetchGoogleCalendars,
    saveGoogleCalendarSelection,
    applyGoogleRecurringImports,
  } = useOS();
  const { dark, toggle: toggleDark } = useDarkMode();

  // Settings live at state.settings
  const settings = { ...DEFAULT_SETTINGS, ...(state.settings ?? {}) };

  const set = (key, value) => {
    update(s => ({ ...s, settings: { ...(s.settings ?? DEFAULT_SETTINGS), [key]: value } }));
  };

  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // ── Notification permission ──────────────────────────────────────────────
  const [notifPerm, setNotifPerm] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );
  const requestNotif = async () => {
    if (typeof Notification === 'undefined') return;
    const perm = await Notification.requestPermission();
    setNotifPerm(perm);
  };

  const [googleEmail, setGoogleEmail] = useState(settings.googleCalendar?.email ?? '');
  const [googleAccessToken, setGoogleAccessToken] = useState('');
  const [googleRefreshToken, setGoogleRefreshToken] = useState('');
  const [googleCalendars, setGoogleCalendars] = useState([]);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);

  const loadCalendars = async () => {
    setGoogleLoading(true);
    setGoogleError('');
    try {
      const rows = await fetchGoogleCalendars();
      setGoogleCalendars(rows);
    } catch (error) {
      setGoogleError(error.message || 'Unable to load calendars');
    } finally {
      setGoogleLoading(false);
    }
  };

  useEffect(() => {
    if (!settings.googleCalendar?.connected) return;
    loadCalendars();
  }, [settings.googleCalendar?.connected]);

  const onConnectGoogle = async () => {
    setGoogleLoading(true);
    setGoogleError('');
    try {
      await connectGoogleCalendar({
        accessToken: googleAccessToken.trim(),
        refreshToken: googleRefreshToken.trim(),
        email: googleEmail.trim(),
      });
      await loadCalendars();
      setGoogleAccessToken('');
      setGoogleRefreshToken('');
    } catch (error) {
      setGoogleError(error.message || 'Unable to connect Google Calendar');
    } finally {
      setGoogleLoading(false);
    }
  };

  const onDisconnectGoogle = async () => {
    setGoogleLoading(true);
    setGoogleError('');
    try {
      await disconnectGoogleCalendar();
      setGoogleCalendars([]);
    } catch (error) {
      setGoogleError(error.message || 'Unable to disconnect Google Calendar');
    } finally {
      setGoogleLoading(false);
    }
  };

  const onToggleCalendar = (calendarId, checked) => {
    const current = settings.googleCalendar?.selectedCalendarIds ?? [];
    const next = checked ? [...new Set([...current, calendarId])] : current.filter((id) => id !== calendarId);
    saveGoogleCalendarSelection(next);
  };

  const onSyncNow = async () => {
    setGoogleLoading(true);
    setGoogleError('');
    try {
      const result = await syncGoogleCalendar({ force: true });
      if ((result?.recurringCandidates ?? []).length > 0) {
        setShowImportModal(true);
      }
    } catch (error) {
      setGoogleError(error.message || 'Google sync failed');
    } finally {
      setGoogleLoading(false);
    }
  };

  const recurringCandidates = state.ui?.pendingGoogleRecurringImports ?? [];

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-lg mx-auto space-y-4 pb-10">

        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Settings</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Personalise your Lifestyle OS</p>
        </div>

        {/* ── Profile ── */}
        <SettingSection title="Profile">
          <SettingRow label="Your name" sub="Used in greetings and exports">
            <input
              type="text"
              value={settings.name}
              onChange={e => set('name', e.target.value)}
              placeholder="Enter your name…"
              className="input-base w-36 text-sm"
            />
          </SettingRow>
        </SettingSection>

        {/* ── Google Calendar ── */}
        <SettingSection title="Google Calendar">
          {!settings.googleCalendar?.connected ? (
            <div className="py-3 space-y-2.5">
              <p className="text-xs text-[var(--text-secondary)]">
                Connect a Google account token pair from your Supabase Google auth session.
              </p>
              <input
                type="email"
                value={googleEmail}
                onChange={(e) => setGoogleEmail(e.target.value)}
                placeholder="Google account email"
                className="input-base w-full text-sm"
              />
              <input
                type="password"
                value={googleAccessToken}
                onChange={(e) => setGoogleAccessToken(e.target.value)}
                placeholder="Google access token"
                className="input-base w-full text-sm"
              />
              <input
                type="password"
                value={googleRefreshToken}
                onChange={(e) => setGoogleRefreshToken(e.target.value)}
                placeholder="Google refresh token"
                className="input-base w-full text-sm"
              />
              <button
                onClick={onConnectGoogle}
                disabled={googleLoading || !googleEmail.trim() || !googleAccessToken.trim() || !googleRefreshToken.trim()}
                className="text-xs px-4 py-2 rounded-xl bg-[var(--sidebar-active)] text-[var(--sidebar-active-text)] hover:opacity-90 disabled:opacity-60"
              >
                {googleLoading ? 'Connecting...' : 'Connect Google Calendar'}
              </button>
            </div>
          ) : (
            <>
              <SettingRow
                label="Connected account"
                sub={settings.googleCalendar?.lastSyncedAt ? `Last synced ${new Date(settings.googleCalendar.lastSyncedAt).toLocaleString()}` : 'Not synced yet'}
              >
                <span className="text-xs text-[var(--text-muted)]">{settings.googleCalendar?.email || 'Connected'}</span>
              </SettingRow>
              <div className="py-3 space-y-2.5">
                <p className="text-xs text-[var(--text-secondary)]">Calendars to include</p>
                {googleCalendars.length === 0 ? (
                  <p className="text-[11px] text-[var(--text-muted)]">No calendars loaded.</p>
                ) : (
                  <div className="space-y-1">
                    {googleCalendars.map((calendar) => {
                      const selected = (settings.googleCalendar?.selectedCalendarIds ?? []).includes(calendar.id);
                      return (
                        <label key={calendar.id} className="flex items-center justify-between gap-3 text-xs text-[var(--text-primary)]">
                          <span className="truncate">{calendar.summary}</span>
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={(e) => onToggleCalendar(calendar.id, e.target.checked)}
                          />
                        </label>
                      );
                    })}
                  </div>
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    onClick={onSyncNow}
                    disabled={googleLoading}
                    className="text-xs px-3 py-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--surface-inset)] disabled:opacity-60"
                  >
                    {googleLoading ? 'Syncing...' : 'Force Sync'}
                  </button>
                  <button
                    onClick={onDisconnectGoogle}
                    disabled={googleLoading}
                    className="text-xs px-3 py-1.5 rounded-lg border border-red-100 text-red-500 hover:bg-[var(--fill-red)] disabled:opacity-60"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            </>
          )}
          {googleError ? <p className="text-[11px] text-red-500 pb-2">{googleError}</p> : null}
        </SettingSection>

        {/* ── Schedule ── */}
        <SettingSection title="Daily schedule">
          <SettingRow label="Wake time" sub="Used to anchor your morning block">
            <input
              type="time"
              value={settings.wakeTime}
              onChange={e => set('wakeTime', e.target.value)}
              className="input-base w-28 text-sm"
            />
          </SettingRow>
          <SettingRow label="Sleep target" sub="Your nightly goal in hours">
            <div className="flex items-center gap-2">
              <input
                type="range" min={5} max={10} step={0.5}
                value={settings.sleepTarget}
                onChange={e => set('sleepTarget', parseFloat(e.target.value))}
                className="w-24 accent-[var(--accent-indigo)]"
              />
              <span className="text-sm text-[var(--text-primary)] tabular-nums w-8">
                {settings.sleepTarget}h
              </span>
            </div>
          </SettingRow>
          <SettingRow label="Weekly review day" sub="When you get your review reminder">
            <select
              value={settings.reviewDay}
              onChange={e => set('reviewDay', e.target.value)}
              className="input-base w-28 text-sm"
            >
              {DAYS.map(d => <option key={d}>{d}</option>)}
            </select>
          </SettingRow>
          <SettingRow label="First day of week" sub="Calendar display preference">
            <select
              value={settings.firstDayOfWeek}
              onChange={e => set('firstDayOfWeek', e.target.value)}
              className="input-base w-28 text-sm"
            >
              <option>Monday</option>
              <option>Sunday</option>
            </select>
          </SettingRow>
        </SettingSection>

        {/* ── Focus & energy ── */}
        <SettingSection title="Focus & energy">
          <SettingRow label="Default focus block" sub="Minutes for new cycle blocks">
            <div className="flex items-center gap-2">
              <input
                type="range" min={25} max={180} step={5}
                value={settings.focusBlockMins}
                onChange={e => set('focusBlockMins', parseInt(e.target.value))}
                className="w-24 accent-[var(--accent-indigo)]"
              />
              <span className="text-sm text-[var(--text-primary)] tabular-nums w-10">
                {settings.focusBlockMins}m
              </span>
            </div>
          </SettingRow>
          <SettingRow label="Low-energy threshold" sub="Show protocol below this energy level">
            <div className="flex items-center gap-1">
              {[1,2,3,4,5].map(n => (
                <button
                  key={n}
                  onClick={() => set('energyLowThreshold', n)}
                  className={`w-7 h-7 rounded-lg text-xs font-bold transition-all
                    ${settings.energyLowThreshold === n
                      ? 'bg-[var(--fill-red)]0 text-white'
                      : 'bg-[var(--surface-inset)] text-[var(--text-muted)] hover:bg-[var(--border)]'}`}
                >
                  {n}
                </button>
              ))}
            </div>
          </SettingRow>
        </SettingSection>

        {/* ── Appearance ── */}
        <SettingSection title="Appearance">
          <SettingRow label="Dark mode" sub="Currently {dark ? 'on' : 'off'}">
            <Toggle value={dark} onChange={toggleDark} />
          </SettingRow>
          <SettingRow label="Streak badges" sub="Show habit streak counts in lists">
            <Toggle value={settings.showStreakBadges} onChange={v => set('showStreakBadges', v)} />
          </SettingRow>
          <SettingRow label="Time format" sub="12-hour or 24-hour clock">
            <div className="flex gap-1">
              {['12h','24h'].map(f => (
                <button key={f} onClick={() => set('timeFormat', f)}
                  className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-all
                    ${settings.timeFormat === f
                      ? 'bg-[var(--sidebar-active)] text-[var(--sidebar-active-text)] border-[var(--sidebar-active)]'
                      : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)]'}`}>
                  {f}
                </button>
              ))}
            </div>
          </SettingRow>
        </SettingSection>

        {/* ── Notifications ── */}
        <SettingSection title="Notifications">
          {notifPerm !== 'granted' ? (
            <div className="py-3">
              <p className="text-xs text-[var(--text-secondary)] mb-2">
                Enable browser notifications to get session alerts and reminders.
              </p>
              <button
                onClick={requestNotif}
                className="text-xs px-4 py-2 rounded-xl bg-[var(--sidebar-active)] text-[var(--sidebar-active-text)] hover:opacity-90 transition-opacity"
              >
                Enable notifications
              </button>
              {notifPerm === 'denied' && (
                <p className="text-[11px] text-red-400 mt-2">
                  Blocked in browser settings. Update via browser → Site settings.
                </p>
              )}
            </div>
          ) : (
            <>
              <SettingRow label="Review reminder" sub={`Remind on ${settings.reviewDay} evenings`}>
                <Toggle value={settings.notifyReviewReminder} onChange={v => set('notifyReviewReminder', v)} />
              </SettingRow>
              <SettingRow label="Habit streaks" sub="Remind if no habits logged by evening">
                <Toggle value={settings.notifyHabitStreak} onChange={v => set('notifyHabitStreak', v)} />
              </SettingRow>
            </>
          )}
        </SettingSection>

        {/* ── About ── */}
        <SettingSection title="About">
          <SettingRow label="Version" sub="">
            <span className="text-xs text-[var(--text-muted)] font-mono">v1.0.0</span>
          </SettingRow>
          <SettingRow label="Storage" sub="Data saved in browser localStorage">
            <span className="text-xs text-[var(--text-muted)]">localStorage · v5</span>
          </SettingRow>
          <div className="py-2">
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Lifestyle OS — a personal operating system built with React, Tailwind CSS, and care.
              Data syncs through your PostgreSQL-backed API and is scoped to your account.
            </p>
          </div>
          <div className="py-2">
            <button
              onClick={signOut}
              className="text-xs px-4 py-2 rounded-xl border border-red-100 text-red-500 hover:bg-[var(--fill-red)] transition-colors"
            >
              Sign out
            </button>
          </div>
        </SettingSection>

      </div>

      {showImportModal ? (
        <div className="fixed inset-0 bg-black/30 z-40 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[var(--surface-raised)] border border-[var(--border)] rounded-2xl p-5 space-y-3">
            <p className="text-sm font-semibold text-[var(--text-primary)]">Review & Import Recurring Events</p>
            <p className="text-xs text-[var(--text-muted)]">Confirm before writing recurring Google commitments into Week A/B/C templates.</p>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {recurringCandidates.map((event) => {
                const cadence = event.cadence?.interval === 1 ? 'every week' : `every ${event.cadence?.interval || '?'} weeks`;
                return (
                  <div key={event.google_event_id} className="rounded-xl border border-[var(--border)] px-3 py-2">
                    <p className="text-sm text-[var(--text-primary)]">{event.summary}</p>
                    <p className="text-[11px] text-[var(--text-muted)]">{cadence} · starts {new Date(event.start_time).toLocaleString()}</p>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-[var(--text-secondary)]">We found recurring events. Add detected cadence slots into your templates?</p>
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setShowImportModal(false)}
                className="text-xs px-3 py-1.5 rounded-lg border border-[var(--border)]"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  applyGoogleRecurringImports();
                  setShowImportModal(false);
                }}
                className="text-xs px-3 py-1.5 rounded-lg bg-[var(--sidebar-active)] text-[var(--sidebar-active-text)]"
              >
                Confirm Import
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
