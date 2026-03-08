// Mock data for development / demo mode (used when Supabase is not configured)

// ─── Stable mock UUIDs — these match the rows seeded in supabase/mock_seed.sql ───
// Do NOT change these without re-running mock_seed.sql in your Supabase project.
export const MOCK_USER_IDS = {
  super_admin:       '00000000-0000-0000-0000-000000000001',
  admin:             '00000000-0000-0000-0000-000000000002',
  coach:             '00000000-0000-0000-0000-000000000003',
  nutritionist:      '00000000-0000-0000-0000-000000000004',
  athlete:           '00000000-0000-0000-0000-000000000005',
  athlete2:          '00000000-0000-0000-0000-000000000006',
  assistant_coach:   '00000000-0000-0000-0000-000000000007',
}
export const MOCK_ORG_ID = '00000000-0000-0000-0000-000000000010'

// ─── profiles: standalone, no org binding ───────────────────────────────────
export const MOCK_USERS = {
  super_admin: {
    id: MOCK_USER_IDS.super_admin,
    email: 'superadmin@powerplus.app',
    full_name: 'Alex Rivera',
    display_name: 'Alex (Platform Admin)',
    platform_role: 'super_admin',
    self_coach: false,
    avatar_url: null,
    weight_class: null,
    federation: null,
    equipment_type: null,
    bio: 'Platform administrator. Manages all organizations on PowerPlus.',
  },
  admin: {
    id: MOCK_USER_IDS.admin,
    email: 'admin@powerplus.app',
    full_name: 'Marcus Webb',
    display_name: 'Coach Marcus',
    platform_role: 'user',
    self_coach: true,   // Head coach who also logs his own workouts/nutrition
    avatar_url: null,
    weight_class: '93kg',
    federation: 'USAPL',
    equipment_type: 'raw',
    bio: 'Head coach & operations. 10+ years coaching powerlifters. Still trains competitively.',
  },
  coach: {
    id: MOCK_USER_IDS.coach,
    email: 'coach@powerplus.app',
    full_name: 'Elena Torres',
    display_name: 'Coach Elena',
    platform_role: 'user',
    self_coach: false,
    avatar_url: null,
    weight_class: null,
    federation: 'USAPL',
    equipment_type: 'raw',
    bio: 'Strength coach specializing in IPF-style technique.',
  },
  nutritionist: {
    id: MOCK_USER_IDS.nutritionist,
    email: 'nutrition@powerplus.app',
    full_name: 'Dr. Priya Nair',
    display_name: 'Dr. Priya',
    platform_role: 'user',
    self_coach: false,
    avatar_url: null,
    weight_class: null,
    federation: null,
    equipment_type: null,
    bio: 'Sports dietitian with focus on strength athletes.',
  },
  athlete: {
    id: MOCK_USER_IDS.athlete,
    email: 'athlete@powerplus.app',
    full_name: 'Jordan Blake',
    display_name: 'Jordan',
    platform_role: 'user',
    self_coach: false,
    avatar_url: null,
    weight_class: '93kg',
    federation: 'USAPL',
    equipment_type: 'raw',
    bio: 'Competing since 2021. Current total: 672.5kg',
  },
  assistant_coach: {
    id: MOCK_USER_IDS.assistant_coach,
    email: 'assistant@powerplus.app',
    full_name: 'Ryan Park',
    display_name: 'Coach Ryan',
    platform_role: 'user',
    self_coach: false,
    avatar_url: null,
    weight_class: null,
    federation: 'USAPL',
    equipment_type: 'raw',
    bio: 'Assistant coach focused on technique and athlete monitoring.',
    role: 'coach',
  },
}

// ─── Platform-level user list for super_admin demo view ─────────────────────
// Mirrors what fetchAllPlatformUsers() returns from Supabase.
// Iron North Athletics users are tagged so is_demo filtering works in demo mode.
export const MOCK_PLATFORM_USERS = [
  // Super admin — not counted in production user metrics
  { id: MOCK_USER_IDS.super_admin,    email: 'superadmin@powerplus.app',  full_name: 'Alex Rivera',    display_name: 'Alex (Platform Admin)', platform_role: 'super_admin', role: 'super_admin',  is_demo: true,  created_at: '2023-10-01' },
  // Iron North Athletics — demo org, excluded from all production KPIs
  { id: MOCK_USER_IDS.admin,          email: 'admin@powerplus.app',       full_name: 'Marcus Webb',    display_name: 'Coach Marcus',          platform_role: 'user',        role: 'head_coach',   is_demo: true,  created_at: '2024-01-10' },
  { id: MOCK_USER_IDS.coach,          email: 'coach@powerplus.app',       full_name: 'Elena Torres',   display_name: 'Coach Elena',           platform_role: 'user',        role: 'coach',        is_demo: true,  created_at: '2024-01-15' },
  { id: MOCK_USER_IDS.nutritionist,   email: 'nutrition@powerplus.app',   full_name: 'Dr. Priya Nair', display_name: 'Dr. Priya',             platform_role: 'user',        role: 'nutritionist', is_demo: true,  created_at: '2024-02-10' },
  { id: MOCK_USER_IDS.athlete,        email: 'athlete@powerplus.app',     full_name: 'Jordan Blake',   display_name: 'Jordan',                platform_role: 'user',        role: 'athlete',      is_demo: true,  created_at: '2024-03-01' },
  { id: MOCK_USER_IDS.athlete2,       email: 'sam.price@email.com',       full_name: 'Samantha Price', display_name: 'Samantha',              platform_role: 'user',        role: 'athlete',      is_demo: true,  created_at: '2024-03-05' },
  { id: MOCK_USER_IDS.assistant_coach,email: 'assistant@powerplus.app',   full_name: 'Ryan Park',      display_name: 'Coach Ryan',            platform_role: 'user',        role: 'coach',        is_demo: true,  created_at: '2024-04-01' },
  { id: 'u-coach-002',                email: 'mike@powerplus.com',        full_name: 'Mike Rivera',    display_name: 'Mike Rivera',           platform_role: 'user',        role: 'coach',        is_demo: true,  created_at: '2024-02-20' },
  { id: 'u-ath-003',                  email: 'devon@email.com',           full_name: 'Devon Park',     display_name: 'Devon Park',            platform_role: 'user',        role: 'athlete',      is_demo: true,  created_at: '2024-03-10' },
  // Production orgs — counted in all KPI metrics
  { id: 'u-coach-ext-001', email: 'chris@ironbarbell.com',  full_name: 'Chris Nakamura', display_name: 'Chris Nakamura', platform_role: 'user', role: 'head_coach',   is_demo: false, created_at: '2024-06-01' },
  { id: 'u-ath-ext-001',   email: 'dana@email.com',         full_name: 'Dana Kowalski',  display_name: 'Dana Kowalski',  platform_role: 'user', role: 'athlete',      is_demo: false, created_at: '2024-06-15' },
  { id: 'u-ath-ext-002',   email: 'raj@email.com',          full_name: 'Raj Patel',      display_name: 'Raj Patel',      platform_role: 'user', role: 'athlete',      is_demo: false, created_at: '2024-07-01' },
  { id: 'u-coach-ext-002', email: 'tara@peaklabs.com',      full_name: 'Tara Osei',      display_name: 'Tara Osei',      platform_role: 'user', role: 'head_coach',   is_demo: false, created_at: '2023-11-01' },
  { id: 'u-coach-ext-003', email: 'ben@peaklabs.com',       full_name: 'Ben Foster',     display_name: 'Ben Foster',     platform_role: 'user', role: 'coach',        is_demo: false, created_at: '2023-11-15' },
  { id: 'u-nutri-ext-001', email: 'lucia@peaklabs.com',     full_name: 'Lucia Mendez',   display_name: 'Lucia Mendez',   platform_role: 'user', role: 'nutritionist', is_demo: false, created_at: '2023-12-01' },
  { id: 'u-coach-ext-004', email: 'omar@atlasstrength.com', full_name: 'Omar Shafi',     display_name: 'Omar Shafi',     platform_role: 'user', role: 'head_coach',   is_demo: false, created_at: '2025-01-15' },
]

export const MOCK_ATHLETES = [
  {
    id: MOCK_USER_IDS.athlete, full_name: 'Jordan Blake', weight_class: '93kg',
    federation: 'USAPL', member_id: 'USAPL-93-10284', equipment_type: 'raw',
    adherence: 87, e1rm_squat: 220, e1rm_bench: 155, e1rm_deadlift: 280,
    last_session: '2026-02-27', flags: [], avatar_url: null,
    bodyweight_kg: 91.5,
    bio: 'Competing since 2021. 4x USAPL state competitor. Currently in meet prep for Spring Classic 2026.',
    dietary_profile: {
      restrictions: ['none'],
      allergens: ['none'],
      intolerances: [],
      preferences: ['high-protein', 'meal-prep-friendly'],
      weekly_food_budget: 175,
      notes: 'No restrictions. Prefers batch-cooked meals. Extra carbs on heavy training days.',
    },
    current_block_id: 'tb-2',
    next_meet_id: 'meet-1',
    goal_ids: ['g1', 'g4'],
    sleep_avg: 7.2,
    nutrition_compliance: 84,
    rpe_avg_this_week: 8.3,
    sessions_this_week: 4,
    sessions_planned_this_week: 5,
    injury_notes: 'Minor left hip tightness noted 2026-02-14. Monitoring. No load modifications.',
    check_in_trend: [
      { week: 'W5', sleep: 6.8, soreness: 6, stress: 5, energy: 7, bodyweight: 91.2 },
      { week: 'W6', sleep: 7.0, soreness: 5, stress: 4, energy: 7, bodyweight: 91.4 },
      { week: 'W7', sleep: 7.4, soreness: 7, stress: 6, energy: 6, bodyweight: 91.5 },
      { week: 'W8', sleep: 7.2, soreness: 6, stress: 5, energy: 8, bodyweight: 91.5 },
    ],
    recent_sessions: [
      { date: '2026-02-27', name: 'Week 8 Day 4 – Squat + Bench', rpe: 7.0, sets: 9, top_lift: 'Pause Squat 170kg x3' },
      { date: '2026-02-25', name: 'Week 8 Day 3 – Heavy Deadlift', rpe: 8.2, sets: 7, top_lift: 'Deadlift 255kg x2' },
      { date: '2026-02-24', name: 'Week 8 Day 2 – Heavy Bench', rpe: 8.0, sets: 8, top_lift: 'Bench 120kg x3' },
      { date: '2026-02-21', name: 'Week 8 Day 1 – Heavy Squat', rpe: 8.5, sets: 11, top_lift: 'Back Squat 210kg x3' },
    ],
    coach_notes: 'Responding well to intensification. Watch bar path on heavy squats. Consider slight volume cut next week before peak. Hip flexibility work ongoing.',
    nutrition_macros: { plan: { calories: 3200, protein: 200, carbs: 380, fat: 90 }, actual: { calories: 2850, protein: 178, carbs: 340, fat: 82 } },
  },
  {
    id: MOCK_USER_IDS.athlete2, full_name: 'Samantha Price', weight_class: '72kg',
    federation: 'USAPL', member_id: 'USAPL-72-08847', equipment_type: 'raw',
    adherence: 92, e1rm_squat: 175, e1rm_bench: 110, e1rm_deadlift: 220,
    last_session: '2026-02-27', flags: ['pain_flag'], avatar_url: null,
    bodyweight_kg: 71.2,
    bio: 'Elite-level 72kg lifter. 3x USAPL nationals qualifier. Specializes in deadlift.',
    dietary_profile: {
      restrictions: ['dairy-free'],
      allergens: ['dairy', 'shellfish'],
      intolerances: ['lactose'],
      preferences: ['anti-inflammatory', 'lower-fat', 'shoulder-recovery'],
      weekly_food_budget: 150,
      notes: 'Dairy allergy — substitute almond milk for cow milk, no cheese. Shellfish allergy. Anti-inflammatory focus for shoulder recovery.',
    },
    current_block_id: 'tb-2',
    next_meet_id: 'meet-1',
    goal_ids: ['g1'],
    sleep_avg: 8.1,
    nutrition_compliance: 91,
    rpe_avg_this_week: 8.0,
    sessions_this_week: 5,
    sessions_planned_this_week: 5,
    injury_notes: 'Right shoulder pain reported 2026-02-26. Bench work modified — no lockout pressing until cleared.',
    check_in_trend: [
      { week: 'W5', sleep: 8.2, soreness: 4, stress: 3, energy: 8, bodyweight: 71.0 },
      { week: 'W6', sleep: 8.0, soreness: 4, stress: 3, energy: 8, bodyweight: 71.1 },
      { week: 'W7', sleep: 7.9, soreness: 5, stress: 4, energy: 7, bodyweight: 71.3 },
      { week: 'W8', sleep: 8.1, soreness: 7, stress: 5, energy: 6, bodyweight: 71.2 },
    ],
    recent_sessions: [
      { date: '2026-02-27', name: 'Bench + Accessories', rpe: 7.5, sets: 12, top_lift: 'Bench 90kg x3 (modified)' },
      { date: '2026-02-25', name: 'Heavy Deadlift', rpe: 8.5, sets: 8, top_lift: 'Deadlift 175kg x2' },
      { date: '2026-02-24', name: 'Squat Day', rpe: 8.0, sets: 10, top_lift: 'Back Squat 152.5kg x2' },
      { date: '2026-02-21', name: 'Bench Day', rpe: 7.0, sets: 10, top_lift: 'Bench 90kg x3' },
    ],
    coach_notes: 'Shoulder needs monitoring. Cleared for squat/DL, bench on hold. Nutrition compliance exceptional. May need weight cut protocol in 4 weeks.',
    nutrition_macros: { plan: { calories: 2400, protein: 165, carbs: 280, fat: 70 }, actual: { calories: 2360, protein: 162, carbs: 276, fat: 68 } },
  },
  {
    id: 'u-ath-003', full_name: 'Devon Cruz', weight_class: '120kg',
    federation: 'USAPL', member_id: 'USAPL-120-03391', equipment_type: 'raw',
    adherence: 74, e1rm_squat: 310, e1rm_bench: 220, e1rm_deadlift: 370,
    last_session: '2026-02-25', flags: ['missed_sessions'], avatar_url: null,
    bodyweight_kg: 118.3,
    bio: 'Heaviest lifter on the team. Massive deadlift potential. Availability challenges due to work schedule.',
    dietary_profile: {
      restrictions: ['gluten-free'],
      allergens: ['gluten', 'tree-nuts'],
      intolerances: ['gluten'],
      preferences: ['high-calorie', 'easy-prep'],
      weekly_food_budget: 220,
      notes: 'Celiac disease — strictly gluten-free. Tree nut allergy. Needs calorie-dense, easy-to-prepare meals due to busy work schedule.',
    },
    current_block_id: 'tb-2',
    next_meet_id: 'meet-1',
    goal_ids: [],
    sleep_avg: 6.5,
    nutrition_compliance: 68,
    rpe_avg_this_week: 7.5,
    sessions_this_week: 3,
    sessions_planned_this_week: 5,
    injury_notes: 'No active injuries. General lower back fatigue — normal for block phase. Monitor.',
    check_in_trend: [
      { week: 'W5', sleep: 6.2, soreness: 7, stress: 7, energy: 5, bodyweight: 119.1 },
      { week: 'W6', sleep: 6.4, soreness: 6, stress: 6, energy: 6, bodyweight: 118.8 },
      { week: 'W7', sleep: 6.8, soreness: 5, stress: 5, energy: 6, bodyweight: 118.5 },
      { week: 'W8', sleep: 6.5, soreness: 6, stress: 7, energy: 5, bodyweight: 118.3 },
    ],
    recent_sessions: [
      { date: '2026-02-25', name: 'Heavy Deadlift', rpe: 8.5, sets: 7, top_lift: 'Deadlift 330kg x1' },
      { date: '2026-02-22', name: 'Squat Day', rpe: 7.5, sets: 8, top_lift: 'Back Squat 280kg x3' },
      { date: '2026-02-19', name: 'Bench + Accessories', rpe: 7.0, sets: 10, top_lift: 'Bench 175kg x3' },
    ],
    coach_notes: '2 missed sessions this week (Wednesday + Friday). Needs schedule intervention. Strong when present. Nutrition/sleep coaching needed — both below targets.',
    nutrition_macros: { plan: { calories: 4200, protein: 240, carbs: 480, fat: 120 }, actual: { calories: 2900, protein: 165, carbs: 310, fat: 90 } },
  },
  {
    id: 'u-ath-004', full_name: 'Mia Johansson', weight_class: '63kg',
    federation: 'USAPL', member_id: 'USAPL-63-17452', equipment_type: 'raw',
    adherence: 96, e1rm_squat: 145, e1rm_bench: 92, e1rm_deadlift: 185,
    last_session: '2026-02-28', flags: [], avatar_url: null,
    bodyweight_kg: 62.4,
    bio: 'Most consistent athlete on the roster. First year competing at nationals level. Rapid progression trajectory.',
    dietary_profile: {
      restrictions: ['vegetarian'],
      allergens: ['eggs'],
      intolerances: [],
      preferences: ['plant-based-protein', 'low-fat'],
      weekly_food_budget: 120,
      notes: 'Vegetarian — no meat or fish. Egg allergy. Relies on plant proteins (tofu, legumes, dairy). Budget conscious.',
    },
    current_block_id: 'tb-2',
    next_meet_id: 'meet-1',
    goal_ids: ['g1'],
    sleep_avg: 8.4,
    nutrition_compliance: 94,
    rpe_avg_this_week: 8.1,
    sessions_this_week: 5,
    sessions_planned_this_week: 5,
    injury_notes: 'No active issues. Mild knee tracking noted on deep squat — cued with valgus correction drills.',
    check_in_trend: [
      { week: 'W5', sleep: 8.5, soreness: 3, stress: 2, energy: 9, bodyweight: 62.1 },
      { week: 'W6', sleep: 8.6, soreness: 4, stress: 2, energy: 9, bodyweight: 62.2 },
      { week: 'W7', sleep: 8.3, soreness: 3, stress: 3, energy: 8, bodyweight: 62.3 },
      { week: 'W8', sleep: 8.4, soreness: 4, stress: 3, energy: 9, bodyweight: 62.4 },
    ],
    recent_sessions: [
      { date: '2026-02-28', name: 'Week 8 Day 5 – Heavy Squat', rpe: 8.0, sets: 11, top_lift: 'Back Squat 122.5kg x2' },
      { date: '2026-02-26', name: 'Squat + Bench Accessory', rpe: 7.0, sets: 9, top_lift: 'Bench 70kg x2' },
      { date: '2026-02-25', name: 'Heavy Deadlift', rpe: 8.5, sets: 7, top_lift: 'Deadlift 145kg x2' },
      { date: '2026-02-24', name: 'Volume Bench', rpe: 7.5, sets: 10, top_lift: 'Bench 67.5kg x3' },
    ],
    coach_notes: 'Exceptional consistency. On track for a breakthrough total at Spring Classic. Continue current programming. May be ready for elite attempt selection.',
    nutrition_macros: { plan: { calories: 2200, protein: 148, carbs: 260, fat: 62 }, actual: { calories: 2180, protein: 145, carbs: 257, fat: 61 } },
  },
  {
    id: 'u-ath-005', full_name: 'Carlos Mendez', weight_class: '83kg',
    federation: 'USAPL', member_id: 'USAPL-83-22167', equipment_type: 'raw',
    adherence: 81, e1rm_squat: 255, e1rm_bench: 175, e1rm_deadlift: 310,
    last_session: '2026-02-26', flags: ['low_sleep'], avatar_url: null,
    bodyweight_kg: 82.1,
    bio: 'Technical lifter with strong squat and deadlift. Sleep and recovery are limiting factors currently.',
    dietary_profile: {
      restrictions: ['none'],
      allergens: ['peanuts', 'soy'],
      intolerances: [],
      preferences: ['quick-prep', 'high-protein'],
      weekly_food_budget: 160,
      notes: 'Peanut allergy (anaphylactic — use almond butter instead). Soy allergy — no soy sauce, tofu, or edamame. Quick-prep meals preferred.',
    },
    current_block_id: 'tb-2',
    next_meet_id: 'meet-2',
    goal_ids: [],
    sleep_avg: 5.8,
    nutrition_compliance: 76,
    rpe_avg_this_week: 7.8,
    sessions_this_week: 4,
    sessions_planned_this_week: 5,
    injury_notes: 'No current injuries. Chronic sleep deprivation flagged — may affect recovery and adaptation.',
    check_in_trend: [
      { week: 'W5', sleep: 5.5, soreness: 7, stress: 8, energy: 4, bodyweight: 82.5 },
      { week: 'W6', sleep: 5.9, soreness: 6, stress: 7, energy: 5, bodyweight: 82.3 },
      { week: 'W7', sleep: 5.7, soreness: 7, stress: 7, energy: 5, bodyweight: 82.2 },
      { week: 'W8', sleep: 5.8, soreness: 6, stress: 8, energy: 4, bodyweight: 82.1 },
    ],
    recent_sessions: [
      { date: '2026-02-26', name: 'Volume Bench', rpe: 7.5, sets: 11, top_lift: 'Bench 145kg x5' },
      { date: '2026-02-24', name: 'Heavy Squat', rpe: 8.5, sets: 9, top_lift: 'Back Squat 245kg x2' },
      { date: '2026-02-22', name: 'Heavy Deadlift', rpe: 8.0, sets: 8, top_lift: 'Deadlift 295kg x2' },
      { date: '2026-02-21', name: 'Bench Day', rpe: 7.0, sets: 9, top_lift: 'Bench 140kg x5' },
    ],
    coach_notes: 'Sleep intervention needed. Consider referring to sports psychologist for stress management. Programming loads held conservative until sleep avg improves above 6.5h.',
    nutrition_macros: { plan: { calories: 3400, protein: 210, carbs: 400, fat: 95 }, actual: { calories: 2650, protein: 162, carbs: 295, fat: 80 } },
  },
  {
    id: 'u-ath-006', full_name: 'Aisha Rahman', weight_class: '84kg',
    federation: 'USAPL', member_id: 'USAPL-84-09938', equipment_type: 'raw',
    adherence: 89, e1rm_squat: 190, e1rm_bench: 120, e1rm_deadlift: 240,
    last_session: '2026-02-27', flags: [], avatar_url: null,
    bodyweight_kg: 83.5,
    bio: 'Second year at 84kg. Versatile lifter with balanced SBD profile. Strong progress on squat this cycle.',
    dietary_profile: {
      restrictions: ['halal'],
      allergens: ['none'],
      intolerances: ['lactose'],
      preferences: ['meal-prep-friendly', 'halal-certified'],
      weekly_food_budget: 145,
      notes: 'Halal only — all meat must be halal-certified. Lactose intolerant (lactase enzyme ok). No pork products.',
    },
    current_block_id: 'tb-2',
    next_meet_id: 'meet-2',
    goal_ids: [],
    sleep_avg: 7.7,
    nutrition_compliance: 86,
    rpe_avg_this_week: 7.9,
    sessions_this_week: 4,
    sessions_planned_this_week: 5,
    injury_notes: 'No active issues.',
    check_in_trend: [
      { week: 'W5', sleep: 7.4, soreness: 4, stress: 4, energy: 7, bodyweight: 83.8 },
      { week: 'W6', sleep: 7.8, soreness: 4, stress: 3, energy: 8, bodyweight: 83.6 },
      { week: 'W7', sleep: 7.6, soreness: 5, stress: 4, energy: 7, bodyweight: 83.5 },
      { week: 'W8', sleep: 7.7, soreness: 4, stress: 4, energy: 7, bodyweight: 83.5 },
    ],
    recent_sessions: [
      { date: '2026-02-27', name: 'Squat + Accessories', rpe: 8.0, sets: 10, top_lift: 'Back Squat 182.5kg x2' },
      { date: '2026-02-25', name: 'Deadlift Day', rpe: 8.2, sets: 8, top_lift: 'Deadlift 230kg x2' },
      { date: '2026-02-24', name: 'Bench + Accessories', rpe: 7.5, sets: 11, top_lift: 'Bench 112.5kg x3' },
      { date: '2026-02-21', name: 'Heavy Squat', rpe: 8.5, sets: 10, top_lift: 'Back Squat 185kg x2' },
    ],
    coach_notes: 'Solid across the board. Squat progressed +15kg since last block. Would benefit from extra bench volume — currently the limiting lift. Consider adding 1 bench-specific session.',
    nutrition_macros: { plan: { calories: 2900, protein: 185, carbs: 340, fat: 82 }, actual: { calories: 2620, protein: 168, carbs: 308, fat: 74 } },
  },
]

