// ─── Lifestyle OS · Data Schema & Seed Data ───────────────────────────────
export const CYCLE_LABELS = { A: 'Week A', B: 'Week B', C: 'Week C' };
export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const PROJECT_STATUSES = ['Active', 'Paused', 'Completed', 'Archived'];
export const TASK_STATUSES = ['Todo', 'In Progress', 'Done', 'Blocked'];
export const ENERGY_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
export const BLOCK_TYPES = ['focus', 'rest', 'admin', 'social', 'health'];

export const WORKOUT_LIBRARY = [
  {
    id: 'workout-upper-power',
    name: 'Upper Body Power',
    note: "Use the 'Strength' folder in Hevy.",
    intensity: 'High',
  },
  {
    id: 'workout-lower-strength',
    name: 'Lower Body Strength',
    note: "Use the 'Strength' folder in Hevy.",
    intensity: 'High',
  },
  {
    id: 'workout-full-body',
    name: 'Full Body Builder',
    note: "Use the 'Hypertrophy' folder in Hevy.",
    intensity: 'Medium',
  },
  {
    id: 'workout-zone2-cardio',
    name: 'Zone 2 Cardio',
    note: 'Keep it conversational. Leave the room with more energy than you entered with.',
    intensity: 'Low',
  },
  {
    id: 'workout-mobility-reset',
    name: 'Mobility Reset',
    note: '10-15 minutes of joints, spine, and easy movement.',
    intensity: 'Low',
  },
  {
    id: 'workout-active-recovery',
    name: 'Active Recovery / Walk',
    note: 'Walk 20-30 minutes, hydrate, and keep the whole session easy.',
    intensity: 'Low',
  },
];

export const MEAL_PROTOCOLS = [
  {
    id: 'meal-high-carb-fueling',
    name: 'High-Carb Fueling',
    description: 'Use on high-output weeks. Keep carbs easy to access around training.',
    sampleMeals: ['Oats + fruit', 'Rice bowl + lean protein', 'Potatoes + eggs + toast'],
  },
  {
    id: 'meal-maintenance',
    name: 'Maintenance',
    description: 'Balanced intake for steady weeks with no special push.',
    sampleMeals: ['Greek yogurt + berries', 'Chicken salad + bread', 'Salmon + vegetables + rice'],
  },
  {
    id: 'meal-low-carb-recovery',
    name: 'Low-Carb Recovery',
    description: 'Keep meals lighter when the week is intentionally easier or more restorative.',
    sampleMeals: ['Eggs + avocado', 'Soup + protein', 'Salad + olive oil + protein'],
  },
];

export const RECOVERY_PROTOCOLS = [
  {
    id: 'recovery-active-walk',
    name: 'Active Recovery / Walk',
    note: '20-30 minutes of easy movement, then stop while you still feel fresh.',
    intensity: 'Low',
  },
  {
    id: 'recovery-mobility',
    name: 'Mobility Reset',
    note: 'Use gentle mobility and breathing work. No intensity target.',
    intensity: 'Low',
  },
];

export const PANTRY_ESSENTIALS = [
  'Eggs',
  'Greek yogurt',
  'Chicken breast',
  'Rice',
  'Oats',
  'Potatoes',
  'Bananas',
  'Frozen vegetables',
  'Leafy greens',
  'Olive oil',
  'Nuts',
  'Salt',
];

export const DEFAULT_REFERENCE = {
  workoutLibrary: WORKOUT_LIBRARY,
  mealProtocols: MEAL_PROTOCOLS,
  recoveryProtocols: RECOVERY_PROTOCOLS,
  pantryEssentials: PANTRY_ESSENTIALS,
};

