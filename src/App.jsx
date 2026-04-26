import { useState, useCallback, useEffect } from 'react';
import { useKeyboard } from './hooks/useKeyboard';
import CommandPalette from './components/modules/CommandPalette';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { OSProvider, useOS } from './context/OSContext';
import { useDarkMode } from './hooks/useDarkMode';
import { useSupabaseAuth } from './hooks/useSupabaseAuth';
import { Settings as SettingsIcon } from 'lucide-react';

// ── Module imports ─────────────────────────────────────────────────────────
import DashboardModule    from './components/modules/DashboardModule';
import CaptureModule      from './components/modules/CaptureModule';
import CycleModule        from './components/modules/CycleModule';
import MetricsModule      from './components/modules/MetricsModule';
import PrinciplesModule   from './components/modules/PrinciplesModule';
import WeeklyReviewModule from './components/modules/WeeklyReviewModule';
import HabitsModule     from './components/modules/HabitsModule';
import HealthModule     from './components/modules/ReferenceModule';
import SettingsModule  from './components/modules/SettingsModule';
import JournalModule   from './components/modules/JournalModule';
import OnboardingFlow  from './components/modules/OnboardingFlow';
import AuthScreen      from './components/modules/AuthScreen';

// ── Module registry ────────────────────────────────────────────────────────
const CORE_MODULES = [
  { id: 'dashboard', label: 'Dashboard',  icon: '⌂',  Component: DashboardModule  },
  { id: 'capture',   label: 'Inbox',      icon: '↓',  Component: CaptureModule    },
  { id: 'cycles',    label: 'Cycles',     icon: '↻',  Component: CycleModule      },
  { id: 'metrics',   label: 'Metrics',    icon: '◈',  Component: MetricsModule    },
  { id: 'health',    label: 'Health',     icon: '▣',  Component: HealthModule  },
  { id: 'principles', label: 'Principles', icon: '✦', Component: PrinciplesModule },
];
const SYSTEM_MODULES = [
  { id: 'review',     label: 'Weekly Review',  icon: '✐', Component: WeeklyReviewModule },
  { id: 'habits',     label: 'Habits',         icon: '◐', Component: HabitsModule       },
  { id: 'journal',    label: 'Journal',        icon: '✎', Component: JournalModule      },
];
const HIDDEN_MODULES = [
  { id: 'settings', label: 'Settings', icon: '◧', Component: SettingsModule },
];
const ALL_MODULES = [...CORE_MODULES, ...SYSTEM_MODULES, ...HIDDEN_MODULES];

// Bottom nav shows only primary 5
const BOTTOM_NAV_IDS = ['dashboard', 'capture', 'cycles', 'health', 'principles'];

// ── SVG icons ──────────────────────────────────────────────────────────────
const SunIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);
const MoonIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);
const HamburgerIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="3" y1="6" x2="21" y2="6"/>
    <line x1="3" y1="12" x2="21" y2="12"/>
    <line x1="3" y1="18" x2="21" y2="18"/>
  </svg>
);
const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

// ── useBadges ──────────────────────────────────────────────────────────────
function useBadges(state) {
  return {
    capture: state.capture?.filter((c) => !c.processed).length ?? 0,
  };
}

// ── NavButton (shared by sidebar + drawer) ─────────────────────────────────
function NavButton({ mod, active, badge, onClick, compact = false }) {
  return (
    <button
      onClick={() => onClick(mod.id)}
      title={compact ? mod.label : undefined}
      className={[
        'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium',
        'transition-colors duration-100 group relative',
        active
          ? 'bg-[var(--sidebar-active)] text-[var(--sidebar-active-text)]'
          : 'text-[var(--text-secondary)] hover:bg-[var(--surface-inset)] hover:text-[var(--text-primary)]',
      ].join(' ')}
    >
      <span className={`text-base leading-none shrink-0 ${compact ? 'mx-auto' : ''}`}>
        {mod.icon}
      </span>
      {!compact && (
        <>
          <span className="flex-1 text-left truncate">{mod.label}</span>
          {badge > 0 && (
            <span className={[
              'text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none shrink-0',
              active ? 'bg-white/20 text-white' : 'bg-[var(--surface-inset)] text-[var(--text-muted)]',
            ].join(' ')}>
              {badge}
            </span>
          )}
        </>
      )}
      {compact && badge > 0 && (
        <span className="absolute top-1 right-1 w-2 h-2 bg-[var(--accent-indigo)] rounded-full" />
      )}
      {/* Icon-mode tooltip */}
      {compact && (
        <span className={[
          'absolute left-full ml-2 px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap z-50',
          'bg-[var(--text-primary)] text-[var(--surface)]',
          'opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none',
        ].join(' ')}>
          {mod.label}
          {badge > 0 && <span className="ml-1.5 opacity-60">({badge})</span>}
        </span>
      )}
    </button>
  );
}

