import { useState } from 'react';
import { useOS } from '../../context/OSContext';
import { initials, formatRelative } from '../../utils/helpers';

// ── Urgency helpers ────────────────────────────────────────────────────────
const urgencyMeta = (days) => {
  if (days === Infinity) return { label: 'Never contacted', color: 'text-red-500',   dot: 'bg-red-400',   bar: 'bg-red-100'   };
  if (days > 60)         return { label: `${days}d ago`,    color: 'text-red-400',   dot: 'bg-red-300',   bar: 'bg-[var(--fill-red)]'    };
  if (days > 30)         return { label: `${days}d ago`,    color: 'text-amber-500', dot: 'bg-amber-400', bar: 'bg-[var(--fill-amber)]'  };
  if (days > 14)         return { label: `${days}d ago`,    color: 'text-yellow-500',dot: 'bg-yellow-400',bar: 'bg-yellow-50' };
  return                          { label: formatRelative(null), color: 'text-emerald-500', dot: 'bg-emerald-400', bar: 'bg-[var(--fill-emerald)]' };
};

// Hardcode urgency label properly
const urgencyLabel = (days) => {
  if (days === Infinity) return 'Never';
  if (days === 0)        return 'Today';
  if (days === 1)        return 'Yesterday';
  return `${days}d ago`;
};

