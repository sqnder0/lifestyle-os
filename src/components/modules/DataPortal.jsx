import { useState } from 'react';
import { useOS } from '../../context/OSContext';

// ── Storage size estimate ──────────────────────────────────────────────────
function bytesToKB(bytes) { return (bytes / 1024).toFixed(1); }

function getStorageSize(key) {
  try {
    const raw = localStorage.getItem(key) ?? '';
    return new Blob([raw]).size;
  } catch { return 0; }
}

// ── Section ────────────────────────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div className="card px-5 py-4 space-y-4">
      <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">{title}</h3>
      {children}
    </div>
  );
}

// ── Stat row ───────────────────────────────────────────────────────────────
function StatRow({ label, value, sub }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-[var(--border)] last:border-0">
      <span className="text-sm text-[var(--text-secondary)]">{label}</span>
      <div className="text-right">
        <span className="text-sm font-semibold text-[var(--text-primary)] tabular-nums">{value}</span>
        {sub && <span className="text-xs text-[var(--text-muted)] ml-2">{sub}</span>}
      </div>
    </div>
  );
}

// ── DataPortal ─────────────────────────────────────────────────────────────
export default function DataPortal() {
  const { state, resetToSeed } = useOS();
  const [importDraft, setImportDraft] = useState('');
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const storageKey  = 'lifestyle-os-v5';
  const storageSize = getStorageSize(storageKey);

  // ── Derived stats ──────────────────────────────────────────────────────
  const stats = {
    projects:   Object.keys(state.projects ?? {}).length,
    tasks:      Object.keys(state.tasks ?? {}).length,
    tasksDone:  Object.values(state.tasks ?? {}).filter(t => t.status === 'Done').length,
    inbox:      (state.capture ?? []).length,
    contacts:   Object.keys(state.crm ?? {}).length,
    principles: Object.keys(state.principles ?? {}).length,
    reviews:    Object.keys(state.reviews ?? {}).length,
    habits:     Object.keys(state.habits ?? {}).length,
    metricDays: Object.keys(state.metrics ?? {}).length,
    workouts:   state.reference?.workoutLibrary?.length ?? 0,
    mealProtocols: state.reference?.mealProtocols?.length ?? 0,
    pantryItems: state.reference?.pantryEssentials?.length ?? 0,
  };

  // ── Export ─────────────────────────────────────────────────────────────
  const handleExport = () => {
    const json = JSON.stringify(state, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `lifestyle-os-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Copy to clipboard ──────────────────────────────────────────────────
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(state, null, 2))
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })
      .catch(() => {});
  };

  // ── Import ─────────────────────────────────────────────────────────────
  const handleImport = () => {
    try {
      const parsed = JSON.parse(importDraft);
      if (typeof parsed !== 'object' || parsed === null) throw new Error('Root must be an object');
      // Write directly to localStorage — user must refresh
      localStorage.setItem(storageKey, JSON.stringify(parsed));
      setImportSuccess(true);
      setImportError('');
      setTimeout(() => window.location.reload(), 1200);
    } catch (e) {
      setImportError(e.message);
    }
  };

  // ── Import from file ───────────────────────────────────────────────────
  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setImportDraft(ev.target?.result ?? '');
    reader.readAsText(file);
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-xl mx-auto space-y-4 pb-10">

        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Data & Storage</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Export, import, or inspect your Lifestyle OS data
          </p>
        </div>

        {/* ── Stats ── */}
        <Section title="What's stored">
          <StatRow label="Projects"         value={stats.projects} />
          <StatRow label="Tasks"            value={stats.tasks} sub={`${stats.tasksDone} done`} />
          <StatRow label="Inbox items"      value={stats.inbox} />
          <StatRow label="Contacts"         value={stats.contacts} />
          <StatRow label="Habits"           value={stats.habits} />
          <StatRow label="Principles"       value={stats.principles} />
          <StatRow label="Workouts"         value={stats.workouts} />
          <StatRow label="Meal protocols"   value={stats.mealProtocols} />
          <StatRow label="Pantry items"     value={stats.pantryItems} />
          <StatRow label="Metric days"      value={stats.metricDays} />
          <StatRow label="Weekly reviews"   value={stats.reviews} />
          <StatRow label="Storage used"     value={`${bytesToKB(storageSize)} KB`} sub="localStorage" />
        </Section>

        {/* ── Export ── */}
        <Section title="Export">
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Download your complete OS state as a JSON file. Use this for backups
            or to move data between browsers.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              className="flex-1 text-sm font-medium py-2.5 rounded-xl bg-[var(--sidebar-active)] text-[var(--sidebar-active-text)] hover:opacity-90 transition-opacity"
            >
              ↓ Download JSON
            </button>
            <button
              onClick={handleCopy}
              className="px-4 text-sm border border-[var(--border)] rounded-xl hover:bg-[var(--surface-inset)] transition-colors"
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
        </Section>

        {/* ── Import ── */}
        <Section title="Import">
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Paste a JSON export below or load a file. The page will reload after import.
          </p>

          {/* File picker */}
          <label className="flex items-center gap-2 text-xs text-[var(--accent-indigo)] cursor-pointer hover:underline">
            <input type="file" accept=".json,application/json" onChange={handleFile} className="hidden" />
            📁 Load from file…
          </label>

          <textarea
            value={importDraft}
            onChange={e => { setImportDraft(e.target.value); setImportError(''); setImportSuccess(false); }}
            placeholder='Paste exported JSON here…'
            rows={5}
            className="textarea-base font-mono text-xs"
          />

          {importError && (
            <p className="text-xs text-red-500 bg-[var(--fill-red)] px-3 py-2 rounded-lg border border-red-100">
              ✕ {importError}
            </p>
          )}
          {importSuccess && (
            <p className="text-xs text-emerald-600 bg-[var(--fill-emerald)] px-3 py-2 rounded-lg border border-emerald-100">
              ✓ Imported — reloading…
            </p>
          )}

          <button
            onClick={handleImport}
            disabled={!importDraft.trim()}
            className="w-full text-sm font-medium py-2.5 rounded-xl bg-[var(--sidebar-active)] text-[var(--sidebar-active-text)] hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Import & reload
          </button>
        </Section>

        {/* ── Danger zone ── */}
        <Section title="Reset">
          {!confirmReset ? (
            <div className="space-y-2">
              <p className="text-xs text-[var(--text-secondary)]">
                Reset all data to the built-in demo state. This cannot be undone.
              </p>
              <button
                onClick={() => setConfirmReset(true)}
                className="text-sm text-red-500 border border-red-100 hover:bg-[var(--fill-red)] transition-colors px-4 py-2 rounded-xl w-full"
              >
                Reset to demo data…
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-red-500">Are you sure? All your data will be lost.</p>
              <div className="flex gap-2">
                <button
                  onClick={() => { resetToSeed(); setConfirmReset(false); }}
                  className="flex-1 text-sm font-medium py-2 rounded-xl bg-[var(--fill-red)]0 text-white hover:bg-red-600 transition-colors"
                >
                  Yes, reset everything
                </button>
                <button
                  onClick={() => setConfirmReset(false)}
                  className="px-4 text-sm border border-[var(--border)] rounded-xl hover:bg-[var(--surface-inset)] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}