export const DEFAULT_CYCLE_PLANS = {
  A: {
    workoutsByDay: {
      Mon: 'workout-upper-power',
      Tue: 'workout-zone2-cardio',
      Wed: 'workout-lower-strength',
      Thu: 'workout-mobility-reset',
      Fri: 'workout-full-body',
      Sat: 'workout-zone2-cardio',
      Sun: 'workout-active-recovery',
    },
    mealProtocolId: 'meal-high-carb-fueling',
  },
  B: {
    workoutsByDay: {
      Mon: 'workout-full-body',
      Tue: 'workout-zone2-cardio',
      Wed: 'workout-mobility-reset',
      Thu: 'workout-lower-strength',
      Fri: 'workout-zone2-cardio',
      Sat: 'workout-active-recovery',
      Sun: 'workout-mobility-reset',
    },
    mealProtocolId: 'meal-maintenance',
  },
  C: {
    workoutsByDay: {
      Mon: 'workout-mobility-reset',
      Tue: 'workout-zone2-cardio',
      Wed: 'workout-active-recovery',
      Thu: 'workout-mobility-reset',
      Fri: 'workout-zone2-cardio',
      Sat: 'workout-active-recovery',
      Sun: 'workout-mobility-reset',
    },
    mealProtocolId: 'meal-low-carb-recovery',
  },
};

export const uid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

