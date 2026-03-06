-- ── Programming tables: RLS policies ────────────────────────────────────────
-- Tables covered:
--   exercises              (global + org-private exercises)
--   program_templates      (org-scoped templates)
--   workout_templates      (child of program_templates)
--   workout_template_exercises (child of workout_templates)
-- ─────────────────────────────────────────────────────────────────────────────

-- ── exercises ────────────────────────────────────────────────────────────────
alter table exercises enable row level security;

-- Anyone authenticated can see global exercises
create policy "exercises_select_global"
  on exercises for select
  using (is_global = true or org_id is null);

-- Org members can see their org's private exercises
create policy "exercises_select_org"
  on exercises for select
  using (
    org_id is null
    or is_global = true
    or exists (
      select 1 from org_members om
       where om.org_id = exercises.org_id
         and om.user_id = auth.uid()
         and om.status = 'active'
    )
  );

-- Staff can insert exercises (global created_by = uid; org-scoped require org membership)
create policy "exercises_insert_staff"
  on exercises for insert
  with check (
    created_by = auth.uid()
    and (
      org_id is null
      or exists (
        select 1 from org_members om
         where om.org_id = exercises.org_id
           and om.user_id = auth.uid()
           and om.org_role in ('owner','head_coach','coach')
           and om.status = 'active'
      )
    )
  );

-- Only creator or org owner/head_coach can update
create policy "exercises_update_staff"
  on exercises for update
  using (
    created_by = auth.uid()
    or exists (
      select 1 from org_members om
       where om.org_id = exercises.org_id
         and om.user_id = auth.uid()
         and om.org_role in ('owner','head_coach')
         and om.status = 'active'
    )
  );

-- Only creator or org owner/head_coach can delete
create policy "exercises_delete_staff"
  on exercises for delete
  using (
    created_by = auth.uid()
    or exists (
      select 1 from org_members om
       where om.org_id = exercises.org_id
         and om.user_id = auth.uid()
         and om.org_role in ('owner','head_coach')
         and om.status = 'active'
    )
  );

-- ── program_templates ────────────────────────────────────────────────────────
alter table program_templates enable row level security;

-- Org members can read their org's templates
create policy "program_templates_select"
  on program_templates for select
  using (
    is_public = true
    or created_by = auth.uid()
    or exists (
      select 1 from org_members om
       where om.org_id = program_templates.org_id
         and om.user_id = auth.uid()
         and om.status = 'active'
    )
  );

-- Staff can create templates for their org
create policy "program_templates_insert"
  on program_templates for insert
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from org_members om
       where om.org_id = program_templates.org_id
         and om.user_id = auth.uid()
         and om.org_role in ('owner','head_coach','coach')
         and om.status = 'active'
    )
  );

create policy "program_templates_update"
  on program_templates for update
  using (
    created_by = auth.uid()
    or exists (
      select 1 from org_members om
       where om.org_id = program_templates.org_id
         and om.user_id = auth.uid()
         and om.org_role in ('owner','head_coach')
         and om.status = 'active'
    )
  );

create policy "program_templates_delete"
  on program_templates for delete
  using (
    created_by = auth.uid()
    or exists (
      select 1 from org_members om
       where om.org_id = program_templates.org_id
         and om.user_id = auth.uid()
         and om.org_role in ('owner','head_coach')
         and om.status = 'active'
    )
  );

-- ── workout_templates ────────────────────────────────────────────────────────
alter table workout_templates enable row level security;

-- Access follows parent program_template
create policy "workout_templates_select"
  on workout_templates for select
  using (
    exists (
      select 1 from program_templates pt
       where pt.id = workout_templates.template_id
         and (
           pt.is_public = true
           or pt.created_by = auth.uid()
           or exists (
             select 1 from org_members om
              where om.org_id = pt.org_id
                and om.user_id = auth.uid()
                and om.status = 'active'
           )
         )
    )
  );

create policy "workout_templates_insert"
  on workout_templates for insert
  with check (
    exists (
      select 1 from program_templates pt
       join org_members om on om.org_id = pt.org_id
        and om.user_id = auth.uid()
        and om.org_role in ('owner','head_coach','coach')
        and om.status = 'active'
       where pt.id = workout_templates.template_id
    )
  );

