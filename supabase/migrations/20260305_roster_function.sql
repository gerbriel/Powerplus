-- ── Add member_id column to profiles (federation membership number) ─────────
alter table profiles add column if not exists member_id text;

-- ── Roster: get_org_athlete_roster function ─────────────────────────────────
-- Returns one row per athlete in an org, with aggregated stats derived from
-- recent check-ins, workout sessions, injury logs, nutrition logs, and
-- training blocks. Callable by any authenticated org member who has a
-- staff role (owner / head_coach / coach).
--
-- Usage:
--   select * from get_org_athlete_roster('org-uuid-here');
--
-- Security: SECURITY DEFINER so the function can cross RLS boundaries and
-- aggregate data for athletes that the calling coach is assigned to.
-- The caller permission check is done inside the function body.

drop function if exists get_org_athlete_roster(uuid);

create or replace function get_org_athlete_roster(p_org_id uuid)
returns table (
  id                        uuid,
  full_name                 text,
  display_name              text,
  avatar_url                text,
  weight_class              text,
  federation                text,
  member_id                 text,
  equipment_type            text,
  bio                       text,

  -- Latest check-in metrics (past 28 days)
  bodyweight_kg             numeric,
  sleep_avg                 numeric,
  soreness_avg              numeric,
  stress_avg                numeric,
  energy_avg                numeric,

  -- Workout stats (current 7-day window: Mon–Sun)
  sessions_this_week        integer,
  sessions_planned_this_week integer,
  rpe_avg_this_week         numeric,
  last_session_date         date,

  -- Computed adherence % (sessions_this_week / sessions_planned * 100)
  adherence                 integer,

  -- Nutrition compliance (avg compliance_score past 7 logs)
  nutrition_compliance      integer,

  -- e1RM estimates from personal_records table (most recent per lift)
  e1rm_squat                numeric,
  e1rm_bench                numeric,
  e1rm_deadlift             numeric,

  -- Active injury flags
  injury_notes              text,
  injury_log_id             uuid,

  -- Linked training block id (most recent active block)
  current_block_id          uuid,

  -- Next meet id (earliest upcoming meet)
  next_meet_id              uuid,

  -- Linked goal IDs
  goal_ids                  uuid[],

  -- Flags array  (pain_flag | missed_sessions | low_sleep)
  flags                     text[],

  -- Check-in trend: last 4 completed ISO weeks as JSON array
  check_in_trend            jsonb,

  -- Recent sessions: last 4 completed workout sessions as JSON array
  recent_sessions           jsonb,

  -- Nutrition macros: plan + actual (from most recent nutrition_plan + last nutrition_log)
  nutrition_macros          jsonb,

  -- Coach notes (most recent audit_log entry with action = 'coach_note')
  coach_notes               text
)
language plpgsql
security definer
stable
as $$
declare
  v_caller_role text;
  v_week_start  date;
  v_week_end    date;
