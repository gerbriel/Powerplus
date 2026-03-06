-- ── Extend meets table with UI fields ───────────────────────────────────────
-- These columns are used by MeetsPage but were missing from the original schema.

alter table meets
  add column if not exists equipment         text default 'raw',
  add column if not exists athletes_registered integer default 0,
  add column if not exists athletes_confirmed  integer default 0,
  -- jsonb blob storing attempt planner data per athlete:
  -- { squat: { 1: 192.5, 2: 202.5, 3: 210 }, bench: {...}, deadlift: {...} }
  add column if not exists attempts          jsonb,
  -- Arrays of linked UUIDs (blocks / goals) owned by this athlete
  add column if not exists linked_goal_ids   uuid[] default '{}',
  add column if not exists linked_block_ids  uuid[] default '{}';

-- Extend athlete_meet_entries with attempt arrays if not already present
-- (schema.sql already has squat_attempts/bench_attempts/deadlift_attempts)
-- Add a convenience updated_at column so we can order by last edit
alter table athlete_meet_entries
  add column if not exists updated_at timestamptz default now();

-- ── RLS for meets ─────────────────────────────────────────────────────────────

-- Athlete can always read/write their own personal meets
drop policy if exists "meets: creator can manage own" on meets;
create policy "meets: creator can manage own"
  on meets for all
  using  (created_by = auth.uid())
  with check (created_by = auth.uid());

-- Org coaches can manage meets for their org
drop policy if exists "meets: coaches can manage" on meets;
create policy "meets: coaches can manage"
  on meets for all
  using (
    org_id is not null and exists (
      select 1 from org_members
       where org_id = meets.org_id
         and user_id = auth.uid()
         and org_role in ('owner','head_coach','coach')
    )
  )
  with check (
    org_id is not null and exists (
      select 1 from org_members
       where org_id = meets.org_id
         and user_id = auth.uid()
         and org_role in ('owner','head_coach','coach')
    )
  );

-- Org members can read org meets
drop policy if exists "meets: org members can read" on meets;
create policy "meets: org members can read"
  on meets for select
  using (
    org_id is null
    or exists (
      select 1 from org_members
       where org_id = meets.org_id and user_id = auth.uid()
    )
  );

-- ── RLS for athlete_meet_entries ──────────────────────────────────────────────

drop policy if exists "meet_entries: athlete sees own"     on athlete_meet_entries;
drop policy if exists "meet_entries: org members can read" on athlete_meet_entries;
drop policy if exists "meet_entries: athlete manages own"  on athlete_meet_entries;
drop policy if exists "meet_entries: coaches read"         on athlete_meet_entries;

-- Athletes manage their own entries
create policy "meet_entries: athlete manages own"
  on athlete_meet_entries for all
  using  (athlete_id = auth.uid())
  with check (athlete_id = auth.uid());

-- Coaches/staff can read entries for meets in their org
create policy "meet_entries: coaches read"
  on athlete_meet_entries for select
  using (
    exists (
      select 1 from meets m
      join org_members om on om.org_id = m.org_id
       where m.id = athlete_meet_entries.meet_id
         and om.user_id = auth.uid()
         and om.org_role in ('owner','head_coach','coach')
    )
  );

-- ── Extend training_blocks with linked_meet_id & linked_goal_ids if missing ──
alter table training_blocks
  add column if not exists linked_meet_id  uuid references meets(id) on delete set null,
  add column if not exists linked_goal_ids uuid[] default '{}';
