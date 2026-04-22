// ─── Lifestyle OS · Utilities ─────────────────────────────────────────────

// ── Date helpers ──────────────────────────────────────────────────────────

export const todayKey = () => new Date().toISOString().split("T")[0];

export const formatDate = (isoString) => {
  if (!isoString) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(isoString));
};

export const formatRelative = (isoString) => {
  if (!isoString) return "Never";
  const diff = Math.floor((Date.now() - new Date(isoString)) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return `${diff} days ago`;
  if (diff < 30) return `${Math.floor(diff / 7)} weeks ago`;
  if (diff < 365) return `${Math.floor(diff / 30)} months ago`;
  return `${Math.floor(diff / 365)} years ago`;
};

export const daysBetween = (isoA, isoB = new Date().toISOString()) =>
  Math.floor((new Date(isoB) - new Date(isoA)) / 86_400_000);

// ── String helpers ────────────────────────────────────────────────────────

export const initials = (name = "") =>
  name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

export const truncate = (str = "", max = 60) =>
  str.length <= max ? str : str.slice(0, max - 1) + "…";

// ── Color maps ────────────────────────────────────────────────────────────

export const PROJECT_STATUS_COLORS = {
  Active: "bg-emerald-100 text-emerald-700",
  Paused: "bg-amber-100 text-amber-700",
  Completed: "bg-sky-100 text-sky-700",
  Archived: "bg-zinc-100 text-zinc-500",
};

export const TASK_STATUS_COLORS = {
  Todo: "bg-zinc-100 text-zinc-600",
  "In Progress": "bg-indigo-100 text-indigo-700",
  Done: "bg-emerald-100 text-emerald-700",
  Blocked: "bg-red-100 text-red-600",
};

export const CYCLE_BLOCK_COLORS = {
  indigo: "bg-indigo-200 text-indigo-800 border-indigo-300",
  sky: "bg-sky-200 text-sky-800 border-sky-300",
  amber: "bg-amber-200 text-amber-800 border-amber-300",
  emerald: "bg-emerald-200 text-emerald-800 border-emerald-300",
  rose: "bg-rose-200 text-rose-800 border-rose-300",
  violet: "bg-violet-200 text-violet-800 border-violet-300",
};

export const BLOCK_TYPE_COLORS = {
  focus: "indigo",
  rest: "emerald",
  admin: "amber",
  social: "sky",
  health: "rose",
};

// ── Metric helpers ────────────────────────────────────────────────────────

/** Returns a Tailwind color class based on energy level (1–10) */
export const energyColor = (n) => {
  if (!n) return "text-zinc-400";
  if (n <= 3) return "text-red-500";
  if (n <= 5) return "text-amber-500";
  if (n <= 7) return "text-yellow-500";
  return "text-emerald-500";
};

/** Average of an array of numbers (ignores nulls) */
export const avg = (arr) => {
  const vals = arr.filter((v) => Number.isFinite(v));
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
};

// ── Sorting & filtering ───────────────────────────────────────────────────

export const sortBy = (arr, key, dir = "asc") =>
  [...arr].sort((a, b) => {
    const va = a[key] ?? "";
    const vb = b[key] ?? "";
    return dir === "asc" ? (va > vb ? 1 : -1) : va < vb ? 1 : -1;
  });

export const groupBy = (arr, key) =>
  arr.reduce((acc, item) => {
    const k = item[key] ?? "undefined";
    if (!acc[k]) acc[k] = [];
    acc[k].push(item);
    return acc;
  }, {});
