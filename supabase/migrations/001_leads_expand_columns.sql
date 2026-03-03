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