export const MOCK_PAST_WORKOUTS = [
  {
    id: 'ws-h1',
    name: 'Week 7 Day 4 – Volume Bench',
    date: '2026-02-26',
    duration: 68,
    avg_rpe: 7.5,
    total_sets: 18,
    total_volume_kg: 4320,
    linked_block_id: 'tb-2',
    dots: null,
    notes: 'Touch-and-go felt smooth. Triceps fatigued by last set.',
    blocks: [
      {
        type: 'main', label: 'Main Lift – Bench',
        exercises: [
          {
            id: 'e5', name: 'Bench Press',
            sets_logged: [
              { set: 1, weight_kg: 110, reps: 5, rpe: 7, is_top_set: false, media: [] },
              { set: 2, weight_kg: 112.5, reps: 5, rpe: 7.5, is_top_set: false, media: [] },
              { set: 3, weight_kg: 115, reps: 5, rpe: 8, is_top_set: true, media: [{ type: 'video', url: null, label: 'Top set – side view' }] },
              { set: 4, weight_kg: 112.5, reps: 5, rpe: 8, is_top_set: false, media: [] },
              { set: 5, weight_kg: 110, reps: 5, rpe: 7.5, is_top_set: false, media: [] },
            ]
          }
        ]
      },
      {
        type: 'accessory', label: 'Accessory',
        exercises: [
          {
            id: 'e6', name: 'Close Grip Bench',
            sets_logged: [
              { set: 1, weight_kg: 90, reps: 8, rpe: 7, is_top_set: false, media: [] },
              { set: 2, weight_kg: 90, reps: 8, rpe: 7.5, is_top_set: false, media: [] },
              { set: 3, weight_kg: 90, reps: 7, rpe: 8, is_top_set: false, media: [] },
            ]
          },
          {
            id: 'e7', name: 'Tricep Pushdown',
            sets_logged: [
              { set: 1, weight_kg: 40, reps: 15, rpe: 6, is_top_set: false, media: [] },
              { set: 2, weight_kg: 40, reps: 14, rpe: 6.5, is_top_set: false, media: [] },
              { set: 3, weight_kg: 40, reps: 12, rpe: 7, is_top_set: false, media: [] },
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'ws-h2',
    name: 'Week 7 Day 3 – Heavy Deadlift',
    date: '2026-02-25',
    duration: 82,
    avg_rpe: 8.2,
    total_sets: 14,
    total_volume_kg: 6800,
    linked_block_id: 'tb-2',
    dots: null,
    notes: 'Hips shot up on 4th set. Coach flagged lockout. Lower back tight after.',
    blocks: [
      {
        type: 'main', label: 'Main Lift – Deadlift',
        exercises: [
          {
            id: 'e9', name: 'Conventional Deadlift',
            sets_logged: [
              { set: 1, weight_kg: 220, reps: 3, rpe: 7.5, is_top_set: false, media: [] },
              { set: 2, weight_kg: 240, reps: 3, rpe: 8, is_top_set: false, media: [] },
              { set: 3, weight_kg: 255, reps: 2, rpe: 8.5, is_top_set: true, media: [{ type: 'video', url: null, label: 'Top set – front angle' }] },
              { set: 4, weight_kg: 255, reps: 2, rpe: 9, is_top_set: false, media: [] },
            ]
          }
        ]
      },
      {
        type: 'accessory', label: 'Accessory',
        exercises: [
          {
            id: 'e11', name: 'Romanian Deadlift',
            sets_logged: [
              { set: 1, weight_kg: 140, reps: 8, rpe: 7, is_top_set: false, media: [] },
              { set: 2, weight_kg: 140, reps: 8, rpe: 7.5, is_top_set: false, media: [] },
              { set: 3, weight_kg: 140, reps: 7, rpe: 8, is_top_set: false, media: [] },
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'ws-h3',
    name: 'Week 7 Day 1 – Heavy Squat',
    date: '2026-02-21',
    duration: 91,
    avg_rpe: 8.5,
    total_sets: 20,
    total_volume_kg: 8400,
    linked_block_id: 'tb-2',
    dots: null,
    notes: 'Depth was solid. Bar path drifted forward on last set. Need to cue chest up.',
    blocks: [
      {
        type: 'main', label: 'Main Lift – Squat',
        exercises: [
          {
            id: 'e1', name: 'Back Squat',
            sets_logged: [
              { set: 1, weight_kg: 180, reps: 3, rpe: 7, is_top_set: false, media: [] },
              { set: 2, weight_kg: 195, reps: 3, rpe: 7.5, is_top_set: false, media: [] },
              { set: 3, weight_kg: 205, reps: 3, rpe: 8, is_top_set: false, media: [] },
              { set: 4, weight_kg: 210, reps: 3, rpe: 8.5, is_top_set: true, media: [{ type: 'photo', url: null, label: 'Bar path analysis' }, { type: 'video', url: null, label: 'Top set – side view' }] },
              { set: 5, weight_kg: 205, reps: 3, rpe: 8.5, is_top_set: false, media: [] },
            ]
          }
        ]
      },
      {
        type: 'accessory', label: 'Accessory',
        exercises: [
          {
            id: 'e4', name: 'Romanian Deadlift',
            sets_logged: [
              { set: 1, weight_kg: 120, reps: 8, rpe: 7, is_top_set: false, media: [] },
              { set: 2, weight_kg: 120, reps: 8, rpe: 7.5, is_top_set: false, media: [] },
              { set: 3, weight_kg: 120, reps: 8, rpe: 7.5, is_top_set: false, media: [] },
            ]
          },
          {
            id: 'e18', name: 'Leg Press',
            sets_logged: [
              { set: 1, weight_kg: 200, reps: 12, rpe: 6, is_top_set: false, media: [] },
              { set: 2, weight_kg: 200, reps: 12, rpe: 6.5, is_top_set: false, media: [] },
              { set: 3, weight_kg: 200, reps: 10, rpe: 7, is_top_set: false, media: [] },
            ]
          }
        ]
      }
    ]
  }
]

export const MOCK_TODAY_WORKOUT = {
  id: 'ws-001',
  name: 'Week 8 Day 1 – Heavy Squat',
  scheduled_date: '2026-02-28',
  status: 'planned',
  estimated_duration: 90,
  linked_block_id: 'tb-2',
  blocks: [
    {
      type: 'warmup',
      label: 'Warm-Up',
      exercises: [
        { id: 'e1', name: 'Hip Circle', sets: 2, reps: '15', notes: 'Activate glutes' },
        { id: 'e2', name: 'Goblet Squat', sets: 3, reps: '10', intensity: '20kg', notes: 'Focus on depth' },
      ]
    },
    {
      type: 'main',
      label: 'Main Lift – Squat',
      exercises: [
        { id: 'e3', name: 'Back Squat', sets: 5, reps: '3', intensity: 'RPE 8', notes: 'Competition stance. Video top set.', linked_goal_ids: ['g1', 'g4'] },
      ]
    },
    {
      type: 'accessory',
      label: 'Accessory',
      exercises: [
        { id: 'e4', name: 'Romanian Deadlift', sets: 3, reps: '8', intensity: '100kg', notes: 'Slow eccentric 3s' },
        { id: 'e5', name: 'Leg Press', sets: 3, reps: '12', intensity: '180kg', notes: '' },
        { id: 'e6', name: 'Ab Wheel', sets: 3, reps: '10', intensity: 'BW', notes: '' },
      ]
    },
    {
      type: 'conditioning',
      label: 'Conditioning',
      exercises: [
        { id: 'e7', name: 'Assault Bike', sets: 1, reps: null, exercise_type: 'cardio', duration_min: 10, notes: 'Zone 2 — keep HR <140bpm' },
      ]
    }
  ]
}

// Full week schedule (week of Feb 23–Mar 1, 2026 — "Week 8" of Block 2)
// Today = Feb 28 (Saturday). Week starts Monday Feb 23.
export const MOCK_WEEK_SCHEDULE = [
  {
    id: 'ws-w8d1',
    day: 'Mon',
    date: '2026-02-23',
    name: 'Week 8 Day 1 – Heavy Squat',
    status: 'completed',
    duration: 91,
    avg_rpe: 8.5,
    linked_block_id: 'tb-2',
    estimated_duration: 90,
    notes: 'Depth was solid. Bar path drifted forward on last set.',
    blocks: [
      { type: 'main', label: 'Main Lift – Squat', exercises: [
        { id: 'w8d1-e1', name: 'Back Squat', sets: 5, reps: '3', intensity: 'RPE 8-8.5', notes: 'Competition stance. Video top set.', linked_goal_ids: ['g1', 'g4'],
          sets_logged: [
            { set: 1, weight_kg: 185, reps: 3, rpe: 7.5, is_top_set: false },
            { set: 2, weight_kg: 197.5, reps: 3, rpe: 8, is_top_set: false },
            { set: 3, weight_kg: 207.5, reps: 3, rpe: 8, is_top_set: false },
            { set: 4, weight_kg: 212.5, reps: 3, rpe: 8.5, is_top_set: true, media: [{ type: 'video', label: 'Top set – side view' }] },
            { set: 5, weight_kg: 207.5, reps: 3, rpe: 8.5, is_top_set: false },
          ]},
      ]},
      { type: 'accessory', label: 'Accessory', exercises: [
        { id: 'w8d1-e2', name: 'Romanian Deadlift', sets: 3, reps: '8', intensity: '110kg', notes: '',
          sets_logged: [
            { set: 1, weight_kg: 110, reps: 8, rpe: 7, is_top_set: false },
            { set: 2, weight_kg: 110, reps: 8, rpe: 7.5, is_top_set: false },
            { set: 3, weight_kg: 110, reps: 7, rpe: 8, is_top_set: false },
          ]},
        { id: 'w8d1-e3', name: 'Leg Press', sets: 3, reps: '12', intensity: '200kg', notes: '',
          sets_logged: [
            { set: 1, weight_kg: 200, reps: 12, rpe: 6, is_top_set: false },
            { set: 2, weight_kg: 200, reps: 12, rpe: 6.5, is_top_set: false },
            { set: 3, weight_kg: 200, reps: 10, rpe: 7, is_top_set: false },
          ]},
      ]},
    ],
  },
  {
    id: 'ws-w8d2',
    day: 'Tue',
    date: '2026-02-24',
    name: 'Week 8 Day 2 – Volume Bench',
    status: 'completed',
    duration: 68,
    avg_rpe: 7.5,
    linked_block_id: 'tb-2',
    estimated_duration: 75,
    notes: 'Touch-and-go felt smooth. Triceps fatigued by last set.',
    blocks: [
      { type: 'main', label: 'Main Lift – Bench', exercises: [
        { id: 'w8d2-e1', name: 'Bench Press', sets: 5, reps: '5', intensity: 'RPE 7.5', notes: '', linked_goal_ids: ['g1'],
          sets_logged: [
            { set: 1, weight_kg: 110, reps: 5, rpe: 7, is_top_set: false },
            { set: 2, weight_kg: 112.5, reps: 5, rpe: 7.5, is_top_set: false },
            { set: 3, weight_kg: 115, reps: 5, rpe: 8, is_top_set: true, media: [{ type: 'video', label: 'Top set – side view' }] },
            { set: 4, weight_kg: 112.5, reps: 5, rpe: 8, is_top_set: false },
            { set: 5, weight_kg: 110, reps: 5, rpe: 7.5, is_top_set: false },
          ]},
      ]},
      { type: 'accessory', label: 'Accessory', exercises: [
        { id: 'w8d2-e2', name: 'Close Grip Bench', sets: 3, reps: '8', intensity: '90kg', notes: '',
          sets_logged: [
            { set: 1, weight_kg: 90, reps: 8, rpe: 7, is_top_set: false },
            { set: 2, weight_kg: 90, reps: 8, rpe: 7.5, is_top_set: false },
            { set: 3, weight_kg: 90, reps: 7, rpe: 8, is_top_set: false },
          ]},
      ]},
    ],
  },
  {
    id: 'ws-w8d3',
    day: 'Wed',
    date: '2026-02-25',
    name: 'Week 8 Day 3 – Heavy Deadlift',
    status: 'completed',
    duration: 82,
    avg_rpe: 8.2,
    linked_block_id: 'tb-2',
    estimated_duration: 85,
    notes: 'Hips shot up on 4th set. Coach flagged lockout. Lower back tight after.',
    blocks: [
      { type: 'main', label: 'Main Lift – Deadlift', exercises: [
        { id: 'w8d3-e1', name: 'Conventional Deadlift', sets: 4, reps: '2-3', intensity: 'RPE 8.5', notes: '', linked_goal_ids: ['g1'],
          sets_logged: [
            { set: 1, weight_kg: 220, reps: 3, rpe: 7.5, is_top_set: false },
            { set: 2, weight_kg: 240, reps: 3, rpe: 8, is_top_set: false },
            { set: 3, weight_kg: 255, reps: 2, rpe: 8.5, is_top_set: true, media: [{ type: 'video', label: 'Top set – front angle' }] },
            { set: 4, weight_kg: 255, reps: 2, rpe: 9, is_top_set: false },
          ]},
      ]},
      { type: 'accessory', label: 'Accessory', exercises: [
        { id: 'w8d3-e2', name: 'Romanian Deadlift', sets: 3, reps: '8', intensity: '140kg', notes: '',
          sets_logged: [
            { set: 1, weight_kg: 140, reps: 8, rpe: 7, is_top_set: false },
            { set: 2, weight_kg: 140, reps: 8, rpe: 7.5, is_top_set: false },
            { set: 3, weight_kg: 140, reps: 7, rpe: 8, is_top_set: false },
          ]},
      ]},
    ],
  },
  {
    id: 'ws-w8d4',
    day: 'Thu',
    date: '2026-02-26',
    name: 'Week 8 Day 4 – Squat + Bench Accessory',
    status: 'completed',
    duration: 55,
    avg_rpe: 7.0,
    linked_block_id: 'tb-2',
    estimated_duration: 60,
    notes: 'Deload-style. Everything felt light.',
    blocks: [
      { type: 'main', label: 'Main Work', exercises: [
        { id: 'w8d4-e1', name: 'Pause Squat', sets: 3, reps: '3', intensity: '170kg', notes: '2s pause', linked_goal_ids: ['g4'],
          sets_logged: [
            { set: 1, weight_kg: 160, reps: 3, rpe: 6.5, is_top_set: false },
            { set: 2, weight_kg: 170, reps: 3, rpe: 7, is_top_set: true },
            { set: 3, weight_kg: 170, reps: 3, rpe: 7.5, is_top_set: false },
          ]},
        { id: 'w8d4-e2', name: 'Bench Press', sets: 3, reps: '5', intensity: '100kg', notes: '',
          sets_logged: [
            { set: 1, weight_kg: 100, reps: 5, rpe: 6, is_top_set: false },
            { set: 2, weight_kg: 105, reps: 5, rpe: 6.5, is_top_set: true },
            { set: 3, weight_kg: 105, reps: 5, rpe: 7, is_top_set: false },
          ]},
      ]},
    ],
  },
  {
    id: 'ws-w8d5',
    day: 'Sat',
    date: '2026-02-28',
    name: 'Week 8 Day 5 – Heavy Squat',
    status: 'today',
    estimated_duration: 90,
    linked_block_id: 'tb-2',
    notes: '',
    blocks: [
      { type: 'warmup', label: 'Warm-Up', exercises: [
        { id: 'e1', name: 'Hip Circle', sets: 2, reps: '15', notes: 'Activate glutes' },
        { id: 'e2', name: 'Goblet Squat', sets: 3, reps: '10', intensity: '20kg', notes: 'Focus on depth' },
      ]},
      { type: 'main', label: 'Main Lift – Squat', exercises: [
        { id: 'e3', name: 'Back Squat', sets: 5, reps: '3', intensity: 'RPE 8', notes: 'Competition stance. Video top set.', linked_goal_ids: ['g1', 'g4'] },
      ]},
      { type: 'accessory', label: 'Accessory', exercises: [
        { id: 'e4', name: 'Romanian Deadlift', sets: 3, reps: '8', intensity: '100kg', notes: 'Slow eccentric 3s' },
        { id: 'e5', name: 'Leg Press', sets: 3, reps: '12', intensity: '180kg', notes: '' },
        { id: 'e6', name: 'Ab Wheel', sets: 3, reps: '10', intensity: 'BW', notes: '' },
      ]},
      { type: 'conditioning', label: 'Conditioning', exercises: [
        { id: 'e7', name: 'Assault Bike', sets: 1, reps: null, exercise_type: 'cardio', duration_min: 10, notes: 'Zone 2 — keep HR <140bpm' },
      ]},
    ],
  },
  {
    id: 'ws-w8d6',
    day: 'Sun',
    date: '2026-03-01',
    name: 'Active Recovery',
    status: 'scheduled',
    estimated_duration: 30,
    linked_block_id: 'tb-2',
    notes: 'Mobility + light cardio. Optional.',
    blocks: [
      { type: 'conditioning', label: 'Recovery', exercises: [
        { id: 'rec-e1', name: 'Foam Rolling', sets: 1, reps: null, exercise_type: 'cardio', duration_min: 15, notes: 'Full body' },
        { id: 'rec-e2', name: 'Stationary Bike', sets: 1, reps: null, exercise_type: 'cardio', duration_min: 20, notes: 'Zone 1 — keep HR <120bpm' },
      ]},
    ],
  },
]

export const MOCK_STRENGTH_TREND = [
  { date: 'Oct', squat: 195, bench: 137, deadlift: 252 },
  { date: 'Nov', squat: 202, bench: 140, deadlift: 260 },
  { date: 'Dec', squat: 207, bench: 143, deadlift: 265 },
  { date: 'Jan', squat: 212, bench: 147, deadlift: 270 },
  { date: 'Feb', squat: 220, bench: 155, deadlift: 280 },
]

export const MOCK_ADHERENCE_TREND = [
  { week: 'W1', adherence: 80, nutrition: 72 },
  { week: 'W2', adherence: 85, nutrition: 78 },
  { week: 'W3', adherence: 78, nutrition: 74 },
  { week: 'W4', adherence: 90, nutrition: 82 },
  { week: 'W5', adherence: 87, nutrition: 85 },
  { week: 'W6', adherence: 92, nutrition: 88 },
  { week: 'W7', adherence: 88, nutrition: 86 },
  { week: 'W8', adherence: 87, nutrition: 84 },
]

export const MOCK_TEAM_ADHERENCE = [
  { athlete: 'Jordan', adherence: 87 },
  { athlete: 'Samantha', adherence: 92 },
  { athlete: 'Devon', adherence: 74 },
  { athlete: 'Mia', adherence: 96 },
  { athlete: 'Carlos', adherence: 81 },
  { athlete: 'Aisha', adherence: 89 },
]

export const MOCK_MESSAGES = [
  {
    id: 'm1',
    channel: 'general',
    sender: { id: 'u-coach-001', name: 'Coach Elena', role: 'coach' },
    content: 'Great training week everyone! Remember to log your check-ins tonight 💪',
    timestamp: '2026-02-28T09:15:00Z',
    reactions: [{ emoji: '💪', count: 5 }, { emoji: '🔥', count: 3 }],
  },
  {
    id: 'm2',
    channel: 'general',
    sender: { id: MOCK_USER_IDS.athlete, name: 'Jordan Blake', role: 'athlete' },
    content: 'Hit a new squat PR today – 215kg! Thanks for the programming 🙏',
    timestamp: '2026-02-28T11:30:00Z',
    reactions: [{ emoji: '🎉', count: 8 }, { emoji: '💪', count: 6 }],
  },
  {
    id: 'm3',
    channel: 'general',
    sender: { id: 'u-ath-004', name: 'Mia Johansson', role: 'athlete' },
    content: 'Quick question: can I swap RDLs for leg curls today? My hamstrings are really sore.',
    timestamp: '2026-02-28T14:00:00Z',
    reactions: [],
  },
  {
    id: 'm4',
    channel: 'general',
    sender: { id: 'u-coach-001', name: 'Coach Elena', role: 'coach' },
    content: '@Mia Yes, leg curl 3x12 is fine. Just note it in your log. Check your soreness score tonight too.',
    timestamp: '2026-02-28T14:22:00Z',
    reactions: [{ emoji: '✅', count: 1 }],
  },
]

export const MOCK_CHANNELS = [
  { id: 'ch-1', name: 'general', type: 'public', unread: 2 },
  { id: 'ch-2', name: 'announcements', type: 'announcement', unread: 0 },
  { id: 'ch-3', name: 'wins-board', type: 'public', unread: 1 },
  { id: 'ch-4', name: 'meet-prep-spring-2026', type: 'private', unread: 0 },
  { id: 'ch-5', name: 'coaches-only', type: 'private', unread: 3 },
]

export const MOCK_DIRECT_MESSAGES = [
  { id: 'dm-1', with: 'Coach Elena', role: 'coach', unread: 1, last_message: 'Great job on that top set!' },
  { id: 'dm-2', with: 'Dr. Priya', role: 'nutritionist', unread: 0, last_message: "Don't forget your check-in tonight" },
]

export const MOCK_NOTIFICATIONS = [
  { id: 'n1', type: 'workout_reminder', title: 'Workout in 2 hours', body: 'Week 8 Day 1 – Heavy Squat starts at 4pm', read: false, created_at: '2026-02-28T14:00:00Z' },
  { id: 'n2', type: 'message', title: 'Coach Elena commented', body: 'on your top set from Tuesday', read: false, created_at: '2026-02-28T11:00:00Z' },
  { id: 'n3', type: 'pr', title: 'New PR! 🎉', body: 'Jordan Blake hit a new squat PR: 215kg', read: true, created_at: '2026-02-28T09:00:00Z' },
  { id: 'n4', type: 'alert', title: 'Low sleep alert', body: 'Carlos Mendez avg sleep < 6h this week', read: true, created_at: '2026-02-27T08:00:00Z' },
]

export const MOCK_MEETS = [
  {
    id: 'meet-1',
    name: 'Spring Classic 2026',
    federation: 'USAPL',
    location: 'Chicago, IL',
    meet_date: '2026-04-12',
    status: 'upcoming',
    registration_deadline: '2026-03-15',
    athletes_registered: 4,
    equipment: 'raw',
    weight_classes: ['63kg', '83kg', '93kg', '120kg'],
    notes: 'State-level qualifier. Early weigh-in available.',
    attempts: {
      squat: { 1: 192.5, 2: 202.5, 3: 210 },
      bench: { 1: 140, 2: 147.5, 3: 152.5 },
      deadlift: { 1: 260, 2: 272.5, 3: 282.5 },
    },
    linked_goal_ids: ['g1', 'g4'],
    linked_block_ids: ['tb-1'],
  },
  {
    id: 'meet-2',
    name: 'State Championships',
    federation: 'USAPL',
    location: 'Austin, TX',
    meet_date: '2026-06-20',
    status: 'upcoming',
    registration_deadline: '2026-05-20',
    athletes_registered: 2,
    equipment: 'raw',
    weight_classes: ['72kg', '84kg'],
    notes: '',
    attempts: {
      squat: { 1: 200, 2: 210, 3: 217.5 },
      bench: { 1: 145, 2: 152.5, 3: 157.5 },
      deadlift: { 1: 267.5, 2: 277.5, 3: 287.5 },
    },
    linked_goal_ids: ['g1'],
    linked_block_ids: ['tb-2'],
  },
]

export const MOCK_TRAINING_BLOCKS = [
  {
    id: 'tb-1',
    name: 'Spring Classic Prep – Block 1 (Hypertrophy)',
    phase: 'accumulation',
    start_date: '2026-01-06',
    end_date: '2026-02-02',
    weeks: 4,
    status: 'completed',
    linked_meet_id: 'meet-1',
    linked_goal_ids: ['g1'],
    focus: 'Volume & Technique',
    avg_rpe_target: 7.5,
    sessions_planned: 16,
    sessions_completed: 15,
    notes: 'High volume accumulation. Focus on technique and GPP.',
    color: 'blue',
  },
  {
    id: 'tb-2',
    name: 'Spring Classic Prep – Block 2 (Intensification)',
    phase: 'intensification',
    start_date: '2026-02-03',
    end_date: '2026-03-02',
    weeks: 4,
    status: 'active',
    linked_meet_id: 'meet-1',
    linked_goal_ids: ['g1', 'g4'],
    focus: 'Strength & Peaking',
    avg_rpe_target: 8.5,
    sessions_planned: 16,
    sessions_completed: 4,
    notes: 'Reduce volume, increase intensity. Competition specificity.',
    color: 'purple',
  },
  {
    id: 'tb-3',
    name: 'Spring Classic Prep – Block 3 (Peaking)',
    phase: 'peaking',
    start_date: '2026-03-03',
    end_date: '2026-03-29',
    weeks: 4,
    status: 'planned',
    linked_meet_id: 'meet-1',
    linked_goal_ids: ['g1', 'g4'],
    focus: 'Peak & Taper',
    avg_rpe_target: 9,
    sessions_planned: 12,
    sessions_completed: 0,
    notes: 'Singles and attempt selection. Deload final week.',
    color: 'orange',
  },
  {
    id: 'tb-4',
    name: 'State Championships – Offseason Base',
    phase: 'accumulation',
    start_date: '2026-04-21',
    end_date: '2026-05-18',
    weeks: 4,
    status: 'planned',
    linked_meet_id: 'meet-2',
    linked_goal_ids: ['g1'],
    focus: 'GPP & Volume',
    avg_rpe_target: 7,
    sessions_planned: 16,
    sessions_completed: 0,
    notes: 'Post-meet recovery then volume rebuild.',
    color: 'green',
  },
]

export const MOCK_GOALS = [
  {
    id: 'g1',
    title: '650kg Total',
    goal_type: 'strength',
    target_value: 650,
    current_value: 610,
    target_unit: 'kg',
    target_date: '2026-08-01',
    completed: false,
    notes: 'Squat 220 + Bench 155 + Deadlift 280 = 655kg projection. Need +40kg total.',
    progress_history: [
      { date: '2025-10-01', value: 565, source: 'Meet – Fall Open', session_id: null },
      { date: '2025-11-15', value: 572.5, source: 'Gym projection', session_id: null },
      { date: '2025-12-20', value: 582, source: 'Gym projection', session_id: null },
      { date: '2026-01-10', value: 590, source: 'Gym projection', session_id: null },
      { date: '2026-01-31', value: 597.5, source: 'Block 1 peak', session_id: null },
      { date: '2026-02-13', value: 604, source: 'Block 2 – squat PR', session_id: 'ws-h3' },
      { date: '2026-02-21', value: 610, source: 'Block 2 – combined PR projection', session_id: 'ws-h3' },
    ],
  },
  {
    id: 'g2',
    title: '7.5h avg sleep',
    goal_type: 'process',
    target_value: 7.5,
    current_value: 6.8,
    target_unit: 'hours',
    target_date: null,
    completed: false,
    notes: 'Tracking 7-day rolling average via check-in.',
    progress_history: [
      { date: '2026-01-01', value: 6.0, source: 'Check-in W1' },
      { date: '2026-01-08', value: 6.2, source: 'Check-in W2' },
      { date: '2026-01-15', value: 6.5, source: 'Check-in W3' },
      { date: '2026-01-22', value: 6.6, source: 'Check-in W4' },
      { date: '2026-02-01', value: 6.7, source: 'Check-in W5' },
      { date: '2026-02-14', value: 6.8, source: 'Check-in W6' },
    ],
  },
  {
    id: 'g3',
    title: '200g protein/day',
    goal_type: 'nutrition',
    target_value: 200,
    current_value: 185,
    target_unit: 'g',
    target_date: null,
    completed: false,
    notes: 'Logged via nutrition check-in. 7-day rolling average.',
    progress_history: [
      { date: '2026-01-01', value: 155, source: 'Nutrition W1' },
      { date: '2026-01-15', value: 165, source: 'Nutrition W3' },
      { date: '2026-02-01', value: 172, source: 'Nutrition W5' },
      { date: '2026-02-14', value: 180, source: 'Nutrition W7' },
      { date: '2026-02-21', value: 185, source: 'Nutrition W8' },
    ],
  },
  {
    id: 'g4',
    title: 'Open at 200kg squat at Spring Classic',
    goal_type: 'meet',
    target_value: 200,
    current_value: null,
    target_unit: 'kg',
    target_date: '2026-04-12',
    completed: false,
    notes: 'Attempt selection set to 192.5kg opener. Target 202.5 on 2nd, 210 on 3rd. Current training max ~215kg.',
    progress_history: [
      { date: '2026-01-10', value: 185, source: 'Block 1 – training max', session_id: null },
      { date: '2026-01-31', value: 190, source: 'Block 1 peak', session_id: null },
      { date: '2026-02-13', value: 195, source: 'Block 2 – squat session', session_id: 'ws-h3' },
    ],
  },
]

export const MOCK_EXERCISES = [
  { id: 'ex-1', name: 'Back Squat', category: 'squat', is_competition_lift: true },
  { id: 'ex-2', name: 'Bench Press', category: 'bench', is_competition_lift: true },
  { id: 'ex-3', name: 'Conventional Deadlift', category: 'deadlift', is_competition_lift: true },
  { id: 'ex-4', name: 'Sumo Deadlift', category: 'deadlift', is_competition_lift: false },
  { id: 'ex-5', name: 'Romanian Deadlift', category: 'accessory', is_competition_lift: false },
  { id: 'ex-6', name: 'Leg Press', category: 'accessory', is_competition_lift: false },
  { id: 'ex-7', name: 'Close Grip Bench', category: 'bench', is_competition_lift: false },
  { id: 'ex-8', name: 'Pull-Ups', category: 'accessory', is_competition_lift: false },
  { id: 'ex-9', name: 'Overhead Press', category: 'accessory', is_competition_lift: false },
  { id: 'ex-10', name: 'Bulgarian Split Squat', category: 'accessory', is_competition_lift: false },
]

export const MOCK_RESOURCES = [
  { id: 'r1', title: 'Meet Day Checklist', category: 'meet_day', tags: ['competition', 'checklist'], updated_at: '2026-01-15' },
  { id: 'r2', title: 'Attempt Selection Guide', category: 'meet_day', tags: ['attempts', 'strategy'], updated_at: '2026-01-10' },
  { id: 'r3', title: 'RPE Calibration Guide', category: 'technique', tags: ['rpe', 'autoregulation'], updated_at: '2026-02-01' },
  { id: 'r4', title: 'Competition Warm-Up Protocol', category: 'meet_day', tags: ['warmup', 'competition'], updated_at: '2026-01-20' },
  { id: 'r5', title: 'Squat Technique Checklist', category: 'technique', tags: ['squat', 'form'], updated_at: '2026-02-10' },
  { id: 'r6', title: 'Recovery Strategies for Powerlifters', category: 'recovery', tags: ['recovery', 'sleep'], updated_at: '2026-02-15' },
]

// ─── Injury Logs ─────────────────────────────────────────────────────────────
export const MOCK_INJURY_LOGS = [
  {
    id: 'inj-001',
    athlete_id: MOCK_USER_IDS.athlete,
    body_area: 'Left Hip',
    pain_level: 3,
    injury_date: '2026-02-14',
    description: 'Minor tightness in left hip flexor. Likely from high-bar squat volume.',
    movement_affected: ['Back Squat', 'Leg Press'],
    resolved: false,
    resolved_date: null,
    reported_to_coach: true,
    coach_notes: 'Monitoring. No load modifications yet. Added hip mobility work pre-session.',
    log_history: [
      { date: '2026-02-14', pain_level: 5, note: 'First reported. Tight post-session.', reporter: 'athlete' },
      { date: '2026-02-18', pain_level: 4, note: 'Slightly better after mobility work.', reporter: 'athlete' },
      { date: '2026-02-21', pain_level: 3, note: 'Improving. No sharp pain during squats.', reporter: 'athlete' },
      { date: '2026-02-28', pain_level: 3, note: 'Stable. Continuing mobility protocol.', reporter: 'athlete' },
    ],
  },
  {
    id: 'inj-002',
    athlete_id: MOCK_USER_IDS.athlete,
    body_area: 'Lower Back',
    pain_level: 0,
    injury_date: '2025-11-05',
    description: 'Mild lower back fatigue from deadlift block. General DOMS-level.',
    movement_affected: ['Conventional Deadlift'],
    resolved: true,
    resolved_date: '2025-12-01',
    reported_to_coach: true,
    coach_notes: 'Resolved after deload week. Standard block fatigue.',
    log_history: [
      { date: '2025-11-05', pain_level: 4, note: 'After heavy deadlift session. Dull ache.', reporter: 'athlete' },
      { date: '2025-11-12', pain_level: 3, note: 'Better. Foam rolling helping.', reporter: 'athlete' },
      { date: '2025-11-26', pain_level: 1, note: 'Nearly gone after deload.', reporter: 'athlete' },
      { date: '2025-12-01', pain_level: 0, note: 'Cleared.', reporter: 'coach' },
    ],
  },
  {
    id: 'inj-003',
    athlete_id: MOCK_USER_IDS.athlete,
    body_area: 'Right Wrist',
    pain_level: 0,
    injury_date: '2025-08-20',
    description: 'Wrist soreness from high bench volume during off-season.',
    movement_affected: ['Bench Press', 'Close Grip Bench'],
    resolved: true,
    resolved_date: '2025-09-10',
    reported_to_coach: false,
    coach_notes: '',
    log_history: [
      { date: '2025-08-20', pain_level: 5, note: 'Acute soreness post-bench. Wrapped wrist.', reporter: 'athlete' },
      { date: '2025-08-27', pain_level: 3, note: 'Better with wrist wraps.', reporter: 'athlete' },
      { date: '2025-09-10', pain_level: 0, note: 'Fully resolved.', reporter: 'athlete' },
    ],
  },
]

export const MOCK_NUTRITION_TODAY = {
  plan: { calories: 3200, protein: 200, carbs: 380, fat: 90, water: 4000 },
  actual: { calories: 2850, protein: 178, carbs: 340, fat: 82, water: 3200 },
  compliance: 84,
  supplements: [
    { name: 'Creatine 5g', taken: true },
    { name: 'Vitamin D3 5000IU', taken: true },
    { name: 'Electrolytes', taken: false },
    { name: 'Fish Oil 3g', taken: false },
  ]
}

export const MOCK_WEEKLY_REVIEW_QUEUE = [
  { athlete: 'Jordan Blake', session: 'Heavy Squat', status: 'video_pending', flag: null },
  { athlete: 'Samantha Price', session: 'Bench + Accessories', status: 'completed', flag: 'pain_flag' },
  { athlete: 'Devon Cruz', session: 'Heavy Deadlift', status: 'missed', flag: 'missed_sessions' },
  { athlete: 'Mia Johansson', session: 'Squat + Accessories', status: 'completed', flag: null },
  { athlete: 'Carlos Mendez', session: 'Bench Day', status: 'completed', flag: 'low_sleep' },
]

// Per-athlete, per-exercise history for trend analysis.
// Each entry: { date: 'YYYY-MM-DD', weight_kg, reps, rpe, e1rm_kg }
export const MOCK_EXERCISE_HISTORY = {
  'Jordan Blake': {
    'Back Squat': [
      { date: '2025-09-05', weight_kg: 185, reps: 3, rpe: 8, e1rm_kg: 204 },
      { date: '2025-09-19', weight_kg: 187.5, reps: 3, rpe: 8, e1rm_kg: 207 },
      { date: '2025-10-03', weight_kg: 190, reps: 3, rpe: 8.5, e1rm_kg: 209 },
      { date: '2025-10-17', weight_kg: 192.5, reps: 3, rpe: 8.5, e1rm_kg: 212 },
      { date: '2025-10-31', weight_kg: 195, reps: 2, rpe: 9, e1rm_kg: 208 },
      { date: '2025-11-14', weight_kg: 197.5, reps: 3, rpe: 8, e1rm_kg: 217 },
      { date: '2025-11-28', weight_kg: 200, reps: 3, rpe: 8.5, e1rm_kg: 220 },
      { date: '2025-12-12', weight_kg: 202.5, reps: 2, rpe: 9, e1rm_kg: 216 },
      { date: '2026-01-02', weight_kg: 205, reps: 3, rpe: 8.5, e1rm_kg: 226 },
      { date: '2026-01-16', weight_kg: 207.5, reps: 3, rpe: 9, e1rm_kg: 228 },
      { date: '2026-01-30', weight_kg: 210, reps: 2, rpe: 9, e1rm_kg: 224 },
      { date: '2026-02-13', weight_kg: 212.5, reps: 2, rpe: 9.5, e1rm_kg: 227 },
    ],
    'Bench Press': [
      { date: '2025-09-06', weight_kg: 120, reps: 3, rpe: 8, e1rm_kg: 132 },
      { date: '2025-09-20', weight_kg: 122.5, reps: 3, rpe: 8, e1rm_kg: 135 },
      { date: '2025-10-04', weight_kg: 125, reps: 3, rpe: 8.5, e1rm_kg: 138 },
      { date: '2025-10-18', weight_kg: 125, reps: 4, rpe: 8, e1rm_kg: 142 },
      { date: '2025-11-01', weight_kg: 127.5, reps: 3, rpe: 8, e1rm_kg: 140 },
      { date: '2025-11-15', weight_kg: 130, reps: 3, rpe: 8.5, e1rm_kg: 143 },
      { date: '2025-11-29', weight_kg: 132.5, reps: 2, rpe: 9, e1rm_kg: 141 },
      { date: '2025-12-13', weight_kg: 132.5, reps: 3, rpe: 8.5, e1rm_kg: 146 },
      { date: '2026-01-03', weight_kg: 135, reps: 3, rpe: 8, e1rm_kg: 149 },
      { date: '2026-01-17', weight_kg: 137.5, reps: 2, rpe: 9, e1rm_kg: 147 },
      { date: '2026-01-31', weight_kg: 137.5, reps: 3, rpe: 8.5, e1rm_kg: 151 },
      { date: '2026-02-14', weight_kg: 140, reps: 2, rpe: 9, e1rm_kg: 149 },
    ],
    'Conventional Deadlift': [
      { date: '2025-09-07', weight_kg: 230, reps: 3, rpe: 8, e1rm_kg: 253 },
      { date: '2025-09-21', weight_kg: 235, reps: 3, rpe: 8.5, e1rm_kg: 259 },
      { date: '2025-10-05', weight_kg: 237.5, reps: 3, rpe: 8.5, e1rm_kg: 262 },
      { date: '2025-10-19', weight_kg: 240, reps: 2, rpe: 9, e1rm_kg: 256 },
      { date: '2025-11-02', weight_kg: 242.5, reps: 3, rpe: 8.5, e1rm_kg: 267 },
      { date: '2025-11-16', weight_kg: 245, reps: 3, rpe: 9, e1rm_kg: 270 },
      { date: '2025-11-30', weight_kg: 247.5, reps: 2, rpe: 9, e1rm_kg: 264 },
      { date: '2025-12-14', weight_kg: 250, reps: 3, rpe: 8.5, e1rm_kg: 275 },
      { date: '2026-01-04', weight_kg: 252.5, reps: 3, rpe: 8.5, e1rm_kg: 278 },
      { date: '2026-01-18', weight_kg: 255, reps: 2, rpe: 9, e1rm_kg: 272 },
      { date: '2026-02-01', weight_kg: 257.5, reps: 3, rpe: 9, e1rm_kg: 283 },
      { date: '2026-02-15', weight_kg: 260, reps: 2, rpe: 9.5, e1rm_kg: 277 },
    ],
    'Romanian Deadlift': [
      { date: '2025-09-10', weight_kg: 150, reps: 5, rpe: 7, e1rm_kg: 175 },
      { date: '2025-10-01', weight_kg: 155, reps: 5, rpe: 7, e1rm_kg: 181 },
      { date: '2025-10-22', weight_kg: 160, reps: 5, rpe: 7.5, e1rm_kg: 187 },
      { date: '2025-11-12', weight_kg: 162.5, reps: 5, rpe: 7.5, e1rm_kg: 190 },
      { date: '2025-12-03', weight_kg: 165, reps: 5, rpe: 8, e1rm_kg: 193 },
      { date: '2026-01-07', weight_kg: 167.5, reps: 5, rpe: 8, e1rm_kg: 196 },
      { date: '2026-01-28', weight_kg: 170, reps: 5, rpe: 8, e1rm_kg: 198 },
      { date: '2026-02-18', weight_kg: 172.5, reps: 4, rpe: 8, e1rm_kg: 195 },
    ],
    'Overhead Press': [
      { date: '2025-09-08', weight_kg: 72.5, reps: 5, rpe: 8, e1rm_kg: 85 },
      { date: '2025-10-06', weight_kg: 75, reps: 5, rpe: 8, e1rm_kg: 88 },
      { date: '2025-11-03', weight_kg: 77.5, reps: 5, rpe: 8.5, e1rm_kg: 90 },
      { date: '2025-12-01', weight_kg: 80, reps: 4, rpe: 8.5, e1rm_kg: 89 },
      { date: '2026-01-05', weight_kg: 80, reps: 5, rpe: 8, e1rm_kg: 93 },
      { date: '2026-02-02', weight_kg: 82.5, reps: 4, rpe: 8.5, e1rm_kg: 92 },
    ],
  },
  'Samantha Price': {
    'Back Squat': [
      { date: '2025-09-08', weight_kg: 130, reps: 3, rpe: 8, e1rm_kg: 143 },
      { date: '2025-09-22', weight_kg: 132.5, reps: 3, rpe: 8, e1rm_kg: 146 },
      { date: '2025-10-06', weight_kg: 135, reps: 3, rpe: 8.5, e1rm_kg: 149 },
      { date: '2025-10-20', weight_kg: 137.5, reps: 2, rpe: 9, e1rm_kg: 147 },
      { date: '2025-11-03', weight_kg: 140, reps: 3, rpe: 8.5, e1rm_kg: 154 },
      { date: '2025-11-17', weight_kg: 142.5, reps: 3, rpe: 9, e1rm_kg: 157 },
      { date: '2025-12-01', weight_kg: 145, reps: 2, rpe: 9, e1rm_kg: 155 },
      { date: '2026-01-05', weight_kg: 147.5, reps: 3, rpe: 8.5, e1rm_kg: 162 },
      { date: '2026-01-19', weight_kg: 150, reps: 2, rpe: 9, e1rm_kg: 160 },
      { date: '2026-02-02', weight_kg: 152.5, reps: 2, rpe: 9.5, e1rm_kg: 163 },
    ],
    'Bench Press': [
      { date: '2025-09-09', weight_kg: 75, reps: 3, rpe: 8, e1rm_kg: 83 },
      { date: '2025-09-23', weight_kg: 77.5, reps: 3, rpe: 8.5, e1rm_kg: 85 },
      { date: '2025-10-07', weight_kg: 80, reps: 3, rpe: 8, e1rm_kg: 88 },
      { date: '2025-10-21', weight_kg: 80, reps: 4, rpe: 8, e1rm_kg: 91 },
      { date: '2025-11-04', weight_kg: 82.5, reps: 3, rpe: 8.5, e1rm_kg: 91 },
      { date: '2025-11-18', weight_kg: 85, reps: 3, rpe: 8, e1rm_kg: 94 },
      { date: '2025-12-02', weight_kg: 85, reps: 4, rpe: 8.5, e1rm_kg: 96 },
      { date: '2026-01-06', weight_kg: 87.5, reps: 3, rpe: 8.5, e1rm_kg: 96 },
      { date: '2026-01-20', weight_kg: 90, reps: 2, rpe: 9, e1rm_kg: 96 },
      { date: '2026-02-03', weight_kg: 90, reps: 3, rpe: 8.5, e1rm_kg: 99 },
    ],
    'Conventional Deadlift': [
      { date: '2025-09-10', weight_kg: 155, reps: 3, rpe: 8, e1rm_kg: 171 },
      { date: '2025-10-01', weight_kg: 160, reps: 3, rpe: 8, e1rm_kg: 176 },
      { date: '2025-10-22', weight_kg: 162.5, reps: 3, rpe: 8.5, e1rm_kg: 179 },
      { date: '2025-11-12', weight_kg: 165, reps: 3, rpe: 8.5, e1rm_kg: 182 },
      { date: '2025-12-03', weight_kg: 167.5, reps: 2, rpe: 9, e1rm_kg: 179 },
      { date: '2026-01-07', weight_kg: 170, reps: 3, rpe: 8.5, e1rm_kg: 187 },
      { date: '2026-01-28', weight_kg: 172.5, reps: 2, rpe: 9, e1rm_kg: 184 },
      { date: '2026-02-18', weight_kg: 175, reps: 2, rpe: 9.5, e1rm_kg: 187 },
    ],
  },
  'Devon Cruz': {
    'Back Squat': [
      { date: '2025-09-05', weight_kg: 260, reps: 3, rpe: 8, e1rm_kg: 286 },
      { date: '2025-09-19', weight_kg: 265, reps: 3, rpe: 8.5, e1rm_kg: 292 },
      { date: '2025-10-03', weight_kg: 270, reps: 2, rpe: 9, e1rm_kg: 288 },
      { date: '2025-10-17', weight_kg: 272.5, reps: 3, rpe: 8.5, e1rm_kg: 300 },
      { date: '2025-11-07', weight_kg: 275, reps: 3, rpe: 8.5, e1rm_kg: 303 },
      { date: '2025-11-28', weight_kg: 277.5, reps: 2, rpe: 9, e1rm_kg: 296 },
      { date: '2026-01-09', weight_kg: 280, reps: 3, rpe: 8.5, e1rm_kg: 308 },
      { date: '2026-02-06', weight_kg: 282.5, reps: 2, rpe: 9, e1rm_kg: 302 },
    ],
    'Bench Press': [
      { date: '2025-09-06', weight_kg: 165, reps: 3, rpe: 8, e1rm_kg: 182 },
      { date: '2025-10-04', weight_kg: 167.5, reps: 3, rpe: 8, e1rm_kg: 184 },
      { date: '2025-11-01', weight_kg: 170, reps: 3, rpe: 8.5, e1rm_kg: 187 },
      { date: '2025-11-29', weight_kg: 172.5, reps: 2, rpe: 9, e1rm_kg: 184 },
      { date: '2026-01-03', weight_kg: 175, reps: 3, rpe: 8.5, e1rm_kg: 193 },
      { date: '2026-02-07', weight_kg: 177.5, reps: 2, rpe: 9, e1rm_kg: 189 },
    ],
    'Conventional Deadlift': [
      { date: '2025-09-07', weight_kg: 310, reps: 2, rpe: 8.5, e1rm_kg: 327 },
      { date: '2025-09-21', weight_kg: 315, reps: 2, rpe: 8.5, e1rm_kg: 332 },
      { date: '2025-10-05', weight_kg: 317.5, reps: 2, rpe: 9, e1rm_kg: 335 },
      { date: '2025-10-19', weight_kg: 320, reps: 2, rpe: 9, e1rm_kg: 341 },
      { date: '2025-11-16', weight_kg: 322.5, reps: 2, rpe: 9, e1rm_kg: 344 },
      { date: '2025-12-14', weight_kg: 325, reps: 2, rpe: 9.5, e1rm_kg: 346 },
      { date: '2026-01-11', weight_kg: 327.5, reps: 2, rpe: 9, e1rm_kg: 349 },
      { date: '2026-02-08', weight_kg: 330, reps: 1, rpe: 9.5, e1rm_kg: 341 },
    ],
  },
  'Mia Johansson': {
    'Back Squat': [
      { date: '2025-09-05', weight_kg: 105, reps: 3, rpe: 8, e1rm_kg: 116 },
      { date: '2025-09-19', weight_kg: 107.5, reps: 3, rpe: 8, e1rm_kg: 118 },
      { date: '2025-10-03', weight_kg: 110, reps: 3, rpe: 8, e1rm_kg: 121 },
      { date: '2025-10-17', weight_kg: 112.5, reps: 3, rpe: 8.5, e1rm_kg: 124 },
      { date: '2025-11-07', weight_kg: 115, reps: 2, rpe: 8.5, e1rm_kg: 123 },
      { date: '2025-11-28', weight_kg: 117.5, reps: 3, rpe: 8.5, e1rm_kg: 129 },
      { date: '2026-01-09', weight_kg: 120, reps: 3, rpe: 8, e1rm_kg: 132 },
      { date: '2026-02-06', weight_kg: 122.5, reps: 2, rpe: 9, e1rm_kg: 131 },
    ],
    'Bench Press': [
      { date: '2025-09-06', weight_kg: 60, reps: 3, rpe: 8, e1rm_kg: 66 },
      { date: '2025-10-04', weight_kg: 62.5, reps: 3, rpe: 8, e1rm_kg: 69 },
      { date: '2025-11-01', weight_kg: 65, reps: 3, rpe: 8.5, e1rm_kg: 72 },
      { date: '2025-11-29', weight_kg: 65, reps: 4, rpe: 8, e1rm_kg: 74 },
      { date: '2026-01-03', weight_kg: 67.5, reps: 3, rpe: 8.5, e1rm_kg: 74 },
      { date: '2026-02-07', weight_kg: 70, reps: 2, rpe: 9, e1rm_kg: 75 },
    ],
    'Conventional Deadlift': [
      { date: '2025-09-07', weight_kg: 130, reps: 3, rpe: 8, e1rm_kg: 143 },
      { date: '2025-10-05', weight_kg: 135, reps: 3, rpe: 8, e1rm_kg: 149 },
      { date: '2025-11-02', weight_kg: 137.5, reps: 3, rpe: 8.5, e1rm_kg: 151 },
      { date: '2025-12-07', weight_kg: 140, reps: 3, rpe: 8.5, e1rm_kg: 154 },
      { date: '2026-01-11', weight_kg: 142.5, reps: 2, rpe: 9, e1rm_kg: 152 },
      { date: '2026-02-08', weight_kg: 145, reps: 2, rpe: 9, e1rm_kg: 155 },
    ],
  },
}

// ─── Meal Plan Recipes ────────────────────────────────────────────────────────
export const MOCK_MEAL_PLAN_RECIPES = [
  {
    id: 'r1',
    name: 'High-Protein Overnight Oats',
    meal_type: 'breakfast',
    prep_time: 5,
    cook_time: 0,
    servings: 1,
    serving_size: '1 jar (~450g)',
    macros: { calories: 520, protein: 42, carbs: 62, fat: 10 },
    contains: ['gluten', 'dairy'],
    allergens: ['gluten', 'dairy'],
    dietary_flags: ['vegetarian'],
    ingredients: [
      { name: 'Rolled oats', amount: '80g' },
      { name: 'Greek yogurt (0% fat)', amount: '150g' },
      { name: 'Whey protein powder', amount: '30g (1 scoop)' },
      { name: 'Banana', amount: '1 medium (~120g)' },
      { name: 'Unsweetened almond milk', amount: '200ml' },
      { name: 'Chia seeds', amount: '10g' },
    ],
    instructions: 'Mix oats, chia seeds, and protein powder in a jar. Add yogurt and almond milk. Stir well. Refrigerate overnight. Slice banana on top before serving.',
    tags: ['meal-prep', 'no-cook', 'high-protein', 'training-day'],
    day_types: ['training', 'rest'],
  },
  {
    id: 'r2',
    name: 'Chicken & Rice Power Bowl',
    meal_type: 'lunch',
    prep_time: 10,
    cook_time: 20,
    servings: 1,
    serving_size: '1 bowl (~550g)',
    macros: { calories: 680, protein: 55, carbs: 72, fat: 14 },
    contains: ['gluten', 'soy'],
    allergens: ['gluten', 'soy'],
    dietary_flags: [],
    ingredients: [
      { name: 'Chicken breast', amount: '200g' },
      { name: 'White rice (dry)', amount: '100g' },
      { name: 'Broccoli florets', amount: '150g' },
      { name: 'Olive oil', amount: '10ml' },
      { name: 'Garlic (minced)', amount: '2 cloves' },
      { name: 'Low-sodium soy sauce', amount: '15ml' },
      { name: 'Sesame seeds', amount: '5g' },
    ],
    instructions: 'Cook rice per packet instructions. Season chicken with garlic, salt, pepper and cook in olive oil 6-7 min/side. Steam broccoli 4 min. Drizzle soy sauce, garnish with sesame seeds.',
    tags: ['meal-prep', 'high-protein', 'training-day'],
    day_types: ['training'],
  },
  {
    id: 'r3',
    name: 'Pre-Workout Banana Oat Protein Shake',
    meal_type: 'pre-workout',
    prep_time: 5,
    cook_time: 0,
    servings: 1,
    serving_size: '1 shake (~600ml)',
    macros: { calories: 420, protein: 35, carbs: 55, fat: 6 },
    contains: ['gluten', 'dairy'],
    allergens: ['gluten', 'dairy'],
    dietary_flags: ['vegetarian'],
    ingredients: [
      { name: 'Banana', amount: '1 large (~140g)' },
      { name: 'Whey protein powder', amount: '30g (1 scoop)' },
      { name: 'Rolled oats', amount: '40g' },
      { name: 'Whole milk', amount: '250ml' },
      { name: 'Honey', amount: '10g' },
      { name: 'Ice cubes', amount: '4-5' },
    ],
    instructions: 'Add all ingredients to blender. Blend on high for 30 seconds until smooth. Consume 45-60 min before training.',
    tags: ['no-cook', 'pre-workout', 'quick'],
    day_types: ['training'],
  },
  {
    id: 'r4',
    name: 'Post-Workout Salmon & Sweet Potato',
    meal_type: 'dinner',
    prep_time: 10,
    cook_time: 25,
    servings: 1,
    serving_size: '1 plate (~600g)',
    macros: { calories: 640, protein: 48, carbs: 58, fat: 18 },
    contains: ['fish'],
    allergens: ['fish'],
    dietary_flags: ['gluten-free', 'dairy-free'],
    ingredients: [
      { name: 'Salmon fillet', amount: '200g' },
      { name: 'Sweet potato', amount: '300g' },
      { name: 'Asparagus', amount: '100g' },
      { name: 'Olive oil', amount: '15ml' },
      { name: 'Lemon', amount: '1/2' },
      { name: 'Fresh dill', amount: '5g' },
      { name: 'Garlic powder', amount: '1 tsp' },
    ],
    instructions: 'Preheat oven 200°C. Cube sweet potato, toss in olive oil, roast 20 min. Season salmon with lemon, dill, garlic powder. Pan-sear 4 min/side. Steam asparagus 3 min. Plate together.',
    tags: ['high-protein', 'omega-3', 'post-workout'],
    day_types: ['training', 'rest'],
  },
  {
    id: 'r5',
    name: 'Rest Day Turkey Egg White Scramble',
    meal_type: 'breakfast',
    prep_time: 5,
    cook_time: 10,
    servings: 1,
    serving_size: '1 plate (~350g)',
    macros: { calories: 380, protein: 48, carbs: 18, fat: 10 },
    contains: ['eggs', 'dairy'],
    allergens: ['eggs', 'dairy'],
    dietary_flags: ['gluten-free'],
    ingredients: [
      { name: 'Egg whites', amount: '6 large (200ml)' },
      { name: 'Ground turkey', amount: '100g' },
      { name: 'Baby spinach', amount: '60g' },
      { name: 'Cherry tomatoes', amount: '80g' },
      { name: 'Feta cheese (light)', amount: '30g' },
      { name: 'Olive oil spray', amount: '1 spray' },
      { name: 'Everything bagel seasoning', amount: '1 tsp' },
    ],
    instructions: 'Brown turkey in pan, add spinach until wilted. Pour egg whites over, scramble gently. Add tomatoes, top with feta and seasoning.',
    tags: ['low-carb', 'high-protein', 'rest-day'],
    day_types: ['rest'],
  },
  {
    id: 'r6',
    name: 'Protein Peanut Butter Balls (Snack)',
    meal_type: 'snack',
    prep_time: 15,
    cook_time: 0,
    servings: 4,
    serving_size: '2 balls (~60g)',
    macros: { calories: 180, protein: 12, carbs: 16, fat: 8 },
    contains: ['gluten', 'dairy', 'peanuts'],
    allergens: ['gluten', 'dairy', 'peanuts'],
    dietary_flags: ['vegetarian'],
    ingredients: [
      { name: 'Rolled oats', amount: '60g' },
      { name: 'Natural peanut butter', amount: '40g' },
      { name: 'Whey protein powder', amount: '30g (1 scoop)' },
      { name: 'Honey', amount: '20g' },
      { name: 'Dark chocolate chips', amount: '20g' },
    ],
    instructions: 'Mix all ingredients in a bowl until combined. Roll into 8 equal balls (~30g each). Refrigerate 30 min to firm up. Store in airtight container up to 5 days.',
    tags: ['meal-prep', 'no-cook', 'snack', 'batch-cook'],
    day_types: ['training', 'rest'],
  },
]

// ─── Shopping List ─────────────────────────────────────────────────────────────
export const MOCK_SHOPPING_LIST = {
  generated_from: ['r1', 'r2', 'r3', 'r4', 'r5', 'r6'],
  week: 'Feb 23 – Mar 1, 2026',
  budget: 150,
  categories: [
    {
      name: 'Proteins',
      icon: '🥩',
      items: [
        { id: 'sl1', name: 'Chicken breast', amount: '1.4kg', weight_g: 1400, price: 14.99, calories_per_100g: 165, protein_per_100g: 31, carbs_per_100g: 0, fat_per_100g: 3.6, checked: false, recipe_ids: ['r2'] },
        { id: 'sl2', name: 'Salmon fillets', amount: '1.4kg (7×200g)', weight_g: 1400, price: 24.99, calories_per_100g: 208, protein_per_100g: 20, carbs_per_100g: 0, fat_per_100g: 13, checked: false, recipe_ids: ['r4'] },
        { id: 'sl3', name: 'Ground turkey', amount: '700g', weight_g: 700, price: 8.49, calories_per_100g: 149, protein_per_100g: 17, carbs_per_100g: 0, fat_per_100g: 8, checked: false, recipe_ids: ['r5'] },
        { id: 'sl4', name: 'Whey protein powder', amount: '1 tub (~900g)', weight_g: 900, price: 39.99, calories_per_100g: 380, protein_per_100g: 75, carbs_per_100g: 8, fat_per_100g: 5, checked: false, recipe_ids: ['r1', 'r3', 'r6'] },
        { id: 'sl5', name: 'Greek yogurt (0% fat)', amount: '1kg tub', weight_g: 1000, price: 6.49, calories_per_100g: 59, protein_per_100g: 10, carbs_per_100g: 4, fat_per_100g: 0, checked: false, recipe_ids: ['r1'] },
        { id: 'sl6', name: 'Egg whites (carton)', amount: '1 litre', weight_g: 1000, price: 5.99, calories_per_100g: 52, protein_per_100g: 11, carbs_per_100g: 0.7, fat_per_100g: 0.2, checked: false, recipe_ids: ['r5'] },
        { id: 'sl7', name: 'Feta cheese (light)', amount: '200g block', weight_g: 200, price: 3.99, calories_per_100g: 264, protein_per_100g: 14, carbs_per_100g: 4, fat_per_100g: 21, checked: false, recipe_ids: ['r5'] },
      ],
    },
    {
      name: 'Carbohydrates',
      icon: '🌾',
      items: [
        { id: 'sl8', name: 'Rolled oats', amount: '1kg bag', weight_g: 1000, price: 3.49, calories_per_100g: 389, protein_per_100g: 17, carbs_per_100g: 66, fat_per_100g: 7, checked: false, recipe_ids: ['r1', 'r3', 'r6'] },
        { id: 'sl9', name: 'White rice', amount: '700g (dry)', weight_g: 700, price: 2.99, calories_per_100g: 365, protein_per_100g: 7, carbs_per_100g: 80, fat_per_100g: 0.7, checked: false, recipe_ids: ['r2'] },
        { id: 'sl10', name: 'Sweet potatoes', amount: '2.1kg (~7 medium)', weight_g: 2100, price: 5.49, calories_per_100g: 86, protein_per_100g: 1.6, carbs_per_100g: 20, fat_per_100g: 0.1, checked: false, recipe_ids: ['r4'] },
        { id: 'sl11', name: 'Bananas', amount: '14 (2 bunches)', weight_g: 1960, price: 2.99, calories_per_100g: 89, protein_per_100g: 1.1, carbs_per_100g: 23, fat_per_100g: 0.3, checked: false, recipe_ids: ['r1', 'r3'] },
      ],
    },
    {
      name: 'Vegetables',
      icon: '🥦',
      items: [
        { id: 'sl12', name: 'Broccoli', amount: '1.05kg (7 portions)', weight_g: 1050, price: 3.99, calories_per_100g: 34, protein_per_100g: 2.8, carbs_per_100g: 7, fat_per_100g: 0.4, checked: false, recipe_ids: ['r2'] },
        { id: 'sl13', name: 'Asparagus', amount: '700g (2 bunches)', weight_g: 700, price: 4.49, calories_per_100g: 20, protein_per_100g: 2.2, carbs_per_100g: 3.9, fat_per_100g: 0.1, checked: false, recipe_ids: ['r4'] },
        { id: 'sl14', name: 'Baby spinach', amount: '300g bag', weight_g: 300, price: 3.29, calories_per_100g: 23, protein_per_100g: 2.9, carbs_per_100g: 3.6, fat_per_100g: 0.4, checked: false, recipe_ids: ['r5'] },
        { id: 'sl15', name: 'Cherry tomatoes', amount: '500g punnet', weight_g: 500, price: 2.99, calories_per_100g: 18, protein_per_100g: 0.9, carbs_per_100g: 3.9, fat_per_100g: 0.2, checked: false, recipe_ids: ['r5'] },
      ],
    },
    {
      name: 'Dairy & Eggs',
      icon: '🥛',
      items: [
        { id: 'sl16', name: 'Whole milk', amount: '2 litres', weight_g: 2000, price: 3.49, calories_per_100g: 61, protein_per_100g: 3.2, carbs_per_100g: 4.8, fat_per_100g: 3.3, checked: false, recipe_ids: ['r3'] },
        { id: 'sl17', name: 'Unsweetened almond milk', amount: '1.4 litres', weight_g: 1400, price: 3.99, calories_per_100g: 15, protein_per_100g: 0.4, carbs_per_100g: 0.3, fat_per_100g: 1.1, checked: false, recipe_ids: ['r1'] },
      ],
    },
    {
      name: 'Pantry',
      icon: '🫙',
      items: [
        { id: 'sl18', name: 'Natural peanut butter', amount: '280g', weight_g: 280, price: 4.99, calories_per_100g: 588, protein_per_100g: 25, carbs_per_100g: 20, fat_per_100g: 50, checked: false, recipe_ids: ['r6'] },
        { id: 'sl19', name: 'Chia seeds', amount: '100g', weight_g: 100, price: 2.49, calories_per_100g: 486, protein_per_100g: 17, carbs_per_100g: 42, fat_per_100g: 31, checked: false, recipe_ids: ['r1'] },
        { id: 'sl20', name: 'Honey', amount: '1 jar (~200g)', weight_g: 200, price: 3.99, calories_per_100g: 304, protein_per_100g: 0.3, carbs_per_100g: 82, fat_per_100g: 0, checked: false, recipe_ids: ['r3', 'r6'] },
        { id: 'sl21', name: 'Dark chocolate chips', amount: '140g', weight_g: 140, price: 2.99, calories_per_100g: 598, protein_per_100g: 5, carbs_per_100g: 52, fat_per_100g: 43, checked: false, recipe_ids: ['r6'] },
        { id: 'sl22', name: 'Low-sodium soy sauce', amount: '1 bottle', weight_g: 300, price: 2.49, calories_per_100g: 53, protein_per_100g: 8, carbs_per_100g: 4.9, fat_per_100g: 0, checked: false, recipe_ids: ['r2'] },
        { id: 'sl23', name: 'Olive oil', amount: '1 bottle', weight_g: 500, price: 6.99, calories_per_100g: 884, protein_per_100g: 0, carbs_per_100g: 0, fat_per_100g: 100, checked: false, recipe_ids: ['r2', 'r4'] },
        { id: 'sl24', name: 'Sesame seeds', amount: '50g', weight_g: 50, price: 1.49, calories_per_100g: 573, protein_per_100g: 18, carbs_per_100g: 23, fat_per_100g: 50, checked: false, recipe_ids: ['r2'] },
        { id: 'sl25', name: 'Lemon', amount: '4', weight_g: 400, price: 1.99, calories_per_100g: 29, protein_per_100g: 1.1, carbs_per_100g: 9, fat_per_100g: 0.3, checked: false, recipe_ids: ['r4'] },
        { id: 'sl26', name: 'Everything bagel seasoning', amount: '1 jar', weight_g: 80, price: 3.49, calories_per_100g: 333, protein_per_100g: 13, carbs_per_100g: 33, fat_per_100g: 20, checked: false, recipe_ids: ['r5'] },
        { id: 'sl27', name: 'Garlic', amount: '1 bulb', weight_g: 60, price: 0.79, calories_per_100g: 149, protein_per_100g: 6.4, carbs_per_100g: 33, fat_per_100g: 0.5, checked: false, recipe_ids: ['r2', 'r4'] },
        { id: 'sl28', name: 'Fresh dill', amount: '1 bunch', weight_g: 30, price: 1.49, calories_per_100g: 43, protein_per_100g: 3.5, carbs_per_100g: 7, fat_per_100g: 1.1, checked: false, recipe_ids: ['r4'] },
      ],
    },
  ],
}

// ─── Shopping Lists (multi-week, with history & links) ────────────────────────
export const MOCK_SHOPPING_LISTS = [
  {
    id: 'sl-w8',
    label: 'Week 8 — Feb 23–Mar 1, 2026',
    week_start: '2026-02-23',
    week_end: '2026-03-01',
    cadence: 'weekly',
    budget: 150,
    status: 'active',
    linked_goal_ids: ['g3'],
    linked_block_id: 'tb-2',
    linked_meet_id: null,
    notes: 'Intensification block — high protein focus, lean proteins priority.',
    categories: [
      { name: 'Proteins', icon: '🥩', items: [
        { id: 'sli-001', name: 'Chicken breast', amount: '1.4kg', weight_g: 1400, price: 14.99, calories_per_100g: 165, protein_per_100g: 31, carbs_per_100g: 0, fat_per_100g: 3.6, checked: true, recipe_ids: ['r2'] },
        { id: 'sli-002', name: 'Salmon fillets', amount: '1.4kg', weight_g: 1400, price: 24.99, calories_per_100g: 208, protein_per_100g: 20, carbs_per_100g: 0, fat_per_100g: 13, checked: false, recipe_ids: ['r4'] },
        { id: 'sli-003', name: 'Whey protein powder', amount: '1 tub (~900g)', weight_g: 900, price: 39.99, calories_per_100g: 380, protein_per_100g: 75, carbs_per_100g: 8, fat_per_100g: 5, checked: true, recipe_ids: ['r1', 'r3', 'r6'] },
        { id: 'sli-004', name: 'Greek yogurt (0% fat)', amount: '1kg tub', weight_g: 1000, price: 6.49, calories_per_100g: 59, protein_per_100g: 10, carbs_per_100g: 4, fat_per_100g: 0, checked: false, recipe_ids: ['r1'] },
        { id: 'sli-005', name: 'Ground turkey', amount: '700g', weight_g: 700, price: 8.49, calories_per_100g: 149, protein_per_100g: 17, carbs_per_100g: 0, fat_per_100g: 8, checked: false, recipe_ids: ['r5'] },
        { id: 'sli-006', name: 'Egg whites (carton)', amount: '1 litre', weight_g: 1000, price: 5.99, calories_per_100g: 52, protein_per_100g: 11, carbs_per_100g: 0.7, fat_per_100g: 0.2, checked: false, recipe_ids: ['r5'] },
      ]},
      { name: 'Carbohydrates', icon: '🌾', items: [
        { id: 'sli-007', name: 'Rolled oats', amount: '1kg bag', weight_g: 1000, price: 3.49, calories_per_100g: 389, protein_per_100g: 17, carbs_per_100g: 66, fat_per_100g: 7, checked: true, recipe_ids: ['r1', 'r3', 'r6'] },
        { id: 'sli-008', name: 'White rice', amount: '700g (dry)', weight_g: 700, price: 2.99, calories_per_100g: 365, protein_per_100g: 7, carbs_per_100g: 80, fat_per_100g: 0.7, checked: false, recipe_ids: ['r2'] },
        { id: 'sli-009', name: 'Sweet potatoes', amount: '2.1kg', weight_g: 2100, price: 5.49, calories_per_100g: 86, protein_per_100g: 1.6, carbs_per_100g: 20, fat_per_100g: 0.1, checked: false, recipe_ids: ['r4'] },
        { id: 'sli-010', name: 'Bananas', amount: '14 (2 bunches)', weight_g: 1960, price: 2.99, calories_per_100g: 89, protein_per_100g: 1.1, carbs_per_100g: 23, fat_per_100g: 0.3, checked: false, recipe_ids: ['r1', 'r3'] },
      ]},
      { name: 'Vegetables', icon: '🥦', items: [
        { id: 'sli-011', name: 'Broccoli', amount: '1.05kg', weight_g: 1050, price: 3.99, calories_per_100g: 34, protein_per_100g: 2.8, carbs_per_100g: 7, fat_per_100g: 0.4, checked: false, recipe_ids: ['r2'] },
        { id: 'sli-012', name: 'Asparagus', amount: '700g', weight_g: 700, price: 4.49, calories_per_100g: 20, protein_per_100g: 2.2, carbs_per_100g: 3.9, fat_per_100g: 0.1, checked: false, recipe_ids: ['r4'] },
        { id: 'sli-013', name: 'Baby spinach', amount: '300g bag', weight_g: 300, price: 3.29, calories_per_100g: 23, protein_per_100g: 2.9, carbs_per_100g: 3.6, fat_per_100g: 0.4, checked: false, recipe_ids: ['r5'] },
      ]},
      { name: 'Pantry', icon: '🫙', items: [
        { id: 'sli-014', name: 'Natural peanut butter', amount: '280g', weight_g: 280, price: 4.99, calories_per_100g: 588, protein_per_100g: 25, carbs_per_100g: 20, fat_per_100g: 50, checked: false, recipe_ids: ['r6'] },
        { id: 'sli-015', name: 'Chia seeds', amount: '100g', weight_g: 100, price: 2.49, calories_per_100g: 486, protein_per_100g: 17, carbs_per_100g: 42, fat_per_100g: 31, checked: false, recipe_ids: ['r1'] },
        { id: 'sli-016', name: 'Olive oil', amount: '1 bottle', weight_g: 500, price: 6.99, calories_per_100g: 884, protein_per_100g: 0, carbs_per_100g: 0, fat_per_100g: 100, checked: false, recipe_ids: ['r2', 'r4'] },
      ]},
    ],
  },
  {
    id: 'sl-w7',
    label: 'Week 7 — Feb 16–22, 2026',
    week_start: '2026-02-16',
    week_end: '2026-02-22',
    cadence: 'weekly',
    budget: 150,
    status: 'completed',
    linked_goal_ids: ['g3'],
    linked_block_id: 'tb-2',
    linked_meet_id: null,
    notes: 'Similar to Week 8. All items purchased.',
    categories: [
      { name: 'Proteins', icon: '🥩', items: [
        { id: 'sli-101', name: 'Chicken breast', amount: '1.4kg', weight_g: 1400, price: 14.99, calories_per_100g: 165, protein_per_100g: 31, carbs_per_100g: 0, fat_per_100g: 3.6, checked: true, recipe_ids: ['r2'] },
        { id: 'sli-102', name: 'Salmon fillets', amount: '1.4kg', weight_g: 1400, price: 22.99, calories_per_100g: 208, protein_per_100g: 20, carbs_per_100g: 0, fat_per_100g: 13, checked: true, recipe_ids: ['r4'] },
        { id: 'sli-103', name: 'Whey protein powder', amount: '1 tub', weight_g: 900, price: 39.99, calories_per_100g: 380, protein_per_100g: 75, carbs_per_100g: 8, fat_per_100g: 5, checked: true, recipe_ids: ['r1', 'r3'] },
        { id: 'sli-104', name: 'Greek yogurt (0% fat)', amount: '1kg tub', weight_g: 1000, price: 6.49, calories_per_100g: 59, protein_per_100g: 10, carbs_per_100g: 4, fat_per_100g: 0, checked: true, recipe_ids: ['r1'] },
      ]},
      { name: 'Carbohydrates', icon: '🌾', items: [
        { id: 'sli-105', name: 'Rolled oats', amount: '1kg bag', weight_g: 1000, price: 3.49, calories_per_100g: 389, protein_per_100g: 17, carbs_per_100g: 66, fat_per_100g: 7, checked: true, recipe_ids: ['r1', 'r3', 'r6'] },
        { id: 'sli-106', name: 'White rice', amount: '700g', weight_g: 700, price: 2.99, calories_per_100g: 365, protein_per_100g: 7, carbs_per_100g: 80, fat_per_100g: 0.7, checked: true, recipe_ids: ['r2'] },
        { id: 'sli-107', name: 'Sweet potatoes', amount: '2.1kg', weight_g: 2100, price: 5.49, calories_per_100g: 86, protein_per_100g: 1.6, carbs_per_100g: 20, fat_per_100g: 0.1, checked: true, recipe_ids: ['r4'] },
      ]},
      { name: 'Vegetables', icon: '🥦', items: [
        { id: 'sli-108', name: 'Broccoli', amount: '1.05kg', weight_g: 1050, price: 3.99, calories_per_100g: 34, protein_per_100g: 2.8, carbs_per_100g: 7, fat_per_100g: 0.4, checked: true, recipe_ids: ['r2'] },
        { id: 'sli-109', name: 'Baby spinach', amount: '300g bag', weight_g: 300, price: 3.29, calories_per_100g: 23, protein_per_100g: 2.9, carbs_per_100g: 3.6, fat_per_100g: 0.4, checked: true, recipe_ids: ['r5'] },
      ]},
    ],
  },
  {
    id: 'sl-biw1',
    label: 'Bi-Weekly — Jan 26–Feb 8, 2026',
    week_start: '2026-01-26',
    week_end: '2026-02-08',
    cadence: 'biweekly',
    budget: 280,
    status: 'completed',
    linked_goal_ids: ['g3'],
    linked_block_id: 'tb-1',
    linked_meet_id: 'meet-1',
    notes: 'Block 1 final 2 weeks. Meet prep bulk buy.',
    categories: [
      { name: 'Proteins', icon: '🥩', items: [
        { id: 'sli-201', name: 'Chicken breast', amount: '2.8kg', weight_g: 2800, price: 28.99, calories_per_100g: 165, protein_per_100g: 31, carbs_per_100g: 0, fat_per_100g: 3.6, checked: true, recipe_ids: ['r2'] },
        { id: 'sli-202', name: 'Salmon fillets', amount: '2.8kg', weight_g: 2800, price: 45.99, calories_per_100g: 208, protein_per_100g: 20, carbs_per_100g: 0, fat_per_100g: 13, checked: true, recipe_ids: ['r4'] },
        { id: 'sli-203', name: 'Whey protein powder', amount: '2 tubs', weight_g: 1800, price: 74.99, calories_per_100g: 380, protein_per_100g: 75, carbs_per_100g: 8, fat_per_100g: 5, checked: true, recipe_ids: ['r1', 'r3'] },
      ]},
      { name: 'Carbohydrates', icon: '🌾', items: [
        { id: 'sli-204', name: 'Rolled oats', amount: '2kg bag', weight_g: 2000, price: 6.49, calories_per_100g: 389, protein_per_100g: 17, carbs_per_100g: 66, fat_per_100g: 7, checked: true, recipe_ids: ['r1', 'r3', 'r6'] },
        { id: 'sli-205', name: 'White rice', amount: '1.4kg', weight_g: 1400, price: 5.49, calories_per_100g: 365, protein_per_100g: 7, carbs_per_100g: 80, fat_per_100g: 0.7, checked: true, recipe_ids: ['r2'] },
      ]},
    ],
  },
]

// ─── Meal Prep Log (sessions with batch-cooked items, linked to goals/blocks) ─
export const MOCK_MEAL_PREP_LOG = [
  {
    id: 'mpl-001',
    label: 'Week 8 Prep Session',
    date: '2026-02-22',
    cadence: 'weekly',
    week_start: '2026-02-23',
    week_end: '2026-03-01',
    linked_goal_ids: ['g3'],
    linked_block_id: 'tb-2',
    linked_meet_id: null,
    notes: 'Sunday prep. Cooked all proteins and carbs for the week. ~2.5 hours total.',
    total_calories_prepped: 14800,
    total_protein_prepped: 980,
    items: [
      { id: 'mpi-001', recipe_id: 'ar-001-r2', recipe_name: 'Chicken & Rice Power Bowl', servings_made: 7, servings_consumed: 3, storage: 'fridge', notes: 'Seasoned with garlic + soy sauce', macros_per_serving: { calories: 680, protein: 55, carbs: 72, fat: 14 } },
      { id: 'mpi-002', recipe_id: 'ar-001-r1', recipe_name: 'High-Protein Overnight Oats', servings_made: 5, servings_consumed: 3, storage: 'fridge', notes: 'No banana yet — add morning of', macros_per_serving: { calories: 520, protein: 42, carbs: 62, fat: 10 } },
      { id: 'mpi-003', recipe_id: 'ar-001-r4', recipe_name: 'Post-Workout Salmon & Sweet Potato', servings_made: 4, servings_consumed: 1, storage: 'fridge', notes: 'Salmon cooked fresh — sweet potato only prepped', macros_per_serving: { calories: 640, protein: 48, carbs: 58, fat: 18 } },
      { id: 'mpi-004', recipe_id: 'ar-001-r6', recipe_name: 'Protein Peanut Butter Balls (Snack)', servings_made: 8, servings_consumed: 4, storage: 'fridge', notes: 'Made double batch', macros_per_serving: { calories: 180, protein: 12, carbs: 16, fat: 8 } },
    ],
  },
  {
    id: 'mpl-002',
    label: 'Week 7 Prep Session',
    date: '2026-02-15',
    cadence: 'weekly',
    week_start: '2026-02-16',
    week_end: '2026-02-22',
    linked_goal_ids: ['g3'],
    linked_block_id: 'tb-2',
    linked_meet_id: null,
    notes: 'Standard weekly prep. Added turkey scramble batch this time.',
    total_calories_prepped: 13200,
    total_protein_prepped: 890,
    items: [
      { id: 'mpi-005', recipe_id: 'ar-001-r2', recipe_name: 'Chicken & Rice Power Bowl', servings_made: 7, servings_consumed: 7, storage: 'fridge', notes: '', macros_per_serving: { calories: 680, protein: 55, carbs: 72, fat: 14 } },
      { id: 'mpi-006', recipe_id: 'ar-001-r1', recipe_name: 'High-Protein Overnight Oats', servings_made: 5, servings_consumed: 5, storage: 'fridge', notes: '', macros_per_serving: { calories: 520, protein: 42, carbs: 62, fat: 10 } },
      { id: 'mpi-007', recipe_id: 'ar-001-r5', recipe_name: 'Rest Day Turkey Egg White Scramble', servings_made: 3, servings_consumed: 3, storage: 'fridge', notes: '', macros_per_serving: { calories: 380, protein: 48, carbs: 18, fat: 10 } },
    ],
  },
  {
    id: 'mpl-003',
    label: 'Bi-Weekly Jan 26–Feb 8 Prep',
    date: '2026-01-26',
    cadence: 'biweekly',
    week_start: '2026-01-26',
    week_end: '2026-02-08',
    linked_goal_ids: ['g3'],
    linked_block_id: 'tb-1',
    linked_meet_id: 'meet-1',
    notes: 'Block 1 final bi-weekly prep. Focus on meet-prep macros.',
    total_calories_prepped: 28500,
    total_protein_prepped: 1920,
    items: [
      { id: 'mpi-008', recipe_id: 'ar-001-r2', recipe_name: 'Chicken & Rice Power Bowl', servings_made: 14, servings_consumed: 14, storage: 'fridge+freezer', notes: 'Froze half for week 2', macros_per_serving: { calories: 680, protein: 55, carbs: 72, fat: 14 } },
      { id: 'mpi-009', recipe_id: 'ar-001-r4', recipe_name: 'Post-Workout Salmon & Sweet Potato', servings_made: 8, servings_consumed: 8, storage: 'fridge', notes: '', macros_per_serving: { calories: 640, protein: 48, carbs: 58, fat: 18 } },
      { id: 'mpi-010', recipe_id: 'ar-001-r6', recipe_name: 'Protein Peanut Butter Balls (Snack)', servings_made: 16, servings_consumed: 16, storage: 'fridge', notes: 'Batch × 4', macros_per_serving: { calories: 180, protein: 12, carbs: 16, fat: 8 } },
    ],
  },
]

// ─── Organizations ──────────────────────────────────────────────────────────

// Default intake questionnaire fields (shared starting point)
export const DEFAULT_INTAKE_FIELDS = [
  // ── Contact Info ──────────────────────────────────────────────────────────
  { id: 'f-section-contact',   label: 'Contact Information',         type: 'section_heading' },
  { id: 'f-first-name',        label: 'First Name',                  type: 'text',     required: true,  placeholder: 'First name', half: true },
  { id: 'f-last-name',         label: 'Last Name',                   type: 'text',     required: true,  placeholder: 'Last name',  half: true },
  { id: 'f-email',             label: 'Email Address',               type: 'email',    required: true,  placeholder: 'you@email.com' },
  { id: 'f-phone',             label: 'Phone Number',                type: 'tel',      required: false, placeholder: '+1 (555) 000-0000', half: true },
  { id: 'f-instagram',         label: 'Instagram Handle',            type: 'text',     required: false, placeholder: '@yourhandle',        half: true },

  // ── Service ───────────────────────────────────────────────────────────────
  { id: 'f-section-service',   label: 'Services',                    type: 'section_heading' },
  { id: 'f-service',           label: 'Which Service Are You Seeking?', type: 'select', required: true,
    options: ['1:1 Coaching (Full Service)', 'Meet Day Coaching', 'Movement Coaching', 'Nutritionist Only'] },
  { id: 'f-coach-pref',        label: 'Coach Preference (if any)',   type: 'text',     required: false, placeholder: "Name of coach you'd like to work with, or 'No preference'" },

  // ── Personal Info ─────────────────────────────────────────────────────────
  { id: 'f-section-personal',  label: 'Personal Information',        type: 'section_heading' },
  { id: 'f-age',               label: 'Age',                         type: 'number',   required: true,  placeholder: 'e.g. 27',   half: true },
  { id: 'f-occupation',        label: 'Job / Occupation',            type: 'text',     required: false, placeholder: 'e.g. Nurse, Teacher, Remote', half: true },
  { id: 'f-height',            label: 'Height',                      type: 'text',     required: false, placeholder: 'e.g. 5\'10" or 178cm', half: true },
  { id: 'f-weight',            label: 'Current Bodyweight',          type: 'text',     required: false, placeholder: 'e.g. 185 lbs or 84 kg',  half: true },
  { id: 'f-weight-class',      label: 'Preferred Weight Class',      type: 'text',     required: false, placeholder: 'e.g. 93kg, 83kg, 74kg',  half: true },
  { id: 'f-obligations',       label: 'Other Obligations / Commitments', type: 'textarea', required: false, placeholder: 'Family, school, travel schedule, shift work, etc.' },

  // ── Training Schedule ─────────────────────────────────────────────────────
  { id: 'f-section-schedule',  label: 'Training Schedule',           type: 'section_heading' },
  { id: 'f-days-per-week',     label: 'Days Available to Train Per Week', type: 'select', required: true,
    options: ['2 days', '3 days', '4 days', '5 days', '6 days', '7 days'] },
  { id: 'f-training-days',     label: 'Preferred Training Days',     type: 'text',     required: false, placeholder: 'e.g. Mon, Wed, Fri, Sat' },
  { id: 'f-training-time',     label: 'Preferred Training Time',     type: 'select',   required: false,
    options: ['Morning (5am–10am)', 'Afternoon (10am–4pm)', 'Evening (4pm–9pm)', 'Overnight / Late night', 'Varies / Flexible'] },
  { id: 'f-sleep-schedule',    label: 'Sleep Schedule',              type: 'text',     required: false, placeholder: 'e.g. 11pm–7am', half: true },
  { id: 'f-sleep-hours',       label: 'Average Hours of Sleep per Night', type: 'number', required: false, placeholder: 'e.g. 7', half: true },

  // ── Lifting Stats ─────────────────────────────────────────────────────────
  { id: 'f-section-lifts',     label: 'Lifting Stats',               type: 'section_heading' },
  { id: 'f-squat-max',         label: 'Squat Max (lbs or kg)',        type: 'text',     required: false, placeholder: 'e.g. 405 lbs', half: true },
  { id: 'f-bench-max',         label: 'Bench Max (lbs or kg)',        type: 'text',     required: false, placeholder: 'e.g. 275 lbs', half: true },
  { id: 'f-deadlift-max',      label: 'Deadlift Max (lbs or kg)',     type: 'text',     required: false, placeholder: 'e.g. 500 lbs', half: true },
  { id: 'f-squat-freq',        label: 'Squat Frequency (sessions/week)', type: 'select', required: false,
    options: ['1x', '2x', '3x', '4x+', 'Not currently squatting'], half: true },
  { id: 'f-bench-freq',        label: 'Bench Frequency (sessions/week)', type: 'select', required: false,
    options: ['1x', '2x', '3x', '4x+', 'Not currently benching'], half: true },
  { id: 'f-deadlift-freq',     label: 'Deadlift Frequency (sessions/week)', type: 'select', required: false,
    options: ['1x', '2x', '3x', '4x+', 'Not currently deadlifting'], half: true },

  // ── Technique ────────────────────────────────────────────────────────────
  { id: 'f-section-technique', label: 'Technique & Style',           type: 'section_heading' },
  { id: 'f-squat-style',       label: 'Squat Style',                 type: 'select',   required: false,
    options: ['High Bar', 'Low Bar', 'Not Sure / Open to coaching'] },
  { id: 'f-bench-style',       label: 'Bench Press Style',           type: 'select',   required: false,
    options: ['Flat back / Minimal arch', 'Moderate arch', 'Competition arch', 'Not Sure / Open to coaching'] },
  { id: 'f-deadlift-style',    label: 'Deadlift Style',              type: 'select',   required: false,
    options: ['Conventional', 'Sumo', 'Not Sure / Open to coaching'] },
  { id: 'f-current-program',   label: 'Current Program Style',       type: 'select',   required: false,
    options: ['Percentage-based', 'RPE / Autoregulation', 'Hybrid', 'No structured program', 'Other'] },
  { id: 'f-weakpoints',        label: 'Current Weak Points / Areas Needing Improvement', type: 'textarea', required: false, placeholder: 'e.g. Squat depth, bench lockout, deadlift off the floor, overall technique…' },

  // ── Training Experience & History ─────────────────────────────────────────
  { id: 'f-section-history',   label: 'Training Experience & History', type: 'section_heading' },
  { id: 'f-experience',        label: 'Training Experience',          type: 'select',   required: true,
    options: ['Beginner (< 1 year)', 'Intermediate (1–3 years)', 'Advanced (3–5 years)', 'Elite (5+ years)'] },
  { id: 'f-fed',               label: 'Federation (if any)',          type: 'text',     required: false, placeholder: 'USAPL, IPF, RPS, WRPF, etc.', half: true },
  { id: 'f-membership',        label: 'Membership / Athlete ID #',    type: 'text',     required: false, placeholder: 'e.g. USAPL-93-12345',        half: true },
  { id: 'f-injuries',          label: 'Current or Past Injuries',    type: 'textarea', required: false, placeholder: 'Please describe any injuries, surgeries, or chronic pain we should know about.' },

  // ── Health & Recovery ─────────────────────────────────────────────────────
  { id: 'f-section-health',    label: 'Health & Recovery',           type: 'section_heading' },
  { id: 'f-nutrition-score',   label: 'Nutrition Score (1–10, 10 = dialed in)', type: 'number', required: false, placeholder: 'e.g. 6', half: true },
  { id: 'f-hydration-score',   label: 'Hydration Score (1–10)',      type: 'number',   required: false, placeholder: 'e.g. 7', half: true },
  { id: 'f-stress-score',      label: 'External Stress Score (1–10, 10 = very high)', type: 'number', required: false, placeholder: 'e.g. 5', half: true },
  { id: 'f-recovery',          label: 'Recovery (1–10, 10 = excellent)', type: 'number', required: false, placeholder: 'e.g. 7', half: true },
  { id: 'f-external-stressors', label: 'External Stressors / Life Factors', type: 'textarea', required: false, placeholder: 'Work stress, family obligations, health conditions, financial pressures, etc.' },

  // ── Coaching Fit ──────────────────────────────────────────────────────────
  { id: 'f-section-coaching',  label: 'Coaching Fit',                type: 'section_heading' },
  { id: 'f-learner-type',      label: 'How Do You Learn Best?',      type: 'select',   required: false,
    options: ['Conceptual (explain the "why")', 'Visual (show me video / diagrams)', 'Kinesthetic (learn by doing / feel)', 'Combination'] },
  { id: 'f-expectations',      label: 'Expectations for a Coach',    type: 'textarea', required: false, placeholder: 'What do you expect from your coach? Communication style, check-in frequency, level of detail, etc.' },
  { id: 'f-concerns',          label: 'Any Concerns or Hesitations?', type: 'textarea', required: false, placeholder: 'Anything holding you back or that you want us to address upfront?' },
  { id: 'f-goals',             label: 'Goals',                       type: 'textarea', required: true,  placeholder: 'Short-term and long-term goals — competition, total, weight class, performance, etc.' },

  // ── How Did You Find Us ───────────────────────────────────────────────────
  { id: 'f-section-source',    label: 'Last Step',                   type: 'section_heading' },
  { id: 'f-hear',              label: 'How Did You Hear About Us?',  type: 'select',   required: false,
    options: ['Instagram', 'Google', 'Referred by a friend or athlete', 'YouTube', 'In person / at a meet', 'Other'] },
]

export const MOCK_ORGS = [
  {
    id: MOCK_ORG_ID,
    name: 'Iron North Athletics',
    slug: 'iron-north',
    plan: 'team_pro',
    status: 'active',
    is_demo: true,
    created_at: '2024-01-10',
    head_coach_id: MOCK_USER_IDS.admin,
    federation: 'USAPL',
    timezone: 'America/New_York',
    weight_unit: 'lbs',
    athlete_limit: 30,
    staff_limit: 5,
    storage_gb_limit: 10,
    storage_gb_used: 6.2,
    logo_url: null,
    address: 'New York, NY',
    // New flags: org has a dedicated nutritionist; athletes can also self-manage
    has_dedicated_nutritionist: true,
    athletes_can_self_manage_nutrition: true,
    members: [
      { user_id: MOCK_USER_IDS.admin,        full_name: 'Marcus Webb',    email: 'admin@powerplus.app',      org_role: 'head_coach',   is_self_athlete: true,  status: 'active', joined_at: '2024-01-10', athlete_count: null, bio: 'Head coach & operations. 10+ years coaching powerlifters across USAPL and IPF. Current 93kg competitor. Specializes in peaking and meet prep strategy.' },
      { user_id: MOCK_USER_IDS.coach,        full_name: 'Elena Torres',   email: 'coach@powerplus.app',      org_role: 'coach',        is_self_athlete: false, status: 'active', joined_at: '2024-01-15', athlete_count: 8,    bio: 'Strength coach specializing in IPF-style technique and movement quality. CSCS certified, 6 years of coaching experience.' },
      { user_id: MOCK_USER_IDS.nutritionist, full_name: 'Dr. Priya Nair', email: 'nutrition@powerplus.app',  org_role: 'nutritionist', is_self_athlete: false, status: 'active', joined_at: '2024-02-10', athlete_count: 12,   bio: 'Registered Sports Dietitian. PhD in Exercise Nutrition. Specializes in weight cut protocols, meet-day fueling, and body composition for strength athletes.' },
      { user_id: 'u-coach-002',              full_name: 'Mike Rivera',     email: 'mike@powerplus.com',       org_role: 'coach',        is_self_athlete: false, status: 'active', joined_at: '2024-02-20', athlete_count: 6,    bio: 'Coach specializing in beginner and intermediate programming. Passionate about building a strong technical foundation from day one.' },
      { user_id: MOCK_USER_IDS.athlete,      full_name: 'Jordan Blake',   email: 'athlete@powerplus.app',    org_role: 'athlete',      is_self_athlete: false, status: 'active', joined_at: '2024-03-01', athlete_count: null },
      { user_id: MOCK_USER_IDS.athlete2,     full_name: 'Samantha Price', email: 'sam.price@email.com',      org_role: 'athlete',      is_self_athlete: false, status: 'active', joined_at: '2024-03-05', athlete_count: null },
      { user_id: 'u-ath-003',               full_name: 'Devon Park',      email: 'devon@email.com',          org_role: 'athlete',      is_self_athlete: false, status: 'active', joined_at: '2024-03-10', athlete_count: null },
    ],
    invitations: [
      { id: 'inv-001', email: 'alex.torres@email.com', org_role: 'coach', status: 'pending', sent_at: '2026-02-20', message: 'Hey Alex, excited to have you on board!' },
      { id: 'inv-002', email: 'newathlete@email.com', org_role: 'athlete', status: 'pending', sent_at: '2026-02-25', message: '' },
    ],
    activity_log: [
      { id: 'act-001', text: 'Jordan Blake logged Week 8 Day 4 workout', time: '2h ago', type: 'workout', user_id: MOCK_USER_IDS.athlete },
      { id: 'act-002', text: 'Coach Elena updated Devon Park\'s training block', time: '5h ago', type: 'update', user_id: MOCK_USER_IDS.coach },
      { id: 'act-003', text: 'Dr. Priya updated Samantha Price\'s nutrition plan', time: '1d ago', type: 'nutrition', user_id: MOCK_USER_IDS.nutritionist },
      { id: 'act-004', text: 'Marcus Webb invited Alex Torres (coach)', time: '1d ago', type: 'invite', user_id: MOCK_USER_IDS.admin },
      { id: 'act-005', text: '6 athletes submitted weekly check-ins', time: '2d ago', type: 'checkin', user_id: null },
      { id: 'act-006', text: 'Samantha Price raised a pain flag (rating: 8)', time: '3d ago', type: 'flag', user_id: MOCK_USER_IDS.athlete2 },
    ],
    // ── Public intake page ──────────────────────────────────────────────────
    public_page: {
      published: true,
      hero_headline: 'Train with Iron North Athletics',
      hero_subheadline: 'Elite powerlifting coaching for athletes who are serious about the platform.',
      hero_cta: 'Apply to Join',
      accent_color: '#a855f7',
      sections: [
        { id: 'sec-001', type: 'about',      order: 1, visible: true, title: 'About the Program',  body: 'Iron North Athletics is a USAPL-affiliated powerlifting team based in New York City. We work with intermediate to advanced lifters to develop meet-ready strength through periodized programming, weekly check-ins, and individualized coaching.' },
        { id: 'sec-002', type: 'coaches',    order: 2, visible: true, title: 'Your Coaching Staff', body: '' },
        { id: 'sec-003', type: 'highlights', order: 3, visible: true, title: 'What You Get',       body: '', items: ['Fully periodized 12–16 week programs', 'Weekly video call check-ins', 'Real-time messaging with your coach', 'Nutrition oversight with Dr. Priya Nair', 'Meet preparation and attempt selection', 'Access to the PowerPlus athlete app'] },
        { id: 'sec-004', type: 'testimonials', order: 4, visible: true, title: 'Athlete Stories', body: '', items: [
          { author: 'Jordan Blake', role: 'Athlete — 93kg Raw', text: 'Marcus completely changed how I approach training. I hit my first 500kg total within 6 months of joining Iron North. The programming is dialed in and the weekly check-ins keep me accountable.' },
          { author: 'Samantha Price', role: 'Athlete — 63kg Raw', text: 'The nutrition coaching from Dr. Priya was game-changing. I dropped a weight class, hit a 30kg PR on my total, and went 9 for 9 at my last meet. Couldn\'t have done it without this team.' },
          { author: 'Devon Park', role: 'Athlete — 83kg Raw', text: 'I came in as a complete beginner and within a year I was competing at my first state meet. Coach Elena has a gift for teaching technique in a way that actually sticks.' },
          { author: 'Chris M.', role: 'Athlete — 120kg Equipped', text: 'Best investment I\'ve made in my lifting career. The structure, the coaching staff, the community — Iron North is the real deal.' },
        ]},
        { id: 'sec-005', type: 'faq',        order: 5, visible: true, title: 'Frequently Asked Questions', body: '', items: [
          { q: 'Do I need to compete to join?',       a: 'No. We welcome athletes who want to train for strength, even if they never step on a platform.' },
          { q: 'How much does coaching cost?',        a: 'Coaching packages start at $150/month. Fill out the intake form and we\'ll reach out with details.' },
          { q: 'What equipment do you support?',      a: 'We primarily coach raw (with sleeves) and single-ply equipped lifting.' },
          { q: 'How long is the onboarding process?', a: 'Once your application is reviewed (usually within 48 hours), onboarding takes about a week.' },
        ]},
        { id: 'sec-006', type: 'intake',     order: 6, visible: true, title: 'Apply to Join',      body: 'Fill out the form below and our coaching staff will be in touch within 48 hours.' },
      ],
      intake_fields: DEFAULT_INTAKE_FIELDS,
    },
    leads: [
      { id: 'lead-001', full_name: 'Taylor Kim',      email: 'taylor.kim@email.com',    phone: '555-0101', experience: 'Intermediate (1–3 years)', goals: 'Compete USAPL nationals in 2026, break 500kg total.', status: 'new',        submitted_at: '2026-02-27', notes: '', assigned_to: null, source: 'Instagram', federation: 'USAPL', injuries: 'None' },
      { id: 'lead-002', full_name: 'Priya Singh',     email: 'priya.singh@email.com',   phone: '',         experience: 'Beginner (< 1 year)',      goals: 'Learn powerlifting from scratch, looking for a gym community.', status: 'contacted', submitted_at: '2026-02-24', notes: 'Sent intro email. Scheduled a discovery call for March 5th.', assigned_to: MOCK_USER_IDS.coach, source: 'Google', federation: '', injuries: 'Left knee — mild patellar tendinitis' },
      { id: 'lead-003', full_name: 'Connor Walsh',    email: 'c.walsh@email.com',       phone: '555-0303', experience: 'Advanced (3–5 years)',     goals: 'Hit 600kg total in the 93kg class within 12 months.', status: 'onboarded', submitted_at: '2026-02-18', notes: 'Accepted. Started Block 1 Feb 25.', assigned_to: MOCK_USER_IDS.admin, source: 'Referred by a friend', federation: 'RPS', injuries: 'None' },
      { id: 'lead-004', full_name: 'Aaliyah Brooks',  email: 'abrooks@email.com',       phone: '',         experience: 'Intermediate (1–3 years)', goals: 'Improve my squat form and hit a 200kg total.', status: 'new',        submitted_at: '2026-03-01', notes: '', assigned_to: null, source: 'Instagram', federation: '', injuries: '' },
      { id: 'lead-005', full_name: 'Liam Chen',       email: 'liam.chen@outlook.com',   phone: '555-0505', experience: 'Elite (5+ years)',         goals: 'Qualify for IPF Worlds.', status: 'declined',  submitted_at: '2026-02-10', notes: 'Already coaches himself — not a fit right now.', assigned_to: null, source: 'YouTube', federation: 'IPF', injuries: 'Shoulder impingement (managed)' },
      { id: 'lead-006', full_name: 'Nadia Okonkwo',   email: 'nadia.ok@gmail.com',      phone: '555-0606', experience: 'Beginner (< 1 year)',      goals: 'Build a base, lose fat, get strong. No meet plans yet but open to competing one day.', status: 'new', submitted_at: '2026-03-02', notes: '', assigned_to: null, source: 'Instagram', federation: '', injuries: '' },
      { id: 'lead-007', full_name: 'Matt Greyson',    email: 'mattg@email.com',         phone: '',         experience: 'Intermediate (1–3 years)', goals: 'Coached programming — been self-programming for 2 years and feel stuck.', status: 'contacted', submitted_at: '2026-02-28', notes: 'Good candidate. Sent welcome package. Waiting on reply.', assigned_to: MOCK_USER_IDS.admin, source: 'Referred by a friend', federation: 'USAPL', injuries: 'Lower back tightness occasionally' },
      { id: 'lead-008', full_name: 'Sofia Reyes',     email: 'sofia.reyes@email.com',   phone: '555-0808', experience: 'Advanced (3–5 years)',     goals: 'Top 3 finish at USAPL Raw Nationals in the 72kg class.', status: 'new', submitted_at: '2026-03-02', notes: '', assigned_to: null, source: 'Google', federation: 'USAPL', injuries: 'None' },
    ],
  },
  {
    id: 'org-002',
    name: 'Iron North Barbell',
    slug: 'iron-north-barbell',
    plan: 'starter',
    status: 'active',
    is_demo: false,
    created_at: '2024-06-01',
    head_coach_id: 'u-coach-ext-001',
    federation: 'IPF',
    timezone: 'America/Chicago',
    weight_unit: 'kg',
    athlete_limit: 10,
    staff_limit: 2,
    storage_gb_limit: 2,
    storage_gb_used: 0.8,
    logo_url: null,
    address: 'Minneapolis, MN',
    has_dedicated_nutritionist: false,
    athletes_can_self_manage_nutrition: true,
    members: [
      { user_id: 'u-coach-ext-001', full_name: 'Chris Nakamura', email: 'chris@ironbarbell.com', org_role: 'head_coach', is_self_athlete: false, status: 'active', joined_at: '2024-06-01', athlete_count: null },
      { user_id: 'u-ath-ext-001', full_name: 'Dana Kowalski', email: 'dana@email.com', org_role: 'athlete', is_self_athlete: false, status: 'active', joined_at: '2024-06-15', athlete_count: null },
      { user_id: 'u-ath-ext-002', full_name: 'Raj Patel', email: 'raj@email.com', org_role: 'athlete', is_self_athlete: false, status: 'active', joined_at: '2024-07-01', athlete_count: null },
      { user_id: MOCK_USER_IDS.athlete, full_name: 'Jordan Blake', email: 'athlete@powerplus.app', org_role: 'athlete', is_self_athlete: false, status: 'active', joined_at: '2025-01-10', athlete_count: null },
    ],
    invitations: [
      { id: 'inv-003', email: 'nutritionist@ironbarbell.com', org_role: 'nutritionist', status: 'pending', sent_at: '2026-02-01', message: 'Join us as our team nutritionist!' },
    ],
    activity_log: [
      { id: 'act-007', text: 'Dana Kowalski logged a new PR — Deadlift 190kg', time: '1d ago', type: 'workout', user_id: 'u-ath-ext-001' },
      { id: 'act-008', text: 'Chris Nakamura created Block 2 program', time: '3d ago', type: 'update', user_id: 'u-coach-ext-001' },
    ],
    public_page: { published: false, hero_headline: 'Iron North Barbell', hero_subheadline: 'Competitive powerlifting coaching in Minneapolis.', hero_cta: 'Apply Now', accent_color: '#3b82f6', sections: [{ id: 'sec-org2-001', type: 'intake', order: 1, visible: true, title: 'Apply to Join', body: '' }], intake_fields: DEFAULT_INTAKE_FIELDS },
    leads: [],
  },
  {
    id: 'org-003',
    name: 'Peak Performance Lab',
    slug: 'peak-performance-lab',
    plan: 'enterprise',
    status: 'active',
    is_demo: false,
    created_at: '2023-11-01',
    head_coach_id: 'u-coach-ext-002',
    federation: 'USAPL',
    timezone: 'America/Los_Angeles',
    weight_unit: 'lbs',
    athlete_limit: 100,
    staff_limit: 20,
    storage_gb_limit: 50,
    storage_gb_used: 18.4,
    logo_url: null,
    address: 'Los Angeles, CA',
    has_dedicated_nutritionist: true,
    athletes_can_self_manage_nutrition: false, // Nutritionist manages all nutrition plans
    members: [
      { user_id: 'u-coach-ext-002', full_name: 'Tara Osei', email: 'tara@peaklabs.com', org_role: 'head_coach', is_self_athlete: false, status: 'active', joined_at: '2023-11-01', athlete_count: null },
      { user_id: 'u-coach-ext-003', full_name: 'Ben Foster', email: 'ben@peaklabs.com', org_role: 'coach', is_self_athlete: false, status: 'active', joined_at: '2023-11-15', athlete_count: 22 },
      { user_id: 'u-nutri-ext-001', full_name: 'Lucia Mendez', email: 'lucia@peaklabs.com', org_role: 'nutritionist', is_self_athlete: false, status: 'active', joined_at: '2023-12-01', athlete_count: 35 },
    ],
    invitations: [],
    activity_log: [
      { id: 'act-009', text: 'Lucia Mendez updated 8 athlete nutrition plans', time: '4h ago', type: 'nutrition', user_id: 'u-nutri-ext-001' },
      { id: 'act-010', text: 'Ben Foster published new meet prep block', time: '2d ago', type: 'update', user_id: 'u-coach-ext-003' },
    ],
    public_page: { published: true, hero_headline: 'Train with Peak Performance Lab', hero_subheadline: 'Science-based powerlifting and performance coaching in LA.', hero_cta: 'Start Your Application', accent_color: '#f97316', sections: [{ id: 'sec-org3-001', type: 'about', order: 1, visible: true, title: 'About PPL', body: 'Peak Performance Lab is an enterprise-level coaching organization working with national and international level athletes.' }, { id: 'sec-org3-002', type: 'intake', order: 2, visible: true, title: 'Apply Now', body: '' }], intake_fields: DEFAULT_INTAKE_FIELDS },
    leads: [
      { id: 'lead-org3-001', full_name: 'Marcus Hill', email: 'mhill@email.com', phone: '', experience: 'Elite (5+ years)', goals: 'IPF World Team qualifier.', status: 'contacted', submitted_at: '2026-02-28', notes: 'Reached out via DM. Very strong on paper.', assigned_to: 'u-coach-ext-002', source: 'Instagram', federation: 'IPF', injuries: '' },
    ],
  },
  {
    id: 'org-004',
    name: 'Atlas Strength Club',
    slug: 'atlas-strength-club',
    plan: 'starter',
    status: 'suspended',
    is_demo: false,
    created_at: '2025-01-15',
    head_coach_id: 'u-coach-ext-004',
    federation: 'RPS',
    timezone: 'America/Denver',
    weight_unit: 'lbs',
    athlete_limit: 10,
    staff_limit: 2,
    storage_gb_limit: 2,
    storage_gb_used: 0.1,
    logo_url: null,
    address: 'Denver, CO',
    has_dedicated_nutritionist: false,
    athletes_can_self_manage_nutrition: true,
    members: [
      { user_id: 'u-coach-ext-004', full_name: 'Omar Shafi', email: 'omar@atlasstrength.com', org_role: 'head_coach', is_self_athlete: false, status: 'active', joined_at: '2025-01-15', athlete_count: null },
    ],
    invitations: [],
    activity_log: [],
    public_page: { published: false, hero_headline: 'Atlas Strength Club', hero_subheadline: 'Powerlifting in Denver, CO.', hero_cta: 'Get Started', accent_color: '#22c55e', sections: [{ id: 'sec-org4-001', type: 'intake', order: 1, visible: true, title: 'Apply to Join', body: '' }], intake_fields: DEFAULT_INTAKE_FIELDS },
    leads: [],
  },
]

// ─── Explicit multi-org memberships (mirrors org_members table) ──────────────
// Useful for resolving "what role does this user have in org X?"
export const MOCK_ORG_MEMBERS = [
  // Marcus Webb: head_coach at primary org AND acts as a self-athlete there
  { id: 'om-001', org_id: MOCK_ORG_ID, user_id: MOCK_USER_IDS.admin,        org_role: 'head_coach',   is_self_athlete: true,  nutrition_permissions: [], joined_at: '2024-01-10' },
  // Elena Torres: coach
  { id: 'om-002', org_id: MOCK_ORG_ID, user_id: MOCK_USER_IDS.coach,        org_role: 'coach',        is_self_athlete: true,  nutrition_permissions: [], joined_at: '2024-01-15' },
  // Dr. Priya: nutritionist
  { id: 'om-003', org_id: MOCK_ORG_ID, user_id: MOCK_USER_IDS.nutritionist, org_role: 'nutritionist', is_self_athlete: true,  nutrition_permissions: [], joined_at: '2024-02-10' },
  // Jordan Blake: athlete at primary org
  { id: 'om-004', org_id: MOCK_ORG_ID, user_id: MOCK_USER_IDS.athlete,           org_role: 'athlete',   is_self_athlete: false, nutrition_permissions: ['view_plan'], joined_at: '2024-03-01' },
  // Jordan Blake: ALSO an athlete at org-002 (multi-org example)
  { id: 'om-005', org_id: 'org-002',   user_id: MOCK_USER_IDS.athlete,           org_role: 'athlete',   is_self_athlete: false, nutrition_permissions: ['view_plan', 'edit_plan'], joined_at: '2025-01-10' },
  // Chris Nakamura: head_coach at org-002 (no nutritionist → gets all nutrition permissions by role)
  { id: 'om-006', org_id: 'org-002',   user_id: 'u-coach-ext-001',               org_role: 'head_coach', is_self_athlete: false, nutrition_permissions: [], joined_at: '2024-06-01' },
  // Ryan Park: assistant coach (mapped to 'coach' role)
  { id: 'om-007', org_id: MOCK_ORG_ID, user_id: MOCK_USER_IDS.assistant_coach,   org_role: 'coach',     is_self_athlete: false, nutrition_permissions: [], joined_at: '2024-04-01' },
]

// ─── Staff–athlete assignments (granular per-athlete permissions) ─────────────
export const MOCK_STAFF_ASSIGNMENTS = [
  // Dr. Priya → Jordan Blake (full nutrition access)
  {
    id: 'saa-001', org_id: MOCK_ORG_ID,
    staff_id: MOCK_USER_IDS.nutritionist, athlete_id: MOCK_USER_IDS.athlete,
    can_view_nutrition: true, can_edit_nutrition: true,
    can_create_meal_prep: true, can_assign_meal_prep: true,
    can_edit_shopping_list: true,
    can_view_workouts: true, can_edit_workouts: false,
    can_view_checkins: true,
  },
  // Dr. Priya → Samantha Price (full nutrition access)
  {
    id: 'saa-002', org_id: MOCK_ORG_ID,
    staff_id: MOCK_USER_IDS.nutritionist, athlete_id: MOCK_USER_IDS.athlete2,
    can_view_nutrition: true, can_edit_nutrition: true,
    can_create_meal_prep: true, can_assign_meal_prep: true,
    can_edit_shopping_list: true,
    can_view_workouts: true, can_edit_workouts: false,
    can_view_checkins: true,
  },
  // Coach Elena → Jordan Blake (workout + check-in only)
  {
    id: 'saa-003', org_id: MOCK_ORG_ID,
    staff_id: MOCK_USER_IDS.coach, athlete_id: MOCK_USER_IDS.athlete,
    can_view_nutrition: true, can_edit_nutrition: false,
    can_create_meal_prep: false, can_assign_meal_prep: false,
    can_edit_shopping_list: false,
    can_view_workouts: true, can_edit_workouts: true,
    can_view_checkins: true,
  },
  // Marcus Webb (head_coach/self-athlete) → himself — so his own data is treated as athlete data
  {
    id: 'saa-004', org_id: MOCK_ORG_ID,
    staff_id: MOCK_USER_IDS.admin, athlete_id: MOCK_USER_IDS.admin,
    can_view_nutrition: true, can_edit_nutrition: true,
    can_create_meal_prep: true, can_assign_meal_prep: true,
    can_edit_shopping_list: true,
    can_view_workouts: true, can_edit_workouts: true,
    can_view_checkins: true,
  },
  // Chris Nakamura (head_coach, no nutritionist) → Dana Kowalski — inherits full nutrition
  {
    id: 'saa-005', org_id: 'org-002',
    staff_id: 'u-coach-ext-001', athlete_id: 'u-ath-ext-001',
    can_view_nutrition: true, can_edit_nutrition: true,
    can_create_meal_prep: true, can_assign_meal_prep: true,
    can_edit_shopping_list: true,
    can_view_workouts: true, can_edit_workouts: true,
    can_view_checkins: true,
  },
]

export const PLAN_META = {
  starter: { label: 'Starter', color: 'blue', athletes: 10, staff: 2, storage: '2GB', price: '$49/mo' },
  team_pro: { label: 'Team Pro', color: 'purple', athletes: 30, staff: 5, storage: '10GB', price: '$149/mo' },
  enterprise: { label: 'Enterprise', color: 'yellow', athletes: 100, staff: 20, storage: '50GB', price: '$499/mo' },
}

// ─── Athlete Weekly Meal Plans (nutritionist-assigned) ───────────────────────
// Shape: { [athleteId]: { [dayKey]: { breakfast: [], lunch: [], dinner: [], snack: [], 'pre-workout': [], 'post-workout': [], supplements: [] } } }
// Each item: { id, name, calories, protein, carbs, fat, source: 'recipe'|'prep'|'custom', recipe_id?, prep_item_id?, servings?, notes? }
const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday']

function emptyWeek() {
  return Object.fromEntries(DAYS.map(d => [d, {
    breakfast: [], lunch: [], dinner: [], snack: [], 'pre-workout': [], 'post-workout': [], supplements: [],
  }]))
}

export const MOCK_ATHLETE_MEAL_PLANS = {
  [MOCK_USER_IDS.athlete]: {
    ...emptyWeek(),
    monday: {
      breakfast: [
        { id: 'amp-001', name: 'High-Protein Overnight Oats', calories: 520, protein: 42, carbs: 62, fat: 10, source: 'recipe', recipe_id: 'ar-001-r1', servings: 1, notes: '' },
      ],
      lunch: [
        { id: 'amp-002', name: 'Chicken & Rice Power Bowl', calories: 680, protein: 55, carbs: 72, fat: 14, source: 'recipe', recipe_id: 'ar-001-r2', servings: 1, notes: '' },
      ],
      dinner: [
        { id: 'amp-003', name: 'Post-Workout Salmon & Sweet Potato', calories: 640, protein: 48, carbs: 58, fat: 18, source: 'recipe', recipe_id: 'ar-001-r4', servings: 1, notes: '' },
      ],
      snack: [
        { id: 'amp-004', name: 'Protein Peanut Butter Balls', calories: 360, protein: 24, carbs: 32, fat: 16, source: 'prep', prep_item_id: 'mpi-004', servings: 2, notes: 'Pre-sleep snack' },
      ],
      'pre-workout': [
        { id: 'amp-005', name: 'Banana Oat Protein Shake', calories: 420, protein: 35, carbs: 55, fat: 6, source: 'recipe', recipe_id: 'ar-001-r3', servings: 1, notes: '45 min before session' },
      ],
      'post-workout': [],
      supplements: [
        { id: 'amp-006', name: 'Creatine Monohydrate 5g', calories: 0, protein: 0, carbs: 0, fat: 0, source: 'custom', servings: 1, notes: 'Post-workout with water' },
        { id: 'amp-007', name: 'Omega-3 (2 caps)', calories: 18, protein: 0, carbs: 0, fat: 2, source: 'custom', servings: 1, notes: 'With dinner' },
      ],
    },
    tuesday: {
      breakfast: [
        { id: 'amp-008', name: 'High-Protein Overnight Oats', calories: 520, protein: 42, carbs: 62, fat: 10, source: 'recipe', recipe_id: 'ar-001-r1', servings: 1, notes: '' },
      ],
      lunch: [
        { id: 'amp-009', name: 'Chicken & Rice Power Bowl', calories: 680, protein: 55, carbs: 72, fat: 14, source: 'recipe', recipe_id: 'ar-001-r2', servings: 1, notes: '' },
      ],
      dinner: [
        { id: 'amp-010', name: 'Rest Day Turkey Egg White Scramble', calories: 380, protein: 48, carbs: 18, fat: 10, source: 'recipe', recipe_id: 'ar-001-r5', servings: 1, notes: 'Rest day — lower carbs' },
      ],
      snack: [],
      'pre-workout': [],
      'post-workout': [],
      supplements: [
        { id: 'amp-011', name: 'Magnesium Glycinate 400mg', calories: 0, protein: 0, carbs: 0, fat: 0, source: 'custom', servings: 1, notes: 'Before bed for sleep quality' },
      ],
    },
    wednesday: {
      breakfast: [
        { id: 'amp-012', name: 'High-Protein Overnight Oats', calories: 520, protein: 42, carbs: 62, fat: 10, source: 'recipe', recipe_id: 'ar-001-r1', servings: 1, notes: '' },
      ],
      lunch: [
        { id: 'amp-013', name: 'Chicken & Rice Power Bowl', calories: 680, protein: 55, carbs: 72, fat: 14, source: 'recipe', recipe_id: 'ar-001-r2', servings: 1, notes: '' },
      ],
      dinner: [
        { id: 'amp-014', name: 'Post-Workout Salmon & Sweet Potato', calories: 640, protein: 48, carbs: 58, fat: 18, source: 'recipe', recipe_id: 'ar-001-r4', servings: 1, notes: '' },
      ],
      snack: [
        { id: 'amp-015', name: 'Protein Peanut Butter Balls', calories: 180, protein: 12, carbs: 16, fat: 8, source: 'prep', prep_item_id: 'mpi-004', servings: 1, notes: '' },
      ],
      'pre-workout': [
        { id: 'amp-016', name: 'Banana Oat Protein Shake', calories: 420, protein: 35, carbs: 55, fat: 6, source: 'recipe', recipe_id: 'ar-001-r3', servings: 1, notes: '' },
      ],
      'post-workout': [
        { id: 'amp-017', name: 'Post-Workout Whey + Dextrose', calories: 280, protein: 30, carbs: 30, fat: 2, source: 'custom', servings: 1, notes: 'Within 30 min of session' },
      ],
      supplements: [
        { id: 'amp-018', name: 'Creatine Monohydrate 5g', calories: 0, protein: 0, carbs: 0, fat: 0, source: 'custom', servings: 1, notes: '' },
      ],
    },
    thursday: { breakfast: [], lunch: [
        { id: 'amp-019', name: 'Chicken & Rice Power Bowl', calories: 680, protein: 55, carbs: 72, fat: 14, source: 'recipe', recipe_id: 'ar-001-r2', servings: 1, notes: '' },
      ], dinner: [
        { id: 'amp-020', name: 'Rest Day Turkey Egg White Scramble', calories: 380, protein: 48, carbs: 18, fat: 10, source: 'recipe', recipe_id: 'ar-001-r5', servings: 1, notes: '' },
      ], snack: [], 'pre-workout': [], 'post-workout': [], supplements: [] },
    friday: { breakfast: [
        { id: 'amp-021', name: 'High-Protein Overnight Oats', calories: 520, protein: 42, carbs: 62, fat: 10, source: 'recipe', recipe_id: 'ar-001-r1', servings: 1, notes: '' },
      ], lunch: [
        { id: 'amp-022', name: 'Chicken & Rice Power Bowl', calories: 680, protein: 55, carbs: 72, fat: 14, source: 'recipe', recipe_id: 'ar-001-r2', servings: 1, notes: '' },
      ], dinner: [
        { id: 'amp-023', name: 'Post-Workout Salmon & Sweet Potato', calories: 640, protein: 48, carbs: 58, fat: 18, source: 'recipe', recipe_id: 'ar-001-r4', servings: 1, notes: '' },
      ], snack: [], 'pre-workout': [
        { id: 'amp-024', name: 'Banana Oat Protein Shake', calories: 420, protein: 35, carbs: 55, fat: 6, source: 'recipe', recipe_id: 'ar-001-r3', servings: 1, notes: '' },
      ], 'post-workout': [], supplements: [
        { id: 'amp-025', name: 'Creatine Monohydrate 5g', calories: 0, protein: 0, carbs: 0, fat: 0, source: 'custom', servings: 1, notes: '' },
      ] },
    saturday: { breakfast: [
        { id: 'amp-026', name: 'High-Protein Overnight Oats', calories: 520, protein: 42, carbs: 62, fat: 10, source: 'recipe', recipe_id: 'ar-001-r1', servings: 1, notes: '' },
      ], lunch: [
        { id: 'amp-027', name: 'Chicken & Rice Power Bowl', calories: 680, protein: 55, carbs: 72, fat: 14, source: 'recipe', recipe_id: 'ar-001-r2', servings: 1, notes: '' },
      ], dinner: [], snack: [], 'pre-workout': [
        { id: 'amp-028', name: 'Banana Oat Protein Shake', calories: 420, protein: 35, carbs: 55, fat: 6, source: 'recipe', recipe_id: 'ar-001-r3', servings: 1, notes: '' },
      ], 'post-workout': [
        { id: 'amp-029', name: 'Post-Workout Whey + Dextrose', calories: 280, protein: 30, carbs: 30, fat: 2, source: 'custom', servings: 1, notes: '' },
      ], supplements: [] },
    sunday: { breakfast: [], lunch: [], dinner: [], snack: [], 'pre-workout': [], 'post-workout': [], supplements: [
        { id: 'amp-030', name: 'Magnesium Glycinate 400mg', calories: 0, protein: 0, carbs: 0, fat: 0, source: 'custom', servings: 1, notes: 'Recovery day — prioritize sleep' },
      ] },
  },
  [MOCK_USER_IDS.athlete2]: {
    ...emptyWeek(),
    monday: {
      breakfast: [
        { id: 'amp-b001', name: 'High-Protein Overnight Oats', calories: 520, protein: 42, carbs: 62, fat: 10, source: 'recipe', recipe_id: 'ar-002-r1', servings: 1, notes: '' },
      ],
      lunch: [
        { id: 'amp-b002', name: 'Chicken & Rice Power Bowl', calories: 680, protein: 55, carbs: 72, fat: 14, source: 'recipe', recipe_id: 'ar-002-r2', servings: 1, notes: '' },
      ],
      dinner: [
        { id: 'amp-b003', name: 'Post-Workout Salmon & Sweet Potato', calories: 640, protein: 48, carbs: 58, fat: 18, source: 'recipe', recipe_id: 'ar-002-r4', servings: 1, notes: 'Shoulder-friendly — no overhead' },
      ],
      snack: [],
      'pre-workout': [
        { id: 'amp-b004', name: 'Banana Oat Protein Shake', calories: 420, protein: 35, carbs: 55, fat: 6, source: 'recipe', recipe_id: 'ar-002-r3', servings: 1, notes: '' },
      ],
      'post-workout': [],
      supplements: [
        { id: 'amp-b005', name: 'Fish Oil 3g', calories: 27, protein: 0, carbs: 0, fat: 3, source: 'custom', servings: 1, notes: 'Anti-inflammatory for shoulder recovery' },
        { id: 'amp-b006', name: 'Vitamin D3 2000 IU', calories: 0, protein: 0, carbs: 0, fat: 0, source: 'custom', servings: 1, notes: 'With breakfast' },
      ],
    },
    tuesday: { breakfast: [], lunch: [
        { id: 'amp-b007', name: 'Chicken & Rice Power Bowl', calories: 680, protein: 55, carbs: 72, fat: 14, source: 'recipe', recipe_id: 'ar-002-r2', servings: 1, notes: '' },
      ], dinner: [
        { id: 'amp-b008', name: 'Rest Day Turkey Egg White Scramble', calories: 380, protein: 48, carbs: 18, fat: 10, source: 'recipe', recipe_id: 'ar-002-r5', servings: 1, notes: '' },
      ], snack: [], 'pre-workout': [], 'post-workout': [], supplements: [] },
    wednesday: { breakfast: [
        { id: 'amp-b009', name: 'High-Protein Overnight Oats', calories: 520, protein: 42, carbs: 62, fat: 10, source: 'recipe', recipe_id: 'ar-002-r1', servings: 1, notes: '' },
      ], lunch: [
        { id: 'amp-b010', name: 'Chicken & Rice Power Bowl', calories: 680, protein: 55, carbs: 72, fat: 14, source: 'recipe', recipe_id: 'ar-002-r2', servings: 1, notes: '' },
      ], dinner: [], snack: [], 'pre-workout': [], 'post-workout': [], supplements: [] },
    thursday: { breakfast: [], lunch: [], dinner: [], snack: [], 'pre-workout': [], 'post-workout': [], supplements: [] },
    friday: { breakfast: [], lunch: [], dinner: [], snack: [], 'pre-workout': [], 'post-workout': [], supplements: [] },
    saturday: { breakfast: [], lunch: [], dinner: [], snack: [], 'pre-workout': [], 'post-workout': [], supplements: [] },
    sunday: { breakfast: [], lunch: [], dinner: [], snack: [], 'pre-workout': [], 'post-workout': [], supplements: [] },
  },
}

// ─── Meal History Log ─────────────────────────────────────────────────────────
// Historical record of assigned + completed meals per athlete per day
export const MOCK_MEAL_HISTORY = [
  // ── Week 7 (Feb 16–22) — Jordan Blake ──────────────────────────────────────
  {
    id: 'mh-w7-mon',
    athlete_id: MOCK_USER_IDS.athlete,
    date: '2026-02-16',
    week_label: 'Week 7 — Intensification',
    block_id: 'tb-2',
    goal_ids: ['g1', 'g4'],
    day_type: 'training',
    meals: {
      breakfast:     [{ name: 'High-Protein Overnight Oats',    calories: 520, protein: 42, carbs: 62, fat: 10, completed: true  }],
      'pre-workout': [{ name: 'Banana Oat Protein Shake',       calories: 420, protein: 35, carbs: 55, fat:  6, completed: true  }],
      lunch:         [{ name: 'Chicken & Rice Power Bowl',       calories: 680, protein: 55, carbs: 72, fat: 14, completed: true  }],
      snack:         [{ name: 'Protein Peanut Butter Balls',     calories: 360, protein: 24, carbs: 32, fat: 16, completed: true  }],
      dinner:        [{ name: 'Post-Workout Salmon & Sweet Potato', calories: 640, protein: 48, carbs: 58, fat: 18, completed: true  }],
      'post-workout':[],
      supplements:   [{ name: 'Creatine 5g', calories: 0, protein: 0, carbs: 0, fat: 0, completed: true }, { name: 'Omega-3', calories: 18, protein: 0, carbs: 0, fat: 2, completed: true }],
    },
    totals:  { calories: 2638, protein: 204, carbs: 279, fat: 66 },
    targets: { calories: 3200, protein: 200, carbs: 380, fat: 90 },
    compliance_pct: 92,
    notes: '',
  },
  {
    id: 'mh-w7-tue',
    athlete_id: MOCK_USER_IDS.athlete,
    date: '2026-02-17',
    week_label: 'Week 7 — Intensification',
    block_id: 'tb-2',
    goal_ids: ['g1'],
    day_type: 'rest',
    meals: {
      breakfast:     [{ name: 'High-Protein Overnight Oats',    calories: 520, protein: 42, carbs: 62, fat: 10, completed: true  }],
      'pre-workout': [],
      lunch:         [{ name: 'Chicken & Rice Power Bowl',       calories: 680, protein: 55, carbs: 72, fat: 14, completed: true  }],
      snack:         [],
      dinner:        [{ name: 'Rest Day Turkey Egg White Scramble', calories: 380, protein: 48, carbs: 18, fat: 10, completed: false }],
      'post-workout':[],
      supplements:   [{ name: 'Magnesium Glycinate 400mg', calories: 0, protein: 0, carbs: 0, fat: 0, completed: true }],
    },
    totals:  { calories: 1580, protein: 145, carbs: 152, fat: 34 },
    targets: { calories: 2600, protein: 180, carbs: 260, fat: 70 },
    compliance_pct: 76,
    notes: 'Skipped dinner — felt nauseous.',
  },
  {
    id: 'mh-w7-wed',
    athlete_id: MOCK_USER_IDS.athlete,
    date: '2026-02-18',
    week_label: 'Week 7 — Intensification',
    block_id: 'tb-2',
    goal_ids: ['g1', 'g4'],
    day_type: 'training',
    meals: {
      breakfast:     [{ name: 'High-Protein Overnight Oats',    calories: 520, protein: 42, carbs: 62, fat: 10, completed: true  }],
      'pre-workout': [{ name: 'Banana Oat Protein Shake',       calories: 420, protein: 35, carbs: 55, fat:  6, completed: true  }],
      lunch:         [{ name: 'Chicken & Rice Power Bowl',       calories: 680, protein: 55, carbs: 72, fat: 14, completed: true  }],
      snack:         [{ name: 'Protein Peanut Butter Balls',     calories: 180, protein: 12, carbs: 16, fat:  8, completed: true  }],
      dinner:        [{ name: 'Post-Workout Salmon & Sweet Potato', calories: 640, protein: 48, carbs: 58, fat: 18, completed: true  }],
      'post-workout':[{ name: 'Post-Workout Whey + Dextrose',   calories: 280, protein: 30, carbs: 30, fat:  2, completed: true  }],
      supplements:   [{ name: 'Creatine 5g', calories: 0, protein: 0, carbs: 0, fat: 0, completed: true }],
    },
    totals:  { calories: 2720, protein: 222, carbs: 293, fat: 58 },
    targets: { calories: 3200, protein: 200, carbs: 380, fat: 90 },
    compliance_pct: 100,
    notes: 'Great session — PRed squat. Hit all meals.',
  },
  {
    id: 'mh-w7-fri',
    athlete_id: MOCK_USER_IDS.athlete,
    date: '2026-02-20',
    week_label: 'Week 7 — Intensification',
    block_id: 'tb-2',
    goal_ids: ['g1', 'g4'],
    day_type: 'training',
    meals: {
      breakfast:     [{ name: 'High-Protein Overnight Oats',    calories: 520, protein: 42, carbs: 62, fat: 10, completed: true  }],
      'pre-workout': [{ name: 'Banana Oat Protein Shake',       calories: 420, protein: 35, carbs: 55, fat:  6, completed: true  }],
      lunch:         [{ name: 'Chicken & Rice Power Bowl',       calories: 680, protein: 55, carbs: 72, fat: 14, completed: false }],
      snack:         [],
      dinner:        [{ name: 'Post-Workout Salmon & Sweet Potato', calories: 640, protein: 48, carbs: 58, fat: 18, completed: true  }],
      'post-workout':[],
      supplements:   [{ name: 'Creatine 5g', calories: 0, protein: 0, carbs: 0, fat: 0, completed: true }],
    },
    totals:  { calories: 1580, protein: 125, carbs: 175, fat: 34 },
    targets: { calories: 3200, protein: 200, carbs: 380, fat: 90 },
    compliance_pct: 68,
    notes: 'Missed lunch — work conflict.',
  },
  {
    id: 'mh-w7-sat',
    athlete_id: MOCK_USER_IDS.athlete,
    date: '2026-02-21',
    week_label: 'Week 7 — Intensification',
    block_id: 'tb-2',
    goal_ids: ['g1'],
    day_type: 'training',
    meals: {
      breakfast:     [{ name: 'High-Protein Overnight Oats',    calories: 520, protein: 42, carbs: 62, fat: 10, completed: true  }],
      'pre-workout': [{ name: 'Banana Oat Protein Shake',       calories: 420, protein: 35, carbs: 55, fat:  6, completed: true  }],
      lunch:         [{ name: 'Chicken & Rice Power Bowl',       calories: 680, protein: 55, carbs: 72, fat: 14, completed: true  }],
      snack:         [],
      dinner:        [],
      'post-workout':[{ name: 'Post-Workout Whey + Dextrose',   calories: 280, protein: 30, carbs: 30, fat:  2, completed: true  }],
      supplements:   [],
    },
    totals:  { calories: 1900, protein: 162, carbs: 219, fat: 32 },
    targets: { calories: 3200, protein: 200, carbs: 380, fat: 90 },
    compliance_pct: 79,
    notes: '',
  },
  // ── Week 8 (Feb 23–Mar 1) — Jordan Blake ───────────────────────────────────
  {
    id: 'mh-w8-mon',
    athlete_id: MOCK_USER_IDS.athlete,
    date: '2026-02-23',
    week_label: 'Week 8 — Intensification',
    block_id: 'tb-2',
    goal_ids: ['g1', 'g4'],
    day_type: 'training',
    meals: {
      breakfast:     [{ name: 'High-Protein Overnight Oats',    calories: 520, protein: 42, carbs: 62, fat: 10, completed: true  }],
      'pre-workout': [{ name: 'Banana Oat Protein Shake',       calories: 420, protein: 35, carbs: 55, fat:  6, completed: true  }],
      lunch:         [{ name: 'Chicken & Rice Power Bowl',       calories: 680, protein: 55, carbs: 72, fat: 14, completed: true  }],
      snack:         [{ name: 'Protein Peanut Butter Balls',     calories: 360, protein: 24, carbs: 32, fat: 16, completed: false }],
      dinner:        [{ name: 'Post-Workout Salmon & Sweet Potato', calories: 640, protein: 48, carbs: 58, fat: 18, completed: true  }],
      'post-workout':[],
      supplements:   [{ name: 'Creatine 5g', calories: 0, protein: 0, carbs: 0, fat: 0, completed: true }, { name: 'Omega-3', calories: 18, protein: 0, carbs: 0, fat: 2, completed: true }],
    },
    totals:  { calories: 2638, protein: 204, carbs: 279, fat: 66 },
    targets: { calories: 3200, protein: 200, carbs: 380, fat: 90 },
    compliance_pct: 87,
    notes: 'Skipped snack — too full after dinner.',
  },
  {
    id: 'mh-w8-tue',
    athlete_id: MOCK_USER_IDS.athlete,
    date: '2026-02-24',
    week_label: 'Week 8 — Intensification',
    block_id: 'tb-2',
    goal_ids: ['g1'],
    day_type: 'rest',
    meals: {
      breakfast:     [{ name: 'High-Protein Overnight Oats',    calories: 520, protein: 42, carbs: 62, fat: 10, completed: true  }],
      'pre-workout': [],
      lunch:         [{ name: 'Chicken & Rice Power Bowl',       calories: 680, protein: 55, carbs: 72, fat: 14, completed: true  }],
      snack:         [],
      dinner:        [{ name: 'Rest Day Turkey Egg White Scramble', calories: 380, protein: 48, carbs: 18, fat: 10, completed: true }],
      'post-workout':[],
      supplements:   [{ name: 'Magnesium Glycinate 400mg', calories: 0, protein: 0, carbs: 0, fat: 0, completed: true }],
    },
    totals:  { calories: 1580, protein: 145, carbs: 152, fat: 34 },
    targets: { calories: 2600, protein: 180, carbs: 260, fat: 70 },
    compliance_pct: 88,
    notes: '',
  },
  {
    id: 'mh-w8-wed',
    athlete_id: MOCK_USER_IDS.athlete,
    date: '2026-02-25',
    week_label: 'Week 8 — Intensification',
    block_id: 'tb-2',
    goal_ids: ['g1', 'g4'],
    day_type: 'training',
    meals: {
      breakfast:     [{ name: 'High-Protein Overnight Oats',    calories: 520, protein: 42, carbs: 62, fat: 10, completed: true  }],
      'pre-workout': [{ name: 'Banana Oat Protein Shake',       calories: 420, protein: 35, carbs: 55, fat:  6, completed: true  }],
      lunch:         [{ name: 'Chicken & Rice Power Bowl',       calories: 680, protein: 55, carbs: 72, fat: 14, completed: true  }],
      snack:         [{ name: 'Protein Peanut Butter Balls',     calories: 180, protein: 12, carbs: 16, fat:  8, completed: true  }],
      dinner:        [{ name: 'Post-Workout Salmon & Sweet Potato', calories: 640, protein: 48, carbs: 58, fat: 18, completed: true  }],
      'post-workout':[{ name: 'Post-Workout Whey + Dextrose',   calories: 280, protein: 30, carbs: 30, fat:  2, completed: true  }],
      supplements:   [{ name: 'Creatine 5g', calories: 0, protein: 0, carbs: 0, fat: 0, completed: true }],
    },
    totals:  { calories: 2720, protein: 222, carbs: 293, fat: 58 },
    targets: { calories: 3200, protein: 200, carbs: 380, fat: 90 },
    compliance_pct: 100,
    notes: 'Perfect compliance day.',
  },
  {
    id: 'mh-w8-fri',
    athlete_id: MOCK_USER_IDS.athlete,
    date: '2026-02-27',
    week_label: 'Week 8 — Intensification',
    block_id: 'tb-2',
    goal_ids: ['g1', 'g4'],
    day_type: 'training',
    meals: {
      breakfast:     [{ name: 'High-Protein Overnight Oats',    calories: 520, protein: 42, carbs: 62, fat: 10, completed: true  }],
      'pre-workout': [{ name: 'Banana Oat Protein Shake',       calories: 420, protein: 35, carbs: 55, fat:  6, completed: true  }],
      lunch:         [{ name: 'Chicken & Rice Power Bowl',       calories: 680, protein: 55, carbs: 72, fat: 14, completed: true  }],
      snack:         [],
      dinner:        [{ name: 'Post-Workout Salmon & Sweet Potato', calories: 640, protein: 48, carbs: 58, fat: 18, completed: true  }],
      'post-workout':[{ name: 'Post-Workout Whey + Dextrose',   calories: 280, protein: 30, carbs: 30, fat:  2, completed: true  }],
      supplements:   [{ name: 'Creatine 5g', calories: 0, protein: 0, carbs: 0, fat: 0, completed: true }],
    },
    totals:  { calories: 2540, protein: 192, carbs: 249, fat: 50 },
    targets: { calories: 3200, protein: 200, carbs: 380, fat: 90 },
    compliance_pct: 95,
    notes: '',
  },
  // ── Week 7 — Samantha Price ─────────────────────────────────────────────────
  {
    id: 'mh-sam-w7-mon',
    athlete_id: MOCK_USER_IDS.athlete2,
    date: '2026-02-16',
    week_label: 'Week 7 — Intensification',
    block_id: 'tb-2',
    goal_ids: ['g1'],
    day_type: 'training',
    meals: {
      breakfast:     [{ name: 'High-Protein Overnight Oats',    calories: 520, protein: 42, carbs: 62, fat: 10, completed: true  }],
      'pre-workout': [{ name: 'Banana Oat Protein Shake',       calories: 420, protein: 35, carbs: 55, fat:  6, completed: true  }],
      lunch:         [{ name: 'Chicken & Rice Power Bowl',       calories: 680, protein: 55, carbs: 72, fat: 14, completed: true  }],
      snack:         [],
      dinner:        [{ name: 'Post-Workout Salmon & Sweet Potato', calories: 640, protein: 48, carbs: 58, fat: 18, completed: false }],
      'post-workout':[],
      supplements:   [{ name: 'Fish Oil 3g', calories: 27, protein: 0, carbs: 0, fat: 3, completed: true }, { name: 'Vitamin D3', calories: 0, protein: 0, carbs: 0, fat: 0, completed: true }],
    },
    totals:  { calories: 1620, protein: 132, carbs: 189, fat: 30 },
    targets: { calories: 2800, protein: 175, carbs: 320, fat: 80 },
    compliance_pct: 74,
    notes: 'Shoulder flare-up — reduced appetite.',
  },
  {
    id: 'mh-sam-w8-mon',
    athlete_id: MOCK_USER_IDS.athlete2,
    date: '2026-02-23',
    week_label: 'Week 8 — Intensification',
    block_id: 'tb-2',
    goal_ids: ['g1'],
    day_type: 'training',
    meals: {
      breakfast:     [{ name: 'High-Protein Overnight Oats',    calories: 520, protein: 42, carbs: 62, fat: 10, completed: true  }],
      'pre-workout': [{ name: 'Banana Oat Protein Shake',       calories: 420, protein: 35, carbs: 55, fat:  6, completed: true  }],
      lunch:         [{ name: 'Chicken & Rice Power Bowl',       calories: 680, protein: 55, carbs: 72, fat: 14, completed: true  }],
      snack:         [],
      dinner:        [{ name: 'Post-Workout Salmon & Sweet Potato', calories: 640, protein: 48, carbs: 58, fat: 18, completed: true  }],
      'post-workout':[],
      supplements:   [{ name: 'Fish Oil 3g', calories: 27, protein: 0, carbs: 0, fat: 3, completed: true }],
    },
    totals:  { calories: 2287, protein: 180, carbs: 247, fat: 51 },
    targets: { calories: 2800, protein: 175, carbs: 320, fat: 80 },
    compliance_pct: 91,
    notes: 'Shoulder feeling better — full compliance.',
  },
]

// ─── Athlete Recipe Library ───────────────────────────────────────────────────
// Per-athlete recipes: assigned from templates (source_recipe_id set) or fully custom.
// When assigned from a template, the recipe is a deep copy — tweaks are independent.
// Shape per item: { id, athlete_id, source_recipe_id?, name, meal_type, macros, ingredients, instructions, tags, day_types, prep_time, cook_time, servings, is_custom_for_athlete }
export const MOCK_ATHLETE_RECIPES = {
  [MOCK_USER_IDS.athlete]: [
    {
      id: 'ar-001-r1', athlete_id: MOCK_USER_IDS.athlete, source_recipe_id: 'r1',
      name: 'High-Protein Overnight Oats',
      meal_type: 'breakfast', prep_time: 5, cook_time: 0, servings: 1,
      macros: { calories: 520, protein: 42, carbs: 62, fat: 10 },
      ingredients: [
        { name: 'Rolled oats', amount: '80g' },
        { name: 'Greek yogurt (0% fat)', amount: '150g' },
        { name: 'Whey protein powder', amount: '30g' },
        { name: 'Banana', amount: '1 medium' },
        { name: 'Unsweetened almond milk', amount: '200ml' },
        { name: 'Chia seeds', amount: '10g' },
      ],
      instructions: 'Mix oats, chia seeds, protein powder in a jar. Add yogurt and almond milk. Stir. Refrigerate overnight. Add banana before serving.',
      tags: ['meal-prep', 'high-protein', 'training-day'],
      day_types: ['training', 'rest'],
      is_custom_for_athlete: false,
    },
    {
      id: 'ar-001-r2', athlete_id: MOCK_USER_IDS.athlete, source_recipe_id: 'r2',
      name: 'Chicken & Rice Power Bowl',
      meal_type: 'lunch', prep_time: 10, cook_time: 20, servings: 1,
      macros: { calories: 680, protein: 55, carbs: 72, fat: 14 },
      ingredients: [
        { name: 'Chicken breast', amount: '200g' },
        { name: 'White rice (dry)', amount: '100g' },
        { name: 'Broccoli', amount: '150g' },
        { name: 'Olive oil', amount: '10ml' },
        { name: 'Garlic', amount: '2 cloves' },
        { name: 'Low-sodium soy sauce', amount: '15ml' },
      ],
      instructions: 'Cook rice. Season chicken with garlic, salt, pepper. Pan-sear 6-7 min/side. Steam broccoli 4 min. Drizzle soy sauce.',
      tags: ['meal-prep', 'high-protein', 'training-day'],
      day_types: ['training'],
      is_custom_for_athlete: false,
    },
    {
      id: 'ar-001-r3', athlete_id: MOCK_USER_IDS.athlete, source_recipe_id: 'r3',
      name: 'Pre-Workout Banana Oat Shake',
      meal_type: 'pre-workout', prep_time: 5, cook_time: 0, servings: 1,
      macros: { calories: 420, protein: 35, carbs: 55, fat: 6 },
      ingredients: [
        { name: 'Banana', amount: '1 large' },
        { name: 'Whey protein powder', amount: '30g' },
        { name: 'Rolled oats', amount: '40g' },
        { name: 'Whole milk', amount: '250ml' },
        { name: 'Honey', amount: '10g' },
      ],
      instructions: 'Blend all ingredients on high 30 seconds. Consume 45-60 min before training.',
      tags: ['no-cook', 'pre-workout', 'quick'],
      day_types: ['training'],
      is_custom_for_athlete: false,
    },
    {
      id: 'ar-001-r4', athlete_id: MOCK_USER_IDS.athlete, source_recipe_id: 'r4',
      name: 'Salmon & Sweet Potato (Jordan)',
      meal_type: 'dinner', prep_time: 10, cook_time: 25, servings: 1,
      // Jordan tweaked: extra sweet potato for higher carbs during peak block
      macros: { calories: 700, protein: 48, carbs: 72, fat: 18 },
      ingredients: [
        { name: 'Salmon fillet', amount: '200g' },
        { name: 'Sweet potato', amount: '380g' },
        { name: 'Asparagus', amount: '100g' },
        { name: 'Olive oil', amount: '15ml' },
        { name: 'Lemon', amount: '1/2' },
        { name: 'Fresh dill', amount: '5g' },
      ],
      instructions: 'Preheat oven 200°C. Cube sweet potato (increased portion), toss in olive oil, roast 20 min. Season salmon, pan-sear 4 min/side. Steam asparagus.',
      tags: ['high-protein', 'omega-3', 'post-workout'],
      day_types: ['training', 'rest'],
      is_custom_for_athlete: true,
    },
  ],
  [MOCK_USER_IDS.athlete2]: [
    {
      id: 'ar-002-r1', athlete_id: MOCK_USER_IDS.athlete2, source_recipe_id: 'r1',
      name: 'High-Protein Overnight Oats',
      meal_type: 'breakfast', prep_time: 5, cook_time: 0, servings: 1,
      macros: { calories: 520, protein: 42, carbs: 62, fat: 10 },
      ingredients: [
        { name: 'Rolled oats', amount: '80g' },
        { name: 'Greek yogurt (0% fat)', amount: '150g' },
        { name: 'Whey protein powder', amount: '30g' },
        { name: 'Banana', amount: '1 medium' },
        { name: 'Unsweetened almond milk', amount: '200ml' },
      ],
      instructions: 'Mix oats, protein powder in a jar. Add yogurt and almond milk. Stir. Refrigerate overnight. Add banana before serving.',
      tags: ['meal-prep', 'high-protein'],
      day_types: ['training', 'rest'],
      is_custom_for_athlete: false,
    },
    {
      id: 'ar-002-r2', athlete_id: MOCK_USER_IDS.athlete2, source_recipe_id: 'r2',
      name: 'Chicken & Rice Power Bowl (Samantha)',
      meal_type: 'lunch', prep_time: 10, cook_time: 20, servings: 1,
      // Samantha: lower fat — no sesame seeds, olive oil reduced for shoulder recovery anti-inflammatory focus
      macros: { calories: 620, protein: 55, carbs: 72, fat: 8 },
      ingredients: [
        { name: 'Chicken breast', amount: '200g' },
        { name: 'White rice (dry)', amount: '100g' },
        { name: 'Broccoli', amount: '150g' },
        { name: 'Olive oil', amount: '5ml' },
        { name: 'Garlic', amount: '2 cloves' },
        { name: 'Low-sodium soy sauce', amount: '15ml' },
      ],
      instructions: 'Cook rice. Season chicken with garlic, salt, pepper. Pan-sear in minimal oil. Steam broccoli. Drizzle soy sauce.',
      tags: ['meal-prep', 'high-protein', 'lower-fat'],
      day_types: ['training'],
      is_custom_for_athlete: true,
    },
    {
      id: 'ar-002-r5', athlete_id: MOCK_USER_IDS.athlete2, source_recipe_id: 'r5',
      name: 'Turkey Egg White Scramble (Samantha)',
      meal_type: 'breakfast', prep_time: 5, cook_time: 10, servings: 1,
      // Samantha: added extra feta + cherry tomatoes for palatability
      macros: { calories: 410, protein: 48, carbs: 20, fat: 12 },
      ingredients: [
        { name: 'Egg whites', amount: '6 large' },
        { name: 'Ground turkey', amount: '100g' },
        { name: 'Baby spinach', amount: '60g' },
        { name: 'Cherry tomatoes', amount: '120g' },
        { name: 'Feta cheese (light)', amount: '40g' },
        { name: 'Olive oil spray', amount: '1 spray' },
      ],
      instructions: 'Brown turkey in pan, add spinach until wilted. Pour egg whites over, scramble gently. Add extra tomatoes and more feta.',
      tags: ['high-protein', 'rest-day', 'lower-carb'],
      day_types: ['rest'],
      is_custom_for_athlete: true,
    },
  ],
}

// ─── Athlete Prep Log ─────────────────────────────────────────────────────────
// Meal prep sessions scoped to a specific athlete (nutritionist batches for that athlete).
// Each item tracks servings_made / servings_consumed — remaining = made - consumed.
export const MOCK_ATHLETE_PREP_LOG = {
  [MOCK_USER_IDS.athlete]: [
    {
      id: 'apl-001-w8', athlete_id: MOCK_USER_IDS.athlete,
      label: 'Jordan — Week 8 Prep',
      date: '2026-02-22',
      week_start: '2026-02-23', week_end: '2026-03-01',
      linked_block_id: 'tb-2', linked_goal_ids: ['g3'],
      notes: 'Full week prep for Jordan. Extra sweet potato portions.',
      items: [
        { id: 'api-001', recipe_id: 'ar-001-r2', recipe_name: 'Chicken & Rice Power Bowl', servings_made: 5, servings_consumed: 2, storage: 'fridge', macros_per_serving: { calories: 680, protein: 55, carbs: 72, fat: 14 } },
        { id: 'api-002', recipe_id: 'ar-001-r4', recipe_name: 'Salmon & Sweet Potato (Jordan)', servings_made: 4, servings_consumed: 1, storage: 'fridge', macros_per_serving: { calories: 700, protein: 48, carbs: 72, fat: 18 } },
        { id: 'api-003', recipe_id: 'ar-001-r1', recipe_name: 'High-Protein Overnight Oats', servings_made: 5, servings_consumed: 2, storage: 'fridge', macros_per_serving: { calories: 520, protein: 42, carbs: 62, fat: 10 } },
      ],
    },
  ],
  [MOCK_USER_IDS.athlete2]: [
    {
      id: 'apl-002-w8', athlete_id: MOCK_USER_IDS.athlete2,
      label: 'Samantha — Week 8 Prep',
      date: '2026-02-22',
      week_start: '2026-02-23', week_end: '2026-03-01',
      linked_block_id: 'tb-2', linked_goal_ids: ['g3'],
      notes: 'Lower-fat variants for shoulder recovery protocol.',
      items: [
        { id: 'api-004', recipe_id: 'ar-002-r2', recipe_name: 'Chicken & Rice Power Bowl (Samantha)', servings_made: 4, servings_consumed: 1, storage: 'fridge', macros_per_serving: { calories: 620, protein: 55, carbs: 72, fat: 8 } },
        { id: 'api-005', recipe_id: 'ar-002-r5', recipe_name: 'Turkey Egg White Scramble (Samantha)', servings_made: 3, servings_consumed: 0, storage: 'fridge', macros_per_serving: { calories: 410, protein: 48, carbs: 20, fat: 12 } },
      ],
    },
  ],
}

// ─── Athlete Shopping Lists ───────────────────────────────────────────────────
// Per-athlete shopping lists created/assigned by nutritionist.
// Linked to recipes used in that athlete's meal plan for that week.
// Tracks athlete's budget against estimated cost.
// Shape: { [athleteId]: [{ id, athlete_id, label, week_start, week_end, budget, spent_estimate, status,
//   linked_recipe_ids, linked_block_id, notes,
//   categories: [{ name, icon, items: [{ id, name, amount, price, checked, recipe_ids, allergen_flag? }] }]
// }] }
export const MOCK_ATHLETE_SHOPPING_LISTS = {
  [MOCK_USER_IDS.athlete]: [
    {
      id: 'asl-001-w8',
      athlete_id: MOCK_USER_IDS.athlete,
      label: 'Jordan — Week 8 Shopping',
      week_start: '2026-02-23',
      week_end: '2026-03-01',
      shopping_date: '2026-03-02',
      budget: 175,
      status: 'active',
      pantry_log: [
        { id: 'pl-001-1', name: 'Chicken breast', amount: '1.0kg', price: 10.99, purchased_at: '2026-02-23', recipe_ids: ['ar-001-r2'], list_label: 'Jordan — Week 7 Shopping', notes: '' },
        { id: 'pl-001-2', name: 'Rolled oats', amount: '500g', price: 2.49, purchased_at: '2026-02-23', recipe_ids: ['ar-001-r1'], list_label: 'Jordan — Week 7 Shopping', notes: '' },
        { id: 'pl-001-3', name: 'Olive oil', amount: '1 bottle', price: 6.99, purchased_at: '2026-02-23', recipe_ids: ['ar-001-r2','ar-001-r4'], list_label: 'Jordan — Week 7 Shopping', notes: 'Still ~half left' },
        { id: 'pl-001-4', name: 'Whey protein powder', amount: '1 tub', price: 39.99, purchased_at: '2026-02-16', recipe_ids: ['ar-001-r1'], list_label: 'Jordan — Week 6 Shopping', notes: 'Last ~10 servings remaining' },
        { id: 'pl-001-5', name: 'White rice (dry)', amount: '500g', price: 1.99, purchased_at: '2026-02-23', recipe_ids: ['ar-001-r2'], list_label: 'Jordan — Week 7 Shopping', notes: '' },
      ],
      linked_recipe_ids: ['ar-001-r1', 'ar-001-r2', 'ar-001-r4'],
      linked_block_id: 'tb-2',
      notes: 'High-protein focus. Extra sweet potato for Jordan\'s tweaked salmon recipe. Quantities for 5 training days.',
      categories: [
        { name: 'Proteins', icon: '🥩', items: [
          { id: 'asli-001', name: 'Chicken breast', amount: '1.0kg', price: 10.99, checked: true,  recipe_ids: ['ar-001-r2'], allergen_flag: false },
          { id: 'asli-002', name: 'Salmon fillets', amount: '1.0kg (5×200g)', price: 19.99, checked: false, recipe_ids: ['ar-001-r4'], allergen_flag: false },
          { id: 'asli-003', name: 'Whey protein powder', amount: '1 tub', price: 39.99, checked: true, recipe_ids: ['ar-001-r1', 'ar-001-r3'], allergen_flag: false },
          { id: 'asli-004', name: 'Greek yogurt (0% fat)', amount: '750g', price: 5.49, checked: false, recipe_ids: ['ar-001-r1'], allergen_flag: false },
        ]},
        { name: 'Carbohydrates', icon: '🌾', items: [
          { id: 'asli-005', name: 'Rolled oats', amount: '500g', price: 2.49, checked: true, recipe_ids: ['ar-001-r1', 'ar-001-r3'], allergen_flag: false },
          { id: 'asli-006', name: 'White rice (dry)', amount: '500g', price: 1.99, checked: true, recipe_ids: ['ar-001-r2'], allergen_flag: false },
          { id: 'asli-007', name: 'Sweet potatoes (Jordan — extra portion)', amount: '1.9kg (5×380g)', price: 5.49, checked: false, recipe_ids: ['ar-001-r4'], allergen_flag: false },
          { id: 'asli-008', name: 'Bananas', amount: '10 (1.5 bunches)', price: 2.49, checked: false, recipe_ids: ['ar-001-r1', 'ar-001-r3'], allergen_flag: false },
        ]},
        { name: 'Vegetables', icon: '🥦', items: [
          { id: 'asli-009', name: 'Broccoli', amount: '750g', price: 2.99, checked: false, recipe_ids: ['ar-001-r2'], allergen_flag: false },
          { id: 'asli-010', name: 'Asparagus', amount: '500g', price: 3.49, checked: false, recipe_ids: ['ar-001-r4'], allergen_flag: false },
        ]},
        { name: 'Pantry', icon: '🫙', items: [
          { id: 'asli-011', name: 'Olive oil', amount: '1 bottle', price: 6.99, checked: true, recipe_ids: ['ar-001-r2', 'ar-001-r4'], allergen_flag: false },
          { id: 'asli-012', name: 'Low-sodium soy sauce', amount: '1 bottle', price: 2.49, checked: false, recipe_ids: ['ar-001-r2'], allergen_flag: false },
          { id: 'asli-013', name: 'Chia seeds', amount: '100g', price: 2.49, checked: false, recipe_ids: ['ar-001-r1'], allergen_flag: false },
          { id: 'asli-014', name: 'Fresh dill', amount: '1 bunch', price: 1.49, checked: false, recipe_ids: ['ar-001-r4'], allergen_flag: false },
        ]},
      ],
    },
  ],
  [MOCK_USER_IDS.athlete2]: [
    {
      id: 'asl-002-w8',
      athlete_id: MOCK_USER_IDS.athlete2,
      label: 'Samantha — Week 8 Shopping',
      week_start: '2026-02-23',
      week_end: '2026-03-01',
      shopping_date: '2026-03-02',
      budget: 150,
      status: 'active',
      pantry_log: [
        { id: 'pl-002-1', name: 'Rolled oats', amount: '320g', price: 1.99, purchased_at: '2026-02-23', recipe_ids: ['ar-002-r1'], list_label: 'Samantha — Week 7 Shopping', notes: '' },
        { id: 'pl-002-2', name: 'Unsweetened almond milk', amount: '1.4 litres', price: 3.99, purchased_at: '2026-02-16', recipe_ids: ['ar-002-r1'], list_label: 'Samantha — Week 6 Shopping', notes: 'Unopened carton still in pantry' },
        { id: 'pl-002-3', name: 'Olive oil', amount: '1 bottle', price: 6.99, purchased_at: '2026-02-09', recipe_ids: ['ar-002-r2','ar-002-r5'], list_label: 'Samantha — Week 5 Shopping', notes: '' },
        { id: 'pl-002-4', name: 'Chia seeds', amount: '80g', price: 1.99, purchased_at: '2026-02-23', recipe_ids: ['ar-002-r1'], list_label: 'Samantha — Week 7 Shopping', notes: 'About 40g left' },
      ],
      linked_recipe_ids: ['ar-002-r1', 'ar-002-r2', 'ar-002-r5'],
      linked_block_id: 'tb-2',
      notes: 'Dairy-free substitutions applied. No feta in oats. Almond milk instead of cow milk. Shellfish-free. Anti-inflammatory focus.',
      categories: [
        { name: 'Proteins', icon: '🥩', items: [
          { id: 'asli-101', name: 'Chicken breast', amount: '800g', price: 8.99, checked: true, recipe_ids: ['ar-002-r2'], allergen_flag: false },
          { id: 'asli-102', name: 'Ground turkey', amount: '300g', price: 4.49, checked: false, recipe_ids: ['ar-002-r5'], allergen_flag: false },
          { id: 'asli-103', name: 'Egg whites (carton)', amount: '1 litre', price: 5.99, checked: false, recipe_ids: ['ar-002-r5'], allergen_flag: false },
          { id: 'asli-104', name: 'Whey protein powder', amount: '1 tub', price: 39.99, checked: true, recipe_ids: ['ar-002-r1'], allergen_flag: false },
          // NOTE: Feta cheese would trigger Samantha's dairy allergen — intentionally excluded
        ]},
        { name: 'Carbohydrates', icon: '🌾', items: [
          { id: 'asli-105', name: 'Rolled oats', amount: '320g', price: 1.99, checked: true, recipe_ids: ['ar-002-r1'], allergen_flag: false },
          { id: 'asli-106', name: 'White rice (dry)', amount: '400g', price: 1.49, checked: false, recipe_ids: ['ar-002-r2'], allergen_flag: false },
          { id: 'asli-107', name: 'Bananas', amount: '7', price: 1.99, checked: false, recipe_ids: ['ar-002-r1'], allergen_flag: false },
        ]},
        { name: 'Vegetables', icon: '🥦', items: [
          { id: 'asli-108', name: 'Broccoli', amount: '600g', price: 2.49, checked: false, recipe_ids: ['ar-002-r2'], allergen_flag: false },
          { id: 'asli-109', name: 'Baby spinach', amount: '180g', price: 2.29, checked: false, recipe_ids: ['ar-002-r5'], allergen_flag: false },
          { id: 'asli-110', name: 'Cherry tomatoes (extra)', amount: '360g (extra for Samantha)', price: 2.49, checked: false, recipe_ids: ['ar-002-r5'], allergen_flag: false },
        ]},
        { name: 'Dairy-Free Alternatives', icon: '🌿', items: [
          { id: 'asli-111', name: 'Unsweetened almond milk (dairy-free sub)', amount: '1.4 litres', price: 3.99, checked: false, recipe_ids: ['ar-002-r1'], allergen_flag: false },
          // Substituting dairy yogurt → coconut yogurt for Samantha
          { id: 'asli-112', name: 'Coconut yogurt (dairy-free)', amount: '400g', price: 4.99, checked: false, recipe_ids: ['ar-002-r1'], allergen_flag: false },
        ]},
        { name: 'Pantry', icon: '🫙', items: [
          { id: 'asli-113', name: 'Olive oil', amount: '1 bottle', price: 6.99, checked: true, recipe_ids: ['ar-002-r2', 'ar-002-r5'], allergen_flag: false },
          // NOTE: Soy sauce excluded — would conflict with Carlos (diff athlete), not Samantha. Included here for r2.
          { id: 'asli-114', name: 'Low-sodium soy sauce', amount: '1 bottle', price: 2.49, checked: false, recipe_ids: ['ar-002-r2'], allergen_flag: false },
          { id: 'asli-115', name: 'Chia seeds', amount: '80g', price: 1.99, checked: false, recipe_ids: ['ar-002-r1'], allergen_flag: false },
        ]},
      ],
    },
  ],
}