// ── SectionDivider ─────────────────────────────────────────────────────────
function SectionDivider({ label, compact }) {
  return (
    <div className="pt-1 pb-0.5">
      <div className="border-t border-[var(--border)] mb-1.5" />
      {!compact && label && (
        <p className="px-3 pb-0.5 text-[10px] font-bold tracking-widest text-[var(--text-muted)] uppercase">
          {label}
        </p>
      )}
    </div>
  );
}

// ── DesktopSidebar ─────────────────────────────────────────────────────────
function DesktopSidebar({ activeModule, badges, onNavigate, dark, onDarkToggle }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={[
      'hidden md:flex flex-col shrink-0 h-full',
      'bg-[var(--sidebar-bg)] border-r border-[var(--border)]',
      'transition-[width] duration-200',
      collapsed ? 'w-14' : 'w-52',
    ].join(' ')}>

      {/* Logo + collapse toggle */}
      <div className={`flex items-center px-3 pt-5 pb-3 ${collapsed ? 'justify-center' : 'justify-between'}`}>
        {!collapsed && (
          <span className="text-[10px] font-black tracking-[0.25em] text-[var(--text-muted)] uppercase select-none">
            OS
          </span>
        )}
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-inset)] transition-colors"
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          <HamburgerIcon />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-1 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {CORE_MODULES.map((m) => (
          <NavButton key={m.id} mod={m} active={activeModule === m.id}
            badge={badges[m.id] ?? 0} onClick={onNavigate} compact={collapsed} />
        ))}
        <SectionDivider label="Systems" compact={collapsed} />
        {SYSTEM_MODULES.map((m) => (
          <NavButton key={m.id} mod={m} active={activeModule === m.id}
            badge={0} onClick={onNavigate} compact={collapsed} />
        ))}
      </nav>

      {/* Footer */}
      <div className="px-2 py-3 border-t border-[var(--border)] space-y-0.5">
        <button
          onClick={onDarkToggle}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm
                     text-[var(--text-muted)] hover:text-[var(--text-primary)]
                     hover:bg-[var(--surface-inset)] transition-colors"
          title={dark ? 'Light mode' : 'Dark mode'}
        >
          <span className="shrink-0">{dark ? <SunIcon /> : <MoonIcon />}</span>
          {!collapsed && <span className="text-sm">{dark ? 'Light mode' : 'Dark mode'}</span>}
        </button>
      </div>
    </aside>
  );
}

// ── MobileHeader ───────────────────────────────────────────────────────────
function MobileHeader({ label, dark, onDarkToggle, onMenuOpen, onSearchOpen, onSettingsOpen }) {
  return (
    <header className="md:hidden shrink-0 flex items-center justify-between px-4 py-3
                       bg-[var(--sidebar-bg)] border-b border-[var(--border)]">
      <span className="text-[10px] font-black tracking-[0.25em] text-[var(--text-muted)] uppercase select-none">
        OS
      </span>
      <span className="text-sm font-semibold text-[var(--text-primary)] absolute left-1/2 -translate-x-1/2">
        {label}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={onDarkToggle}
          className="p-2 rounded-xl text-[var(--text-muted)] hover:bg-[var(--surface-inset)] transition-colors"
        >
          {dark ? <SunIcon /> : <MoonIcon />}
        </button>
        <button
          onClick={onSearchOpen}
          className="p-2 rounded-xl text-[var(--text-muted)] hover:bg-[var(--surface-inset)] transition-colors"
          aria-label="Search"
        >
          <span className="text-sm">⌘</span>
        </button>
        <button
          onClick={onSettingsOpen}
          className="p-2 rounded-xl text-[var(--text-muted)] hover:bg-[var(--surface-inset)] transition-colors"
          aria-label="Open settings"
        >
          <SettingsIcon size={16} />
        </button>
        <button
          onClick={onMenuOpen}
          className="p-2 rounded-xl text-[var(--text-muted)] hover:bg-[var(--surface-inset)] transition-colors"
          aria-label="Open menu"
        >
          <HamburgerIcon />
        </button>
      </div>
    </header>
  );
}

