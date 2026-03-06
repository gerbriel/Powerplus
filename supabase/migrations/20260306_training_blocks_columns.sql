-- ── Extend training_blocks with fields used by the Training Management UI ───
-- These columns exist in mock data but were missing from the original schema.

alter table training_blocks
  add column if not exists phase              text,           -- accumulation | intensification | peak | deload | transition | peaking
  add column if not exists weeks             integer,        -- duration in weeks
  add column if not exists status            text default 'planned', -- planned | active | completed
  add column if not exists focus             text,           -- free-text training focus
  add column if not exists avg_rpe_target    numeric(4,1),   -- e.g. 7.5
  add column if not exists sessions_planned  integer default 0,
  add column if not exists sessions_completed integer default 0,
  add column if not exists color             text;           -- ui accent color

-- Optional: keep block_type in sync with phase for backward compat
-- (block_type is an existing enum column; phase is the free-text version used by the UI)

-- ── RLS: ensure coaches can insert/update/delete org training blocks ─────────

-- Drop legacy policies if they exist
drop policy if exists "training_blocks: org members read org templates" on training_blocks;
drop policy if exists "training_blocks: athlete reads own"              on training_blocks;
drop policy if exists "training_blocks: coaches manage"                 on training_blocks;

-- Staff (owner/head_coach/coach) can do full CRUD on their org's blocks
create policy "training_blocks: coaches manage"
  on training_blocks for all
  using (
    exists (
      select 1 from org_members
       where org_id = training_blocks.org_id
         and user_id = auth.uid()
         and org_role in ('owner','head_coach','coach')
    )
  )
  with check (
    exists (
      select 1 from org_members
       where org_id = training_blocks.org_id
         and user_id = auth.uid()
         and org_role in ('owner','head_coach','coach')
    )
  );

-- All org members can read blocks for their org
create policy "training_blocks: org members read"
  on training_blocks for select
  using (
    exists (
      select 1 from org_members
       where org_id = training_blocks.org_id
         and user_id = auth.uid()
    )
  );

-- Athletes can always read their own personal blocks
create policy "training_blocks: athlete reads own"
  on training_blocks for select
  using (athlete_id = auth.uid());
