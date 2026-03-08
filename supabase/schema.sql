-- ============================================================
-- POWERPLUS: Powerlifting Team OS
-- Supabase Schema — Single consolidated file (safe to re-run)
-- Version 3 — Multi-org, standalone accounts, flexible roles
-- Includes all migrations through 2026-03-06
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- ENUMS  (idempotent — safe to re-run)
-- ============================================================

do $$ begin create type platform_role as enum ('super_admin', 'user'); exception when duplicate_object then null; end $$;

do $$ begin
  create type org_role as enum (
    'owner', 'head_coach', 'coach', 'nutritionist', 'athlete', 'analyst'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type nutrition_permission as enum (
    'view_plan', 'edit_plan', 'create_meal_prep', 'assign_meal_prep',
    'edit_shopping_list', 'view_supplement_log', 'edit_supplement_log'
  );
exception when duplicate_object then null; end $$;

do $$ begin create type workout_status        as enum ('planned','in_progress','completed','missed','skipped');        exception when duplicate_object then null; end $$;
do $$ begin create type check_in_type         as enum ('morning','post_workout','evening');                            exception when duplicate_object then null; end $$;
do $$ begin create type message_type          as enum ('text','file','video','announcement');                          exception when duplicate_object then null; end $$;
do $$ begin create type goal_type             as enum ('strength','nutrition','meet','process');                       exception when duplicate_object then null; end $$;
do $$ begin create type meet_status           as enum ('upcoming','registered','completed','cancelled');               exception when duplicate_object then null; end $$;
do $$ begin create type pain_level            as enum ('0','1','2','3','4','5','6','7','8','9','10');                  exception when duplicate_object then null; end $$;
do $$ begin create type block_type            as enum ('accumulation','intensification','peak','deload','transition'); exception when duplicate_object then null; end $$;
do $$ begin create type nutrition_log_cadence as enum ('daily','weekly','biweekly','monthly');                        exception when duplicate_object then null; end $$;
do $$ begin create type lead_status           as enum ('new','contacted','onboarded','declined');                     exception when duplicate_object then null; end $$;

-- ============================================================
-- TABLES
-- ============================================================

-- ── profiles ─────────────────────────────────────────────────
create table if not exists profiles (
  id                  uuid primary key references auth.users(id) on delete cascade,
  email               text unique not null,
  full_name           text not null,
  display_name        text,
  avatar_url          text,
  platform_role       platform_role not null default 'user',
  role                text default 'athlete',
  member_id           text,
  phone               text,
  date_of_birth       date,
  weight_class        text,
  federation          text,
  equipment_type      text default 'raw',
  bio                 text,
  timezone            text default 'UTC',
  self_coach          boolean default false,
  onboarding_complete boolean default false,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);
-- Idempotent column guards (for databases that predate these additions)
alter table profiles add column if not exists role text default 'athlete';
alter table profiles add column if not exists member_id text;
alter table profiles add column if not exists phone text;
alter table profiles add column if not exists date_of_birth date;
alter table profiles add column if not exists weight_class text;
alter table profiles add column if not exists federation text;
alter table profiles add column if not exists equipment_type text default 'raw';
alter table profiles add column if not exists bio text;
alter table profiles add column if not exists timezone text default 'UTC';
alter table profiles add column if not exists self_coach boolean default false;
alter table profiles add column if not exists onboarding_complete boolean default false;

-- ── organizations ─────────────────────────────────────────────
create table if not exists organizations (
  id                                 uuid primary key default uuid_generate_v4(),
  name                               text not null,
  slug                               text unique,
  description                        text,
  logo_url                           text,
  website_url                        text,
  federation                         text,
  timezone                           text default 'UTC',
  weight_unit                        text default 'kg',
  plan                               text default 'starter',
  status                             text default 'active',
  athlete_limit                      integer default 10,
  staff_limit                        integer default 2,
  storage_gb_limit                   integer default 2,
  storage_gb_used                    numeric default 0,
  has_dedicated_nutritionist         boolean default false,
  athletes_can_self_manage_nutrition boolean default true,
  address                            text,
  is_demo                            boolean default false,
  stripe_customer_id                 text,
  stripe_subscription_id             text,
  billing_email                      text,
  trial_ends_at                      timestamptz,
  created_at                         timestamptz default now(),
  updated_at                         timestamptz default now()
);
-- Idempotent column guards for organizations
alter table organizations add column if not exists is_demo boolean default false;
alter table organizations add column if not exists stripe_customer_id text;
alter table organizations add column if not exists stripe_subscription_id text;
alter table organizations add column if not exists billing_email text;
alter table organizations add column if not exists trial_ends_at timestamptz;

-- ── org_members ───────────────────────────────────────────────
create table if not exists org_members (
  id                    uuid primary key default uuid_generate_v4(),
  org_id                uuid references organizations(id) on delete cascade,
  user_id               uuid references profiles(id) on delete cascade,
  org_role              org_role not null default 'athlete',
  is_self_athlete       boolean default false,
  status                text default 'active',
  invited_by            uuid references profiles(id),
  joined_at             timestamptz default now(),
  nutrition_permissions nutrition_permission[],
  unique(org_id, user_id)
);

-- ── org_invitations ───────────────────────────────────────────
create table if not exists org_invitations (
  id            uuid primary key default uuid_generate_v4(),
  org_id        uuid references organizations(id) on delete cascade,
  invited_email text not null,
  org_role      org_role not null default 'athlete',
  invited_by    uuid references profiles(id),
  message       text,
  token         text unique default md5(random()::text),
  status        text default 'pending',
  sent_at       timestamptz default now(),
  expires_at    timestamptz default now() + interval '7 days',
  accepted_at   timestamptz
);

-- ── org_join_requests ─────────────────────────────────────────
create table if not exists org_join_requests (
  id             uuid primary key default uuid_generate_v4(),
  org_id         uuid references organizations(id) on delete cascade,
  user_id        uuid references profiles(id) on delete cascade,
  requested_role org_role not null default 'athlete',
  message        text,
  status         text not null default 'pending',
  reviewed_by    uuid references profiles(id),
  reviewed_at    timestamptz,
  created_at     timestamptz default now(),
  unique(org_id, user_id)
);

-- ── training_groups ───────────────────────────────────────────
create table if not exists training_groups (
  id          uuid primary key default uuid_generate_v4(),
  org_id      uuid references organizations(id) on delete cascade,
  name        text not null,
  description text,
  coach_id    uuid references profiles(id),
  created_at  timestamptz default now()
);

create table if not exists group_members (
  id         uuid primary key default uuid_generate_v4(),
  group_id   uuid references training_groups(id) on delete cascade,
  athlete_id uuid references profiles(id) on delete cascade,
  joined_at  timestamptz default now(),
  unique(group_id, athlete_id)
);

-- ── staff_athlete_assignments ─────────────────────────────────
create table if not exists staff_athlete_assignments (
  id                     uuid primary key default uuid_generate_v4(),
  org_id                 uuid references organizations(id) on delete cascade,
  staff_id               uuid references profiles(id) on delete cascade,
  athlete_id             uuid references profiles(id) on delete cascade,
  can_view_nutrition     boolean default true,
  can_edit_nutrition     boolean default false,
  can_create_meal_prep   boolean default false,
  can_assign_meal_prep   boolean default false,
  can_edit_shopping_list boolean default false,
  can_view_workouts      boolean default true,
  can_edit_workouts      boolean default true,
  can_view_checkins      boolean default true,
  active                 boolean default true,
  assigned_at            timestamptz default now(),
  assigned_by            uuid references profiles(id),
  unique(org_id, staff_id, athlete_id)
);

-- ── exercises ─────────────────────────────────────────────────
create table if not exists exercises (
  id                  uuid primary key default uuid_generate_v4(),
  name                text not null,
  category            text not null,
  muscle_groups       text[],
  equipment           text[],
  description         text,
  video_url           text,
  technique_tags      text[],
  is_competition_lift boolean default false,
  created_by          uuid references profiles(id),
  org_id              uuid references organizations(id),
  is_global           boolean default false,
  created_at          timestamptz default now()
);

-- ── program_templates ─────────────────────────────────────────
create table if not exists program_templates (
  id                uuid primary key default uuid_generate_v4(),
  name              text not null,
  description       text,
  weeks             integer not null default 12,
  block_type        block_type,
  programming_style text default 'hybrid',
  created_by        uuid references profiles(id),
  org_id            uuid references organizations(id),
  is_public         boolean default false,
  tags              text[],
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

create table if not exists program_template_weeks (
  id          uuid primary key default uuid_generate_v4(),
  template_id uuid references program_templates(id) on delete cascade,
  week_number integer not null,
  name        text,
  notes       text,
  is_deload   boolean default false
);

create table if not exists workout_templates (
  id                 uuid primary key default uuid_generate_v4(),
  template_id        uuid references program_templates(id) on delete cascade,
  week_id            uuid references program_template_weeks(id) on delete cascade,
  day_of_week        integer not null,
  name               text not null,
  notes              text,
  estimated_duration integer,
  created_at         timestamptz default now()
);

create table if not exists workout_template_exercises (
  id                       uuid primary key default uuid_generate_v4(),
  workout_template_id      uuid references workout_templates(id) on delete cascade,
  exercise_id              uuid references exercises(id),
  block_type               text,
  order_index              integer not null,
  sets                     integer,
  reps                     text,
  intensity_type           text,
  intensity_value          text,
  rest_seconds             integer,
  tempo                    text,
  coaching_cues            text,
  notes                    text,
  alternative_exercise_ids uuid[]
);

-- ── program_instances ─────────────────────────────────────────
create table if not exists program_instances (
  id                    uuid primary key default uuid_generate_v4(),
  template_id           uuid references program_templates(id),
  athlete_id            uuid references profiles(id) on delete cascade,
  assigned_by           uuid references profiles(id),
  name                  text not null,
  start_date            date not null,
  end_date              date,
  current_week          integer default 1,
  training_max_squat    numeric,
  training_max_bench    numeric,
  training_max_deadlift numeric,
  notes                 text,
  active                boolean default true,
  created_at            timestamptz default now()
);

-- ── workout_sessions ──────────────────────────────────────────
create table if not exists workout_sessions (
  id                  uuid primary key default uuid_generate_v4(),
  athlete_id          uuid references profiles(id) on delete cascade,
  program_instance_id uuid references program_instances(id),
  workout_template_id uuid references workout_templates(id),
  name                text not null,
  scheduled_date      date not null,
  status              workout_status default 'planned',
  started_at          timestamptz,
  completed_at        timestamptz,
  notes               text,
  overall_rpe         numeric,
  readiness_score     integer,
  coach_comment       text,
  reviewed_by         uuid references profiles(id),
  created_at          timestamptz default now()
);

create table if not exists workout_sets (
  id               uuid primary key default uuid_generate_v4(),
  session_id       uuid references workout_sessions(id) on delete cascade,
  exercise_id      uuid references exercises(id),
  set_number       integer not null,
  planned_reps     integer,
  planned_weight   numeric,
  planned_rpe      numeric,
  performed_reps   integer,
  performed_weight numeric,
  performed_rpe    numeric,
  is_pr            boolean default false,
  is_top_set       boolean default false,
  video_url        text,
  pain_area        text,
  pain_level       text,
  notes            text,
  logged_at        timestamptz default now()
);

-- ── personal_records ──────────────────────────────────────────
create table if not exists personal_records (
  id             uuid primary key default uuid_generate_v4(),
  athlete_id     uuid references profiles(id) on delete cascade,
  exercise_id    uuid references exercises(id),
  record_type    text not null,
  weight         numeric not null,
  reps           integer,
  rpe            numeric,
  e1rm           numeric,
  is_competition boolean default false,
  meet_name      text,
  set_id         uuid references workout_sets(id),
  recorded_at    date not null,
  notes          text,
  created_at     timestamptz default now()
);

-- ── daily_checkins ────────────────────────────────────────────
create table if not exists daily_checkins (
  id               uuid primary key default uuid_generate_v4(),
  athlete_id       uuid references profiles(id) on delete cascade,
  check_date       date not null,
  check_type       check_in_type default 'morning',
  sleep_hours      numeric,
  sleep_quality    integer check (sleep_quality between 1 and 10),
  stress_level     integer check (stress_level between 1 and 10),
  soreness_level   integer check (soreness_level between 1 and 10),
  motivation_level integer check (motivation_level between 1 and 10),
  steps            integer,
  bodyweight       numeric,
  bodyweight_unit  text default 'kg',
  notes            text,
  created_at       timestamptz default now(),
  unique(athlete_id, check_date, check_type)
);

-- ── nutrition_plans ───────────────────────────────────────────
create table if not exists nutrition_plans (
  id                       uuid primary key default uuid_generate_v4(),
  athlete_id               uuid references profiles(id) on delete cascade,
  created_by               uuid references profiles(id),
  last_edited_by           uuid references profiles(id),
  org_id                   uuid references organizations(id),
  name                     text not null,
  calories_training        integer,
  calories_rest            integer,
  protein_g                integer,
  carbs_g                  integer,
  fat_g                    integer,
  fiber_g                  integer,
  water_ml                 integer,
  cadence                  nutrition_log_cadence default 'weekly',
  valid_from               date,
  valid_to                 date,
  linked_training_block_id uuid,
  linked_goal_ids          uuid[],
  linked_meet_id           uuid,
  coach_notes              text,
  athlete_can_edit         boolean default false,
  active                   boolean default true,
  created_at               timestamptz default now(),
  updated_at               timestamptz default now()
);

-- ── nutrition_logs ────────────────────────────────────────────
create table if not exists nutrition_logs (
  id                uuid primary key default uuid_generate_v4(),
  athlete_id        uuid references profiles(id) on delete cascade,
  nutrition_plan_id uuid references nutrition_plans(id),
  log_date          date not null,
  is_training_day   boolean default true,
  calories_actual   integer,
  protein_actual    numeric,
  carbs_actual      numeric,
  fat_actual        numeric,
  fiber_actual      numeric,
  water_actual      integer,
  compliance_score  integer check (compliance_score between 0 and 100),
  log_method        text default 'checklist',
  photo_url         text,
  hunger_level      integer check (hunger_level between 1 and 10),
  energy_level      integer check (energy_level between 1 and 10),
  digestion_notes   text,
  notes             text,
  reviewed_by       uuid references profiles(id),
  staff_comment     text,
  created_at        timestamptz default now(),
  unique(athlete_id, log_date)
);

-- ── supplement_stacks / items / logs ──────────────────────────
create table if not exists supplement_stacks (
  id         uuid primary key default uuid_generate_v4(),
  athlete_id uuid references profiles(id) on delete cascade,
  created_by uuid references profiles(id),
  name       text not null default 'Default Stack',
  notes      text,
  active     boolean default true,
  created_at timestamptz default now()
);

create table if not exists supplement_stack_items (
  id              uuid primary key default uuid_generate_v4(),
  stack_id        uuid references supplement_stacks(id) on delete cascade,
  supplement_name text not null,
  dose            text,
  timing          text,
  notes           text,
  order_index     integer default 0
);

create table if not exists supplement_logs (
  id              uuid primary key default uuid_generate_v4(),
  athlete_id      uuid references profiles(id) on delete cascade,
  stack_item_id   uuid references supplement_stack_items(id),
  supplement_name text,
  log_date        date not null,
  taken           boolean default false,
  notes           text,
  logged_at       timestamptz default now()
);

-- ── meal_prep_recipes ─────────────────────────────────────────
create table if not exists meal_prep_recipes (
  id                 uuid primary key default uuid_generate_v4(),
  created_by         uuid references profiles(id),
  org_id             uuid references organizations(id),
  is_org_template    boolean default false,
  name               text not null,
  meal_type          text,
  prep_time          integer,
  cook_time          integer,
  servings           integer default 1,
  macros_per_serving jsonb not null default '{}',
  ingredients        jsonb default '[]',
  instructions       text,
  tags               text[],
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);

-- ── meal_prep_sessions / items ────────────────────────────────
create table if not exists meal_prep_sessions (
  id                       uuid primary key default uuid_generate_v4(),
  athlete_id               uuid references profiles(id) on delete cascade,
  created_by               uuid references profiles(id),
  org_id                   uuid references organizations(id),
  label                    text not null,
  prep_date                date not null,
  cadence                  nutrition_log_cadence default 'weekly',
  period_start             date,
  period_end               date,
  linked_training_block_id uuid,
  linked_goal_ids          uuid[],
  linked_meet_id           uuid,
  total_calories_prepped   integer default 0,
  total_protein_prepped    integer default 0,
  notes                    text,
  created_at               timestamptz default now()
);

create table if not exists meal_prep_session_items (
  id                 uuid primary key default uuid_generate_v4(),
  session_id         uuid references meal_prep_sessions(id) on delete cascade,
  recipe_id          uuid references meal_prep_recipes(id),
  recipe_name        text not null,
  servings_made      integer not null default 1,
  servings_consumed  integer not null default 0,
  storage            text default 'fridge',
  macros_per_serving jsonb not null default '{}',
  notes              text
);

-- ── shopping_lists ────────────────────────────────────────────
create table if not exists shopping_lists (
  id                       uuid primary key default uuid_generate_v4(),
  athlete_id               uuid references profiles(id) on delete cascade,
  created_by               uuid references profiles(id),
  org_id                   uuid references organizations(id),
  label                    text not null,
  cadence                  nutrition_log_cadence default 'weekly',
  week_start               date,
  week_end                 date,
  budget                   numeric,
  status                   text default 'active',
  linked_training_block_id uuid,
  linked_goal_ids          uuid[],
  linked_meet_id           uuid,
  notes                    text,
  created_at               timestamptz default now(),
  updated_at               timestamptz default now()
);

create table if not exists shopping_list_categories (
  id          uuid primary key default uuid_generate_v4(),
  list_id     uuid references shopping_lists(id) on delete cascade,
  name        text not null,
  icon        text,
  order_index integer default 0
);

create table if not exists shopping_list_items (
  id                uuid primary key default uuid_generate_v4(),
  list_id           uuid references shopping_lists(id) on delete cascade,
  category_id       uuid references shopping_list_categories(id) on delete set null,
  name              text not null,
  amount            text,
  weight_g          numeric,
  price             numeric,
  checked           boolean default false,
  calories_per_100g numeric,
  protein_per_100g  numeric,
  carbs_per_100g    numeric,
  fat_per_100g      numeric,
  recipe_ids        uuid[],
  notes             text,
  added_by          uuid references profiles(id),
  added_at          timestamptz default now()
);

-- ── training_blocks ───────────────────────────────────────────
create table if not exists training_blocks (
  id                  uuid primary key default uuid_generate_v4(),
  org_id              uuid references organizations(id),
  athlete_id          uuid references profiles(id) on delete cascade,
  created_by          uuid references profiles(id),
  name                text not null,
  block_type          block_type,
  phase               text,
  weeks               integer,
  status              text default 'planned',
  focus               text,
  avg_rpe_target      numeric(4,1),
  sessions_planned    integer default 0,
  sessions_completed  integer default 0,
  color               text,
  start_date          date,
  end_date            date,
  notes               text,
  active              boolean default true,
  linked_meet_id      uuid,
  linked_goal_ids     uuid[] default '{}',
  created_at          timestamptz default now()
);
-- Idempotent column guards (added via migrations; CREATE TABLE IF NOT EXISTS won't add these to existing tables)
alter table training_blocks add column if not exists phase               text;
alter table training_blocks add column if not exists weeks               integer;
alter table training_blocks add column if not exists status              text default 'planned';
alter table training_blocks add column if not exists focus               text;
alter table training_blocks add column if not exists avg_rpe_target      numeric(4,1);
alter table training_blocks add column if not exists sessions_planned    integer default 0;
alter table training_blocks add column if not exists sessions_completed  integer default 0;
alter table training_blocks add column if not exists color               text;
alter table training_blocks add column if not exists linked_meet_id      uuid;
alter table training_blocks add column if not exists linked_goal_ids     uuid[] default '{}';

-- ── goals ─────────────────────────────────────────────────────
create table if not exists goals (
  id                       uuid primary key default uuid_generate_v4(),
  athlete_id               uuid references profiles(id) on delete cascade,
  created_by               uuid references profiles(id),
  org_id                   uuid references organizations(id),
  goal_type                goal_type not null,
  title                    text not null,
  description              text,
  target_value             numeric,
  target_unit              text,
  current_value            numeric,
  target_date              date,
  linked_training_block_id uuid references training_blocks(id),
  linked_meet_id           uuid,
  completed                boolean default false,
  completed_at             timestamptz,
  notes                    text,
  created_at               timestamptz default now(),
  updated_at               timestamptz default now()
);
-- Idempotent column guard
alter table goals add column if not exists linked_meet_id uuid;

-- ── meets ─────────────────────────────────────────────────────
create table if not exists meets (
  id                    uuid primary key default uuid_generate_v4(),
  org_id                uuid references organizations(id),
  created_by            uuid references profiles(id),
  name                  text not null,
  federation            text,
  location              text,
  meet_date             date,
  registration_deadline date,
  weigh_in_date         date,
  status                meet_status default 'upcoming',
  website_url           text,
  notes                 text,
  equipment             text default 'raw',
  athletes_registered   integer default 0,
  athletes_confirmed    integer default 0,
  attempts              jsonb,
  linked_goal_ids       uuid[] default '{}',
  linked_block_ids      uuid[] default '{}',
  created_at            timestamptz default now()
);
-- Idempotent column guards (added via migrations)
alter table meets add column if not exists equipment           text default 'raw';
alter table meets add column if not exists athletes_registered integer default 0;
alter table meets add column if not exists athletes_confirmed  integer default 0;
alter table meets add column if not exists attempts            jsonb;
alter table meets add column if not exists linked_goal_ids     uuid[] default '{}';
alter table meets add column if not exists linked_block_ids    uuid[] default '{}';

-- Deferred FKs (idempotent)
do $$ begin
  alter table goals add constraint goals_linked_meet_id_fkey
    foreign key (linked_meet_id) references meets(id);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table training_blocks add constraint training_blocks_linked_meet_id_fkey
    foreign key (linked_meet_id) references meets(id) on delete set null;
exception when duplicate_object then null; end $$;

create table if not exists athlete_meet_entries (
  id                uuid primary key default uuid_generate_v4(),
  meet_id           uuid references meets(id) on delete cascade,
  athlete_id        uuid references profiles(id) on delete cascade,
  weight_class      text,
  equipment_type    text,
  squat_opener      numeric,
  bench_opener      numeric,
  deadlift_opener   numeric,
  squat_attempts    numeric[],
  bench_attempts    numeric[],
  deadlift_attempts numeric[],
  squat_result      numeric,
  bench_result      numeric,
  deadlift_result   numeric,
  total_result      numeric,
  dots_score        numeric,
  wilks_score       numeric,
  placement         integer,
  notes             text,
  updated_at        timestamptz default now(),
  created_at        timestamptz default now()
);
-- Idempotent column guard
alter table athlete_meet_entries add column if not exists updated_at timestamptz default now();

-- ── messaging ─────────────────────────────────────────────────
create table if not exists channels (
  id           uuid primary key default uuid_generate_v4(),
  org_id       uuid references organizations(id) on delete cascade,
  name         text not null,
  description  text,
  channel_type text default 'public',
  created_by   uuid references profiles(id),
  is_archived  boolean default false,
  created_at   timestamptz default now()
);

create table if not exists channel_members (
  id           uuid primary key default uuid_generate_v4(),
  channel_id   uuid references channels(id) on delete cascade,
  user_id      uuid references profiles(id) on delete cascade,
  role         text default 'member',
  joined_at    timestamptz default now(),
  last_read_at timestamptz default now(),
  unique(channel_id, user_id)
);

create table if not exists messages (
  id             uuid primary key default uuid_generate_v4(),
  channel_id     uuid references channels(id) on delete cascade,
  sender_id      uuid references profiles(id),
  content        text,
  message_type   message_type default 'text',
  file_url       text,
  file_name      text,
  reply_to_id    uuid references messages(id),
  is_pinned      boolean default false,
  is_action_item boolean default false,
  edited_at      timestamptz,
  gif_url        text,
  media_url      text,
  formatting     jsonb,
  created_at     timestamptz default now()
);

create table if not exists message_reactions (
  id         uuid primary key default uuid_generate_v4(),
  message_id uuid references messages(id) on delete cascade,
  user_id    uuid references profiles(id) on delete cascade,
  emoji      text not null,
  created_at timestamptz default now(),
  unique(message_id, user_id, emoji)
);

-- ── events / calendar ─────────────────────────────────────────
create table if not exists events (
  id               uuid primary key default uuid_generate_v4(),
  org_id           uuid references organizations(id),
  created_by       uuid references profiles(id),
  title            text not null,
  description      text,
  event_type       text not null,
  start_time       timestamptz not null,
  end_time         timestamptz,
  location         text,
  meeting_url      text,
  attendee_ids     uuid[],
  reminder_minutes integer[],
  created_at       timestamptz default now()
);

-- ── resources ─────────────────────────────────────────────────
create table if not exists resources (
  id           uuid primary key default uuid_generate_v4(),
  org_id       uuid references organizations(id),
  created_by   uuid references profiles(id),
  title        text not null,
  content      text,
  category     text,
  file_url     text,
  video_url    text,
  is_published boolean default true,
  tags         text[],
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- ── announcements ─────────────────────────────────────────────
create table if not exists announcements (
  id                uuid primary key default uuid_generate_v4(),
  org_id            uuid references organizations(id) on delete cascade,
  author_id         uuid references profiles(id),
  title             text not null,
  content           text not null,
  announcement_type text default 'general',
  is_pinned         boolean default false,
  requires_approval boolean default false,
  approved_by       uuid references profiles(id),
  approved_at       timestamptz,
  created_at        timestamptz default now()
);

-- ── injury_logs ───────────────────────────────────────────────
create table if not exists injury_logs (
  id                uuid primary key default uuid_generate_v4(),
  athlete_id        uuid references profiles(id) on delete cascade,
  body_area         text not null,
  pain_level        integer check (pain_level between 0 and 10),
  injury_date       date not null,
  reported_date     date,                        -- date first reported (used by roster function)
  status            text default 'active',       -- 'active' | 'monitoring' | 'resolved'
  description       text,
  movement_affected text[],
  resolved          boolean default false,
  resolved_date     date,
  reported_to_coach boolean default false,
  coach_notes       text,
  log_history       jsonb default '[]',          -- array of {date, pain_level, note, reporter}
  created_at        timestamptz default now()
);
-- Idempotent column guards (added via migrations)
alter table injury_logs add column if not exists reported_date date;
alter table injury_logs add column if not exists status        text default 'active';
alter table injury_logs add column if not exists log_history   jsonb default '[]';

-- ── notifications ─────────────────────────────────────────────
create table if not exists notifications (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid references profiles(id) on delete cascade,
  title      text not null,
  body       text,
  type       text,
  data       jsonb,
  read       boolean default false,
  created_at timestamptz default now()
);

-- ── audit_logs ────────────────────────────────────────────────
create table if not exists audit_logs (
  id          uuid primary key default uuid_generate_v4(),
  actor_id    uuid references profiles(id),
  action      text not null,
  entity_type text,
  entity_id   uuid,
  changes     jsonb,
  ip_address  text,
  created_at  timestamptz default now()
);

-- ── org_public_pages ──────────────────────────────────────────
create table if not exists org_public_pages (
  id               uuid primary key default uuid_generate_v4(),
  org_id           uuid unique not null references organizations(id) on delete cascade,
  published        boolean not null default false,
  hero_headline    text,
  hero_subheadline text,
  hero_cta         text default 'Apply to Join',
  accent_color     text default '#a855f7',
  logo_url         text,
  custom_url       text,
  sections         jsonb not null default '[]',
  intake_fields    jsonb not null default '[]',
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- ── leads ─────────────────────────────────────────────────────
create table if not exists leads (
  id                 uuid primary key default uuid_generate_v4(),
  org_id             uuid not null references organizations(id) on delete cascade,
  full_name          text not null,
  email              text not null,
  phone              text,
  instagram          text,
  service            text,
  coach_pref         text,
  age                integer,
  occupation         text,
  height             text,
  bodyweight         text,
  weight_class       text,
  obligations        text,
  days_per_week      integer,
  training_days      text,
  training_time      text,
  sleep_schedule     text,
  sleep_hours        numeric,
  squat_max          text,
  bench_max          text,
  deadlift_max       text,
  squat_freq         integer,
  bench_freq         integer,
  deadlift_freq      integer,
  squat_style        text,
  bench_style        text,
  deadlift_style     text,
  current_program    text,
  weakpoints         text,
  experience         text,
  federation         text,
  membership_num     text,
  injuries           text,
  nutrition_score    integer,
  hydration_score    integer,
  stress_score       integer,
  recovery_score     integer,
  external_stressors text,
  learner_type       text,
  expectations       text,
  concerns           text,
  goals              text,
  source             text,
  extra_answers      jsonb not null default '{}',
  status             lead_status not null default 'new',
  assigned_to        uuid references profiles(id) on delete set null,
  notes              text,
  submitted_at       timestamptz default now(),
  updated_at         timestamptz default now()
);

create index if not exists leads_org_id_idx        on leads(org_id);
create index if not exists leads_status_idx        on leads(org_id, status);
create index if not exists leads_service_idx       on leads(org_id, service);
create index if not exists leads_submitted_idx     on leads(org_id, submitted_at desc);
create index if not exists leads_extra_answers_idx on leads using gin(extra_answers);

-- ============================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================

alter table profiles                   enable row level security;
alter table organizations              enable row level security;
alter table org_members                enable row level security;
alter table org_invitations            enable row level security;
alter table org_join_requests          enable row level security;
alter table training_groups            enable row level security;
alter table group_members              enable row level security;
alter table staff_athlete_assignments  enable row level security;
alter table exercises                  enable row level security;
alter table program_templates          enable row level security;
alter table program_template_weeks     enable row level security;
alter table workout_templates          enable row level security;
alter table workout_template_exercises enable row level security;
alter table program_instances          enable row level security;
alter table workout_sessions           enable row level security;
alter table workout_sets               enable row level security;
alter table personal_records           enable row level security;
alter table daily_checkins             enable row level security;
alter table training_blocks            enable row level security;
alter table goals                      enable row level security;
alter table meets                      enable row level security;
alter table athlete_meet_entries       enable row level security;
alter table nutrition_plans            enable row level security;
alter table nutrition_logs             enable row level security;
alter table supplement_stacks          enable row level security;
alter table supplement_stack_items     enable row level security;
alter table supplement_logs            enable row level security;
alter table meal_prep_recipes          enable row level security;
alter table meal_prep_sessions         enable row level security;
alter table meal_prep_session_items    enable row level security;
alter table shopping_lists             enable row level security;
alter table shopping_list_categories   enable row level security;
alter table shopping_list_items        enable row level security;
alter table channels                   enable row level security;
alter table channel_members            enable row level security;
alter table messages                   enable row level security;
alter table message_reactions          enable row level security;
alter table events                     enable row level security;
alter table resources                  enable row level security;
alter table announcements              enable row level security;
alter table injury_logs                enable row level security;
alter table notifications              enable row level security;
alter table audit_logs                 enable row level security;
alter table org_public_pages           enable row level security;
alter table leads                      enable row level security;

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

create or replace function get_user_org_role(p_org_id uuid, p_user_id uuid)
  returns org_role as $$
    select org_role from org_members where org_id = p_org_id and user_id = p_user_id
  $$ language sql security definer stable;

create or replace function has_nutrition_permission(
  p_org_id uuid, p_user_id uuid, p_perm nutrition_permission
) returns boolean as $$
  select exists (
    select 1 from org_members
    where org_id = p_org_id and user_id = p_user_id
      and (p_perm = any(nutrition_permissions) or org_role in ('nutritionist','head_coach','owner'))
  )
$$ language sql security definer stable;

create or replace function is_self_athlete(p_org_id uuid, p_user_id uuid)
  returns boolean as $$
    select coalesce(
      (select is_self_athlete from org_members where org_id = p_org_id and user_id = p_user_id), false)
  $$ language sql security definer stable;

create or replace function staff_can_view_athlete(p_org_id uuid, p_staff_id uuid, p_athlete_id uuid)
  returns boolean as $$
    select exists (select 1 from staff_athlete_assignments
      where org_id = p_org_id and staff_id = p_staff_id and athlete_id = p_athlete_id)
  $$ language sql security definer stable;

-- Returns the list of org_ids the caller belongs to — used to break RLS recursion on org_members.
create or replace function get_my_org_ids()
  returns uuid[] as $$
    select coalesce(array_agg(org_id), '{}') from org_members where user_id = auth.uid()
  $$ language sql security definer stable;

-- Returns true if the calling user has platform_role = 'super_admin'.
-- Security-definer so it bypasses RLS when checking the profiles table.
create or replace function is_platform_super_admin()
  returns boolean as $$
    select exists (select 1 from profiles where id = auth.uid() and platform_role = 'super_admin')
  $$ language sql security definer stable;

-- ============================================================
-- RLS POLICIES (all idempotent via DROP IF EXISTS before CREATE)
-- ============================================================

-- ── profiles ──────────────────────────────────────────────────
drop policy if exists "profiles: any org member can read" on profiles;
-- Allow reading profiles of users who share at least one org, plus your own profile.
-- Super-admin can read all profiles.
-- Uses get_my_org_ids() (security-definer) to avoid RLS recursion:
--   profiles SELECT → org_members (direct join) → get_my_org_ids() → org_members = infinite loop.
-- Instead we look up our org list once via the helper, then check if the target profile
-- is a member of any of those orgs.
create policy "profiles: any org member can read" on profiles for select
  using (
    is_platform_super_admin()
    or id = auth.uid()
    or exists (
      select 1 from org_members
      where user_id = profiles.id
        and org_id = any(get_my_org_ids())
    )
  );

drop policy if exists "profiles: owner can update" on profiles;
create policy "profiles: owner can update" on profiles for update using (auth.uid() = id);

drop policy if exists "profiles: owner can insert" on profiles;
create policy "profiles: owner can insert" on profiles for insert with check (auth.uid() = id);

drop policy if exists "profiles: owner can delete" on profiles;
create policy "profiles: owner can delete" on profiles for delete using (auth.uid() = id);

-- ── organizations ─────────────────────────────────────────────
drop policy if exists "orgs: members can read" on organizations;
create policy "orgs: members can read" on organizations for select
  using (
    is_platform_super_admin()
    or exists (select 1 from org_members where org_id = organizations.id and user_id = auth.uid())
  );

drop policy if exists "orgs: owner can update" on organizations;
create policy "orgs: owner can update" on organizations for update
  using (get_user_org_role(id, auth.uid()) = 'owner');

-- INSERT is handled by the create_org_with_owner() security-definer RPC.
-- This policy allows the trigger/function pathway; direct client inserts remain blocked.
drop policy if exists "orgs: authenticated can insert via rpc" on organizations;
create policy "orgs: authenticated can insert via rpc" on organizations for insert
  with check (auth.uid() is not null);

drop policy if exists "orgs: owner can delete" on organizations;
create policy "orgs: owner can delete" on organizations for delete
  using (get_user_org_role(id, auth.uid()) = 'owner');

-- ── org_members ───────────────────────────────────────────────
drop policy if exists "org_members: member can view own org" on org_members;
-- Uses security-definer helper to avoid infinite recursion (can't query org_members from inside itself).
create policy "org_members: member can view own org" on org_members for select
  using (is_platform_super_admin() or org_id = any(get_my_org_ids()));

drop policy if exists "org_members: owner/head_coach can manage" on org_members;
create policy "org_members: owner/head_coach can manage" on org_members for all
  using (get_user_org_role(org_id, auth.uid()) in ('owner','head_coach'));

-- ── org_invitations ───────────────────────────────────────────
drop policy if exists "invitations: org admins can manage" on org_invitations;
create policy "invitations: org admins can manage" on org_invitations for all
  using (get_user_org_role(org_id, auth.uid()) in ('owner','head_coach'));

drop policy if exists "invitations: invitee can read own" on org_invitations;
create policy "invitations: invitee can read own" on org_invitations for select
  using (
    is_platform_super_admin()
    or invited_email = (select email from profiles where id = auth.uid())
  );

-- ── org_join_requests ─────────────────────────────────────────
drop policy if exists "Users can create join requests" on org_join_requests;
create policy "Users can create join requests" on org_join_requests for insert with check (auth.uid() = user_id);

drop policy if exists "Users can read own join requests" on org_join_requests;
create policy "Users can read own join requests" on org_join_requests for select using (auth.uid() = user_id);

drop policy if exists "Org staff can read join requests" on org_join_requests;
create policy "Org staff can read join requests" on org_join_requests for select
  using (exists (select 1 from org_members om where om.org_id = org_join_requests.org_id
    and om.user_id = auth.uid() and om.org_role in ('owner','head_coach','coach') and om.status = 'active'));

drop policy if exists "Org staff can update join requests" on org_join_requests;
create policy "Org staff can update join requests" on org_join_requests for update
  using (exists (select 1 from org_members om where om.org_id = org_join_requests.org_id
    and om.user_id = auth.uid() and om.org_role in ('owner','head_coach','coach') and om.status = 'active'));

drop policy if exists "Users can retract own pending requests" on org_join_requests;
create policy "Users can retract own pending requests" on org_join_requests for delete
  using (auth.uid() = user_id and status = 'pending');

-- ── staff_athlete_assignments ─────────────────────────────────
drop policy if exists "assignments: org admins can manage" on staff_athlete_assignments;
create policy "assignments: org admins can manage" on staff_athlete_assignments for all
  using (get_user_org_role(org_id, auth.uid()) in ('owner','head_coach'));

drop policy if exists "assignments: staff can read own" on staff_athlete_assignments;
create policy "assignments: staff can read own" on staff_athlete_assignments for select
  using (staff_id = auth.uid() or athlete_id = auth.uid());

-- ── training_groups / group_members ───────────────────────────
drop policy if exists "training_groups: org members can read" on training_groups;
create policy "training_groups: org members can read" on training_groups for select
  using (exists (select 1 from org_members where org_id = training_groups.org_id and user_id = auth.uid()));

drop policy if exists "training_groups: coaches can manage" on training_groups;
create policy "training_groups: coaches can manage" on training_groups for all
  using (get_user_org_role(org_id, auth.uid()) in ('owner','head_coach','coach'));

drop policy if exists "group_members: org members can read" on group_members;
create policy "group_members: org members can read" on group_members for select
  using (exists (select 1 from training_groups tg join org_members om on om.org_id = tg.org_id
    where tg.id = group_members.group_id and om.user_id = auth.uid()));

drop policy if exists "group_members: coaches can manage" on group_members;
create policy "group_members: coaches can manage" on group_members for all
  using (exists (select 1 from training_groups tg
    where tg.id = group_members.group_id
      and get_user_org_role(tg.org_id, auth.uid()) in ('owner','head_coach','coach')));

-- ── exercises ─────────────────────────────────────────────────
drop policy if exists "exercises: global or org member can read" on exercises;
drop policy if exists "exercises_select_global" on exercises;
drop policy if exists "exercises_select_org" on exercises;
drop policy if exists "exercises: coaches can manage org exercises" on exercises;
drop policy if exists "exercises_insert_staff" on exercises;
drop policy if exists "exercises_update_staff" on exercises;
drop policy if exists "exercises_delete_staff" on exercises;

create policy "exercises_select_global" on exercises for select
  using (org_id is null or is_global = true
    or exists (select 1 from org_members om where om.org_id = exercises.org_id
      and om.user_id = auth.uid() and om.status = 'active'));

create policy "exercises_insert_staff" on exercises for insert
  with check (created_by = auth.uid()
    and (org_id is null or exists (select 1 from org_members om where om.org_id = exercises.org_id
      and om.user_id = auth.uid() and om.org_role in ('owner','head_coach','coach') and om.status = 'active')));

create policy "exercises_update_staff" on exercises for update
  using (created_by = auth.uid()
    or exists (select 1 from org_members om where om.org_id = exercises.org_id
      and om.user_id = auth.uid() and om.org_role in ('owner','head_coach') and om.status = 'active'));

create policy "exercises_delete_staff" on exercises for delete
  using (created_by = auth.uid()
    or exists (select 1 from org_members om where om.org_id = exercises.org_id
      and om.user_id = auth.uid() and om.org_role in ('owner','head_coach') and om.status = 'active'));

-- ── program_templates ─────────────────────────────────────────
drop policy if exists "program_templates: org members can read" on program_templates;
drop policy if exists "program_templates_select" on program_templates;
drop policy if exists "program_templates: coaches can manage" on program_templates;
drop policy if exists "program_templates_insert" on program_templates;
drop policy if exists "program_templates_update" on program_templates;
drop policy if exists "program_templates_delete" on program_templates;

create policy "program_templates_select" on program_templates for select
  using (is_public = true or created_by = auth.uid()
    or exists (select 1 from org_members om where om.org_id = program_templates.org_id
      and om.user_id = auth.uid() and om.status = 'active'));

create policy "program_templates_insert" on program_templates for insert
  with check (created_by = auth.uid()
    and exists (select 1 from org_members om where om.org_id = program_templates.org_id
      and om.user_id = auth.uid() and om.org_role in ('owner','head_coach','coach') and om.status = 'active'));

create policy "program_templates_update" on program_templates for update
  using (created_by = auth.uid()
    or exists (select 1 from org_members om where om.org_id = program_templates.org_id
      and om.user_id = auth.uid() and om.org_role in ('owner','head_coach') and om.status = 'active'));

create policy "program_templates_delete" on program_templates for delete
  using (created_by = auth.uid()
    or exists (select 1 from org_members om where om.org_id = program_templates.org_id
      and om.user_id = auth.uid() and om.org_role in ('owner','head_coach') and om.status = 'active'));

-- ── program_template_weeks ────────────────────────────────────
drop policy if exists "program_template_weeks_select" on program_template_weeks;
drop policy if exists "program_template_weeks_insert" on program_template_weeks;
drop policy if exists "program_template_weeks_update" on program_template_weeks;
drop policy if exists "program_template_weeks_delete" on program_template_weeks;

create policy "program_template_weeks_select" on program_template_weeks for select
  using (exists (select 1 from program_templates pt where pt.id = program_template_weeks.template_id
    and (pt.is_public = true or pt.created_by = auth.uid()
      or exists (select 1 from org_members om where om.org_id = pt.org_id and om.user_id = auth.uid() and om.status = 'active'))));

create policy "program_template_weeks_insert" on program_template_weeks for insert
  with check (exists (select 1 from program_templates pt
    join org_members om on om.org_id = pt.org_id and om.user_id = auth.uid()
      and om.org_role in ('owner','head_coach','coach') and om.status = 'active'
    where pt.id = program_template_weeks.template_id));

create policy "program_template_weeks_update" on program_template_weeks for update
  using (exists (select 1 from program_templates pt
    join org_members om on om.org_id = pt.org_id and om.user_id = auth.uid()
      and om.org_role in ('owner','head_coach','coach') and om.status = 'active'
    where pt.id = program_template_weeks.template_id));

create policy "program_template_weeks_delete" on program_template_weeks for delete
  using (exists (select 1 from program_templates pt
    join org_members om on om.org_id = pt.org_id and om.user_id = auth.uid()
      and om.org_role in ('owner','head_coach','coach') and om.status = 'active'
    where pt.id = program_template_weeks.template_id));

-- ── workout_templates ─────────────────────────────────────────
drop policy if exists "workout_templates_select" on workout_templates;
drop policy if exists "workout_templates_insert" on workout_templates;
drop policy if exists "workout_templates_update" on workout_templates;
drop policy if exists "workout_templates_delete" on workout_templates;

create policy "workout_templates_select" on workout_templates for select
  using (exists (select 1 from program_templates pt where pt.id = workout_templates.template_id
    and (pt.is_public = true or pt.created_by = auth.uid()
      or exists (select 1 from org_members om where om.org_id = pt.org_id and om.user_id = auth.uid() and om.status = 'active'))));

create policy "workout_templates_insert" on workout_templates for insert
  with check (exists (select 1 from program_templates pt
    join org_members om on om.org_id = pt.org_id and om.user_id = auth.uid()
      and om.org_role in ('owner','head_coach','coach') and om.status = 'active'
    where pt.id = workout_templates.template_id));

create policy "workout_templates_update" on workout_templates for update
  using (exists (select 1 from program_templates pt
    join org_members om on om.org_id = pt.org_id and om.user_id = auth.uid()
      and om.org_role in ('owner','head_coach','coach') and om.status = 'active'
    where pt.id = workout_templates.template_id));

create policy "workout_templates_delete" on workout_templates for delete
  using (exists (select 1 from program_templates pt
    join org_members om on om.org_id = pt.org_id and om.user_id = auth.uid()
      and om.org_role in ('owner','head_coach','coach') and om.status = 'active'
    where pt.id = workout_templates.template_id));

-- ── workout_template_exercises ────────────────────────────────
drop policy if exists "workout_template_exercises_select" on workout_template_exercises;
drop policy if exists "workout_template_exercises_insert" on workout_template_exercises;
drop policy if exists "workout_template_exercises_update" on workout_template_exercises;
drop policy if exists "workout_template_exercises_delete" on workout_template_exercises;

create policy "workout_template_exercises_select" on workout_template_exercises for select
  using (exists (select 1 from workout_templates wt
    join program_templates pt on pt.id = wt.template_id
    where wt.id = workout_template_exercises.workout_template_id
      and (pt.is_public = true or pt.created_by = auth.uid()
        or exists (select 1 from org_members om where om.org_id = pt.org_id and om.user_id = auth.uid() and om.status = 'active'))));

create policy "workout_template_exercises_insert" on workout_template_exercises for insert
  with check (exists (select 1 from workout_templates wt
    join program_templates pt on pt.id = wt.template_id
    join org_members om on om.org_id = pt.org_id and om.user_id = auth.uid()
      and om.org_role in ('owner','head_coach','coach') and om.status = 'active'
    where wt.id = workout_template_exercises.workout_template_id));

create policy "workout_template_exercises_update" on workout_template_exercises for update
  using (exists (select 1 from workout_templates wt
    join program_templates pt on pt.id = wt.template_id
    join org_members om on om.org_id = pt.org_id and om.user_id = auth.uid()
      and om.org_role in ('owner','head_coach','coach') and om.status = 'active'
    where wt.id = workout_template_exercises.workout_template_id));

create policy "workout_template_exercises_delete" on workout_template_exercises for delete
  using (exists (select 1 from workout_templates wt
    join program_templates pt on pt.id = wt.template_id
    join org_members om on om.org_id = pt.org_id and om.user_id = auth.uid()
      and om.org_role in ('owner','head_coach','coach') and om.status = 'active'
    where wt.id = workout_template_exercises.workout_template_id));

-- ── program_instances ─────────────────────────────────────────
drop policy if exists "program_instances: athlete reads own" on program_instances;
create policy "program_instances: athlete reads own" on program_instances for select
  using (auth.uid() = athlete_id);

drop policy if exists "program_instances: coaches can read assigned" on program_instances;
create policy "program_instances: coaches can read assigned" on program_instances for select
  using (exists (select 1 from staff_athlete_assignments saa
    where saa.athlete_id = program_instances.athlete_id and saa.staff_id = auth.uid() and saa.can_edit_workouts = true));

drop policy if exists "program_instances: coaches can insert" on program_instances;
create policy "program_instances: coaches can insert" on program_instances for insert
  with check (exists (select 1 from staff_athlete_assignments saa
    where saa.athlete_id = program_instances.athlete_id and saa.staff_id = auth.uid() and saa.can_edit_workouts = true)
  or exists (select 1 from org_members om
    join program_templates pt on pt.org_id = om.org_id
    where pt.id = program_instances.template_id and om.user_id = auth.uid()
      and om.org_role in ('owner','head_coach','coach') and om.status = 'active'));

drop policy if exists "program_instances: coaches can update" on program_instances;
create policy "program_instances: coaches can update" on program_instances for update
  using (exists (select 1 from staff_athlete_assignments saa
    where saa.athlete_id = program_instances.athlete_id and saa.staff_id = auth.uid() and saa.can_edit_workouts = true)
  or exists (select 1 from org_members om
    join program_templates pt on pt.org_id = om.org_id
    where pt.id = program_instances.template_id and om.user_id = auth.uid()
      and om.org_role in ('owner','head_coach','coach') and om.status = 'active'));

drop policy if exists "program_instances: coaches can delete" on program_instances;
create policy "program_instances: coaches can delete" on program_instances for delete
  using (exists (select 1 from staff_athlete_assignments saa
    where saa.athlete_id = program_instances.athlete_id and saa.staff_id = auth.uid() and saa.can_edit_workouts = true)
  or exists (select 1 from org_members om
    join program_templates pt on pt.org_id = om.org_id
    where pt.id = program_instances.template_id and om.user_id = auth.uid()
      and om.org_role in ('owner','head_coach','coach') and om.status = 'active'));

-- ── workout_sessions ──────────────────────────────────────────
drop policy if exists "workout_sessions: athlete sees own" on workout_sessions;
create policy "workout_sessions: athlete sees own" on workout_sessions for select
  using (auth.uid() = athlete_id);

drop policy if exists "workout_sessions: assigned staff can read" on workout_sessions;
create policy "workout_sessions: assigned staff can read" on workout_sessions for select
  using (exists (select 1 from staff_athlete_assignments saa
    where saa.athlete_id = workout_sessions.athlete_id and saa.staff_id = auth.uid() and saa.can_view_workouts = true));

drop policy if exists "workout_sessions: athlete can insert/update own" on workout_sessions;
create policy "workout_sessions: athlete can insert/update own" on workout_sessions for insert
  with check (auth.uid() = athlete_id);

drop policy if exists "workout_sessions: athlete can update own" on workout_sessions;
create policy "workout_sessions: athlete can update own" on workout_sessions for update
  using (auth.uid() = athlete_id);

drop policy if exists "workout_sessions: athlete can delete own" on workout_sessions;
create policy "workout_sessions: athlete can delete own" on workout_sessions for delete
  using (auth.uid() = athlete_id);

-- ── workout_sets ──────────────────────────────────────────────
drop policy if exists "workout_sets: athlete sees own" on workout_sets;
create policy "workout_sets: athlete sees own" on workout_sets for select
  using (exists (select 1 from workout_sessions ws where ws.id = workout_sets.session_id and ws.athlete_id = auth.uid()));

drop policy if exists "workout_sets: assigned staff can read" on workout_sets;
create policy "workout_sets: assigned staff can read" on workout_sets for select
  using (exists (select 1 from workout_sessions ws
    join staff_athlete_assignments saa on saa.athlete_id = ws.athlete_id
    where ws.id = workout_sets.session_id and saa.staff_id = auth.uid() and saa.can_view_workouts = true));

drop policy if exists "workout_sets: athlete can insert own" on workout_sets;
create policy "workout_sets: athlete can insert own" on workout_sets for insert
  with check (exists (select 1 from workout_sessions ws where ws.id = workout_sets.session_id and ws.athlete_id = auth.uid()));

drop policy if exists "workout_sets: athlete can update own" on workout_sets;
create policy "workout_sets: athlete can update own" on workout_sets for update
  using (exists (select 1 from workout_sessions ws where ws.id = workout_sets.session_id and ws.athlete_id = auth.uid()));

drop policy if exists "workout_sets: athlete can delete own" on workout_sets;
create policy "workout_sets: athlete can delete own" on workout_sets for delete
  using (exists (select 1 from workout_sessions ws where ws.id = workout_sets.session_id and ws.athlete_id = auth.uid()));

-- ── personal_records ──────────────────────────────────────────
drop policy if exists "prs: athlete sees own" on personal_records;
create policy "prs: athlete sees own" on personal_records for select using (auth.uid() = athlete_id);

drop policy if exists "prs: assigned staff can read" on personal_records;
create policy "prs: assigned staff can read" on personal_records for select
  using (exists (select 1 from staff_athlete_assignments saa
    where saa.athlete_id = personal_records.athlete_id and saa.staff_id = auth.uid() and saa.can_view_workouts = true));

drop policy if exists "prs: athlete can insert own" on personal_records;
create policy "prs: athlete can insert own" on personal_records for insert with check (auth.uid() = athlete_id);

drop policy if exists "prs: athlete can update own" on personal_records;
create policy "prs: athlete can update own" on personal_records for update using (auth.uid() = athlete_id);

drop policy if exists "prs: athlete can delete own" on personal_records;
create policy "prs: athlete can delete own" on personal_records for delete using (auth.uid() = athlete_id);

-- ── daily_checkins ────────────────────────────────────────────
drop policy if exists "checkins: athlete sees own" on daily_checkins;
create policy "checkins: athlete sees own" on daily_checkins for select using (auth.uid() = athlete_id);

drop policy if exists "checkins: assigned staff can read" on daily_checkins;
create policy "checkins: assigned staff can read" on daily_checkins for select
  using (exists (select 1 from staff_athlete_assignments saa
    where saa.athlete_id = daily_checkins.athlete_id and saa.staff_id = auth.uid() and saa.can_view_checkins = true));

drop policy if exists "checkins: athlete can insert own" on daily_checkins;
create policy "checkins: athlete can insert own" on daily_checkins for insert with check (auth.uid() = athlete_id);

drop policy if exists "checkins: athlete can update own" on daily_checkins;
create policy "checkins: athlete can update own" on daily_checkins for update using (auth.uid() = athlete_id);

drop policy if exists "checkins: athlete can delete own" on daily_checkins;
create policy "checkins: athlete can delete own" on daily_checkins for delete using (auth.uid() = athlete_id);

-- ── training_blocks ───────────────────────────────────────────
drop policy if exists "training_blocks: org members read org templates" on training_blocks;
drop policy if exists "training_blocks: athlete reads own" on training_blocks;
drop policy if exists "training_blocks: coaches manage" on training_blocks;
drop policy if exists "training_blocks: org members read" on training_blocks;

create policy "training_blocks: coaches manage" on training_blocks for all
  using (exists (select 1 from org_members where org_id = training_blocks.org_id
    and user_id = auth.uid() and org_role in ('owner','head_coach','coach')))
  with check (exists (select 1 from org_members where org_id = training_blocks.org_id
    and user_id = auth.uid() and org_role in ('owner','head_coach','coach')));

create policy "training_blocks: org members read" on training_blocks for select
  using (exists (select 1 from org_members where org_id = training_blocks.org_id and user_id = auth.uid()));

create policy "training_blocks: athlete reads own" on training_blocks for select
  using (athlete_id = auth.uid());

drop policy if exists "training_blocks: athlete manages own personal" on training_blocks;
create policy "training_blocks: athlete manages own personal" on training_blocks for all
  using (org_id is null and athlete_id = auth.uid())
  with check (org_id is null and athlete_id = auth.uid());

-- ── goals ─────────────────────────────────────────────────────
drop policy if exists "goals: athlete sees own" on goals;
create policy "goals: athlete sees own" on goals for select using (auth.uid() = athlete_id);

drop policy if exists "goals: assigned staff can read" on goals;
create policy "goals: assigned staff can read" on goals for select
  using (exists (select 1 from staff_athlete_assignments saa
    where saa.athlete_id = goals.athlete_id and saa.staff_id = auth.uid()));

drop policy if exists "goals: athlete can insert own" on goals;
create policy "goals: athlete can insert own" on goals for insert with check (auth.uid() = athlete_id);

drop policy if exists "goals: athlete or staff can update" on goals;
create policy "goals: athlete or staff can update" on goals for update
  using (auth.uid() = athlete_id
    or exists (select 1 from staff_athlete_assignments saa where saa.athlete_id = goals.athlete_id and saa.staff_id = auth.uid()));

drop policy if exists "goals: athlete can delete own" on goals;
create policy "goals: athlete can delete own" on goals for delete using (auth.uid() = athlete_id);

-- ── meets ─────────────────────────────────────────────────────
drop policy if exists "meets: org members can read" on meets;
drop policy if exists "meets: coaches can manage" on meets;
drop policy if exists "meets: creator can manage own" on meets;

create policy "meets: creator can manage own" on meets for all
  using (created_by = auth.uid()) with check (created_by = auth.uid());

create policy "meets: coaches can manage" on meets for all
  using (org_id is not null and exists (select 1 from org_members
    where org_id = meets.org_id and user_id = auth.uid() and org_role in ('owner','head_coach','coach')))
  with check (org_id is not null and exists (select 1 from org_members
    where org_id = meets.org_id and user_id = auth.uid() and org_role in ('owner','head_coach','coach')));

create policy "meets: org members can read" on meets for select
  using (org_id is null
    or exists (select 1 from org_members where org_id = meets.org_id and user_id = auth.uid()));

-- ── athlete_meet_entries ──────────────────────────────────────
drop policy if exists "meet_entries: athlete sees own" on athlete_meet_entries;
drop policy if exists "meet_entries: org members can read" on athlete_meet_entries;
drop policy if exists "meet_entries: athlete manages own" on athlete_meet_entries;
drop policy if exists "meet_entries: coaches read" on athlete_meet_entries;

create policy "meet_entries: athlete manages own" on athlete_meet_entries for all
  using (athlete_id = auth.uid()) with check (athlete_id = auth.uid());

create policy "meet_entries: coaches read" on athlete_meet_entries for select
  using (exists (select 1 from meets m join org_members om on om.org_id = m.org_id
    where m.id = athlete_meet_entries.meet_id and om.user_id = auth.uid()
      and om.org_role in ('owner','head_coach','coach')));

-- ── nutrition_plans ───────────────────────────────────────────
drop policy if exists "nutrition_plans: athlete sees own" on nutrition_plans;
create policy "nutrition_plans: athlete sees own" on nutrition_plans for select
  using (auth.uid() = athlete_id);

drop policy if exists "nutrition_plans: staff with view nutrition can read" on nutrition_plans;
create policy "nutrition_plans: staff with view nutrition can read" on nutrition_plans for select
  using (exists (select 1 from staff_athlete_assignments saa
    where saa.athlete_id = nutrition_plans.athlete_id and saa.staff_id = auth.uid() and saa.can_view_nutrition = true));

drop policy if exists "nutrition_plans: athlete can insert own" on nutrition_plans;
create policy "nutrition_plans: athlete can insert own" on nutrition_plans for insert
  with check (auth.uid() = athlete_id);

drop policy if exists "nutrition_plans: athlete or authorized staff can update" on nutrition_plans;
create policy "nutrition_plans: athlete or authorized staff can update" on nutrition_plans for update
  using (auth.uid() = athlete_id
    or exists (select 1 from staff_athlete_assignments saa
      where saa.athlete_id = nutrition_plans.athlete_id and saa.staff_id = auth.uid() and saa.can_edit_nutrition = true));

drop policy if exists "nutrition_plans: athlete can delete own" on nutrition_plans;
create policy "nutrition_plans: athlete can delete own" on nutrition_plans for delete using (auth.uid() = athlete_id);

-- ── nutrition_logs ────────────────────────────────────────────
drop policy if exists "nutrition_logs: athlete sees own" on nutrition_logs;
create policy "nutrition_logs: athlete sees own" on nutrition_logs for select using (auth.uid() = athlete_id);

drop policy if exists "nutrition_logs: staff with view nutrition" on nutrition_logs;
create policy "nutrition_logs: staff with view nutrition" on nutrition_logs for select
  using (exists (select 1 from staff_athlete_assignments saa
    where saa.athlete_id = nutrition_logs.athlete_id and saa.staff_id = auth.uid() and saa.can_view_nutrition = true));

drop policy if exists "nutrition_logs: athlete can insert own" on nutrition_logs;
create policy "nutrition_logs: athlete can insert own" on nutrition_logs for insert
  with check (auth.uid() = athlete_id);

drop policy if exists "nutrition_logs: athlete can update own" on nutrition_logs;
create policy "nutrition_logs: athlete can update own" on nutrition_logs for update using (auth.uid() = athlete_id);

drop policy if exists "nutrition_logs: athlete can delete own" on nutrition_logs;
create policy "nutrition_logs: athlete can delete own" on nutrition_logs for delete using (auth.uid() = athlete_id);

-- ── supplement_stacks / items / logs ──────────────────────────
drop policy if exists "supplement_stacks: athlete sees own" on supplement_stacks;
create policy "supplement_stacks: athlete sees own" on supplement_stacks for select using (auth.uid() = athlete_id);

drop policy if exists "supplement_stacks: staff with view supplement" on supplement_stacks;
create policy "supplement_stacks: staff with view supplement" on supplement_stacks for select
  using (exists (select 1 from staff_athlete_assignments saa
    where saa.athlete_id = supplement_stacks.athlete_id and saa.staff_id = auth.uid() and saa.can_view_nutrition = true));

drop policy if exists "supplement_stacks: athlete can insert own" on supplement_stacks;
create policy "supplement_stacks: athlete can insert own" on supplement_stacks for insert with check (auth.uid() = athlete_id);

drop policy if exists "supplement_stacks: athlete can update own" on supplement_stacks;
create policy "supplement_stacks: athlete can update own" on supplement_stacks for update using (auth.uid() = athlete_id);

drop policy if exists "supplement_stacks: athlete can delete own" on supplement_stacks;
create policy "supplement_stacks: athlete can delete own" on supplement_stacks for delete using (auth.uid() = athlete_id);

drop policy if exists "supplement_stack_items: readable via stack owner" on supplement_stack_items;
create policy "supplement_stack_items: readable via stack owner" on supplement_stack_items for select
  using (exists (select 1 from supplement_stacks ss where ss.id = supplement_stack_items.stack_id
    and (ss.athlete_id = auth.uid()
      or exists (select 1 from staff_athlete_assignments saa where saa.athlete_id = ss.athlete_id
        and saa.staff_id = auth.uid() and saa.can_view_nutrition = true))));

drop policy if exists "supplement_stack_items: athlete can manage own" on supplement_stack_items;
create policy "supplement_stack_items: athlete can manage own" on supplement_stack_items for all
  using (exists (select 1 from supplement_stacks ss where ss.id = supplement_stack_items.stack_id and ss.athlete_id = auth.uid()));

drop policy if exists "supplement_logs: athlete sees own" on supplement_logs;
create policy "supplement_logs: athlete sees own" on supplement_logs for select using (auth.uid() = athlete_id);

drop policy if exists "supplement_logs: staff with view nutrition" on supplement_logs;
create policy "supplement_logs: staff with view nutrition" on supplement_logs for select
  using (exists (select 1 from staff_athlete_assignments saa
    where saa.athlete_id = supplement_logs.athlete_id and saa.staff_id = auth.uid() and saa.can_view_nutrition = true));

drop policy if exists "supplement_logs: athlete can insert own" on supplement_logs;
create policy "supplement_logs: athlete can insert own" on supplement_logs for insert with check (auth.uid() = athlete_id);

drop policy if exists "supplement_logs: athlete can update own" on supplement_logs;
create policy "supplement_logs: athlete can update own" on supplement_logs for update using (auth.uid() = athlete_id);

drop policy if exists "supplement_logs: athlete can delete own" on supplement_logs;
create policy "supplement_logs: athlete can delete own" on supplement_logs for delete using (auth.uid() = athlete_id);

-- ── meal_prep_recipes ─────────────────────────────────────────
drop policy if exists "meal_prep_recipes: org template readable by members" on meal_prep_recipes;
create policy "meal_prep_recipes: org template readable by members" on meal_prep_recipes for select
  using (is_org_template = true
    and exists (select 1 from org_members where org_id = meal_prep_recipes.org_id and user_id = auth.uid()));

drop policy if exists "meal_prep_recipes: personal readable by owner" on meal_prep_recipes;
create policy "meal_prep_recipes: personal readable by owner" on meal_prep_recipes for select
  using (is_org_template = false and created_by = auth.uid());

drop policy if exists "meal_prep_recipes: nutritionist/head_coach can manage org templates" on meal_prep_recipes;
create policy "meal_prep_recipes: nutritionist/head_coach can manage org templates" on meal_prep_recipes for all
  using (is_org_template = true
    and get_user_org_role(org_id, auth.uid()) in ('owner','head_coach','nutritionist'));

drop policy if exists "meal_prep_recipes: athlete can manage personal" on meal_prep_recipes;
create policy "meal_prep_recipes: athlete can manage personal" on meal_prep_recipes for all
  using (is_org_template = false and created_by = auth.uid())
  with check (is_org_template = false and created_by = auth.uid());

-- ── meal_prep_sessions / items ────────────────────────────────
drop policy if exists "meal_prep_sessions: athlete sees own" on meal_prep_sessions;
create policy "meal_prep_sessions: athlete sees own" on meal_prep_sessions for select
  using (auth.uid() = athlete_id);

drop policy if exists "meal_prep_sessions: staff with create_meal_prep" on meal_prep_sessions;
create policy "meal_prep_sessions: staff with create_meal_prep" on meal_prep_sessions for select
  using (created_by = auth.uid()
    or exists (select 1 from staff_athlete_assignments saa
      where saa.athlete_id = meal_prep_sessions.athlete_id and saa.staff_id = auth.uid() and saa.can_create_meal_prep = true));

drop policy if exists "meal_prep_sessions: athlete can insert own" on meal_prep_sessions;
create policy "meal_prep_sessions: athlete can insert own" on meal_prep_sessions for insert
  with check (auth.uid() = athlete_id
    or exists (select 1 from staff_athlete_assignments saa
      where saa.athlete_id = meal_prep_sessions.athlete_id and saa.staff_id = auth.uid() and saa.can_create_meal_prep = true));

drop policy if exists "meal_prep_sessions: athlete or staff can update" on meal_prep_sessions;
create policy "meal_prep_sessions: athlete or staff can update" on meal_prep_sessions for update
  using (auth.uid() = athlete_id or created_by = auth.uid());

drop policy if exists "meal_prep_sessions: athlete or staff can delete" on meal_prep_sessions;
create policy "meal_prep_sessions: athlete or staff can delete" on meal_prep_sessions for delete
  using (auth.uid() = athlete_id or created_by = auth.uid());

drop policy if exists "meal_prep_session_items: readable via session" on meal_prep_session_items;
create policy "meal_prep_session_items: readable via session" on meal_prep_session_items for select
  using (exists (select 1 from meal_prep_sessions mps where mps.id = meal_prep_session_items.session_id
    and (mps.athlete_id = auth.uid() or mps.created_by = auth.uid()
      or exists (select 1 from staff_athlete_assignments saa where saa.athlete_id = mps.athlete_id
        and saa.staff_id = auth.uid() and saa.can_view_nutrition = true))));

drop policy if exists "meal_prep_session_items: athlete or staff can manage" on meal_prep_session_items;
create policy "meal_prep_session_items: athlete or staff can manage" on meal_prep_session_items for all
  using (exists (select 1 from meal_prep_sessions mps where mps.id = meal_prep_session_items.session_id
    and (mps.athlete_id = auth.uid() or mps.created_by = auth.uid())));

-- ── shopping_lists / categories / items ───────────────────────
drop policy if exists "shopping_lists: athlete sees own" on shopping_lists;
create policy "shopping_lists: athlete sees own" on shopping_lists for select using (auth.uid() = athlete_id);

drop policy if exists "shopping_lists: staff with edit_shopping_list" on shopping_lists;
create policy "shopping_lists: staff with edit_shopping_list" on shopping_lists for select
  using (created_by = auth.uid()
    or exists (select 1 from staff_athlete_assignments saa
      where saa.athlete_id = shopping_lists.athlete_id and saa.staff_id = auth.uid() and saa.can_edit_shopping_list = true));

drop policy if exists "shopping_lists: athlete or authorized staff can update" on shopping_lists;
create policy "shopping_lists: athlete or authorized staff can update" on shopping_lists for update
  using (auth.uid() = athlete_id
    or exists (select 1 from staff_athlete_assignments saa
      where saa.athlete_id = shopping_lists.athlete_id and saa.staff_id = auth.uid() and saa.can_edit_shopping_list = true));

drop policy if exists "shopping_lists: athlete can insert own" on shopping_lists;
create policy "shopping_lists: athlete can insert own" on shopping_lists for insert
  with check (auth.uid() = athlete_id
    or exists (select 1 from staff_athlete_assignments saa
      where saa.athlete_id = shopping_lists.athlete_id and saa.staff_id = auth.uid() and saa.can_edit_shopping_list = true));

drop policy if exists "shopping_lists: athlete or staff can delete" on shopping_lists;
create policy "shopping_lists: athlete or staff can delete" on shopping_lists for delete
  using (auth.uid() = athlete_id or created_by = auth.uid());

drop policy if exists "shopping_list_categories: readable via list access" on shopping_list_categories;
create policy "shopping_list_categories: readable via list access" on shopping_list_categories for select
  using (exists (select 1 from shopping_lists sl where sl.id = shopping_list_categories.list_id
    and (sl.athlete_id = auth.uid() or sl.created_by = auth.uid()
      or exists (select 1 from staff_athlete_assignments saa where saa.athlete_id = sl.athlete_id
        and saa.staff_id = auth.uid() and saa.can_edit_shopping_list = true))));

drop policy if exists "shopping_list_categories: athlete or staff can manage" on shopping_list_categories;
create policy "shopping_list_categories: athlete or staff can manage" on shopping_list_categories for all
  using (exists (select 1 from shopping_lists sl where sl.id = shopping_list_categories.list_id
    and (sl.athlete_id = auth.uid() or sl.created_by = auth.uid()
      or exists (select 1 from staff_athlete_assignments saa where saa.athlete_id = sl.athlete_id
        and saa.staff_id = auth.uid() and saa.can_edit_shopping_list = true))));

drop policy if exists "shopping_list_items: readable via list access" on shopping_list_items;
create policy "shopping_list_items: readable via list access" on shopping_list_items for select
  using (exists (select 1 from shopping_lists sl where sl.id = shopping_list_items.list_id
    and (sl.athlete_id = auth.uid() or sl.created_by = auth.uid()
      or exists (select 1 from staff_athlete_assignments saa where saa.athlete_id = sl.athlete_id
        and saa.staff_id = auth.uid() and saa.can_edit_shopping_list = true))));

drop policy if exists "shopping_list_items: athlete or staff can manage" on shopping_list_items;
create policy "shopping_list_items: athlete or staff can manage" on shopping_list_items for all
  using (exists (select 1 from shopping_lists sl where sl.id = shopping_list_items.list_id
    and (sl.athlete_id = auth.uid() or sl.created_by = auth.uid()
      or exists (select 1 from staff_athlete_assignments saa where saa.athlete_id = sl.athlete_id
        and saa.staff_id = auth.uid() and saa.can_edit_shopping_list = true))));

-- ── channels ──────────────────────────────────────────────────
drop policy if exists "channels: org members can read" on channels;
create policy "channels: org members can read" on channels for select
  using (exists (select 1 from org_members where org_id = channels.org_id and user_id = auth.uid()));

drop policy if exists "channels: org staff can insert" on channels;
create policy "channels: org staff can insert" on channels for insert
  with check (
    exists (select 1 from org_members where org_id = channels.org_id and user_id = auth.uid()
      and org_role in ('owner','head_coach','coach','nutritionist','analyst'))
    or (channel_type in ('dm','group')
      and exists (select 1 from org_members where org_id = channels.org_id and user_id = auth.uid())));

drop policy if exists "channels: creator or admin can update" on channels;
create policy "channels: creator or admin can update" on channels for update
  using (created_by = auth.uid()
    or exists (select 1 from org_members where org_id = channels.org_id
      and user_id = auth.uid() and org_role in ('owner','head_coach')));

drop policy if exists "channels: creator or admin can delete" on channels;
create policy "channels: creator or admin can delete" on channels for delete
  using (created_by = auth.uid()
    or exists (select 1 from org_members where org_id = channels.org_id
      and user_id = auth.uid() and org_role in ('owner','head_coach')));

-- ── channel_members ───────────────────────────────────────────
drop policy if exists "channel_members: members can read own channel memberships" on channel_members;
create policy "channel_members: members can read own channel memberships" on channel_members for select
  using (user_id = auth.uid()
    or exists (select 1 from channels ch join org_members om on om.org_id = ch.org_id
      where ch.id = channel_members.channel_id and om.user_id = auth.uid()));

drop policy if exists "channel_members: org members can insert" on channel_members;
create policy "channel_members: org members can insert" on channel_members for insert
  with check (exists (select 1 from channels ch join org_members om on om.org_id = ch.org_id
    where ch.id = channel_members.channel_id and om.user_id = auth.uid()));

drop policy if exists "channel_members: can update own last_read_at" on channel_members;
create policy "channel_members: can update own last_read_at" on channel_members for update
  using (user_id = auth.uid());

drop policy if exists "channel_members: can delete" on channel_members;
create policy "channel_members: can delete" on channel_members for delete
  using (user_id = auth.uid()
    or exists (select 1 from channels ch join org_members om on om.org_id = ch.org_id
      where ch.id = channel_members.channel_id and om.user_id = auth.uid() and om.org_role in ('owner','head_coach')));

-- ── messages ──────────────────────────────────────────────────
drop policy if exists "messages: channel members can read" on messages;
create policy "messages: channel members can read" on messages for select
  using (exists (select 1 from channel_members where channel_id = messages.channel_id and user_id = auth.uid()));

drop policy if exists "messages: channel members can insert" on messages;
create policy "messages: channel members can insert" on messages for insert
  with check (exists (select 1 from channel_members where channel_id = messages.channel_id and user_id = auth.uid()));

drop policy if exists "messages: sender can update own" on messages;
create policy "messages: sender can update own" on messages for update using (sender_id = auth.uid());

drop policy if exists "messages: sender or admin can delete" on messages;
create policy "messages: sender or admin can delete" on messages for delete
  using (sender_id = auth.uid()
    or exists (select 1 from channel_members cm
      join channels ch on ch.id = cm.channel_id
      join org_members om on om.org_id = ch.org_id
      where cm.channel_id = messages.channel_id and om.user_id = auth.uid() and om.org_role in ('owner','head_coach')));

-- ── message_reactions ─────────────────────────────────────────
drop policy if exists "message_reactions: channel members can manage" on message_reactions;
create policy "message_reactions: channel members can manage" on message_reactions for all
  using (user_id = auth.uid()
    and exists (select 1 from channel_members cm join messages m on m.channel_id = cm.channel_id
      where m.id = message_reactions.message_id and cm.user_id = auth.uid()));

-- ── events ────────────────────────────────────────────────────
drop policy if exists "events: org members can read" on events;
create policy "events: org members can read" on events for select
  using (exists (select 1 from org_members where org_id = events.org_id and user_id = auth.uid())
    or auth.uid() = any(attendee_ids));

drop policy if exists "events: coaches can manage" on events;
create policy "events: coaches can manage" on events for all
  using (get_user_org_role(org_id, auth.uid()) in ('owner','head_coach','coach'));

drop policy if exists "events: athlete can insert own personal" on events;
create policy "events: athlete can insert own personal" on events for insert
  with check (exists (select 1 from org_members where org_id = events.org_id and user_id = auth.uid()));

drop policy if exists "events: athlete can update own" on events;
create policy "events: athlete can update own" on events for update
  using (created_by = auth.uid());

drop policy if exists "events: creator or admin can delete" on events;
create policy "events: creator or admin can delete" on events for delete
  using (created_by = auth.uid()
    or get_user_org_role(org_id, auth.uid()) in ('owner','head_coach','coach'));

-- ── resources ─────────────────────────────────────────────────
drop policy if exists "resources: org members can read published" on resources;
create policy "resources: org members can read published" on resources for select
  using (is_published = true
    and exists (select 1 from org_members where org_id = resources.org_id and user_id = auth.uid()));

drop policy if exists "resources: coaches can manage" on resources;
create policy "resources: coaches can manage" on resources for all
  using (get_user_org_role(org_id, auth.uid()) in ('owner','head_coach','coach'));

-- ── announcements ─────────────────────────────────────────────
drop policy if exists "announcements: org members can read" on announcements;
create policy "announcements: org members can read" on announcements for select
  using (exists (select 1 from org_members where org_id = announcements.org_id and user_id = auth.uid()));

drop policy if exists "announcements: coaches can manage" on announcements;
create policy "announcements: coaches can manage" on announcements for all
  using (get_user_org_role(org_id, auth.uid()) in ('owner','head_coach'));

-- ── injury_logs ───────────────────────────────────────────────
drop policy if exists "injury_logs: athlete sees own" on injury_logs;
create policy "injury_logs: athlete sees own" on injury_logs for select using (auth.uid() = athlete_id);

drop policy if exists "injury_logs: assigned staff can read" on injury_logs;
create policy "injury_logs: assigned staff can read" on injury_logs for select
  using (exists (select 1 from staff_athlete_assignments saa
    where saa.athlete_id = injury_logs.athlete_id and saa.staff_id = auth.uid() and saa.can_view_checkins = true));

drop policy if exists "injury_logs: athlete can insert/update own" on injury_logs;
create policy "injury_logs: athlete can insert/update own" on injury_logs for insert
  with check (auth.uid() = athlete_id);

drop policy if exists "injury_logs: athlete can update own" on injury_logs;
create policy "injury_logs: athlete can update own" on injury_logs for update using (auth.uid() = athlete_id);

drop policy if exists "injury_logs: athlete can delete own" on injury_logs;
create policy "injury_logs: athlete can delete own" on injury_logs for delete using (auth.uid() = athlete_id);

-- ── notifications ─────────────────────────────────────────────
drop policy if exists "notifications: user sees own" on notifications;
create policy "notifications: user sees own" on notifications for select using (auth.uid() = user_id);

drop policy if exists "notifications: system can insert" on notifications;
create policy "notifications: system can insert" on notifications for insert
  with check (auth.uid() is not null);

drop policy if exists "notifications: user can update own (mark read)" on notifications;
create policy "notifications: user can update own (mark read)" on notifications for update using (auth.uid() = user_id);

drop policy if exists "notifications: user can delete own" on notifications;
create policy "notifications: user can delete own" on notifications for delete using (auth.uid() = user_id);

-- ── audit_logs ────────────────────────────────────────────────
drop policy if exists "audit_logs: super_admin only" on audit_logs;
create policy "audit_logs: super_admin only" on audit_logs for select
  using (exists (select 1 from profiles where id = auth.uid() and platform_role = 'super_admin'));

-- Any authenticated user can write audit log entries (server-side logging).
drop policy if exists "audit_logs: authenticated can insert" on audit_logs;
create policy "audit_logs: authenticated can insert" on audit_logs for insert
  with check (auth.uid() is not null);

-- ── org_public_pages ──────────────────────────────────────────
drop policy if exists "Public can read published pages" on org_public_pages;
create policy "Public can read published pages" on org_public_pages for select using (published = true);

drop policy if exists "Org admins can manage their page" on org_public_pages;
create policy "Org admins can manage their page" on org_public_pages for all
  using (org_id in (
    select org_id from org_members
    where user_id = auth.uid() and org_role in ('owner','head_coach') and status = 'active'));

-- ── leads ─────────────────────────────────────────────────────
drop policy if exists "Org staff can view and manage leads" on leads;
create policy "Org staff can view and manage leads" on leads for all
  using (org_id in (
    select org_id from org_members
    where user_id = auth.uid() and org_role in ('owner','head_coach','coach') and status = 'active'));

drop policy if exists "Anyone can submit an intake form" on leads;
create policy "Anyone can submit an intake form" on leads for insert with check (true);

-- ============================================================
-- AUTH TRIGGER — Auto-create profile on sign-up
-- ============================================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, display_name, platform_role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'user'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- ORG CREATION HELPER
-- ============================================================

create or replace function public.create_org_with_owner(
  p_user_id     uuid,
  p_name        text,
  p_slug        text,
  p_federation  text default null,
  p_timezone    text default 'UTC',
  p_weight_unit text default 'kg'
)
returns uuid as $$
declare
  v_org_id uuid;
begin
  insert into public.organizations (name, slug, federation, timezone, weight_unit, plan, status)
  values (p_name, p_slug, p_federation, p_timezone, p_weight_unit, 'starter', 'active')
  returning id into v_org_id;

  insert into public.org_members (org_id, user_id, org_role, status)
  values (v_org_id, p_user_id, 'owner', 'active');

  return v_org_id;
end;
$$ language plpgsql security definer;

-- ============================================================
-- updated_at TRIGGER
-- ============================================================

create or replace function set_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists leads_updated_at on leads;
create trigger leads_updated_at before update on leads for each row execute procedure set_updated_at();

drop trigger if exists org_public_pages_updated_at on org_public_pages;
create trigger org_public_pages_updated_at before update on org_public_pages for each row execute procedure set_updated_at();

-- ============================================================
-- ORG JOIN REQUEST RPCs
-- ============================================================

create or replace function search_orgs(p_query text, p_limit int default 10)
returns table (id uuid, name text, slug text, logo_url text, federation text, member_count bigint)
language sql security definer stable as $$
  select o.id, o.name, o.slug, o.logo_url, o.federation,
    (select count(*) from org_members om where om.org_id = o.id and om.status = 'active') as member_count
  from organizations o
  where o.status = 'active'
    and (o.name ilike '%' || p_query || '%' or o.slug ilike '%' || p_query || '%')
  order by (o.name ilike p_query) desc, member_count desc, o.name asc
  limit p_limit;
$$;

create or replace function approve_join_request(p_request_id uuid)
returns void language plpgsql security definer as $$
declare v_request org_join_requests%rowtype;
begin
  select * into v_request from org_join_requests where id = p_request_id;
  if not found then raise exception 'Join request not found'; end if;
  if not exists (select 1 from org_members where org_id = v_request.org_id and user_id = auth.uid()
    and org_role in ('owner','head_coach','coach') and status = 'active')
  then raise exception 'Not authorized'; end if;
  insert into org_members (org_id, user_id, org_role, status, invited_by, joined_at)
  values (v_request.org_id, v_request.user_id, v_request.requested_role, 'active', auth.uid(), now())
  on conflict (org_id, user_id) do update set org_role = excluded.org_role, status = 'active', joined_at = now();
  update org_join_requests set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now() where id = p_request_id;
end;
$$;

create or replace function deny_join_request(p_request_id uuid)
returns void language plpgsql security definer as $$
declare v_org_id uuid;
begin
  select org_id into v_org_id from org_join_requests where id = p_request_id;
  if not found then raise exception 'Join request not found'; end if;
  if not exists (select 1 from org_members where org_id = v_org_id and user_id = auth.uid()
    and org_role in ('owner','head_coach','coach') and status = 'active')
  then raise exception 'Not authorized'; end if;
  update org_join_requests set status = 'denied', reviewed_by = auth.uid(), reviewed_at = now() where id = p_request_id;
end;
$$;

-- ============================================================
-- MESSAGING HELPER
-- ============================================================

create or replace function find_dm_channel(p_org_id uuid, p_user_a uuid, p_user_b uuid)
returns uuid language sql stable security definer as $$
  select c.id from channels c
  where c.org_id = p_org_id and c.channel_type = 'dm'
    and exists (select 1 from channel_members where channel_id = c.id and user_id = p_user_a)
    and exists (select 1 from channel_members where channel_id = c.id and user_id = p_user_b)
  limit 1;
$$;

-- ============================================================
-- ROSTER FUNCTIONS
-- ============================================================

drop function if exists get_org_athlete_roster(uuid);

create or replace function get_org_athlete_roster(p_org_id uuid)
returns table (
  id uuid, full_name text, display_name text, avatar_url text, weight_class text, federation text,
  member_id text, equipment_type text, bio text,
  bodyweight_kg numeric, sleep_avg numeric, soreness_avg numeric, stress_avg numeric, energy_avg numeric,
  sessions_this_week integer, sessions_planned_this_week integer, rpe_avg_this_week numeric,
  last_session_date date, adherence integer, nutrition_compliance integer,
  e1rm_squat numeric, e1rm_bench numeric, e1rm_deadlift numeric,
  injury_notes text, injury_log_id uuid, current_block_id uuid, next_meet_id uuid,
  goal_ids uuid[], flags text[], check_in_trend jsonb, recent_sessions jsonb,
  nutrition_macros jsonb, coach_notes text
)
language plpgsql security definer stable as $$
declare
  v_caller_role text;
  v_week_start  date;
  v_week_end    date;
begin
  select org_role::text into v_caller_role
    from org_members where org_id = p_org_id and user_id = auth.uid() limit 1;
  if v_caller_role is null or v_caller_role not in ('owner','head_coach','coach','nutritionist','analyst') then
    raise exception 'Permission denied: not a staff member of this org';
  end if;
  v_week_start := date_trunc('week', current_date)::date;
  v_week_end   := v_week_start + 6;

  return query
  select
    p.id, p.full_name, p.display_name, p.avatar_url, p.weight_class, p.federation,
    p.member_id, p.equipment_type, p.bio,
    (select dc.bodyweight from daily_checkins dc where dc.athlete_id = p.id and dc.bodyweight is not null
      and dc.check_date >= current_date - 28 order by dc.check_date desc limit 1),
    round((select avg(dc.sleep_hours) from daily_checkins dc where dc.athlete_id = p.id
      and dc.sleep_hours is not null and dc.check_date >= current_date - 28), 1),
    round((select avg(dc.soreness_level) from daily_checkins dc where dc.athlete_id = p.id
      and dc.soreness_level is not null and dc.check_date >= current_date - 28), 1),
    round((select avg(dc.stress_level) from daily_checkins dc where dc.athlete_id = p.id
      and dc.stress_level is not null and dc.check_date >= current_date - 28), 1),
    round((select avg(dc.motivation_level) from daily_checkins dc where dc.athlete_id = p.id
      and dc.motivation_level is not null and dc.check_date >= current_date - 28), 1),
    (select count(*)::integer from workout_sessions ws where ws.athlete_id = p.id
      and ws.scheduled_date between v_week_start and v_week_end and ws.status in ('completed','in_progress')),
    greatest((select count(*)::integer from workout_sessions ws where ws.athlete_id = p.id
      and ws.scheduled_date between v_week_start and v_week_end), 0),
    round((select avg(ws.overall_rpe) from workout_sessions ws where ws.athlete_id = p.id
      and ws.scheduled_date between v_week_start and v_week_end and ws.overall_rpe is not null), 1),
    (select ws.scheduled_date from workout_sessions ws where ws.athlete_id = p.id and ws.status = 'completed'
      order by ws.scheduled_date desc limit 1),
    case
      when (select count(*) from workout_sessions ws where ws.athlete_id = p.id
        and ws.scheduled_date between v_week_start and v_week_end) = 0 then 100
      else least(100, greatest(0, round(
        (select count(*) filter (where ws.status in ('completed','in_progress'))::numeric /
               nullif(count(*),0)*100 from workout_sessions ws
         where ws.athlete_id = p.id and ws.scheduled_date between v_week_start and v_week_end))::integer))
    end,
    coalesce((select round(avg(nl.compliance_score))::integer from nutrition_logs nl
      where nl.athlete_id = p.id and nl.compliance_score is not null order by nl.log_date desc limit 7), 0),
    (select pr.weight from personal_records pr join exercises ex on ex.id = pr.exercise_id
      where pr.athlete_id = p.id and pr.record_type = 'estimated_1rm' and lower(ex.category) = 'squat'
      order by pr.recorded_at desc limit 1),
    (select pr.weight from personal_records pr join exercises ex on ex.id = pr.exercise_id
      where pr.athlete_id = p.id and pr.record_type = 'estimated_1rm' and lower(ex.category) = 'bench'
      order by pr.recorded_at desc limit 1),
    (select pr.weight from personal_records pr join exercises ex on ex.id = pr.exercise_id
      where pr.athlete_id = p.id and pr.record_type = 'estimated_1rm' and lower(ex.category) = 'deadlift'
      order by pr.recorded_at desc limit 1),
    (select il.description from injury_logs il where il.athlete_id = p.id and il.status in ('active','monitoring')
      order by il.reported_date desc limit 1),
    (select il.id from injury_logs il where il.athlete_id = p.id and il.status in ('active','monitoring')
      order by il.reported_date desc limit 1),
    (select tb.id from training_blocks tb where tb.athlete_id = p.id and tb.status = 'active'
      order by tb.start_date desc limit 1),
    (select m.id from meets m where m.org_id = p_org_id and m.meet_date >= current_date
      order by m.meet_date asc limit 1),
    coalesce(array(select g.id from goals g where g.athlete_id = p.id and g.completed = false
      order by g.created_at desc), '{}'::uuid[]),
    coalesce(array_remove(array[
      case when exists (select 1 from injury_logs il where il.athlete_id = p.id and il.status in ('active','monitoring')) then 'pain_flag' end,
      case when (select count(*) filter (where ws.status='missed') from workout_sessions ws
               where ws.athlete_id=p.id and ws.scheduled_date between v_week_start and v_week_end) >= 2 then 'missed_sessions' end,
      case when (select avg(dc.sleep_hours) from daily_checkins dc where dc.athlete_id=p.id
               and dc.sleep_hours is not null and dc.check_date >= current_date-7) < 6.5 then 'low_sleep' end
    ], null), '{}'::text[]),
    coalesce((select jsonb_agg(wk order by wk->>'week_start' asc) from (
      select jsonb_build_object('week','W'||to_char(date_trunc('week',dc.check_date),'WW'),
        'week_start',to_char(date_trunc('week',dc.check_date),'YYYY-MM-DD'),
        'sleep',round(avg(dc.sleep_hours),1),'soreness',round(avg(dc.soreness_level),1),
        'stress',round(avg(dc.stress_level),1),'energy',round(avg(dc.motivation_level),1),
        'bodyweight',round(avg(dc.bodyweight),1)) as wk
      from daily_checkins dc where dc.athlete_id=p.id and dc.check_date >= current_date-28
      group by date_trunc('week',dc.check_date) order by date_trunc('week',dc.check_date) desc limit 4) sub),
    '[]'::jsonb),
    coalesce((select jsonb_agg(sess order by (sess->>'date') desc) from (
      select jsonb_build_object('date',ws.scheduled_date,'name',ws.name,'rpe',ws.overall_rpe,
        'sets',(select count(*) from workout_sets wset where wset.session_id=ws.id),
        'top_lift',ws.notes,'status',ws.status) as sess
      from workout_sessions ws where ws.athlete_id=p.id and ws.status='completed'
      order by ws.scheduled_date desc limit 4) sub), '[]'::jsonb),
    jsonb_build_object(
      'plan', coalesce((select jsonb_build_object('calories',np.calories_training,'protein',np.protein_g,'carbs',np.carbs_g,'fat',np.fat_g)
        from nutrition_plans np where np.athlete_id=p.id and np.active=true order by np.updated_at desc limit 1), '{}'::jsonb),
      'actual', coalesce((select jsonb_build_object('calories',nl.calories_actual,'protein',nl.protein_actual,'carbs',nl.carbs_actual,'fat',nl.fat_actual)
        from nutrition_logs nl where nl.athlete_id=p.id order by nl.log_date desc limit 1), '{}'::jsonb)),
    (select al.changes->>'note' from audit_logs al where al.entity_type='athlete'
      and al.entity_id=p.id and al.action='coach_note' order by al.created_at desc limit 1)
  from profiles p
  join org_members om on om.user_id = p.id and om.org_id = p_org_id
  where om.org_role = 'athlete' and om.status = 'active'
  order by p.full_name asc;
end;
$$;

grant execute on function get_org_athlete_roster(uuid) to authenticated;

drop function if exists get_org_review_queue(uuid);

create or replace function get_org_review_queue(p_org_id uuid)
returns table (athlete_id uuid, athlete_name text, session_name text, session_date date,
  status text, overall_rpe numeric, has_video boolean, flags text[])
language plpgsql security definer stable as $$
declare v_caller_role text;
begin
  select org_role::text into v_caller_role from org_members
   where org_id = p_org_id and user_id = auth.uid() limit 1;
  if v_caller_role is null or v_caller_role not in ('owner','head_coach','coach','nutritionist','analyst') then
    raise exception 'Permission denied: not a staff member of this org';
  end if;
  return query
  select p.id, p.full_name, ws.name, ws.scheduled_date, ws.status::text, ws.overall_rpe,
    exists (select 1 from workout_sets wset where wset.session_id=ws.id and wset.video_url is not null),
    coalesce(array_remove(array[
      case when exists (select 1 from injury_logs il where il.athlete_id=p.id and il.status in ('active','monitoring')) then 'pain_flag' end,
      case when ws.status='missed' then 'missed_sessions' end,
      case when (select avg(dc.sleep_hours) from daily_checkins dc where dc.athlete_id=p.id
               and dc.sleep_hours is not null and dc.check_date >= current_date-7) < 6.5 then 'low_sleep' end
    ], null), '{}'::text[])
  from workout_sessions ws
  join profiles p on p.id = ws.athlete_id
  join org_members om on om.user_id=p.id and om.org_id=p_org_id and om.org_role='athlete' and om.status='active'
  where ws.scheduled_date = current_date or (ws.scheduled_date = current_date-1 and ws.status not in ('completed'))
  order by case ws.status when 'in_progress' then 1 when 'planned' then 2 when 'missed' then 3 when 'completed' then 4 else 5 end,
    p.full_name asc;
end;
$$;

grant execute on function get_org_review_queue(uuid) to authenticated;

-- ============================================================
-- GRANT super_admin TO YOUR ACCOUNT (run once, then remove)
-- ============================================================
-- UPDATE profiles
-- SET role = 'super_admin', platform_role = 'super_admin'
-- WHERE id = (SELECT id FROM auth.users WHERE email = 'thepowerplusapp@gmail.com');