// ── DesktopTopBar ──────────────────────────────────────────────────────────
function DesktopTopBar({ label, dark, onDarkToggle, onSearchOpen, onSettingsOpen }) {
  return (
    <header className="hidden md:flex shrink-0 items-center gap-3 px-6 py-3
                       bg-[var(--surface)] border-b border-[var(--border)]">
      <span className="flex-1 text-sm font-semibold text-[var(--text-primary)]">{label}</span>
      <button
        onClick={onSearchOpen}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-inset)] hover:text-[var(--text-primary)] transition-colors text-xs"
        title="Search (⌘K)"
      >
        <span>⌘K</span>
        <span className="hidden lg:inline">Search</span>
      </button>
      <button
        onClick={onDarkToggle}
        className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)]
                   hover:bg-[var(--surface-inset)] transition-colors"
        title={dark ? 'Light mode' : 'Dark mode'}
      >
        {dark ? <SunIcon /> : <MoonIcon />}
      </button>
      <button
        onClick={onSettingsOpen}
        className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)]
                   hover:bg-[var(--surface-inset)] transition-colors"
        title="Settings"
      >
        <SettingsIcon size={16} />
      </button>
    </header>
  );
}

// ── MobileBottomNav ────────────────────────────────────────────────────────
function MobileBottomNav({ activeModule, badges, onNavigate }) {
  const mods = ALL_MODULES.filter((m) => BOTTOM_NAV_IDS.includes(m.id));
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bottom-nav
                    bg-[var(--sidebar-bg)] border-t border-[var(--border)]
                    flex items-stretch">
      {mods.map((m) => {
        const active = activeModule === m.id;
        const badge  = badges[m.id] ?? 0;
        return (
          <button
            key={m.id}
            onClick={() => onNavigate(m.id)}
            className={[
              'flex-1 flex flex-col items-center justify-center gap-0.5 py-2',
              'text-[10px] font-semibold transition-colors relative',
              active ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]',
            ].join(' ')}
          >
            {/* Active pip */}
            {active && (
              <span className="absolute top-1.5 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-[var(--accent-indigo)] rounded-full" />
            )}
            <span className="text-lg leading-none">{m.icon}</span>
            <span>{m.label}</span>
            {badge > 0 && (
              <span className="absolute top-2 right-1/4 translate-x-2/3 min-w-[14px] h-3.5 px-1
                               text-[9px] font-black leading-none flex items-center justify-center
                               bg-[var(--accent-indigo)] text-white rounded-full">
                {badge > 9 ? '9+' : badge}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}

// ── MobileDrawer ────────────────────────────────────────────────────────────
function MobileDrawer({ open, activeModule, badges, onNavigate, dark, onDarkToggle, onClose }) {
  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={[
          'md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-200',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        ].join(' ')}
        onClick={onClose}
        aria-hidden
      />
      {/* Panel */}
      <div className={[
        'md:hidden fixed top-0 right-0 bottom-0 z-50 w-72 flex flex-col',
        'bg-[var(--sidebar-bg)] border-l border-[var(--border)]',
        'transition-transform duration-250 ease-[cubic-bezier(0.16,1,0.3,1)]',
        open ? 'translate-x-0' : 'translate-x-full',
      ].join(' ')}>
        {/* Drawer header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-[var(--border)]">
          <span className="text-[10px] font-black tracking-[0.25em] text-[var(--text-muted)] uppercase">
            Lifestyle OS
          </span>
          <button onClick={onClose}
            className="p-2 rounded-xl text-[var(--text-muted)] hover:bg-[var(--surface-inset)] transition-colors"
            aria-label="Close menu">
            <CloseIcon />
          </button>
        </div>

        {/* All modules */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
          {CORE_MODULES.map((m) => (
            <NavButton key={m.id} mod={m} active={activeModule === m.id}
              badge={badges[m.id] ?? 0}
              onClick={(id) => { onNavigate(id); onClose(); }}
              compact={false} />
          ))}
          <SectionDivider label="Systems" compact={false} />
          {SYSTEM_MODULES.map((m) => (
            <NavButton key={m.id} mod={m} active={activeModule === m.id}
              badge={0}
              onClick={(id) => { onNavigate(id); onClose(); }}
              compact={false} />
          ))}
        </nav>

        {/* Drawer footer */}
        <div className="px-3 py-4 border-t border-[var(--border)] space-y-0.5
                        pb-[max(env(safe-area-inset-bottom,0px),16px)]">
          <button onClick={onDarkToggle}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm
                       text-[var(--text-muted)] hover:text-[var(--text-primary)]
                       hover:bg-[var(--surface-inset)] transition-colors">
            <span className="shrink-0">{dark ? <SunIcon /> : <MoonIcon />}</span>
            <span>{dark ? 'Light mode' : 'Dark mode'}</span>
          </button>
        </div>
      </div>
    </>
  );
}

// ── AppShell ───────────────────────────────────────────────────────────────
function AppShell() {
  const { state, syncLoading, setActiveModule } = useOS();
  const { dark, toggle: toggleDark } = useDarkMode();
  const [drawerOpen, setDrawerOpen]   = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [pageKey, setPageKey]       = useState(0);

  const { activeModule } = state.ui;

  // ── Global keyboard shortcuts ──────────────────────────────────────
  useKeyboard({
    'cmd+k':     () => setPaletteOpen(v => !v),
    'escape':    () => { setPaletteOpen(false); setDrawerOpen(false); },
    'g d':       () => navigate('dashboard'),
    'g i':       () => navigate('capture'),
    'g c':       () => navigate('cycles'),
    'g p':       () => navigate('principles'),
    'g m':       () => navigate('metrics'),
    'g h':       () => navigate('health'),
    'g w':       () => navigate('review'),
    'cmd+,':     () => navigate('settings'),
    'g j':       () => navigate('journal'),
  });
  const badges = useBadges(state);

  const ActiveComponent = ALL_MODULES.find((m) => m.id === activeModule)?.Component
    ?? ALL_MODULES[0].Component;
  const activeLabel = ALL_MODULES.find((m) => m.id === activeModule)?.label ?? '';

  const navigate = useCallback((id) => {
    if (id === activeModule) return;
    setActiveModule(id);
    setPageKey((k) => k + 1);
  }, [activeModule, setActiveModule]);

  if (syncLoading) {
    return (
      <div className="min-h-screen bg-[var(--surface-page)] flex items-center justify-center">
        <p className="text-sm text-[var(--text-muted)]">Syncing your workspace...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[var(--surface-page)] text-[var(--text-primary)] antialiased overflow-hidden">

      {/* Desktop sidebar */}
      <DesktopSidebar
        activeModule={activeModule}
        badges={badges}
        onNavigate={navigate}
        dark={dark}
        onDarkToggle={toggleDark}
      />

      {/* Main column */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Headers (one visible at a time) */}
        <DesktopTopBar
          label={activeLabel}
          dark={dark}
          onDarkToggle={toggleDark}
          onSearchOpen={() => setPaletteOpen(true)}
          onSettingsOpen={() => navigate('settings')}
        />
        <MobileHeader
          label={activeLabel}
          dark={dark}
          onDarkToggle={toggleDark}
          onMenuOpen={() => setDrawerOpen(true)}
          onSearchOpen={() => setPaletteOpen(true)}
          onSettingsOpen={() => navigate('settings')}
        />

        {/* Page */}
        <main className="flex-1 overflow-hidden">
          {/* pb-20 on mobile clears the bottom nav */}
          <div key={pageKey} className="page-enter h-full overflow-hidden p-4 md:p-6 pb-20 md:pb-6 overflow-y-auto">
            <ActiveComponent />
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <MobileBottomNav
        activeModule={activeModule}
        badges={badges}
        onNavigate={navigate}
      />

      {/* Command palette */}
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} onNavigate={navigate} />

      {/* Mobile drawer */}
      <MobileDrawer
        open={drawerOpen}
        activeModule={activeModule}
        badges={badges}
        onNavigate={navigate}
        dark={dark}
        onDarkToggle={toggleDark}
        onClose={() => setDrawerOpen(false)}
      />

      {/* PWA Install Prompt */}
      <PWAInstallPrompt />
    </div>
  );
}

function AuthenticatedWorkspace({ onboardedFromProfile }) {
  const { syncLoading } = useOS();

  if (syncLoading) {
    return (
      <div className="min-h-screen bg-[var(--surface-page)] flex items-center justify-center">
        <p className="text-sm text-[var(--text-muted)]">Syncing your workspace...</p>
      </div>
    );
  }

  if (onboardedFromProfile) {
    return <AppShell />;
  }

  return <OnboardingFlow />;
}

// ── Root ───────────────────────────────────────────────────────────────────
export default function App() {
  const auth = useSupabaseAuth();

  if (auth.loading || auth.profileLoading) {
    return (
      <div className="min-h-screen bg-[var(--surface-page)] flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-[10px] font-black tracking-[0.25em] text-[var(--text-muted)] uppercase">OS</p>
          <p className="text-sm text-[var(--text-muted)]">Initializing OS...</p>
        </div>
      </div>
    );
  }

  if (!auth.session) {
    return (
      <AuthScreen
        onGoogleSignIn={auth.signInWithGoogle}
        loading={auth.loading}
        errorMessage={auth.authError}
      />
    );
  }

  return (
    <OSProvider auth={auth}>
      <AuthenticatedWorkspace onboardedFromProfile={Boolean(auth.profile?.onboarded)} />
    </OSProvider>
  );
}