begin
  -- Verify caller is a staff member of this org
  select org_role::text
    into v_caller_role
    from org_members
   where org_id = p_org_id and user_id = auth.uid()
   limit 1;

  if v_caller_role is null or v_caller_role not in ('owner','head_coach','coach','nutritionist','analyst') then
    raise exception 'Permission denied: not a staff member of this org';
  end if;

  -- Current ISO week bounds (Monday = start)
  v_week_start := date_trunc('week', current_date)::date;
  v_week_end   := v_week_start + 6;

  return query
  select
    p.id,
    p.full_name,
    p.display_name,
    p.avatar_url,
    p.weight_class,
    p.federation,
    p.member_id,
    p.equipment_type,
    p.bio,

    -- ── Latest bodyweight from check-ins (past 28 days) ─────────────────
    (
      select dc.bodyweight
        from daily_checkins dc
       where dc.athlete_id = p.id
         and dc.bodyweight is not null
         and dc.check_date >= current_date - 28
       order by dc.check_date desc
       limit 1
    ) as bodyweight_kg,

    -- ── Sleep avg (past 28 days) ─────────────────────────────────────────
    round(
      (select avg(dc.sleep_hours)
         from daily_checkins dc
        where dc.athlete_id = p.id
          and dc.sleep_hours is not null
          and dc.check_date >= current_date - 28),
      1
    ) as sleep_avg,

    -- ── Soreness avg ─────────────────────────────────────────────────────
    round(
      (select avg(dc.soreness_level)
         from daily_checkins dc
        where dc.athlete_id = p.id
          and dc.soreness_level is not null
          and dc.check_date >= current_date - 28),
      1
    ) as soreness_avg,

    -- ── Stress avg ───────────────────────────────────────────────────────
    round(
      (select avg(dc.stress_level)
         from daily_checkins dc
        where dc.athlete_id = p.id
          and dc.stress_level is not null
          and dc.check_date >= current_date - 28),
      1
    ) as stress_avg,

    -- ── Energy avg ───────────────────────────────────────────────────────
    round(
      (select avg(dc.motivation_level)
         from daily_checkins dc
        where dc.athlete_id = p.id
          and dc.motivation_level is not null
          and dc.check_date >= current_date - 28),
      1
    ) as energy_avg,

    -- ── Sessions this week (completed / in_progress) ─────────────────────
    (
      select count(*)::integer
        from workout_sessions ws
       where ws.athlete_id = p.id
         and ws.scheduled_date between v_week_start and v_week_end
         and ws.status in ('completed','in_progress')
    ) as sessions_this_week,

    -- ── Sessions planned this week (all statuses) ────────────────────────
    greatest(
      (
        select count(*)::integer
          from workout_sessions ws
         where ws.athlete_id = p.id
           and ws.scheduled_date between v_week_start and v_week_end
      ),
      0
    ) as sessions_planned_this_week,

    -- ── RPE avg this week ────────────────────────────────────────────────
    round(
      (select avg(ws.overall_rpe)
         from workout_sessions ws
        where ws.athlete_id = p.id
          and ws.scheduled_date between v_week_start and v_week_end
          and ws.overall_rpe is not null),
      1
    ) as rpe_avg_this_week,

    -- ── Last session date ────────────────────────────────────────────────
    (
      select ws.scheduled_date
        from workout_sessions ws
       where ws.athlete_id = p.id
         and ws.status = 'completed'
       order by ws.scheduled_date desc
       limit 1
    ) as last_session_date,

    -- ── Adherence % this week ────────────────────────────────────────────
    case
      when (
        select count(*)
          from workout_sessions ws
         where ws.athlete_id = p.id
           and ws.scheduled_date between v_week_start and v_week_end
      ) = 0 then 100
      else
        least(100, greatest(0, round(
          (
            select count(*) filter (where ws.status in ('completed','in_progress'))::numeric /
                   nullif(count(*), 0) * 100
              from workout_sessions ws
             where ws.athlete_id = p.id
               and ws.scheduled_date between v_week_start and v_week_end
          )
        )::integer))
    end as adherence,

    -- ── Nutrition compliance avg (last 7 logs) ────────────────────────────
    coalesce(
      (
        select round(avg(nl.compliance_score))::integer
          from nutrition_logs nl
         where nl.athlete_id = p.id
           and nl.compliance_score is not null
         order by nl.log_date desc
         limit 7
      ),
      0
    ) as nutrition_compliance,

    -- ── e1RM: squat ──────────────────────────────────────────────────────
    (
      select pr.weight
        from personal_records pr
        join exercises ex on ex.id = pr.exercise_id
       where pr.athlete_id = p.id
         and pr.record_type = 'estimated_1rm'
         and lower(ex.category) = 'squat'
       order by pr.recorded_at desc
       limit 1
    ) as e1rm_squat,

    -- ── e1RM: bench ──────────────────────────────────────────────────────
    (
      select pr.weight
        from personal_records pr
        join exercises ex on ex.id = pr.exercise_id
       where pr.athlete_id = p.id
         and pr.record_type = 'estimated_1rm'
         and lower(ex.category) = 'bench'
       order by pr.recorded_at desc
       limit 1
    ) as e1rm_bench,

    -- ── e1RM: deadlift ───────────────────────────────────────────────────
    (
      select pr.weight
        from personal_records pr
        join exercises ex on ex.id = pr.exercise_id
       where pr.athlete_id = p.id
         and pr.record_type = 'estimated_1rm'
         and lower(ex.category) = 'deadlift'
       order by pr.recorded_at desc
       limit 1
    ) as e1rm_deadlift,

    -- ── Active injury notes ───────────────────────────────────────────────
    (
      select il.description
        from injury_logs il
       where il.athlete_id = p.id
         and il.status in ('active','monitoring')
       order by il.reported_date desc
       limit 1
    ) as injury_notes,

    -- ── Active injury log id ─────────────────────────────────────────────
    (
      select il.id
        from injury_logs il
       where il.athlete_id = p.id
         and il.status in ('active','monitoring')
       order by il.reported_date desc
       limit 1
    ) as injury_log_id,

    -- ── Current training block ────────────────────────────────────────────
    (
      select tb.id
        from training_blocks tb
       where tb.athlete_id = p.id
         and tb.status = 'active'
       order by tb.start_date desc
       limit 1
    ) as current_block_id,

    -- ── Next meet ────────────────────────────────────────────────────────
    (
      select m.id
        from meets m
       where m.org_id = p_org_id
         and m.meet_date >= current_date
       order by m.meet_date asc
       limit 1
    ) as next_meet_id,

    -- ── Goal IDs ─────────────────────────────────────────────────────────
    coalesce(
      array(
        select g.id
          from goals g
         where g.athlete_id = p.id
           and g.completed = false
         order by g.created_at desc
      ),
      '{}'::uuid[]
    ) as goal_ids,

    -- ── Flags ────────────────────────────────────────────────────────────
    coalesce(
      array_remove(
        array[
          case when exists (
            select 1 from injury_logs il
             where il.athlete_id = p.id and il.status in ('active','monitoring')
          ) then 'pain_flag' end,
          case when (
            select count(*) filter (where ws.status = 'missed')
              from workout_sessions ws
             where ws.athlete_id = p.id
               and ws.scheduled_date between v_week_start and v_week_end
          ) >= 2 then 'missed_sessions' end,
          case when (
            select avg(dc.sleep_hours)
              from daily_checkins dc
             where dc.athlete_id = p.id
               and dc.sleep_hours is not null
               and dc.check_date >= current_date - 7
          ) < 6.5 then 'low_sleep' end
        ],
        null
      ),
      '{}'::text[]
    ) as flags,

    -- ── Check-in trend: last 4 ISO weeks ─────────────────────────────────
    coalesce(
      (
        select jsonb_agg(wk order by wk->>'week_start' asc)
        from (
          select jsonb_build_object(
            'week',        'W' || to_char(date_trunc('week', dc.check_date), 'WW'),
            'week_start',  to_char(date_trunc('week', dc.check_date), 'YYYY-MM-DD'),
            'sleep',       round(avg(dc.sleep_hours), 1),
            'soreness',    round(avg(dc.soreness_level), 1),
            'stress',      round(avg(dc.stress_level), 1),
            'energy',      round(avg(dc.motivation_level), 1),
            'bodyweight',  round(avg(dc.bodyweight), 1)
          ) as wk
          from daily_checkins dc
         where dc.athlete_id = p.id
           and dc.check_date >= current_date - 28
         group by date_trunc('week', dc.check_date)
         order by date_trunc('week', dc.check_date) desc
         limit 4
        ) sub
      ),
      '[]'::jsonb
    ) as check_in_trend,

    -- ── Recent sessions: last 4 completed ────────────────────────────────
    coalesce(
      (
        select jsonb_agg(sess order by (sess->>'date') desc)
        from (
          select jsonb_build_object(
            'date',     ws.scheduled_date,
            'name',     ws.name,
            'rpe',      ws.overall_rpe,
            'sets',     (select count(*) from workout_sets wset where wset.session_id = ws.id),
            'top_lift', ws.notes,
            'status',   ws.status
          ) as sess
          from workout_sessions ws
         where ws.athlete_id = p.id
           and ws.status = 'completed'
         order by ws.scheduled_date desc
         limit 4
        ) sub
      ),
      '[]'::jsonb
    ) as recent_sessions,

    -- ── Nutrition macros: plan targets + last log actuals ─────────────────
    jsonb_build_object(
      'plan', coalesce(
        (
          select jsonb_build_object(
            'calories', np.calories_training,
            'protein',  np.protein_g,
            'carbs',    np.carbs_g,
            'fat',      np.fat_g
          )
          from nutrition_plans np
         where np.athlete_id = p.id and np.active = true
         order by np.updated_at desc
         limit 1
        ),
        '{}'::jsonb
      ),
      'actual', coalesce(
        (
          select jsonb_build_object(
            'calories', nl.calories_actual,
            'protein',  nl.protein_actual,
            'carbs',    nl.carbs_actual,
            'fat',      nl.fat_actual
          )
          from nutrition_logs nl
         where nl.athlete_id = p.id
         order by nl.log_date desc
         limit 1
        ),
        '{}'::jsonb
      )
    ) as nutrition_macros,

    -- ── Most recent coach note ────────────────────────────────────────────
    (
      select al.changes->>'note'
        from audit_logs al
       where al.entity_type = 'athlete'
         and al.entity_id = p.id
         and al.action = 'coach_note'
       order by al.created_at desc
       limit 1
    ) as coach_notes

  from profiles p
  join org_members om on om.user_id = p.id and om.org_id = p_org_id
  where om.org_role = 'athlete'
    and om.status = 'active'
  order by p.full_name asc;