// ── Avatar circle ──────────────────────────────────────────────────────────
function Avatar({ name, size = 'md' }) {
  const sizeClass = size === 'sm' ? 'w-7 h-7 text-[11px]' : 'w-10 h-10 text-sm';
  // Deterministic color from name
  const hue = [...name].reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center font-semibold shrink-0`}
      style={{ background: `hsl(${hue},55%,88%)`, color: `hsl(${hue},45%,35%)` }}
    >
      {initials(name)}
    </div>
  );
}

// ── Tag pill ───────────────────────────────────────────────────────────────
function TagPill({ tag, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`text-[11px] px-2.5 py-0.5 rounded-full border font-medium transition-all
        ${selected
          ? 'bg-[var(--sidebar-active)] text-[var(--sidebar-active-text)] border-[var(--text-primary)]'
          : 'bg-[var(--surface-raised)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--border-strong)]'}`}
    >
      {tag}
    </button>
  );
}

// ── Contact card ───────────────────────────────────────────────────────────
function ContactCard({ contact, days, onTouch, onDelete, onUpdate }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing]   = useState(false);
  const [noteDraft, setNote]    = useState(contact.notes);
  const meta = urgencyMeta(days);

  return (
    <div className={`bg-[var(--surface-raised)] rounded-2xl border transition-all ${meta.bar}`}
      style={{ borderColor: 'rgb(244,244,245)' }}>
      {/* Main row */}
      <div className="flex items-center gap-3 px-4 py-3">
        <Avatar name={contact.name} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-[var(--text-primary)] leading-tight">{contact.name}</p>
            {contact.tags.map((tag) => (
              <span key={tag} className="text-[10px] bg-[var(--surface-inset)] text-[var(--text-secondary)] px-2 py-0.5 rounded-full">
                {tag}
              </span>
            ))}
          </div>
          <p className={`text-[11px] mt-0.5 font-medium ${meta.color}`}>
            {urgencyLabel(days)}
            {days !== Infinity && days > 14 && ' — overdue'}
          </p>
        </div>

        {/* Touch button */}
        <button
          onClick={() => onTouch(contact.id)}
          title="Mark contacted today"
          className="shrink-0 text-xs px-3 py-1.5 border border-[var(--border)] rounded-xl text-[var(--text-secondary)]
                     hover:bg-[var(--fill-emerald)] hover:border-emerald-200 hover:text-emerald-600 transition-all font-medium"
        >
          ✓ Touch
        </button>

        <button
          onClick={() => setExpanded((v) => !v)}
          className="p-1.5 rounded-lg hover:bg-[var(--surface-inset)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors text-xs shrink-0"
        >
          {expanded ? '▲' : '▼'}
        </button>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-[var(--border)] pt-3 space-y-3">
          {contact.email && (
            <p className="text-xs text-[var(--text-secondary)]">
              <span className="text-[var(--text-muted)] mr-2">Email</span>
              <a href={`mailto:${contact.email}`} className="hover:text-indigo-600 transition-colors">
                {contact.email}
              </a>
            </p>
          )}

          {/* Notes */}
          <div>
            <p className="text-[11px] text-[var(--text-muted)] mb-1">Notes</p>
            {editing ? (
              <div className="space-y-2">
                <textarea
                  rows={2}
                  className="w-full text-xs border border-[var(--border)] rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-zinc-300 bg-surface"
                  value={noteDraft}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Notes about this contact…"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => { onUpdate(contact.id, { notes: noteDraft }); setEditing(false); }}
                    className="text-xs bg-[var(--sidebar-active)] text-[var(--sidebar-active-text)] px-3 py-1 rounded-lg hover:bg-[var(--text-secondary)]"
                  >
                    Save
                  </button>
                  <button onClick={() => setEditing(false)}
                    className="text-xs border border-[var(--border)] px-3 py-1 rounded-lg hover:bg-[var(--surface-inset)]">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p
                className="text-xs text-[var(--text-secondary)] cursor-pointer hover:text-[var(--text-primary)] transition-colors italic"
                onClick={() => setEditing(true)}
              >
                {contact.notes || <span className="text-[var(--text-muted)] not-italic">Add notes…</span>}
              </p>
            )}
          </div>

          {/* Delete */}
          <button
            onClick={() => onDelete(contact.id)}
            className="text-[11px] text-[var(--text-muted)] hover:text-red-400 transition-colors"
          >
            Remove contact
          </button>
        </div>
      )}
    </div>
  );
}

// ── New contact form ───────────────────────────────────────────────────────
function NewContactForm({ onAdd, onCancel }) {
  const [name, setName]   = useState('');
  const [email, setEmail] = useState('');
  const [tags, setTags]   = useState('');
  return (
    <div className="bg-[var(--surface-raised)] rounded-2xl border border-[var(--border)] px-5 py-4 space-y-3">
      <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">New Contact</p>
      <div className="grid grid-cols-2 gap-3">
        <input autoFocus className="text-sm border border-[var(--border)] rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-zinc-300 placeholder:text-[var(--text-muted)]"
          placeholder="Full name…" value={name} onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) onAdd({ name: name.trim(), email, tags: tags.split(',').map((t) => t.trim()).filter(Boolean) }); }}
        />
        <input className="text-sm border border-[var(--border)] rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-zinc-300 placeholder:text-[var(--text-muted)]"
          placeholder="Email (optional)" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <input className="w-full text-xs border border-[var(--border)] rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zinc-300 placeholder:text-[var(--text-muted)] text-[var(--text-secondary)]"
        placeholder="Tags — comma separated (work, friend, mentor…)" value={tags} onChange={(e) => setTags(e.target.value)} />
      <div className="flex gap-2">
        <button
          onClick={() => { if (name.trim()) onAdd({ name: name.trim(), email, tags: tags.split(',').map((t) => t.trim()).filter(Boolean) }); }}
          className="flex-1 text-sm bg-[var(--sidebar-active)] text-[var(--sidebar-active-text)] rounded-xl py-2 hover:bg-[var(--text-secondary)] transition-colors font-medium"
        >
          Add contact
        </button>
        <button onClick={onCancel} className="px-4 text-sm border border-[var(--border)] rounded-xl hover:bg-[var(--surface-inset)] transition-colors">Cancel</button>
      </div>
    </div>
  );
}

// ── CRMModule ─────────────────────────────────────────────────────────────
export default function CRMModule() {
  const { state, addContact, updateContact, deleteContact, touchContact, daysSince } = useOS();
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch]     = useState('');
  const [tagFilter, setTagFilter] = useState('');

  const { crm } = state;

  // Gather all unique tags
  const allTags = [...new Set(Object.values(crm).flatMap((c) => c.tags))].sort();

  // Build sorted list: by days since last contact descending (overdue first)
  const contacts = Object.values(crm)
    .map((c) => ({ ...c, days: daysSince(c.id) }))
    .filter((c) => {
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (tagFilter && !c.tags.includes(tagFilter)) return false;
      return true;
    })
    .sort((a, b) => b.days - a.days);

  const overdueCount = contacts.filter((c) => c.days > 30).length;

  return (
    <div className="h-full flex flex-col gap-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">CRM</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            {Object.keys(crm).length} contacts
            {overdueCount > 0 && <span className="text-red-400 ml-1">· {overdueCount} overdue</span>}
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="text-sm bg-[var(--sidebar-active)] text-[var(--sidebar-active-text)] px-4 py-2 rounded-xl hover:bg-[var(--text-secondary)] transition-colors font-medium"
        >
          + Add contact
        </button>
      </div>

      {/* New contact form */}
      {showForm && (
        <NewContactForm
          onAdd={(data) => { addContact(data.name, { email: data.email, tags: data.tags }); setShowForm(false); }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Search + tag filters */}
      <div className="space-y-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search contacts…"
          className="w-full text-sm border border-[var(--border)] rounded-xl px-4 py-2.5 bg-[var(--surface-raised)] focus:outline-none focus:ring-2 focus:ring-zinc-300 placeholder:text-[var(--text-muted)]"
        />
        {allTags.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            <TagPill tag="All" selected={!tagFilter} onClick={() => setTagFilter('')} />
            {allTags.map((tag) => (
              <TagPill key={tag} tag={tag} selected={tagFilter === tag} onClick={() => setTagFilter(tagFilter === tag ? '' : tag)} />
            ))}
          </div>
        )}
      </div>

      {/* Contact list */}
      <div className="flex-1 overflow-y-auto space-y-2 pb-6">
        {contacts.length === 0 ? (
          <div className="text-center py-16 text-[var(--text-muted)]">
            <p className="text-4xl mb-3">👥</p>
            <p className="text-sm">{search || tagFilter ? 'No matching contacts' : 'No contacts yet'}</p>
          </div>
        ) : (
          contacts.map((c) => (
            <ContactCard
              key={c.id}
              contact={c}
              days={c.days}
              onTouch={touchContact}
              onDelete={deleteContact}
              onUpdate={updateContact}
            />
          ))
        )}
      </div>
    </div>
  );
}
