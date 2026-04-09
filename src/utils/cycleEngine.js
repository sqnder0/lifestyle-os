// ─── Lifestyle OS · Cycle Engine ──────────────────────────────────────────
// Pure utility functions — no React, no side-effects.
// All date arithmetic works on local calendar dates, NOT UTC, so the
// "current week" never flips at midnight in a different timezone.

export const CYCLE_LETTERS = ['A', 'B', 'C'];
export const DAYS_SHORT    = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const DAYS_LONG     = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

// ─── 1. Low-level date helpers ─────────────────────────────────────────────

/**
 * Strip a Date to midnight local time (no time component).
 * All arithmetic uses these "day tokens" to avoid DST gaps.
 */
export const toLocalDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

/** YYYY-MM-DD string → local-midnight Date */
export const parseKey = (key) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);          // local constructor, no UTC shift
};

/** Date → YYYY-MM-DD string (local) */
export const toKey = (date) => {
  const d = toLocalDay(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/** Today as YYYY-MM-DD */
export const todayKey = () => toKey(new Date());

/**
 * ISO weekday index: Mon=0 … Sun=6
 * JS getDay() returns Sun=0, so we rotate.
 */
export const isoWeekday = (date) => (toLocalDay(date).getDay() + 6) % 7;

/** Short day label for a date: 'Mon' … 'Sun' */
export const dayLabel = (date) => DAYS_SHORT[isoWeekday(date)];

/** Add N whole days to a date, return new Date */
export const addDays = (date, n) => {
  const d = toLocalDay(date);
  d.setDate(d.getDate() + n);
  return d;
};

/** Whole-day difference: floor((b - a) / msPerDay) */
export const diffDays = (a, b) =>
  Math.floor((toLocalDay(b) - toLocalDay(a)) / 86_400_000);

/** Monday of the week containing `date` */
export const weekStart = (date) => addDays(date, -isoWeekday(date));

// ─── 2. The Cycle Algorithm ────────────────────────────────────────────────

/**
 * getCycleLetter(currentDate, cycleStartDate) → 'A' | 'B' | 'C'
 *
 * cycleStartDate = Day 1 of Week A (must be a Monday for clean weeks,
 * but the maths works for any start day).
 *
 * Strategy:
 *   1. Find Monday of the week containing currentDate  → currentWeekMon
 *   2. Find Monday of the week containing cycleStart   → originWeekMon
 *   3. weekIndex = floor( diffDays(originWeekMon, currentWeekMon) / 7 )
 *   4. letter    = CYCLE_LETTERS[ weekIndex mod 3 ]
 *
 * Negative weekIndex (before the origin) wraps correctly via modulo with
 * the ((n % 3) + 3) % 3 pattern.
 */
export const getCycleLetter = (currentDate, cycleStartDate) => {
  const curMon    = weekStart(currentDate);
  const originMon = weekStart(cycleStartDate);
  const weeks     = Math.round(diffDays(originMon, curMon) / 7);
  const idx       = ((weeks % 3) + 3) % 3;   // safe negative modulo
  return CYCLE_LETTERS[idx];
};

/**
 * getCycleWeekOf(date, cycleStartDate)
 * Returns full metadata for the ISO week containing `date`.
 */
export const getCycleWeekOf = (date, cycleStartDate) => {
  const letter = getCycleLetter(date, cycleStartDate);
  const mon    = weekStart(date);
  const days   = DAYS_SHORT.map((label, i) => ({
    label,
    date:    addDays(mon, i),
    key:     toKey(addDays(mon, i)),
    isToday: toKey(addDays(mon, i)) === todayKey(),
  }));
  return { letter, weekStartDate: mon, days };
};

/**
 * getWeeksAround(centerDate, cycleStartDate, before = 1, after = 1)
 * Returns an array of getCycleWeekOf results for a range of weeks.
 * Useful for a multi-week calendar view.
 */
export const getWeeksAround = (centerDate, cycleStartDate, before = 1, after = 1) => {
  const weeks = [];
  for (let offset = -before; offset <= after; offset++) {
    const target = addDays(weekStart(centerDate), offset * 7);
    weeks.push(getCycleWeekOf(target, cycleStartDate));
  }
  return weeks;
};

// ─── 3. Block resolver ─────────────────────────────────────────────────────

/**
 * resolveDay(dateKey, cycles, overrides) → ResolvedEvent[]
 *
 * Resolution order (highest wins):
 *   1. overrides[dateKey].deleted  → empty array (whole day cancelled)
 *   2. overrides[dateKey].blocks   → use override blocks verbatim
 *   3. cycles[letter].blocks filtered to dayLabel → template blocks
 *
 * Each ResolvedEvent:
 *   { id, label, hour, minute, duration, color, type, source, overrideId? }
 *   source: 'template' | 'override' | 'added'
 */
export const resolveDay = (dateKey, cycles, overrides, cycleStartDate) => {
  const date    = parseKey(dateKey);
  const letter  = getCycleLetter(date, cycleStartDate);
  const dayShort = dayLabel(date);

  const override = overrides?.[dateKey];

  // Full-day cancel
  if (override?.deleted) return [];

  // Date-specific block list (complete replacement)
  if (override?.blocks) {
    return override.blocks.map((b) => ({ ...b, source: 'override' }));
  }

  // Template blocks for this day, plus any additive overrides
  const templateBlocks = (cycles?.[letter]?.blocks ?? [])
    .filter((b) => b.day === dayShort)
    .map((b) => {
      // Check if this specific template block is individually overridden
      const blockOverride = override?.blockOverrides?.[b.id];
      if (blockOverride?.deleted) return null;
      if (blockOverride) return { ...b, ...blockOverride, source: 'override', templateId: b.id };
      return { ...b, source: 'template' };
    })
    .filter(Boolean);

  // Additional blocks added only for this date
  const addedBlocks = (override?.addedBlocks ?? []).map((b) => ({
    ...b,
    source: 'added',
  }));

  return [...templateBlocks, ...addedBlocks].sort((a, b) => {
    const aMin = a.hour * 60 + (a.minute ?? 0);
    const bMin = b.hour * 60 + (b.minute ?? 0);
    return aMin - bMin;
  });
};

/**
 * resolveWeek(weekDays, cycles, overrides, cycleStartDate) → Map<dateKey, ResolvedEvent[]>
 * weekDays = array of { key } objects from getCycleWeekOf
 */
export const resolveWeek = (weekDays, cycles, overrides, cycleStartDate) => {
  const map = {};
  for (const { key } of weekDays) {
    map[key] = resolveDay(key, cycles, overrides, cycleStartDate);
  }
  return map;
};

/**
 * resolvePhysicalBriefing(dateKey, cycleStartDate, cyclePlans, reference, energy, energyThreshold)
 * Returns the daily workout and meal protocol for the dashboard.
 */
export const resolvePhysicalBriefing = (
  dateKey,
  cycleStartDate,
  cyclePlans,
  reference,
  energy = null,
  energyThreshold = 4,
) => {
  const date = parseKey(dateKey);
  const letter = getCycleLetter(date, cycleStartDate);
  const day = dayLabel(date);

  const workouts = reference?.workoutLibrary ?? [];
  const mealProtocols = reference?.mealProtocols ?? [];
  const recoveryProtocols = reference?.recoveryProtocols ?? [];
  const plan = cyclePlans?.[letter] ?? {};

  const workoutId = plan.workoutsByDay?.[day] ?? null;
  const scheduledWorkout = workouts.find((item) => item.id === workoutId) ?? null;
  const mealProtocol = mealProtocols.find((item) => item.id === plan.mealProtocolId) ?? null;
  const recoveryProtocol = recoveryProtocols[0] ?? null;

  const isLowEnergy = energy != null && energy < energyThreshold;
  const workoutIntensityScore =
    typeof scheduledWorkout?.intensity_score === 'number'
      ? scheduledWorkout.intensity_score
      : scheduledWorkout?.intensity === 'High'
        ? 3
        : scheduledWorkout?.intensity === 'Medium'
          ? 2
          : 1;
  const useRecovery = isLowEnergy && workoutIntensityScore >= 3 ? recoveryProtocol : null;

  return {
    letter,
    day,
    scheduledWorkout,
    workout: useRecovery ?? scheduledWorkout,
    mealProtocol,
    recoveryProtocol,
    isRecoveryOverride: Boolean(useRecovery),
    isLowEnergy,
  };
};

// ─── 4. Override factories ─────────────────────────────────────────────────

/**
 * All override mutations return a new `overrides` object — pure, no mutation.
 *
 * overrides shape:
 * {
 *   [dateKey]: {
 *     deleted?: boolean,                     // cancel entire day
 *     blocks?: Block[],                      // full day replacement
 *     blockOverrides?: { [templateBlockId]: Partial<Block> & { deleted? } },
 *     addedBlocks?: Block[],                 // extra blocks for this date only
 *     note?: string,                         // day-level note
 *   }
 * }
 */

export const cancelDay = (overrides, dateKey) => ({
  ...overrides,
  [dateKey]: { deleted: true },
});

export const restoreDay = (overrides, dateKey) => {
  const { [dateKey]: _, ...rest } = overrides;
  return rest;
};

export const overrideBlock = (overrides, dateKey, templateBlockId, patch) => ({
  ...overrides,
  [dateKey]: {
    ...overrides[dateKey],
    blockOverrides: {
      ...(overrides[dateKey]?.blockOverrides ?? {}),
      [templateBlockId]: {
        ...(overrides[dateKey]?.blockOverrides?.[templateBlockId] ?? {}),
        ...patch,
      },
    },
  },
});

export const deleteTemplateBlock = (overrides, dateKey, templateBlockId) =>
  overrideBlock(overrides, dateKey, templateBlockId, { deleted: true });

export const addDateBlock = (overrides, dateKey, block) => ({
  ...overrides,
  [dateKey]: {
    ...overrides[dateKey],
    addedBlocks: [...(overrides[dateKey]?.addedBlocks ?? []), block],
  },
});

export const removeDateBlock = (overrides, dateKey, blockId) => ({
  ...overrides,
  [dateKey]: {
    ...overrides[dateKey],
    addedBlocks: (overrides[dateKey]?.addedBlocks ?? []).filter((b) => b.id !== blockId),
  },
});

export const setDayNote = (overrides, dateKey, note) => ({
  ...overrides,
  [dateKey]: { ...overrides[dateKey], note },
});

// ─── 5. Display helpers ────────────────────────────────────────────────────

/** Format hour + minute into "9:00 AM" style */
export const formatTime = (hour, minute = 0) => {
  const h = hour % 12 === 0 ? 12 : hour % 12;
  const m = String(minute).padStart(2, '0');
  const ampm = hour < 12 ? 'AM' : 'PM';
  return `${h}:${m} ${ampm}`;
};

/** Duration in minutes → "1 h 30 m" */
export const formatDuration = (minutes) => {
  if (minutes < 60) return `${minutes} m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} m` : `${h} h`;
};

/** "Mon 2 Jun" */
export const formatDayHeading = (date) => {
  const d = toLocalDay(date);
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
};

// Block type → Tailwind color classes (bg / text / border)
export const BLOCK_COLORS = {
  focus:  { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-300', dot: 'bg-indigo-500' },
  rest:   { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300', dot: 'bg-emerald-500' },
  admin:  { bg: 'bg-amber-100',  text: 'text-amber-800',  border: 'border-amber-300',  dot: 'bg-amber-500'  },
  social: { bg: 'bg-sky-100',    text: 'text-sky-800',    border: 'border-sky-300',    dot: 'bg-sky-500'    },
  health: { bg: 'bg-rose-100',   text: 'text-rose-800',   border: 'border-rose-300',   dot: 'bg-rose-500'   },
  default:{ bg: 'bg-zinc-100',   text: 'text-zinc-700',   border: 'border-zinc-300',   dot: 'bg-zinc-400'   },
};

export const blockColors = (type) => BLOCK_COLORS[type] ?? BLOCK_COLORS.default;

export const CYCLE_BADGE = {
  A: 'bg-violet-100 text-violet-700 border-violet-200',
  B: 'bg-sky-100    text-sky-700    border-sky-200',
  C: 'bg-rose-100   text-rose-700   border-rose-200',
};
