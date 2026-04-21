export const CYCLE_LABELS = { A: 'Week A', B: 'Week B', C: 'Week C' };
export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const ENERGY_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
export const BLOCK_TYPES = ['focus', 'rest', 'admin', 'social', 'health'];

export const WORKOUT_LIBRARY = [
  {
    id: 'workout-upper-strength',
    name: 'Upper Strength',
    note: 'Compound pulls and presses with progressive overload.',
    intensity: 'High',
    intensity_score: 3,
    hevyUrl: '',
  },
  {
    id: 'workout-zone2-cardio',
    name: 'Zone 2 Cardio',
    note: 'Steady conversational cardio for aerobic base.',
    intensity: 'Medium',
    intensity_score: 2,
    hevyUrl: '',
  },
  {
    id: 'workout-mobility-reset',
    name: 'Mobility Reset',
    note: '20 minutes of mobility and breathing work.',
    intensity: 'Low',
    intensity_score: 1,
    hevyUrl: '',
  },
];

export const MEAL_PROTOCOLS = [
  {
    id: 'meal-performance-fueling',
    name: 'Performance Fueling',
    description: 'Higher-carb protocol around training windows.',
    keyFocus: 'Prioritize pre/post workout carbs and hydration.',
    sampleMeals: ['Oats + fruit', 'Rice bowl + lean protein'],
  },
  {
    id: 'meal-maintenance',
    name: 'Maintenance',
    description: 'Balanced protein, carbs, and fats for steady weeks.',
    keyFocus: 'Hit protein target and maintain meal regularity.',
    sampleMeals: ['Egg scramble + toast', 'Chicken salad + potatoes'],
  },
  {
    id: 'meal-recovery',
    name: 'Recovery',
    description: 'Lighter digestion and anti-inflammatory support.',
    keyFocus: 'Hydration, micronutrients, and easy digestion.',
    sampleMeals: ['Greek yogurt + berries', 'Soup + protein + greens'],
  },
];

export const RECOVERY_PROTOCOLS = [
  {
    id: 'recovery-reset',
    name: 'Recovery Reset',
    note: '30 minutes walk, mobility, and early bedtime target.',
    intensity: 'Low',
    intensity_score: 1,
  },
];

export const RECIPES = [
  {
    id: 'recipe-protein-oats',
    name: 'Protein Overnight Oats',
    ingredients: ['60g oats', '200g yogurt', '1 scoop protein', 'berries'],
    steps: ['Mix ingredients in a jar.', 'Refrigerate overnight.', 'Top with berries and serve.'],
    protocolIds: ['meal-performance-fueling', 'meal-maintenance'],
  },
  {
    id: 'recipe-recovery-bowl',
    name: 'Recovery Rice Bowl',
    ingredients: ['150g rice', '150g chicken', 'spinach', 'olive oil', 'salt'],
    steps: ['Cook rice and chicken.', 'Assemble bowl with greens.', 'Finish with olive oil and salt.'],
    protocolIds: ['meal-maintenance', 'meal-recovery'],
  },
];

export const DEFAULT_REFERENCE = {
  workoutLibrary: WORKOUT_LIBRARY,
  mealProtocols: MEAL_PROTOCOLS,
  recoveryProtocols: RECOVERY_PROTOCOLS,
  recipes: RECIPES,
};

export const DEFAULT_CYCLE_PLANS = {
  A: { workoutsByDay: {}, mealProtocolId: null },
  B: { workoutsByDay: {}, mealProtocolId: null },
  C: { workoutsByDay: {}, mealProtocolId: null },
};

export const uid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