const _d2 = (n) => String(n).padStart(2, '0');
export const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${_d2(d.getMonth()+1)}-${_d2(d.getDate())}`;
};

export const makeCapture = (text = '') => ({
  id: uid(), text, createdAt: new Date().toISOString(), processed: false,
});
export const makeTask = (title = '', projectId = null) => ({
  id: uid(), title, status: 'Todo', projectId, dueDate: null, notes: '',
  createdAt: new Date().toISOString(),
});
export const makeProject = (title = '') => ({
  id: uid(), title, status: 'Active', description: '', taskIds: [],
  createdAt: new Date().toISOString(),
});
export const makeContact = (name = '') => ({
  id: uid(), name, email: '', tags: [], lastContacted: null, notes: '',
  createdAt: new Date().toISOString(),
});
export const makeMetricLog = (date = todayKey()) => ({
  date, energy: null, sleep: null, mood: null, notes: '',
});
export const makeCycleBlock = (day = 'Mon', hour = 9, label = '', type = 'focus') => ({
  id: uid(), day, hour, minute: 0, duration: 60, label, type,
});
export const makeCycle = (letter = 'A') => ({
  letter,
  label: CYCLE_LABELS[letter],
  blocks: [],
  workoutsByDay: {},
  mealProtocolId: null,
});

// ── Seed date helpers ──────────────────────────────────────────────────────
const _now = new Date();
const _dow  = (_now.getDay() + 6) % 7;
const _mon  = new Date(_now);
_mon.setDate(_now.getDate() - _dow); _mon.setHours(0,0,0,0);
const _toKey = (d) => `${d.getFullYear()}-${_d2(d.getMonth()+1)}-${_d2(d.getDate())}`;
export const THIS_WEEK_MONDAY = _toKey(_mon);
const _wed = new Date(_mon); _wed.setDate(_mon.getDate() + 2);
export const THIS_WEDNESDAY = _toKey(_wed);

const p1 = 'proj-001', p2 = 'proj-002';

export const SEED_STATE = {
  cycleStartDate: THIS_WEEK_MONDAY,
  cycles: {
    A: { letter:'A', label:'Week A', blocks: [
      { id:'blk-a01', day:'Mon', hour:6,  minute:30, duration:60,  label:'Morning Run',      type:'health' },
      { id:'blk-a02', day:'Mon', hour:9,  minute:0,  duration:180, label:'Deep Work',        type:'focus'  },
      { id:'blk-a03', day:'Mon', hour:13, minute:0,  duration:60,  label:'Email & Comms',    type:'admin'  },
      { id:'blk-a04', day:'Tue', hour:9,  minute:0,  duration:120, label:'Deep Work',        type:'focus'  },
      { id:'blk-a05', day:'Tue', hour:12, minute:0,  duration:30,  label:'Lunch',            type:'rest'   },
      { id:'blk-a06', day:'Tue', hour:18, minute:0,  duration:90,  label:'Gym',              type:'health' },
      { id:'blk-a07', day:'Wed', hour:9,  minute:0,  duration:180, label:'Deep Work',        type:'focus'  },
      { id:'blk-a08', day:'Wed', hour:14, minute:0,  duration:60,  label:'1:1 Meetings',     type:'social' },
      { id:'blk-a09', day:'Thu', hour:9,  minute:0,  duration:120, label:'Project Review',   type:'admin'  },
      { id:'blk-a10', day:'Thu', hour:18, minute:0,  duration:90,  label:'Gym',              type:'health' },
      { id:'blk-a11', day:'Fri', hour:9,  minute:0,  duration:120, label:'Deep Work',        type:'focus'  },
      { id:'blk-a12', day:'Fri', hour:14, minute:0,  duration:90,  label:'Weekly Review',    type:'admin'  },
      { id:'blk-a13', day:'Sat', hour:10, minute:0,  duration:120, label:'Learning Block',   type:'focus'  },
      { id:'blk-a14', day:'Sun', hour:17, minute:0,  duration:60,  label:'Week Preview',     type:'admin'  },
    ]},
    B: { letter:'B', label:'Week B', blocks: [
      { id:'blk-b01', day:'Mon', hour:9,  minute:0,  duration:180, label:'Deep Work',        type:'focus'  },
      { id:'blk-b02', day:'Mon', hour:14, minute:0,  duration:60,  label:'Admin Catch-up',   type:'admin'  },
      { id:'blk-b03', day:'Tue', hour:6,  minute:30, duration:60,  label:'Morning Run',      type:'health' },
      { id:'blk-b04', day:'Tue', hour:10, minute:0,  duration:120, label:'Deep Work',        type:'focus'  },
      { id:'blk-b05', day:'Wed', hour:9,  minute:0,  duration:120, label:'Writing Block',    type:'focus'  },
      { id:'blk-b06', day:'Wed', hour:11, minute:0,  duration:60,  label:'Team Sync',        type:'social' },
      { id:'blk-b07', day:'Thu', hour:9,  minute:0,  duration:180, label:'Deep Work',        type:'focus'  },
      { id:'blk-b08', day:'Fri', hour:9,  minute:0,  duration:60,  label:'Email Sprint',     type:'admin'  },
      { id:'blk-b09', day:'Fri', hour:14, minute:0,  duration:90,  label:'Weekly Review',    type:'admin'  },
      { id:'blk-b10', day:'Sat', hour:9,  minute:0,  duration:90,  label:'Gym',              type:'health' },
    ]},
    C: { letter:'C', label:'Week C', blocks: [
      { id:'blk-c01', day:'Mon', hour:9,  minute:0,  duration:120, label:'Planning Sprint',  type:'admin'  },
      { id:'blk-c02', day:'Tue', hour:9,  minute:0,  duration:180, label:'Deep Work',        type:'focus'  },
      { id:'blk-c03', day:'Tue', hour:18, minute:0,  duration:60,  label:'Social — Dinner',  type:'social' },
      { id:'blk-c04', day:'Wed', hour:9,  minute:0,  duration:120, label:'Deep Work',        type:'focus'  },
      { id:'blk-c05', day:'Thu', hour:9,  minute:0,  duration:120, label:'Deep Work',        type:'focus'  },
      { id:'blk-c06', day:'Thu', hour:15, minute:0,  duration:60,  label:'Mentoring Call',   type:'social' },
      { id:'blk-c07', day:'Fri', hour:9,  minute:0,  duration:90,  label:'Content Creation', type:'focus'  },
      { id:'blk-c08', day:'Fri', hour:14, minute:0,  duration:90,  label:'Weekly Review',    type:'admin'  },
      { id:'blk-c09', day:'Sat', hour:10, minute:0,  duration:120, label:'Reading Block',    type:'rest'   },
      { id:'blk-c10', day:'Sun', hour:9,  minute:0,  duration:90,  label:'Yoga',             type:'health' },
    ]},
  },
  overrides: {
    [THIS_WEDNESDAY]: {
      blockOverrides: { 'blk-a08': { label:'1:1 with Alex (rescheduled)', hour:15 } },
      addedBlocks: [
        { id:'ov-add-1', day:'Wed', hour:11, minute:0, duration:60, label:'Doctor Appointment', type:'health' },
      ],
      note: 'Busy Wednesday — shifted meeting to 3 PM',
    },
  },
  capture: [
    { ...makeCapture('Research async communication tools'), id:'cap-001' },
    { ...makeCapture('Book dentist appointment'),           id:'cap-002' },
    { ...makeCapture('Read "Building a Second Brain"'),     id:'cap-003' },
  ],
  projects: {
    [p1]: { ...makeProject('Lifestyle OS Build'), id:p1, status:'Active', description:'Full-stack personal OS.', taskIds:['task-001','task-002','task-003'] },
    [p2]: { ...makeProject('Content Calendar'),   id:p2, status:'Active', description:'Monthly writing pipeline.',taskIds:['task-004'] },
  },
  tasks: {
    'task-001': { ...makeTask('Write project brief',    p1), id:'task-001', status:'Done' },
    'task-002': { ...makeTask('Design wireframes',       p1), id:'task-002', status:'In Progress' },
    'task-003': { ...makeTask('Set up repo & CI',        p1), id:'task-003', status:'Todo' },
    'task-004': { ...makeTask('Draft blog post outline', p2), id:'task-004', status:'Todo' },
  },
  metrics: (() => {
    const m = {};
    [[7,7.5,8],[5,6,6],[8,8,9],[6,7,7],[9,8.5,9],[4,5.5,5],[7,7.5,8],
     [8,8,8],[6,6.5,7],[9,8,9],[7,7,8],[5,6,6],[8,8.5,9],[6,7,7]].forEach(([energy,sleep,mood],i,arr)=>{
      const d=new Date(); d.setDate(d.getDate()-(arr.length-1-i));
      const key=_toKey(d); m[key]={date:key,energy,sleep,mood,notes:''};
    });
    return m;
  })(),
  reference: DEFAULT_REFERENCE,
  cyclePlans: DEFAULT_CYCLE_PLANS,
  crm: {
    'contact-001': { ...makeContact('Alice Chen'), id:'contact-001', email:'alice@example.com', tags:['work','mentor'], lastContacted:'2025-05-20T10:00:00Z', notes:'Intro to her network' },
    'contact-002': { ...makeContact('Ben Okafor'), id:'contact-002', email:'ben@example.com',   tags:['friend'],        lastContacted:'2025-06-01T18:30:00Z', notes:'Coffee next month' },
    'contact-003': { ...makeContact('Clara Ruiz'), id:'contact-003', email:'clara@example.com', tags:['work'],          lastContacted:'2025-04-15T09:00:00Z', notes:'' },
  },
  focus3: [
    { id:'f3-seed-1', text:'Ship Phase 3 Dashboard', projectId:'proj-001', done:false, createdAt:new Date().toISOString() },
    { id:'f3-seed-2', text:'Review inbox items',     projectId:null,       done:false, createdAt:new Date().toISOString() },
    { id:'f3-seed-3', text:'',                        projectId:null,       done:false, createdAt:new Date().toISOString() },
  ],
  ui: { activeModule:'dashboard', sidebarOpen:true },
  principles: {
    'prin-001': { id:'prin-001', title:'The 2-Minute Rule',       body:'If a task takes less than 2 minutes, do it now. Never defer the trivial.',              category:'Productivity', order:1, createdAt:new Date().toISOString() },
    'prin-002': { id:'prin-002', title:'One Thing at a Time',     body:'Multitasking is context-switching tax. Single-task ruthlessly.',                         category:'Productivity', order:2, createdAt:new Date().toISOString() },
    'prin-003': { id:'prin-003', title:'Protect the Morning',     body:'The first 90 minutes belong to deep work. No email, no social, no news.',               category:'Productivity', order:3, createdAt:new Date().toISOString() },
    'prin-004': { id:'prin-004', title:'Move Every Day',          body:'Some form of movement daily — walk, lift, stretch. Non-negotiable.',                     category:'Health',        order:1, createdAt:new Date().toISOString() },
    'prin-005': { id:'prin-005', title:'Sleep is the Foundation', body:'7–9 hours is not laziness. Chronic sleep debt compounds into poor decisions.',           category:'Health',        order:2, createdAt:new Date().toISOString() },
    'prin-006': { id:'prin-006', title:'Tend the Garden',         body:'Relationships need watering. Reach out before you need something.',                      category:'Relationships', order:1, createdAt:new Date().toISOString() },
    'prin-007': { id:'prin-007', title:'Spend on Experiences',    body:'Money spent on experiences returns more than money spent on objects.',                   category:'Finance',       order:1, createdAt:new Date().toISOString() },
    'prin-008': { id:'prin-008', title:'Say No to Say Yes',       body:'Every commitment is a trade. Guard your calendar like your savings account.',            category:'General',       order:1, createdAt:new Date().toISOString() },
    'prin-009': { id:'prin-009', title:'Systems Beat Willpower',  body:"Don't rely on discipline alone. Build environments that make the right choice easy.",    category:'General',       order:2, createdAt:new Date().toISOString() },
  },
  reviews: {},
  habits: {
    'hb-001': { id:'hb-001', name:'Morning movement', emoji:'🏃', color:'#6366f1', logs:{}, createdAt:new Date().toISOString() },
    'hb-002': { id:'hb-002', name:'Read 20 min',      emoji:'📚', color:'#10b981', logs:{}, createdAt:new Date().toISOString() },
    'hb-003': { id:'hb-003', name:'No phone first hr', emoji:'📵', color:'#f59e0b', logs:{}, createdAt:new Date().toISOString() },
  },
  settings: {
    name: '', wakeTime: '07:00', sleepTarget: 8,
    reviewDay: 'Friday', reviewTime: '17:00',
    energyLowThreshold: 4, focusBlockMins: 90,
    showStreakBadges: true, compactSidebar: false,
    notifyOverdueCRM: true, notifyReviewReminder: true, notifyHabitStreak: true,
    firstDayOfWeek: 'Monday', timeFormat: '12h', dateFormat: 'DD/MM/YYYY',
  },
};

// ─── Focus3 factory ────────────────────────────────────────────────────────
export const makeFocusItem = (text = '', projectId = null) => ({
  id: uid(),
  text,
  projectId,   // null | project id — optional link to an active project
  done: false,
  createdAt: new Date().toISOString(),
});

// ─── Low-Energy Protocol reference data ───────────────────────────────────
export const LOW_ENERGY_PROTOCOL = [
  { id: 'lep-1', icon: '🧘', title: 'Single-task only',      body: 'Pick ONE thing. Close every other tab and ignore the rest of the list.' },
  { id: 'lep-2', icon: '🚶', title: 'Walk first',            body: '10 minutes outside before anything else. No phone. Reset your nervous system.' },
  { id: 'lep-3', icon: '💧', title: 'Hydrate & eat',         body: 'Drink a full glass of water now. Low energy is often dehydration or low blood sugar.' },
  { id: 'lep-4', icon: '📵', title: 'No decisions before 10',body: 'Defer non-urgent choices. Decision fatigue compounds when you\'re already depleted.' },
  { id: 'lep-5', icon: '⏱️', title: '25-min sprint',          body: 'One Pomodoro. That\'s the whole ask. If you stop after 25 min, that\'s still a win.' },
  { id: 'lep-6', icon: '🌙', title: 'Plan tomorrow tonight',  body: 'Low-energy days are a signal. Block 10 min tonight to protect tomorrow\'s schedule.' },
];

// ─── Extend SEED_STATE with focus3 and dashboard ──────────────────────────
// NOTE: These are merged into the existing SEED_STATE at runtime via OSContext.
// We export the defaults here so OSContext can inject them if missing.
export const FOCUS3_DEFAULT = [
  makeFocusItem('', null),
  makeFocusItem('', null),
  makeFocusItem('', null),
];

// ─── Personal Principles ───────────────────────────────────────────────────
export const makePrinciple = (title = '', body = '', category = 'General') => ({
  id: uid(),
  title,
  body,
  category,   // General | Productivity | Health | Relationships | Finance
  createdAt: new Date().toISOString(),
  order: 0,
});

export const PRINCIPLE_CATEGORIES = ['General', 'Productivity', 'Health', 'Relationships', 'Finance'];

// ─── Weekly Review ─────────────────────────────────────────────────────────
export const REVIEW_PROMPTS = [
  { id: 'rp-1', key: 'wins',        label: 'Wins this week',               placeholder: 'What went well? What are you proud of?' },
  { id: 'rp-2', key: 'struggles',   label: 'Struggles & friction',         placeholder: 'What felt hard? Where did you lose energy or time?' },
  { id: 'rp-3', key: 'learned',     label: 'What I learned',               placeholder: 'Any new insight, skill, or reframe?' },
  { id: 'rp-4', key: 'nextFocus',   label: 'Next week\'s #1 focus',        placeholder: 'If this week could only move one thing forward, what is it?' },
  { id: 'rp-5', key: 'gratitude',   label: 'Gratitude',                    placeholder: 'Three things — big or small.' },
  { id: 'rp-6', key: 'energyNote',  label: 'Energy & body check',          placeholder: 'How did your body feel this week? Sleep, food, movement?' },
];

export const makeReviewEntry = (weekKey = '') => ({
  id: uid(),
  weekKey,        // YYYY-Www  e.g. "2025-W23"
  completedAt: new Date().toISOString(),
  answers: {},    // { [promptKey]: string }
  rating: null,   // 1-5 overall week rating
});

// ─── Seed data for new modules ─────────────────────────────────────────────
export const SEED_PRINCIPLES = {
  'prin-001': { ...makePrinciple('The 2-Minute Rule',        'If a task takes less than 2 minutes, do it now. Never defer the trivial.', 'Productivity'), id:'prin-001', order:1 },
  'prin-002': { ...makePrinciple('One Thing at a Time',      'Multitasking is context-switching tax. Single-task ruthlessly.', 'Productivity'), id:'prin-002', order:2 },
  'prin-003': { ...makePrinciple('Protect the Morning',      'The first 90 minutes belong to deep work. No email, no social, no news.', 'Productivity'), id:'prin-003', order:3 },
  'prin-004': { ...makePrinciple('Move Every Day',           'Some form of movement daily — walk, lift, stretch. Non-negotiable.', 'Health'), id:'prin-004', order:1 },
  'prin-005': { ...makePrinciple('Sleep is the Foundation',  '7–9 hours is not laziness. Chronic sleep debt compounds into poor decisions.', 'Health'), id:'prin-005', order:2 },
  'prin-006': { ...makePrinciple('Tend the Garden',          'Relationships need watering. Reach out before you need something.', 'Relationships'), id:'prin-006', order:1 },
  'prin-007': { ...makePrinciple('Spend on Experiences',     'Money spent on experiences returns more than money spent on objects.', 'Finance'), id:'prin-007', order:1 },
  'prin-008': { ...makePrinciple('Say No to Say Yes',        'Every commitment is a trade. Guard your calendar like your savings account.', 'General'), id:'prin-008', order:1 },
  'prin-009': { ...makePrinciple('Systems Beat Willpower',   'Don\'t rely on discipline alone. Build environments that make the right choice the easy choice.', 'General'), id:'prin-009', order:2 },
};

export const SEED_REVIEWS = {}; // empty on first run — user generates them