create policy "workout_templates_update"
  on workout_templates for update
  using (
    exists (
      select 1 from program_templates pt
       join org_members om on om.org_id = pt.org_id
        and om.user_id = auth.uid()
        and om.org_role in ('owner','head_coach','coach')
        and om.status = 'active'
       where pt.id = workout_templates.template_id
    )
  );

create policy "workout_templates_delete"
  on workout_templates for delete
  using (
    exists (
      select 1 from program_templates pt
       join org_members om on om.org_id = pt.org_id
        and om.user_id = auth.uid()
        and om.org_role in ('owner','head_coach','coach')
        and om.status = 'active'
       where pt.id = workout_templates.template_id
    )
  );

-- ── workout_template_exercises ────────────────────────────────────────────────
alter table workout_template_exercises enable row level security;

create policy "workout_template_exercises_select"
  on workout_template_exercises for select
  using (
    exists (
      select 1 from workout_templates wt
       join program_templates pt on pt.id = wt.template_id
       where wt.id = workout_template_exercises.workout_template_id
         and (
           pt.is_public = true
           or pt.created_by = auth.uid()
           or exists (
             select 1 from org_members om
              where om.org_id = pt.org_id
                and om.user_id = auth.uid()
                and om.status = 'active'
           )
         )
    )
  );

create policy "workout_template_exercises_insert"
  on workout_template_exercises for insert
  with check (
    exists (
      select 1 from workout_templates wt
       join program_templates pt on pt.id = wt.template_id
       join org_members om on om.org_id = pt.org_id
        and om.user_id = auth.uid()
        and om.org_role in ('owner','head_coach','coach')
        and om.status = 'active'
       where wt.id = workout_template_exercises.workout_template_id
    )
  );

create policy "workout_template_exercises_update"
  on workout_template_exercises for update
  using (
    exists (
      select 1 from workout_templates wt
       join program_templates pt on pt.id = wt.template_id
       join org_members om on om.org_id = pt.org_id
        and om.user_id = auth.uid()
        and om.org_role in ('owner','head_coach','coach')
        and om.status = 'active'
       where wt.id = workout_template_exercises.workout_template_id
    )
  );

create policy "workout_template_exercises_delete"
  on workout_template_exercises for delete
  using (
    exists (
      select 1 from workout_templates wt
       join program_templates pt on pt.id = wt.template_id
       join org_members om on om.org_id = pt.org_id
        and om.user_id = auth.uid()
        and om.org_role in ('owner','head_coach','coach')
        and om.status = 'active'
       where wt.id = workout_template_exercises.workout_template_id
    )
  );

-- ── program_template_weeks ────────────────────────────────────────────────────
alter table program_template_weeks enable row level security;

create policy "program_template_weeks_select"
  on program_template_weeks for select
  using (
    exists (
      select 1 from program_templates pt
       where pt.id = program_template_weeks.template_id
         and (
           pt.is_public = true
           or pt.created_by = auth.uid()
           or exists (
             select 1 from org_members om
              where om.org_id = pt.org_id
                and om.user_id = auth.uid()
                and om.status = 'active'
           )
         )
    )
  );

create policy "program_template_weeks_insert"
  on program_template_weeks for insert
  with check (
    exists (
      select 1 from program_templates pt
       join org_members om on om.org_id = pt.org_id
        and om.user_id = auth.uid()
        and om.org_role in ('owner','head_coach','coach')
        and om.status = 'active'
       where pt.id = program_template_weeks.template_id
    )
  );

create policy "program_template_weeks_update"
  on program_template_weeks for update
  using (
    exists (
      select 1 from program_templates pt
       join org_members om on om.org_id = pt.org_id
        and om.user_id = auth.uid()
        and om.org_role in ('owner','head_coach','coach')
        and om.status = 'active'
       where pt.id = program_template_weeks.template_id
    )
  );

create policy "program_template_weeks_delete"
  on program_template_weeks for delete
  using (
    exists (
      select 1 from program_templates pt
       join org_members om on om.org_id = pt.org_id
        and om.user_id = auth.uid()
        and om.org_role in ('owner','head_coach','coach')
        and om.status = 'active'
       where pt.id = program_template_weeks.template_id
    )
  );