const _d2 = (n) => String(n).padStart(2, '0');
export const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${_d2(d.getMonth() + 1)}-${_d2(d.getDate())}`;
};

export const makeCapture = (text = '') => ({
  id: uid(),
  text,
  createdAt: new Date().toISOString(),
  processed: false,
});

export const makeMetricLog = (date = todayKey()) => ({
  date,
  energy: null,
  sleep: null,
  mood: null,
  notes: '',
});

export const makeCycleBlock = (day = 'Mon', hour = 9, label = '', type = 'focus') => ({
  id: uid(),
  day,
  hour,
  minute: 0,
  duration: 60,
  label,
  type,
});

const mondayOfCurrentWeek = () => {
  const now = new Date();
  const dow = (now.getDay() + 6) % 7;
  const mon = new Date(now);
  mon.setDate(now.getDate() - dow);
  mon.setHours(0, 0, 0, 0);
  return `${mon.getFullYear()}-${_d2(mon.getMonth() + 1)}-${_d2(mon.getDate())}`;
};

export const SEED_STATE = {
  cycleStartDate: mondayOfCurrentWeek(),
  cycles: {
    A: { letter: 'A', label: 'Week A', blocks: [] },
    B: { letter: 'B', label: 'Week B', blocks: [] },
    C: { letter: 'C', label: 'Week C', blocks: [] },
  },
  overrides: {},
  capture: [],
  metrics: {},
  reference: DEFAULT_REFERENCE,
  cyclePlans: DEFAULT_CYCLE_PLANS,
  ui: { activeModule: 'dashboard', sidebarOpen: true },
  principles: {},
  reviews: {},
  habits: {},
  journal: {},
  settings: {
    name: '',
    wakeTime: '07:00',
    sleepTarget: 8,
    cycleGoals: '',
    metricTargets: {
      sleepHours: 8,
    },
    reviewDay: 'Friday',
    reviewTime: '17:00',
    energyLowThreshold: 4,
    showStreakBadges: true,
    compactSidebar: false,
    notifyReviewReminder: true,
    notifyHabitStreak: true,
    firstDayOfWeek: 'Monday',
    timeFormat: '12h',
    dateFormat: 'DD/MM/YYYY',
    googleCalendar: {
      connected: false,
      email: '',
      selectedCalendarIds: [],
      lastSyncedAt: null,
    },
    onboarded: false,
  },
  syncedEvents: [],
};

export const LOW_ENERGY_PROTOCOL = [
  { id: 'lep-1', icon: '\u26f3', title: 'Single-task only', body: 'Pick one meaningful task and finish it before adding another.' },
  { id: 'lep-2', icon: '\ud83d\udca7', title: 'Hydrate first', body: 'Drink water and take 5 minutes to reset before starting.' },
  { id: 'lep-3', icon: '\u23f1\ufe0f', title: '25 minute sprint', body: 'Run one focused sprint and reassess energy afterward.' },
];

export const makeFocusItem = (text = '', projectId = null) => ({
  id: uid(),
  text,
  projectId,
  done: false,
  createdAt: new Date().toISOString(),
});

export const FOCUS3_DEFAULT = [
  makeFocusItem('', null),
  makeFocusItem('', null),
  makeFocusItem('', null),
];

export const makePrinciple = (title = '', body = '', category = 'General') => ({
  id: uid(),
  title,
  body,
  category,
  createdAt: new Date().toISOString(),
  order: 0,
});

export const PRINCIPLE_CATEGORIES = ['General', 'Productivity', 'Health', 'Relationships', 'Finance'];

export const REVIEW_PROMPTS = [
  { id: 'rp-1', key: 'wins', label: 'Wins this week', placeholder: 'What went well?' },
  { id: 'rp-2', key: 'struggles', label: 'Friction points', placeholder: 'What felt heavy or stuck?' },
  { id: 'rp-3', key: 'learned', label: 'What I learned', placeholder: 'What changed in your thinking?' },
  { id: 'rp-4', key: 'nextFocus', label: "Next week's focus", placeholder: 'What is the one priority next week?' },
  { id: 'rp-5', key: 'gratitude', label: 'Gratitude', placeholder: 'Three things you are grateful for.' },
  { id: 'rp-6', key: 'energyNote', label: 'Body and energy check', placeholder: 'How did sleep, movement, and nutrition feel?' },
];

export const makeReviewEntry = (weekKey = '') => ({
  id: uid(),
  weekKey,
  completedAt: new Date().toISOString(),
  answers: {},
  rating: null,
});

export const SEED_PRINCIPLES = {};
export const SEED_REVIEWS = {};