end;
$$;

-- Grant execute to authenticated users (RLS inside the function handles authz)
grant execute on function get_org_athlete_roster(uuid) to authenticated;


-- ── Roster: get_org_review_queue function ────────────────────────────────────
-- Returns today's review queue: one row per athlete's most recent or
-- today-scheduled session, with status and flag info.

drop function if exists get_org_review_queue(uuid);

create or replace function get_org_review_queue(p_org_id uuid)
returns table (
  athlete_id    uuid,
  athlete_name  text,
  session_name  text,
  session_date  date,
  status        text,
  overall_rpe   numeric,
  has_video     boolean,
  flags         text[]
)
language plpgsql
security definer
stable
as $$
declare
  v_caller_role text;
begin
  -- Verify caller is staff
  select org_role::text into v_caller_role
    from org_members
   where org_id = p_org_id and user_id = auth.uid()
   limit 1;

  if v_caller_role is null or v_caller_role not in ('owner','head_coach','coach','nutritionist','analyst') then
    raise exception 'Permission denied: not a staff member of this org';
  end if;

  return query
  select
    p.id                                as athlete_id,
    p.full_name                         as athlete_name,
    ws.name                             as session_name,
    ws.scheduled_date                   as session_date,
    ws.status::text                     as status,
    ws.overall_rpe,
    exists (
      select 1 from workout_sets wset
       where wset.session_id = ws.id and wset.video_url is not null
    )                                   as has_video,
    -- Re-derive flags for this athlete
    coalesce(
      array_remove(
        array[
          case when exists (
            select 1 from injury_logs il
             where il.athlete_id = p.id and il.status in ('active','monitoring')
          ) then 'pain_flag' end,
          case when ws.status = 'missed' then 'missed_sessions' end,
          case when (
            select avg(dc.sleep_hours)
              from daily_checkins dc
             where dc.athlete_id = p.id
               and dc.sleep_hours is not null
               and dc.check_date >= current_date - 7
          ) < 6.5 then 'low_sleep' end
        ],
        null
      ),
      '{}'::text[]
    ) as flags

  from workout_sessions ws
  join profiles p on p.id = ws.athlete_id
  join org_members om on om.user_id = p.id and om.org_id = p_org_id and om.org_role = 'athlete' and om.status = 'active'
  where ws.scheduled_date = current_date
     or (ws.scheduled_date = current_date - 1 and ws.status not in ('completed'))
  order by
    case ws.status
      when 'in_progress' then 1
      when 'planned'     then 2
      when 'missed'      then 3
      when 'completed'   then 4
      else 5
    end,
    p.full_name asc;
end;
$$;

grant execute on function get_org_review_queue(uuid) to authenticated;
