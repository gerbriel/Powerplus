-- ============================================================
-- POWERPLUS: Powerlifting Team OS
-- Supabase Schema (run in SQL Editor)
-- Version 2 — Multi-org, standalone accounts, flexible roles
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- ENUMS  (idempotent — safe to re-run)
-- ============================================================

do $$ begin
  create type platform_role as enum ('super_admin', 'user');
exception when duplicate_object then null; end $$;

do $$ begin
  create type org_role as enum (
    'owner',
    'head_coach',
    'coach',
    'nutritionist',
    'athlete',
    'analyst'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type nutrition_permission as enum (
    'view_plan',
    'edit_plan',
    'create_meal_prep',
    'assign_meal_prep',
    'edit_shopping_list',
    'view_supplement_log',
    'edit_supplement_log'
  );
exception when duplicate_object then null; end $$;

do $$ begin create type workout_status as enum ('planned', 'in_progress', 'completed', 'missed', 'skipped'); exception when duplicate_object then null; end $$;
do $$ begin create type check_in_type as enum ('morning', 'post_workout', 'evening'); exception when duplicate_object then null; end $$;
do $$ begin create type message_type as enum ('text', 'file', 'video', 'announcement'); exception when duplicate_object then null; end $$;
do $$ begin create type goal_type as enum ('strength', 'nutrition', 'meet', 'process'); exception when duplicate_object then null; end $$;
do $$ begin create type meet_status as enum ('upcoming', 'registered', 'completed', 'cancelled'); exception when duplicate_object then null; end $$;
do $$ begin create type pain_level as enum ('0','1','2','3','4','5','6','7','8','9','10'); exception when duplicate_object then null; end $$;
do $$ begin create type block_type as enum ('accumulation', 'intensification', 'peak', 'deload', 'transition'); exception when duplicate_object then null; end $$;
do $$ begin create type nutrition_log_cadence as enum ('daily', 'weekly', 'biweekly', 'monthly'); exception when duplicate_object then null; end $$;

-- ============================================================
-- USERS / PROFILES  (standalone — NOT tied to any single org)
-- ============================================================
-- A profile represents the human being.
-- Org membership is tracked separately in org_members.
-- A user can be in multiple orgs with different roles in each.
-- They can also be a solo athlete with no org at all.
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text not null,
  display_name text,
  avatar_url text,
  platform_role platform_role not null default 'user',
  -- Standalone role: set during onboarding ('athlete' | 'head_coach' | 'coach' | 'nutritionist')
  -- Used by resolveRole() when no org membership exists yet.
  role text default 'athlete',
  -- Athletic identity fields (personal to the human, not the org)
  phone text,
  date_of_birth date,
  weight_class text,
  federation text,
  equipment_type text default 'raw',
  bio text,
  timezone text default 'UTC',
  -- self_coach flag: true when head_coach treats themselves as an athlete
  -- (logs their own workouts/nutrition without needing a separate athlete account)
  self_coach boolean default false,
  onboarding_complete boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- ORGANIZATIONS  (formerly "teams")
-- ============================================================
create table if not exists organizations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique,
  description text,
  logo_url text,
  website_url text,
  federation text,
  timezone text default 'UTC',
  weight_unit text default 'kg',       -- 'kg' | 'lbs'
  -- Billing / plan
  plan text default 'starter',         -- 'starter' | 'team_pro' | 'enterprise'
  status text default 'active',        -- 'active' | 'suspended' | 'cancelled'
  athlete_limit integer default 10,
  staff_limit integer default 2,
  storage_gb_limit integer default 2,
  storage_gb_used numeric default 0,
  -- Org-level flags
  -- When false, the head_coach role inherits all nutritionist permissions
  has_dedicated_nutritionist boolean default false,
  -- When true, athletes may self-manage their own nutrition without staff
  athletes_can_self_manage_nutrition boolean default true,
  address text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- ORG MEMBERS  (many-to-many: users ↔ orgs, with per-org role)
-- ============================================================
-- This replaces team_members.
-- A user can appear in this table once per org, with a different org_role each time.
create table if not exists org_members (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid references organizations(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  org_role org_role not null default 'athlete',
  -- head_coach self-athlete: when a head_coach wants to also log their own
  -- athletic data inside this org, this flag is set true and they appear
  -- in athlete rosters for that org.
  is_self_athlete boolean default false,
  status text default 'active',        -- 'active' | 'invited' | 'suspended' | 'removed'
  invited_by uuid references profiles(id),
  joined_at timestamptz default now(),
  -- Explicit nutrition permissions override (used when no nutritionist exists)
  -- NULL = use org defaults based on org_role
  nutrition_permissions nutrition_permission[],
  unique(org_id, user_id)
);

-- Pending invitations (email not yet registered or not yet accepted)
create table if not exists org_invitations (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid references organizations(id) on delete cascade,
  invited_email text not null,
  org_role org_role not null default 'athlete',
  invited_by uuid references profiles(id),
  message text,
  token text unique default md5(random()::text),
  status text default 'pending',       -- 'pending' | 'accepted' | 'expired' | 'revoked'
  sent_at timestamptz default now(),
  expires_at timestamptz default now() + interval '7 days',
  accepted_at timestamptz
);

-- ============================================================
-- TRAINING GROUPS  (sub-groups within an org)
-- ============================================================
create table if not exists training_groups (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid references organizations(id) on delete cascade,
  name text not null,
  description text,
  -- primary coach for this group (must be an org_member with coach/head_coach role)
  coach_id uuid references profiles(id),
  created_at timestamptz default now()
);

create table if not exists group_members (
  id uuid primary key default uuid_generate_v4(),
  group_id uuid references training_groups(id) on delete cascade,
  athlete_id uuid references profiles(id) on delete cascade,
  joined_at timestamptz default now(),
  unique(group_id, athlete_id)
);

-- ============================================================
-- STAFF → ATHLETE DIRECT ASSIGNMENTS
-- (A coach or nutritionist assigned to specific athletes,
--  can span across orgs if both parties share the org)
-- ============================================================
create table if not exists staff_athlete_assignments (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid references organizations(id) on delete cascade,
  staff_id uuid references profiles(id) on delete cascade,
  athlete_id uuid references profiles(id) on delete cascade,
  -- What this staff member can do for this athlete
  can_view_nutrition boolean default true,
  can_edit_nutrition boolean default false,
  can_create_meal_prep boolean default false,
  can_assign_meal_prep boolean default false,
  can_edit_shopping_list boolean default false,
  can_view_workouts boolean default true,
  can_edit_workouts boolean default true,
  can_view_checkins boolean default true,
  active boolean default true,
  assigned_at timestamptz default now(),
  assigned_by uuid references profiles(id),
  unique(org_id, staff_id, athlete_id)
);

-- ============================================================
-- EXERCISES LIBRARY
-- ============================================================
create table if not exists exercises (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  category text not null, -- squat, bench, deadlift, accessory, gpp, mobility
  muscle_groups text[],
  equipment text[],
  description text,
  video_url text,
  technique_tags text[],
  is_competition_lift boolean default false,
  created_by uuid references profiles(id),
  -- NULL = global (available to all); set to org_id for org-private exercises
  org_id uuid references organizations(id),
  is_global boolean default false,
  created_at timestamptz default now()
);

-- ============================================================
-- PROGRAM TEMPLATES
-- ============================================================
create table if not exists program_templates (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  weeks integer not null default 12,
  block_type block_type,
  programming_style text default 'hybrid', -- percentage, rpe, hybrid
  created_by uuid references profiles(id),
  org_id uuid references organizations(id),
  is_public boolean default false,
  tags text[],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists program_template_weeks (
  id uuid primary key default uuid_generate_v4(),
  template_id uuid references program_templates(id) on delete cascade,
  week_number integer not null,
  name text,
  notes text,
  is_deload boolean default false
);

create table if not exists workout_templates (
  id uuid primary key default uuid_generate_v4(),
  template_id uuid references program_templates(id) on delete cascade,
  week_id uuid references program_template_weeks(id) on delete cascade,
  day_of_week integer not null, -- 0=Mon ... 6=Sun
  name text not null,
  notes text,
  estimated_duration integer, -- minutes
  created_at timestamptz default now()
);

create table if not exists workout_template_exercises (
  id uuid primary key default uuid_generate_v4(),
  workout_template_id uuid references workout_templates(id) on delete cascade,
  exercise_id uuid references exercises(id),
  block_type text, -- warmup, main, accessory, gpp, conditioning, mobility
  order_index integer not null,
  sets integer,
  reps text, -- can be "3", "3-5", "AMRAP"
  intensity_type text, -- percentage, rpe, weight
  intensity_value text, -- "80%", "RPE 8", "100kg"
  rest_seconds integer,
  tempo text,
  coaching_cues text,
  notes text,
  alternative_exercise_ids uuid[]
);

-- ============================================================
-- PROGRAM INSTANCES (assigned to athletes)
-- ============================================================
create table if not exists program_instances (
  id uuid primary key default uuid_generate_v4(),
  template_id uuid references program_templates(id),
  athlete_id uuid references profiles(id) on delete cascade,
  assigned_by uuid references profiles(id),
  name text not null,
  start_date date not null,
  end_date date,
  current_week integer default 1,
  training_max_squat numeric,
  training_max_bench numeric,
  training_max_deadlift numeric,
  notes text,
  active boolean default true,
  created_at timestamptz default now()
);

-- ============================================================
-- WORKOUT SESSIONS
-- ============================================================
create table if not exists workout_sessions (
  id uuid primary key default uuid_generate_v4(),
  athlete_id uuid references profiles(id) on delete cascade,
  program_instance_id uuid references program_instances(id),
  workout_template_id uuid references workout_templates(id),
  name text not null,
  scheduled_date date not null,
  status workout_status default 'planned',
  started_at timestamptz,
  completed_at timestamptz,
  notes text,
  overall_rpe numeric,
  readiness_score integer,
  coach_comment text,
  reviewed_by uuid references profiles(id),
  created_at timestamptz default now()
);

create table if not exists workout_sets (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid references workout_sessions(id) on delete cascade,
  exercise_id uuid references exercises(id),
  set_number integer not null,
  planned_reps integer,
  planned_weight numeric,
  planned_rpe numeric,
  performed_reps integer,
  performed_weight numeric,
  performed_rpe numeric,
  is_pr boolean default false,
  is_top_set boolean default false,
  video_url text,
  pain_area text,
  pain_level text,
  notes text,
  logged_at timestamptz default now()
);

-- ============================================================
-- PERSONAL RECORDS
-- ============================================================
create table if not exists personal_records (
  id uuid primary key default uuid_generate_v4(),
  athlete_id uuid references profiles(id) on delete cascade,
  exercise_id uuid references exercises(id),
  record_type text not null, -- 1rm, 3rm, 5rm, estimated_1rm, total, dots
  weight numeric not null,
  reps integer,
  rpe numeric,
  e1rm numeric,
  is_competition boolean default false,
  meet_name text,
  set_id uuid references workout_sets(id),
  recorded_at date not null,
  notes text,
  created_at timestamptz default now()
);

-- ============================================================
-- CHECK-INS (Daily wellness)
-- ============================================================
create table if not exists daily_checkins (
  id uuid primary key default uuid_generate_v4(),
  athlete_id uuid references profiles(id) on delete cascade,
  check_date date not null,
  check_type check_in_type default 'morning',
  sleep_hours numeric,
  sleep_quality integer check (sleep_quality between 1 and 10),
  stress_level integer check (stress_level between 1 and 10),
  soreness_level integer check (soreness_level between 1 and 10),
  motivation_level integer check (motivation_level between 1 and 10),
  steps integer,
  bodyweight numeric,
  bodyweight_unit text default 'kg',
  notes text,
  created_at timestamptz default now(),
  unique(athlete_id, check_date, check_type)
);

-- ============================================================
-- NUTRITION
-- ============================================================
-- ============================================================
-- NUTRITION PLANS
-- ============================================================
-- A nutrition plan belongs to one athlete but can be created/edited
-- by: the athlete themselves, their assigned nutritionist, or the
-- head_coach (when no nutritionist exists in the org).
create table if not exists nutrition_plans (
  id uuid primary key default uuid_generate_v4(),
  athlete_id uuid references profiles(id) on delete cascade,
  -- Who created / last modified this plan
  created_by uuid references profiles(id),
  last_edited_by uuid references profiles(id),
  org_id uuid references organizations(id),
  name text not null,
  -- Daily macro targets split by training/rest day
  calories_training integer,
  calories_rest integer,
  protein_g integer,
  carbs_g integer,
  fat_g integer,
  fiber_g integer,
  water_ml integer,
  -- Cadence / period this plan covers
  cadence nutrition_log_cadence default 'weekly',
  valid_from date,
  valid_to date,
  -- Links to the broader athlete context
  linked_training_block_id uuid,   -- FK to training_blocks
  linked_goal_ids uuid[],
  linked_meet_id uuid,             -- FK to meets
  -- Coach notes visible to athlete
  coach_notes text,
  -- Whether athlete can see/edit their own plan
  athlete_can_edit boolean default false,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- NUTRITION LOGS  (daily compliance records)
-- ============================================================
create table if not exists nutrition_logs (
  id uuid primary key default uuid_generate_v4(),
  athlete_id uuid references profiles(id) on delete cascade,
  nutrition_plan_id uuid references nutrition_plans(id),
  log_date date not null,
  is_training_day boolean default true,
  calories_actual integer,
  protein_actual numeric,
  carbs_actual numeric,
  fat_actual numeric,
  fiber_actual numeric,
  water_actual integer,
  compliance_score integer check (compliance_score between 0 and 100),
  log_method text default 'checklist', -- checklist, macro_only, photo, from_prep
  photo_url text,
  hunger_level integer check (hunger_level between 1 and 10),
  energy_level integer check (energy_level between 1 and 10),
  digestion_notes text,
  notes text,
  -- Staff review
  reviewed_by uuid references profiles(id),
  staff_comment text,
  created_at timestamptz default now(),
  unique(athlete_id, log_date)
);

-- ============================================================
-- SUPPLEMENT STACKS & LOGS
-- ============================================================
-- A supplement stack is a named set of supplements assigned to an athlete
-- (can be created by the athlete, nutritionist, or head_coach)
create table if not exists supplement_stacks (
  id uuid primary key default uuid_generate_v4(),
  athlete_id uuid references profiles(id) on delete cascade,
  created_by uuid references profiles(id),
  name text not null default 'Default Stack',
  notes text,
  active boolean default true,
  created_at timestamptz default now()
);

create table if not exists supplement_stack_items (
  id uuid primary key default uuid_generate_v4(),
  stack_id uuid references supplement_stacks(id) on delete cascade,
  supplement_name text not null,
  dose text,          -- e.g. "5g", "2 capsules"
  timing text,        -- e.g. "pre-workout", "with breakfast", "before bed"
  notes text,
  order_index integer default 0
);

-- Daily supplement log (check off per day)
create table if not exists supplement_logs (
  id uuid primary key default uuid_generate_v4(),
  athlete_id uuid references profiles(id) on delete cascade,
  stack_item_id uuid references supplement_stack_items(id),
  -- fallback for non-stack supplements
  supplement_name text,
  log_date date not null,
  taken boolean default false,
  notes text,
  logged_at timestamptz default now()
);

-- ============================================================
-- MEAL PREP RECIPES LIBRARY
-- ============================================================
-- Recipes can be org-wide (shared by nutritionist/coach) or personal (athlete-created)
create table if not exists meal_prep_recipes (
  id uuid primary key default uuid_generate_v4(),
  created_by uuid references profiles(id),
  org_id uuid references organizations(id),   -- NULL = personal recipe
  is_org_template boolean default false,      -- true = shared across org
  name text not null,
  meal_type text,          -- breakfast, lunch, dinner, snack, pre-workout, post-workout
  prep_time integer,       -- minutes
  cook_time integer,       -- minutes
  servings integer default 1,
  macros_per_serving jsonb not null default '{}', -- {calories, protein, carbs, fat}
  ingredients jsonb default '[]',   -- [{name, amount}]
  instructions text,
  tags text[],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- MEAL PREP LOG SESSIONS
-- ============================================================
-- A prep session = one batch-cooking event (e.g. "Sunday Week 8 Prep")
-- Can be created by: athlete, nutritionist, or head_coach
-- Can be assigned to an athlete by: nutritionist or head_coach
create table if not exists meal_prep_sessions (
  id uuid primary key default uuid_generate_v4(),
  athlete_id uuid references profiles(id) on delete cascade,
  created_by uuid references profiles(id),
  org_id uuid references organizations(id),
  label text not null,
  prep_date date not null,
  cadence nutrition_log_cadence default 'weekly',
  period_start date,
  period_end date,
  -- Context links
  linked_training_block_id uuid,
  linked_goal_ids uuid[],
  linked_meet_id uuid,
  -- Aggregate totals (denormalised for quick reads)
  total_calories_prepped integer default 0,
  total_protein_prepped integer default 0,
  notes text,
  created_at timestamptz default now()
);

create table if not exists meal_prep_session_items (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid references meal_prep_sessions(id) on delete cascade,
  recipe_id uuid references meal_prep_recipes(id),
  recipe_name text not null,       -- snapshot in case recipe is later edited
  servings_made integer not null default 1,
  servings_consumed integer not null default 0,
  storage text default 'fridge',   -- fridge, freezer, counter
  macros_per_serving jsonb not null default '{}',
  notes text
);

-- ============================================================
-- SHOPPING LISTS
-- ============================================================
-- Lists belong to an athlete. Can be created/edited by:
-- the athlete, their nutritionist, or the head_coach.
create table if not exists shopping_lists (
  id uuid primary key default uuid_generate_v4(),
  athlete_id uuid references profiles(id) on delete cascade,
  created_by uuid references profiles(id),
  org_id uuid references organizations(id),
  label text not null,
  cadence nutrition_log_cadence default 'weekly',
  week_start date,
  week_end date,
  budget numeric,
  status text default 'active',   -- 'active' | 'completed'
  -- Context links
  linked_training_block_id uuid,
  linked_goal_ids uuid[],
  linked_meet_id uuid,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists shopping_list_categories (
  id uuid primary key default uuid_generate_v4(),
  list_id uuid references shopping_lists(id) on delete cascade,
  name text not null,
  icon text,
  order_index integer default 0
);

create table if not exists shopping_list_items (
  id uuid primary key default uuid_generate_v4(),
  list_id uuid references shopping_lists(id) on delete cascade,
  category_id uuid references shopping_list_categories(id) on delete set null,
  name text not null,
  amount text,
  weight_g numeric,
  price numeric,
  checked boolean default false,
  -- Nutrition info per 100g (optional)
  calories_per_100g numeric,
  protein_per_100g numeric,
  carbs_per_100g numeric,
  fat_per_100g numeric,
  -- Which recipes require this item
  recipe_ids uuid[],
  notes text,
  added_by uuid references profiles(id),
  added_at timestamptz default now()
);

-- ============================================================
-- TRAINING BLOCKS  (named periodization phases)
-- ============================================================
create table if not exists training_blocks (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid references organizations(id),
  athlete_id uuid references profiles(id) on delete cascade,  -- NULL = org-wide template
  created_by uuid references profiles(id),
  name text not null,
  block_type block_type,
  start_date date,
  end_date date,
  notes text,
  active boolean default true,
  created_at timestamptz default now()
);

-- ============================================================
-- GOALS
-- ============================================================
create table if not exists goals (
  id uuid primary key default uuid_generate_v4(),
  athlete_id uuid references profiles(id) on delete cascade,
  created_by uuid references profiles(id),
  org_id uuid references organizations(id),
  goal_type goal_type not null,
  title text not null,
  description text,
  target_value numeric,
  target_unit text,
  current_value numeric,
  target_date date,
  linked_training_block_id uuid references training_blocks(id),
  linked_meet_id uuid,   -- FK to meets (set after meets table created)
  completed boolean default false,
  completed_at timestamptz,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- MEETS (Competition calendar)
-- ============================================================
create table if not exists meets (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid references organizations(id),
  -- an athlete can add their own private meet even without an org
  created_by uuid references profiles(id),
  name text not null,
  federation text,
  location text,
  meet_date date,
  registration_deadline date,
  weigh_in_date date,
  status meet_status default 'upcoming',
  website_url text,
  notes text,
  created_at timestamptz default now()
);

-- Add the deferred FK on goals now that meets exists (idempotent)
do $$ begin
  alter table goals add constraint goals_linked_meet_id_fkey
    foreign key (linked_meet_id) references meets(id);
exception when duplicate_object then null; end $$;

create table if not exists athlete_meet_entries (
  id uuid primary key default uuid_generate_v4(),
  meet_id uuid references meets(id) on delete cascade,
  athlete_id uuid references profiles(id) on delete cascade,
  weight_class text,
  equipment_type text,
  squat_opener numeric,
  bench_opener numeric,
  deadlift_opener numeric,
  squat_attempts numeric[],
  bench_attempts numeric[],
  deadlift_attempts numeric[],
  squat_result numeric,
  bench_result numeric,
  deadlift_result numeric,
  total_result numeric,
  dots_score numeric,
  wilks_score numeric,
  placement integer,
  notes text,
  created_at timestamptz default now()
);

-- ============================================================
-- MESSAGING
-- ============================================================
create table if not exists channels (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid references organizations(id) on delete cascade,
  name text not null,
  description text,
  channel_type text default 'public', -- public, private, dm, announcement
  created_by uuid references profiles(id),
  is_archived boolean default false,
  created_at timestamptz default now()
);

create table if not exists channel_members (
  id uuid primary key default uuid_generate_v4(),
  channel_id uuid references channels(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  role text default 'member', -- admin, member
  joined_at timestamptz default now(),
  last_read_at timestamptz default now(),
  unique(channel_id, user_id)
);

create table if not exists messages (
  id uuid primary key default uuid_generate_v4(),
  channel_id uuid references channels(id) on delete cascade,
  sender_id uuid references profiles(id),
  content text,
  message_type message_type default 'text',
  file_url text,
  file_name text,
  reply_to_id uuid references messages(id),
  is_pinned boolean default false,
  is_action_item boolean default false,
  edited_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists message_reactions (
  id uuid primary key default uuid_generate_v4(),
  message_id uuid references messages(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  emoji text not null,
  created_at timestamptz default now(),
  unique(message_id, user_id, emoji)
);

-- ============================================================
-- EVENTS / CALENDAR
-- ============================================================
create table if not exists events (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid references organizations(id),
  created_by uuid references profiles(id),
  title text not null,
  description text,
  event_type text not null, -- session, meeting, meet, deadline, other
  start_time timestamptz not null,
  end_time timestamptz,
  location text,
  meeting_url text,
  attendee_ids uuid[],
  reminder_minutes integer[],
  created_at timestamptz default now()
);

-- ============================================================
-- RESOURCES / KNOWLEDGE BASE
-- ============================================================
create table if not exists resources (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid references organizations(id),
  created_by uuid references profiles(id),
  title text not null,
  content text,
  category text, -- technique, recovery, meet_day, rules, nutrition
  file_url text,
  video_url text,
  is_published boolean default true,
  tags text[],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- ANNOUNCEMENTS / WINS BOARD
-- ============================================================
create table if not exists announcements (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid references organizations(id) on delete cascade,
  author_id uuid references profiles(id),
  title text not null,
  content text not null,
  announcement_type text default 'general', -- general, win, qa
  is_pinned boolean default false,
  requires_approval boolean default false,
  approved_by uuid references profiles(id),
  approved_at timestamptz,
  created_at timestamptz default now()
);

-- ============================================================
-- INJURY / PAIN LOG
-- ============================================================
create table if not exists injury_logs (
  id uuid primary key default uuid_generate_v4(),
  athlete_id uuid references profiles(id) on delete cascade,
  body_area text not null,
  pain_level integer check (pain_level between 0 and 10),
  injury_date date not null,
  description text,
  movement_affected text[],
  resolved boolean default false,
  resolved_date date,
  reported_to_coach boolean default false,
  coach_notes text,
  created_at timestamptz default now()
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
create table if not exists notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade,
  title text not null,
  body text,
  type text, -- workout_reminder, message, alert, pr, announcement
  data jsonb,
  read boolean default false,
  created_at timestamptz default now()
);

-- ============================================================
-- AUDIT LOG
-- ============================================================
create table if not exists audit_logs (
  id uuid primary key default uuid_generate_v4(),
  actor_id uuid references profiles(id),
  action text not null,
  entity_type text,
  entity_id uuid,
  changes jsonb,
  ip_address text,
  created_at timestamptz default now()
);

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Returns the org_role for a user in a given org (NULL if not a member)
create or replace function get_user_org_role(p_org_id uuid, p_user_id uuid)
  returns org_role as $$
    select org_role from org_members
    where org_id = p_org_id and user_id = p_user_id
  $$ language sql security definer stable;

-- Returns true if the user holds a specific nutrition_permission in an org
-- (either explicitly granted, or implied by their role)
create or replace function has_nutrition_permission(
  p_org_id uuid,
  p_user_id uuid,
  p_perm nutrition_permission
) returns boolean as $$
  select exists (
    select 1 from org_members
    where org_id = p_org_id
      and user_id = p_user_id
      and (
        p_perm = any(nutrition_permissions)
        or org_role in ('nutritionist', 'head_coach', 'owner')
      )
  )
$$ language sql security definer stable;

-- Returns true if a user is acting as a self-athlete in a given org
create or replace function is_self_athlete(p_org_id uuid, p_user_id uuid)
  returns boolean as $$
    select coalesce(
      (select is_self_athlete from org_members
       where org_id = p_org_id and user_id = p_user_id),
      false
    )
  $$ language sql security definer stable;

-- Returns true if the caller is a staff member (owner/head_coach/coach/nutritionist/analyst)
-- who has an explicit staff_athlete_assignment to view a given athlete in an org
create or replace function staff_can_view_athlete(
  p_org_id uuid,
  p_staff_id uuid,
  p_athlete_id uuid
) returns boolean as $$
  select exists (
    select 1 from staff_athlete_assignments
    where org_id = p_org_id
      and staff_id = p_staff_id
      and athlete_id = p_athlete_id
  )
$$ language sql security definer stable;

-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================

-- ── Enable RLS ──────────────────────────────────────────────
alter table profiles                  enable row level security;
alter table organizations             enable row level security;
alter table org_members               enable row level security;
alter table org_invitations           enable row level security;
alter table training_groups           enable row level security;
alter table group_members             enable row level security;
alter table staff_athlete_assignments enable row level security;
alter table exercises                 enable row level security;
alter table program_templates         enable row level security;
alter table program_template_weeks    enable row level security;
alter table workout_templates         enable row level security;
alter table workout_template_exercises enable row level security;
alter table program_instances         enable row level security;
alter table workout_sessions          enable row level security;
alter table workout_sets              enable row level security;
alter table personal_records          enable row level security;
alter table daily_checkins            enable row level security;
alter table training_blocks           enable row level security;
alter table goals                     enable row level security;
alter table meets                     enable row level security;
alter table athlete_meet_entries      enable row level security;
alter table nutrition_plans           enable row level security;
alter table nutrition_logs            enable row level security;
alter table supplement_stacks         enable row level security;
alter table supplement_stack_items    enable row level security;
alter table supplement_logs           enable row level security;
alter table meal_prep_recipes         enable row level security;
alter table meal_prep_sessions        enable row level security;
alter table meal_prep_session_items   enable row level security;
alter table shopping_lists            enable row level security;
alter table shopping_list_categories  enable row level security;
alter table shopping_list_items       enable row level security;
alter table channels                  enable row level security;
alter table channel_members           enable row level security;
alter table messages                  enable row level security;
alter table message_reactions         enable row level security;
alter table events                    enable row level security;
alter table resources                 enable row level security;
alter table announcements             enable row level security;
alter table injury_logs               enable row level security;
alter table notifications             enable row level security;
alter table audit_logs                enable row level security;

-- ── profiles ────────────────────────────────────────────────
-- Anyone can read public profiles (names, avatars)
drop policy if exists "profiles: any org member can read" on profiles;
create policy "profiles: any org member can read"
  on profiles for select using (true);

-- Users can only update their own profile
drop policy if exists "profiles: owner can update" on profiles;
create policy "profiles: owner can update"
  on profiles for update using (auth.uid() = id);

drop policy if exists "profiles: owner can insert" on profiles;
create policy "profiles: owner can insert"
  on profiles for insert with check (auth.uid() = id);

-- ── organizations ────────────────────────────────────────────
-- Any member of the org can read the org record
drop policy if exists "orgs: members can read" on organizations;
create policy "orgs: members can read"
  on organizations for select
  using (
    exists (
      select 1 from org_members
      where org_id = organizations.id and user_id = auth.uid()
    )
  );

-- Only owners can update the org record
drop policy if exists "orgs: owner can update" on organizations;
create policy "orgs: owner can update"
  on organizations for update
  using (
    get_user_org_role(id, auth.uid()) = 'owner'
  );

-- ── org_members ──────────────────────────────────────────────
-- A user can always read their own membership rows.
-- The "see all members of the same org" subquery was removed — it caused
-- infinite recursion because it queried org_members from within an
-- org_members RLS policy. The app fetches the current user's memberships
-- only, so user_id = auth.uid() is sufficient here.
drop policy if exists "org_members: member can view own org" on org_members;
create policy "org_members: member can view own org"
  on org_members for select
  using (
    user_id = auth.uid()
  );

-- Owners and head_coaches can manage memberships.
-- get_user_org_role() is SECURITY DEFINER so it bypasses RLS and won't recurse.
drop policy if exists "org_members: owner/head_coach can manage" on org_members;
create policy "org_members: owner/head_coach can manage"
  on org_members for all
  using (
    get_user_org_role(org_id, auth.uid()) in ('owner', 'head_coach')
  );

-- ── org_invitations ──────────────────────────────────────────
drop policy if exists "invitations: org admins can manage" on org_invitations;
create policy "invitations: org admins can manage"
  on org_invitations for all
  using (
    get_user_org_role(org_id, auth.uid()) in ('owner', 'head_coach')
  );

drop policy if exists "invitations: invitee can read own" on org_invitations;
create policy "invitations: invitee can read own"
  on org_invitations for select
  using (invited_email = (select email from profiles where id = auth.uid()));

-- ── staff_athlete_assignments ────────────────────────────────
drop policy if exists "assignments: org admins can manage" on staff_athlete_assignments;
create policy "assignments: org admins can manage"
  on staff_athlete_assignments for all
  using (
    get_user_org_role(org_id, auth.uid()) in ('owner', 'head_coach')
  );

drop policy if exists "assignments: staff can read own" on staff_athlete_assignments;
create policy "assignments: staff can read own"
  on staff_athlete_assignments for select
  using (staff_id = auth.uid() or athlete_id = auth.uid());

-- ── training_groups / group_members ─────────────────────────
drop policy if exists "training_groups: org members can read" on training_groups;
create policy "training_groups: org members can read"
  on training_groups for select
  using (
    exists (
      select 1 from org_members
      where org_id = training_groups.org_id and user_id = auth.uid()
    )
  );

drop policy if exists "training_groups: coaches can manage" on training_groups;
create policy "training_groups: coaches can manage"
  on training_groups for all
  using (
    get_user_org_role(org_id, auth.uid()) in ('owner', 'head_coach', 'coach')
  );

drop policy if exists "group_members: org members can read" on group_members;
create policy "group_members: org members can read"
  on group_members for select
  using (
    exists (
      select 1 from training_groups tg
      join org_members om on om.org_id = tg.org_id
      where tg.id = group_members.group_id and om.user_id = auth.uid()
    )
  );

-- ── exercises ────────────────────────────────────────────────
-- Global exercises (org_id IS NULL) readable by all authenticated users
-- Org exercises readable by org members
drop policy if exists "exercises: global or org member can read" on exercises;
create policy "exercises: global or org member can read"
  on exercises for select
  using (
    org_id is null
    or exists (
      select 1 from org_members
      where org_id = exercises.org_id and user_id = auth.uid()
    )
  );

drop policy if exists "exercises: coaches can manage org exercises" on exercises;
create policy "exercises: coaches can manage org exercises"
  on exercises for all
  using (
    org_id is not null
    and get_user_org_role(org_id, auth.uid()) in ('owner', 'head_coach', 'coach')
  );

-- ── program_templates ────────────────────────────────────────
drop policy if exists "program_templates: org members can read" on program_templates;
create policy "program_templates: org members can read"
  on program_templates for select
  using (
    org_id is null
    or exists (
      select 1 from org_members
      where org_id = program_templates.org_id and user_id = auth.uid()
    )
  );

drop policy if exists "program_templates: coaches can manage" on program_templates;
create policy "program_templates: coaches can manage"
  on program_templates for all
  using (
    org_id is not null
    and get_user_org_role(org_id, auth.uid()) in ('owner', 'head_coach', 'coach')
  );

-- ── workout_sessions ─────────────────────────────────────────
-- Athletes see their own; assigned staff can see assigned athletes'
drop policy if exists "workout_sessions: athlete sees own" on workout_sessions;
create policy "workout_sessions: athlete sees own"
  on workout_sessions for select
  using (auth.uid() = athlete_id);

drop policy if exists "workout_sessions: assigned staff can read" on workout_sessions;
create policy "workout_sessions: assigned staff can read"
  on workout_sessions for select
  using (
    exists (
      select 1 from staff_athlete_assignments saa
      where saa.athlete_id = workout_sessions.athlete_id
        and saa.staff_id = auth.uid()
        and saa.can_view_workouts = true
    )
  );

drop policy if exists "workout_sessions: athlete can insert/update own" on workout_sessions;
create policy "workout_sessions: athlete can insert/update own"
  on workout_sessions for insert
  with check (auth.uid() = athlete_id);

drop policy if exists "workout_sessions: athlete can update own" on workout_sessions;
create policy "workout_sessions: athlete can update own"
  on workout_sessions for update
  using (auth.uid() = athlete_id);

-- ── workout_sets ─────────────────────────────────────────────
drop policy if exists "workout_sets: athlete sees own" on workout_sets;
create policy "workout_sets: athlete sees own"
  on workout_sets for select
  using (
    exists (
      select 1 from workout_sessions ws
      where ws.id = workout_sets.session_id and ws.athlete_id = auth.uid()
    )
  );

drop policy if exists "workout_sets: assigned staff can read" on workout_sets;
create policy "workout_sets: assigned staff can read"
  on workout_sets for select
  using (
    exists (
      select 1 from workout_sessions ws
      join staff_athlete_assignments saa on saa.athlete_id = ws.athlete_id
      where ws.id = workout_sets.session_id
        and saa.staff_id = auth.uid()
        and saa.can_view_workouts = true
    )
  );

-- ── personal_records ─────────────────────────────────────────
drop policy if exists "prs: athlete sees own" on personal_records;
create policy "prs: athlete sees own"
  on personal_records for select
  using (auth.uid() = athlete_id);

drop policy if exists "prs: assigned staff can read" on personal_records;
create policy "prs: assigned staff can read"
  on personal_records for select
  using (
    exists (
      select 1 from staff_athlete_assignments saa
      where saa.athlete_id = personal_records.athlete_id
        and saa.staff_id = auth.uid()
        and saa.can_view_workouts = true
    )
  );

-- ── daily_checkins ────────────────────────────────────────────
drop policy if exists "checkins: athlete sees own" on daily_checkins;
create policy "checkins: athlete sees own"
  on daily_checkins for select
  using (auth.uid() = athlete_id);

drop policy if exists "checkins: assigned staff can read" on daily_checkins;
create policy "checkins: assigned staff can read"
  on daily_checkins for select
  using (
    exists (
      select 1 from staff_athlete_assignments saa
      where saa.athlete_id = daily_checkins.athlete_id
        and saa.staff_id = auth.uid()
        and saa.can_view_checkins = true
    )
  );

-- ── training_blocks ───────────────────────────────────────────
-- Org templates (athlete_id IS NULL): all org members can read
-- Athlete-specific: athlete or assigned staff
drop policy if exists "training_blocks: org members read org templates" on training_blocks;
create policy "training_blocks: org members read org templates"
  on training_blocks for select
  using (
    athlete_id is null
    and exists (
      select 1 from org_members
      where org_id = training_blocks.org_id and user_id = auth.uid()
    )
  );

drop policy if exists "training_blocks: athlete reads own" on training_blocks;
create policy "training_blocks: athlete reads own"
  on training_blocks for select
  using (athlete_id = auth.uid());

drop policy if exists "training_blocks: coaches manage" on training_blocks;
create policy "training_blocks: coaches manage"
  on training_blocks for all
  using (
    get_user_org_role(org_id, auth.uid()) in ('owner', 'head_coach', 'coach')
  );

-- ── goals ─────────────────────────────────────────────────────
drop policy if exists "goals: athlete sees own" on goals;
create policy "goals: athlete sees own"
  on goals for select
  using (auth.uid() = athlete_id);

drop policy if exists "goals: assigned staff can read" on goals;
create policy "goals: assigned staff can read"
  on goals for select
  using (
    exists (
      select 1 from staff_athlete_assignments saa
      where saa.athlete_id = goals.athlete_id
        and saa.staff_id = auth.uid()
    )
  );

-- ── meets ─────────────────────────────────────────────────────
drop policy if exists "meets: org members can read" on meets;
create policy "meets: org members can read"
  on meets for select
  using (
    exists (
      select 1 from org_members
      where org_id = meets.org_id and user_id = auth.uid()
    )
  );

drop policy if exists "meets: coaches can manage" on meets;
create policy "meets: coaches can manage"
  on meets for all
  using (
    get_user_org_role(org_id, auth.uid()) in ('owner', 'head_coach', 'coach')
  );

-- ── athlete_meet_entries ──────────────────────────────────────
drop policy if exists "meet_entries: athlete sees own" on athlete_meet_entries;
create policy "meet_entries: athlete sees own"
  on athlete_meet_entries for select
  using (auth.uid() = athlete_id);

drop policy if exists "meet_entries: org members can read" on athlete_meet_entries;
create policy "meet_entries: org members can read"
  on athlete_meet_entries for select
  using (
    exists (
      select 1 from meets m
      join org_members om on om.org_id = m.org_id
      where m.id = athlete_meet_entries.meet_id and om.user_id = auth.uid()
    )
  );

-- ── nutrition_plans ───────────────────────────────────────────
-- Athlete sees own; staff with can_view_nutrition sees assigned athlete plans
drop policy if exists "nutrition_plans: athlete sees own" on nutrition_plans;
create policy "nutrition_plans: athlete sees own"
  on nutrition_plans for select
  using (auth.uid() = athlete_id);

drop policy if exists "nutrition_plans: staff with view nutrition can read" on nutrition_plans;
create policy "nutrition_plans: staff with view nutrition can read"
  on nutrition_plans for select
  using (
    exists (
      select 1 from staff_athlete_assignments saa
      where saa.athlete_id = nutrition_plans.athlete_id
        and saa.staff_id = auth.uid()
        and saa.can_view_nutrition = true
    )
  );

drop policy if exists "nutrition_plans: athlete can insert own" on nutrition_plans;
create policy "nutrition_plans: athlete can insert own"
  on nutrition_plans for insert
  with check (auth.uid() = athlete_id);

drop policy if exists "nutrition_plans: athlete or authorized staff can update" on nutrition_plans;
create policy "nutrition_plans: athlete or authorized staff can update"
  on nutrition_plans for update
  using (
    auth.uid() = athlete_id
    or exists (
      select 1 from staff_athlete_assignments saa
      where saa.athlete_id = nutrition_plans.athlete_id
        and saa.staff_id = auth.uid()
        and saa.can_edit_nutrition = true
    )
  );

-- ── nutrition_logs ────────────────────────────────────────────
drop policy if exists "nutrition_logs: athlete sees own" on nutrition_logs;
create policy "nutrition_logs: athlete sees own"
  on nutrition_logs for select
  using (auth.uid() = athlete_id);

drop policy if exists "nutrition_logs: staff with view nutrition" on nutrition_logs;
create policy "nutrition_logs: staff with view nutrition"
  on nutrition_logs for select
  using (
    exists (
      select 1 from staff_athlete_assignments saa
      where saa.athlete_id = nutrition_logs.athlete_id
        and saa.staff_id = auth.uid()
        and saa.can_view_nutrition = true
    )
  );

drop policy if exists "nutrition_logs: athlete can insert own" on nutrition_logs;
create policy "nutrition_logs: athlete can insert own"
  on nutrition_logs for insert
  with check (auth.uid() = athlete_id);

-- ── supplement_stacks / items / logs ─────────────────────────
drop policy if exists "supplement_stacks: athlete sees own" on supplement_stacks;
create policy "supplement_stacks: athlete sees own"
  on supplement_stacks for select
  using (auth.uid() = athlete_id);

drop policy if exists "supplement_stacks: staff with view supplement" on supplement_stacks;
create policy "supplement_stacks: staff with view supplement"
  on supplement_stacks for select
  using (
    exists (
      select 1 from staff_athlete_assignments saa
      where saa.athlete_id = supplement_stacks.athlete_id
        and saa.staff_id = auth.uid()
        and saa.can_view_nutrition = true
    )
  );

drop policy if exists "supplement_stack_items: readable via stack owner" on supplement_stack_items;
create policy "supplement_stack_items: readable via stack owner"
  on supplement_stack_items for select
  using (
    exists (
      select 1 from supplement_stacks ss
      where ss.id = supplement_stack_items.stack_id
        and (ss.athlete_id = auth.uid()
          or exists (
            select 1 from staff_athlete_assignments saa
            where saa.athlete_id = ss.athlete_id
              and saa.staff_id = auth.uid()
              and saa.can_view_nutrition = true
          )
        )
    )
  );

drop policy if exists "supplement_logs: athlete sees own" on supplement_logs;
create policy "supplement_logs: athlete sees own"
  on supplement_logs for select
  using (auth.uid() = athlete_id);

drop policy if exists "supplement_logs: staff with view nutrition" on supplement_logs;
create policy "supplement_logs: staff with view nutrition"
  on supplement_logs for select
  using (
    exists (
      select 1 from staff_athlete_assignments saa
      where saa.athlete_id = supplement_logs.athlete_id
        and saa.staff_id = auth.uid()
        and saa.can_view_nutrition = true
    )
  );

-- ── meal_prep_recipes ─────────────────────────────────────────
-- Org templates: all org members can read
-- Personal recipes: owner can read
drop policy if exists "meal_prep_recipes: org template readable by members" on meal_prep_recipes;
create policy "meal_prep_recipes: org template readable by members"
  on meal_prep_recipes for select
  using (
    is_org_template = true
    and exists (
      select 1 from org_members
      where org_id = meal_prep_recipes.org_id and user_id = auth.uid()
    )
  );

drop policy if exists "meal_prep_recipes: personal readable by owner" on meal_prep_recipes;
create policy "meal_prep_recipes: personal readable by owner"
  on meal_prep_recipes for select
  using (is_org_template = false and created_by = auth.uid());

drop policy if exists "meal_prep_recipes: nutritionist/head_coach can manage org templates" on meal_prep_recipes;
create policy "meal_prep_recipes: nutritionist/head_coach can manage org templates"
  on meal_prep_recipes for all
  using (
    is_org_template = true
    and get_user_org_role(org_id, auth.uid()) in ('owner', 'head_coach', 'nutritionist')
  );

-- ── meal_prep_sessions / items ────────────────────────────────
drop policy if exists "meal_prep_sessions: athlete sees own" on meal_prep_sessions;
create policy "meal_prep_sessions: athlete sees own"
  on meal_prep_sessions for select
  using (auth.uid() = athlete_id);

drop policy if exists "meal_prep_sessions: staff with create_meal_prep" on meal_prep_sessions;
create policy "meal_prep_sessions: staff with create_meal_prep"
  on meal_prep_sessions for select
  using (
    created_by = auth.uid()
    or exists (
      select 1 from staff_athlete_assignments saa
      where saa.athlete_id = meal_prep_sessions.athlete_id
        and saa.staff_id = auth.uid()
        and saa.can_create_meal_prep = true
    )
  );

drop policy if exists "meal_prep_session_items: readable via session" on meal_prep_session_items;
create policy "meal_prep_session_items: readable via session"
  on meal_prep_session_items for select
  using (
    exists (
      select 1 from meal_prep_sessions mps
      where mps.id = meal_prep_session_items.session_id
        and (
          mps.athlete_id = auth.uid()
          or mps.created_by = auth.uid()
          or exists (
            select 1 from staff_athlete_assignments saa
            where saa.athlete_id = mps.athlete_id
              and saa.staff_id = auth.uid()
              and saa.can_view_nutrition = true
          )
        )
    )
  );

-- ── shopping_lists / categories / items ───────────────────────
drop policy if exists "shopping_lists: athlete sees own" on shopping_lists;
create policy "shopping_lists: athlete sees own"
  on shopping_lists for select
  using (auth.uid() = athlete_id);

drop policy if exists "shopping_lists: staff with edit_shopping_list" on shopping_lists;
create policy "shopping_lists: staff with edit_shopping_list"
  on shopping_lists for select
  using (
    created_by = auth.uid()
    or exists (
      select 1 from staff_athlete_assignments saa
      where saa.athlete_id = shopping_lists.athlete_id
        and saa.staff_id = auth.uid()
        and saa.can_edit_shopping_list = true
    )
  );

drop policy if exists "shopping_lists: athlete or authorized staff can update" on shopping_lists;
create policy "shopping_lists: athlete or authorized staff can update"
  on shopping_lists for update
  using (
    auth.uid() = athlete_id
    or exists (
      select 1 from staff_athlete_assignments saa
      where saa.athlete_id = shopping_lists.athlete_id
        and saa.staff_id = auth.uid()
        and saa.can_edit_shopping_list = true
    )
  );

drop policy if exists "shopping_list_categories: readable via list access" on shopping_list_categories;
create policy "shopping_list_categories: readable via list access"
  on shopping_list_categories for select
  using (
    exists (
      select 1 from shopping_lists sl
      where sl.id = shopping_list_categories.list_id
        and (
          sl.athlete_id = auth.uid()
          or sl.created_by = auth.uid()
          or exists (
            select 1 from staff_athlete_assignments saa
            where saa.athlete_id = sl.athlete_id
              and saa.staff_id = auth.uid()
              and saa.can_edit_shopping_list = true
          )
        )
    )
  );

drop policy if exists "shopping_list_items: readable via list access" on shopping_list_items;
create policy "shopping_list_items: readable via list access"
  on shopping_list_items for select
  using (
    exists (
      select 1 from shopping_list_categories slc
      join shopping_lists sl on sl.id = slc.list_id
      where slc.id = shopping_list_items.category_id
        and (
          sl.athlete_id = auth.uid()
          or sl.created_by = auth.uid()
          or exists (
            select 1 from staff_athlete_assignments saa
            where saa.athlete_id = sl.athlete_id
              and saa.staff_id = auth.uid()
              and saa.can_edit_shopping_list = true
          )
        )
    )
  );

-- ── channels / channel_members / messages ────────────────────
drop policy if exists "channels: org members can read" on channels;
create policy "channels: org members can read"
  on channels for select
  using (
    exists (
      select 1 from org_members
      where org_id = channels.org_id and user_id = auth.uid()
    )
  );

drop policy if exists "channel_members: members can read own channel memberships" on channel_members;
create policy "channel_members: members can read own channel memberships"
  on channel_members for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from channels ch
      join org_members om on om.org_id = ch.org_id
      where ch.id = channel_members.channel_id and om.user_id = auth.uid()
    )
  );

drop policy if exists "messages: channel members can read" on messages;
create policy "messages: channel members can read"
  on messages for select
  using (
    exists (
      select 1 from channel_members
      where channel_id = messages.channel_id and user_id = auth.uid()
    )
  );

drop policy if exists "messages: channel members can insert" on messages;
create policy "messages: channel members can insert"
  on messages for insert
  with check (
    exists (
      select 1 from channel_members
      where channel_id = messages.channel_id and user_id = auth.uid()
    )
  );

drop policy if exists "messages: sender can update own" on messages;
create policy "messages: sender can update own"
  on messages for update
  using (sender_id = auth.uid());

drop policy if exists "message_reactions: channel members can manage" on message_reactions;
create policy "message_reactions: channel members can manage"
  on message_reactions for all
  using (
    user_id = auth.uid()
    and exists (
      select 1 from channel_members cm
      join messages m on m.channel_id = cm.channel_id
      where m.id = message_reactions.message_id and cm.user_id = auth.uid()
    )
  );

-- ── events ───────────────────────────────────────────────────
drop policy if exists "events: org members can read" on events;
create policy "events: org members can read"
  on events for select
  using (
    exists (
      select 1 from org_members
      where org_id = events.org_id and user_id = auth.uid()
    )
  );

drop policy if exists "events: coaches can manage" on events;
create policy "events: coaches can manage"
  on events for all
  using (
    get_user_org_role(org_id, auth.uid()) in ('owner', 'head_coach', 'coach')
  );

-- ── resources ────────────────────────────────────────────────
drop policy if exists "resources: org members can read published" on resources;
create policy "resources: org members can read published"
  on resources for select
  using (
    is_published = true
    and exists (
      select 1 from org_members
      where org_id = resources.org_id and user_id = auth.uid()
    )
  );

drop policy if exists "resources: coaches can manage" on resources;
create policy "resources: coaches can manage"
  on resources for all
  using (
    get_user_org_role(org_id, auth.uid()) in ('owner', 'head_coach', 'coach')
  );

-- ── announcements ────────────────────────────────────────────
drop policy if exists "announcements: org members can read" on announcements;
create policy "announcements: org members can read"
  on announcements for select
  using (
    exists (
      select 1 from org_members
      where org_id = announcements.org_id and user_id = auth.uid()
    )
  );

drop policy if exists "announcements: coaches can manage" on announcements;
create policy "announcements: coaches can manage"
  on announcements for all
  using (
    get_user_org_role(org_id, auth.uid()) in ('owner', 'head_coach')
  );

-- ── injury_logs ──────────────────────────────────────────────
drop policy if exists "injury_logs: athlete sees own" on injury_logs;
create policy "injury_logs: athlete sees own"
  on injury_logs for select
  using (auth.uid() = athlete_id);

drop policy if exists "injury_logs: assigned staff can read" on injury_logs;
create policy "injury_logs: assigned staff can read"
  on injury_logs for select
  using (
    exists (
      select 1 from staff_athlete_assignments saa
      where saa.athlete_id = injury_logs.athlete_id
        and saa.staff_id = auth.uid()
        and saa.can_view_checkins = true
    )
  );

drop policy if exists "injury_logs: athlete can insert/update own" on injury_logs;
create policy "injury_logs: athlete can insert/update own"
  on injury_logs for insert
  with check (auth.uid() = athlete_id);

drop policy if exists "injury_logs: athlete can update own" on injury_logs;
create policy "injury_logs: athlete can update own"
  on injury_logs for update
  using (auth.uid() = athlete_id);

-- ── notifications ────────────────────────────────────────────
drop policy if exists "notifications: user sees own" on notifications;
create policy "notifications: user sees own"
  on notifications for select
  using (auth.uid() = user_id);

drop policy if exists "notifications: user can update own (mark read)" on notifications;
create policy "notifications: user can update own (mark read)"
  on notifications for update
  using (auth.uid() = user_id);

-- ── audit_logs ───────────────────────────────────────────────
-- Only platform admins can read audit logs
drop policy if exists "audit_logs: super_admin only" on audit_logs;
create policy "audit_logs: super_admin only"
  on audit_logs for select
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and platform_role = 'super_admin'
    )
  );

-- ============================================================
-- AUTH TRIGGER — Auto-create profile on sign-up
-- ============================================================
-- When a user signs up via Supabase Auth, this trigger fires
-- and inserts a matching row into public.profiles.
-- The user's full_name and display_name come from auth metadata
-- (passed during signUp: { data: { full_name: '...' } }).
-- ============================================================

-- Add role column to existing installs (idempotent)
alter table public.profiles add column if not exists role text default 'athlete';

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, display_name, platform_role, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'user',
    coalesce(new.raw_user_meta_data->>'role', 'athlete')
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- Drop and recreate so this is safe to re-run
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- ORG CREATION HELPER
-- ============================================================
-- Called client-side after a head_coach signs up and creates
-- their organization. Creates the org and adds the creator
-- as 'owner' in org_members in one transaction.
-- Usage: select create_org_with_owner('<user_id>', 'Org Name', 'org-slug', 'USAPL', 'America/New_York', 'lbs');
-- ============================================================

create or replace function public.create_org_with_owner(
  p_user_id    uuid,
  p_name       text,
  p_slug       text,
  p_federation text default null,
  p_timezone   text default 'UTC',
  p_weight_unit text default 'kg'
)
returns uuid as $$
declare
  v_org_id uuid;
begin
  -- Create the organization
  insert into public.organizations (name, slug, federation, timezone, weight_unit, plan, status)
  values (p_name, p_slug, p_federation, p_timezone, p_weight_unit, 'starter', 'active')
  returning id into v_org_id;

  -- Add creator as owner
  insert into public.org_members (org_id, user_id, org_role, status)
  values (v_org_id, p_user_id, 'owner', 'active');

  return v_org_id;
end;
$$ language plpgsql security definer;

-- ============================================================
-- PUBLIC ORG PAGE  (external marketing site + intake form)
-- Each org has exactly one public page config.
-- Accessible at /org/:slug without authentication.
-- ============================================================
create table if not exists org_public_pages (
  id             uuid primary key default uuid_generate_v4(),
  org_id         uuid unique not null references organizations(id) on delete cascade,
  published      boolean not null default false,
  -- Hero section
  hero_headline    text,
  hero_subheadline text,
  hero_cta         text default 'Apply to Join',
  -- Branding
  accent_color     text default '#a855f7',   -- CSS hex color
  logo_url         text,
  -- Custom domain / URL
  -- When set, this is shown as the shareable link in the admin UI.
  -- To use a custom domain, the coach sets up a GitHub Pages custom domain:
  --   1. Add a CNAME file to the repo's public/ folder with their domain
  --   2. Point DNS CNAME to gerbriel.github.io
  --   3. Configure GitHub Settings → Pages → Custom Domain
  -- This makes the entire platform available at their domain (e.g. their-gym.com).
  custom_url       text,
  -- Sections are stored as ordered JSONB array
  -- Each element: { id, type, order, visible, title, body, items[] }
  -- type: 'about' | 'coaches' | 'highlights' | 'testimonials' | 'faq' | 'intake' | 'custom'
  sections         jsonb not null default '[]',
  -- Intake form field definitions
  -- Each element: { id, label, type, required, placeholder, options[] }
  intake_fields    jsonb not null default '[]',
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- RLS: anyone can read a published page (public intake form)
alter table org_public_pages enable row level security;

drop policy if exists "Public can read published pages" on org_public_pages;
create policy "Public can read published pages"
  on org_public_pages for select
  using (published = true);

drop policy if exists "Org admins can manage their page" on org_public_pages;
create policy "Org admins can manage their page"
  on org_public_pages for all
  using (
    org_id in (
      select org_id from org_members
      where user_id = auth.uid()
      and org_role in ('owner', 'head_coach')
      and status = 'active'
    )
  );

-- ============================================================
-- LEADS  (intake form submissions → potential athletes)
-- ============================================================
do $$ begin create type lead_status as enum ('new', 'contacted', 'onboarded', 'declined'); exception when duplicate_object then null; end $$;

create table if not exists leads (
  id             uuid primary key default uuid_generate_v4(),
  org_id         uuid not null references organizations(id) on delete cascade,

  -- ── Contact Info ──────────────────────────────────────────
  full_name      text not null,
  email          text not null,
  phone          text,
  instagram      text,          -- f-instagram

  -- ── Service Interest ──────────────────────────────────────
  service        text,          -- f-service  (Online 1-on-1, In-Person, etc.)
  coach_pref     text,          -- f-coach-pref

  -- ── Personal Info ─────────────────────────────────────────
  age            integer,       -- f-age
  occupation     text,          -- f-occupation
  height         text,          -- f-height  (stored as text to allow "5'10\"" or "178cm")
  bodyweight     text,          -- f-weight
  weight_class   text,          -- f-weight-class
  obligations    text,          -- f-obligations (family/work commitments)

  -- ── Training Schedule ─────────────────────────────────────
  days_per_week  integer,       -- f-days-per-week
  training_days  text,          -- f-training-days (comma-separated day names)
  training_time  text,          -- f-training-time (morning / afternoon / evening)
  sleep_schedule text,          -- f-sleep-schedule
  sleep_hours    numeric,       -- f-sleep-hours

  -- ── Lifting Stats ─────────────────────────────────────────
  squat_max      text,          -- f-squat-max  (text allows "405 lbs" or "180 kg")
  bench_max      text,          -- f-bench-max
  deadlift_max   text,          -- f-deadlift-max
  squat_freq     integer,       -- f-squat-freq  (sessions/week)
  bench_freq     integer,       -- f-bench-freq
  deadlift_freq  integer,       -- f-deadlift-freq

  -- ── Technique & Style ─────────────────────────────────────
  squat_style    text,          -- f-squat-style
  bench_style    text,          -- f-bench-style
  deadlift_style text,          -- f-deadlift-style
  current_program text,         -- f-current-program
  weakpoints     text,          -- f-weakpoints

  -- ── Training Background ───────────────────────────────────
  experience     text,          -- f-experience  (training experience tier)
  federation     text,          -- f-fed
  membership_num text,          -- f-membership  (current federation membership #)
  injuries       text,          -- f-injuries

  -- ── Health & Recovery ─────────────────────────────────────
  nutrition_score   integer,    -- f-nutrition-score  (1–10)
  hydration_score   integer,    -- f-hydration-score  (1–10)
  stress_score      integer,    -- f-stress-score     (1–10)
  recovery_score    integer,    -- f-recovery         (1–10)
  external_stressors text,      -- f-external-stressors

  -- ── Coaching Fit ──────────────────────────────────────────
  learner_type   text,          -- f-learner-type
  expectations   text,          -- f-expectations
  concerns       text,          -- f-concerns
  goals          text,          -- f-goals

  -- ── Source ────────────────────────────────────────────────
  source         text,          -- f-hear  ('Instagram' | 'Google' | 'Referral' etc.)

  -- ── Flexible overflow for custom / future fields ──────────
  -- Stores any intake field answers that don't map to a dedicated column above.
  -- Keyed by field id (e.g. { "f-custom-123": "answer" }).
  extra_answers  jsonb not null default '{}',

  -- ── CRM ───────────────────────────────────────────────────
  status         lead_status not null default 'new',
  assigned_to    uuid references profiles(id) on delete set null,
  notes          text,          -- internal staff notes
  submitted_at   timestamptz default now(),
  updated_at     timestamptz default now()
);

-- Indexes for fast per-org queries and common filters
create index if not exists leads_org_id_idx        on leads(org_id);
create index if not exists leads_status_idx        on leads(org_id, status);
create index if not exists leads_service_idx       on leads(org_id, service);
create index if not exists leads_submitted_idx     on leads(org_id, submitted_at desc);
-- GIN index so coaches can query extra_answers JSON efficiently
create index if not exists leads_extra_answers_idx on leads using gin(extra_answers);

-- RLS: leads are private to the org
alter table leads enable row level security;

drop policy if exists "Org staff can view and manage leads" on leads;
create policy "Org staff can view and manage leads"
  on leads for all
  using (
    org_id in (
      select org_id from org_members
      where user_id = auth.uid()
      and org_role in ('owner', 'head_coach', 'coach')
      and status = 'active'
    )
  );

-- Public insert (anyone submitting the intake form)
drop policy if exists "Anyone can submit an intake form" on leads;
create policy "Anyone can submit an intake form"
  on leads for insert
  with check (true);

-- ============================================================
-- Trigger: update updated_at on leads and org_public_pages
-- ============================================================
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists leads_updated_at on leads;
create trigger leads_updated_at
  before update on leads
  for each row execute procedure set_updated_at();

drop trigger if exists org_public_pages_updated_at on org_public_pages;
create trigger org_public_pages_updated_at
  before update on org_public_pages
  for each row execute procedure set_updated_at();

-- ============================================================
-- Migration 001 — Expand leads table with full intake form fields
-- Run this in Supabase SQL Editor if you already have a leads table.
-- Safe to run multiple times (uses ADD COLUMN IF NOT EXISTS).
-- ============================================================

-- ── Contact Info ──────────────────────────────────────────────
alter table leads add column if not exists instagram text;

-- ── Service Interest ──────────────────────────────────────────
alter table leads add column if not exists service     text;
alter table leads add column if not exists coach_pref  text;

-- ── Personal Info ─────────────────────────────────────────────
alter table leads add column if not exists age         integer;
alter table leads add column if not exists occupation  text;
alter table leads add column if not exists height      text;
alter table leads add column if not exists bodyweight  text;
alter table leads add column if not exists weight_class text;
alter table leads add column if not exists obligations text;

-- ── Training Schedule ─────────────────────────────────────────
alter table leads add column if not exists days_per_week  integer;
alter table leads add column if not exists training_days  text;
alter table leads add column if not exists training_time  text;
alter table leads add column if not exists sleep_schedule text;
alter table leads add column if not exists sleep_hours    numeric;

-- ── Lifting Stats ─────────────────────────────────────────────
alter table leads add column if not exists squat_max    text;
alter table leads add column if not exists bench_max    text;
alter table leads add column if not exists deadlift_max text;
alter table leads add column if not exists squat_freq   integer;
alter table leads add column if not exists bench_freq   integer;
alter table leads add column if not exists deadlift_freq integer;

-- ── Technique & Style ─────────────────────────────────────────
alter table leads add column if not exists squat_style    text;
alter table leads add column if not exists bench_style    text;
alter table leads add column if not exists deadlift_style text;
alter table leads add column if not exists current_program text;
alter table leads add column if not exists weakpoints     text;

-- ── Training Background ───────────────────────────────────────
alter table leads add column if not exists membership_num text;

-- ── Health & Recovery ─────────────────────────────────────────
alter table leads add column if not exists nutrition_score    integer;
alter table leads add column if not exists hydration_score    integer;
alter table leads add column if not exists stress_score       integer;
alter table leads add column if not exists recovery_score     integer;
alter table leads add column if not exists external_stressors text;

-- ── Coaching Fit ──────────────────────────────────────────────
alter table leads add column if not exists learner_type text;
alter table leads add column if not exists expectations text;
alter table leads add column if not exists concerns     text;

-- ── Extra answers — make NOT NULL if it wasn't already ────────
alter table leads alter column extra_answers set default '{}';
update leads set extra_answers = '{}' where extra_answers is null;
alter table leads alter column extra_answers set not null;

-- ── New indexes ───────────────────────────────────────────────
create index if not exists leads_service_idx      on leads(org_id, service);
create index if not exists leads_submitted_idx    on leads(org_id, submitted_at desc);
create index if not exists leads_extra_answers_idx on leads using gin(extra_answers);

-- ── Backfill: promote any extra_answers keys into columns ─────
-- If you already have rows with data in extra_answers, this promotes
-- the common keys to their new dedicated columns (leaves extra_answers intact).
update leads
set
  instagram         = coalesce(instagram,         extra_answers->>'f-instagram'),
  service           = coalesce(service,           extra_answers->>'f-service'),
  coach_pref        = coalesce(coach_pref,        extra_answers->>'f-coach-pref'),
  age               = coalesce(age,               (extra_answers->>'f-age')::integer),
  occupation        = coalesce(occupation,        extra_answers->>'f-occupation'),
  height            = coalesce(height,            extra_answers->>'f-height'),
  bodyweight        = coalesce(bodyweight,        extra_answers->>'f-weight'),
  weight_class      = coalesce(weight_class,      extra_answers->>'f-weight-class'),
  obligations       = coalesce(obligations,       extra_answers->>'f-obligations'),
  days_per_week     = coalesce(days_per_week,     (extra_answers->>'f-days-per-week')::integer),
  training_days     = coalesce(training_days,     extra_answers->>'f-training-days'),
  training_time     = coalesce(training_time,     extra_answers->>'f-training-time'),
  sleep_schedule    = coalesce(sleep_schedule,    extra_answers->>'f-sleep-schedule'),
  sleep_hours       = coalesce(sleep_hours,       (extra_answers->>'f-sleep-hours')::numeric),
  squat_max         = coalesce(squat_max,         extra_answers->>'f-squat-max'),
  bench_max         = coalesce(bench_max,         extra_answers->>'f-bench-max'),
  deadlift_max      = coalesce(deadlift_max,      extra_answers->>'f-deadlift-max'),
  squat_freq        = coalesce(squat_freq,        (extra_answers->>'f-squat-freq')::integer),
  bench_freq        = coalesce(bench_freq,        (extra_answers->>'f-bench-freq')::integer),
  deadlift_freq     = coalesce(deadlift_freq,     (extra_answers->>'f-deadlift-freq')::integer),
  squat_style       = coalesce(squat_style,       extra_answers->>'f-squat-style'),
  bench_style       = coalesce(bench_style,       extra_answers->>'f-bench-style'),
  deadlift_style    = coalesce(deadlift_style,    extra_answers->>'f-deadlift-style'),
  current_program   = coalesce(current_program,   extra_answers->>'f-current-program'),
  weakpoints        = coalesce(weakpoints,        extra_answers->>'f-weakpoints'),
  membership_num    = coalesce(membership_num,    extra_answers->>'f-membership'),
  nutrition_score   = coalesce(nutrition_score,   (extra_answers->>'f-nutrition-score')::integer),
  hydration_score   = coalesce(hydration_score,   (extra_answers->>'f-hydration-score')::integer),
  stress_score      = coalesce(stress_score,      (extra_answers->>'f-stress-score')::integer),
  recovery_score    = coalesce(recovery_score,    (extra_answers->>'f-recovery')::integer),
  external_stressors = coalesce(external_stressors, extra_answers->>'f-external-stressors'),
  learner_type      = coalesce(learner_type,      extra_answers->>'f-learner-type'),
  expectations      = coalesce(expectations,      extra_answers->>'f-expectations'),
  concerns          = coalesce(concerns,          extra_answers->>'f-concerns')
where extra_answers != '{}';
