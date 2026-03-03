-- ============================================================
-- ORG JOIN REQUESTS
-- Created when a non-owner user (coach, nutritionist, athlete)
-- requests to join an existing org during onboarding or later.
-- The org owner/head_coach approves or denies.
-- ============================================================

create table if not exists org_join_requests (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid references organizations(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  -- The role the requester wants (coach | nutritionist | athlete | head_coach)
  requested_role org_role not null default 'athlete',
  -- Short message from the requester (optional)
  message text,
  status text not null default 'pending',  -- 'pending' | 'approved' | 'denied'
  reviewed_by uuid references profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz default now(),
  -- One active request per user per org at a time
  unique(org_id, user_id)
);

-- RLS
alter table org_join_requests enable row level security;

-- Users can insert their own requests
create policy "Users can create join requests"
  on org_join_requests for insert
  with check (auth.uid() = user_id);

-- Users can read their own requests
create policy "Users can read own join requests"
  on org_join_requests for select
  using (auth.uid() = user_id);

-- Org staff (owner/head_coach) can read requests for their org
create policy "Org staff can read join requests"
  on org_join_requests for select
  using (
    exists (
      select 1 from org_members om
      where om.org_id = org_join_requests.org_id
        and om.user_id = auth.uid()
        and om.org_role in ('owner', 'head_coach', 'admin')
        and om.status = 'active'
    )
  );

-- Org staff can update (approve/deny) requests
create policy "Org staff can update join requests"
  on org_join_requests for update
  using (
    exists (
      select 1 from org_members om
      where om.org_id = org_join_requests.org_id
        and om.user_id = auth.uid()
        and om.org_role in ('owner', 'head_coach', 'admin')
        and om.status = 'active'
    )
  );

-- Users can delete (retract) their own pending requests
create policy "Users can retract own pending requests"
  on org_join_requests for delete
  using (auth.uid() = user_id and status = 'pending');

-- ============================================================
-- SEARCH ORGS RPC
-- Searches organizations by name or slug substring.
-- Returns id, name, slug, logo_url, federation, member count.
-- Only shows active orgs.
-- ============================================================
create or replace function search_orgs(p_query text, p_limit int default 10)
returns table (
  id uuid,
  name text,
  slug text,
  logo_url text,
  federation text,
  member_count bigint
)
language sql
security definer
stable
as $$
  select
    o.id,
    o.name,
    o.slug,
    o.logo_url,
    o.federation,
    (select count(*) from org_members om where om.org_id = o.id and om.status = 'active') as member_count
  from organizations o
  where
    o.status = 'active'
    and (
      o.name ilike '%' || p_query || '%'
      or o.slug ilike '%' || p_query || '%'
    )
  order by
    -- Exact name match first, then by member count descending
    (o.name ilike p_query) desc,
    member_count desc,
    o.name asc
  limit p_limit;
$$;

-- ============================================================
-- APPROVE JOIN REQUEST — marks approved and adds to org_members
-- ============================================================
create or replace function approve_join_request(p_request_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_request org_join_requests%rowtype;
begin
  select * into v_request from org_join_requests where id = p_request_id;

  if not found then
    raise exception 'Join request not found';
  end if;

  -- Verify caller is staff of the org
  if not exists (
    select 1 from org_members
    where org_id = v_request.org_id
      and user_id = auth.uid()
      and org_role in ('owner', 'head_coach', 'admin')
      and status = 'active'
  ) then
    raise exception 'Not authorized';
  end if;

  -- Upsert into org_members
  insert into org_members (org_id, user_id, org_role, status, invited_by, joined_at)
  values (v_request.org_id, v_request.user_id, v_request.requested_role, 'active', auth.uid(), now())
  on conflict (org_id, user_id) do update
    set org_role = excluded.org_role,
        status = 'active',
        joined_at = now();

  -- Mark request approved
  update org_join_requests
  set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
  where id = p_request_id;
end;
$$;

-- ============================================================
-- DENY JOIN REQUEST
-- ============================================================
create or replace function deny_join_request(p_request_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_org_id uuid;
begin
  select org_id into v_org_id from org_join_requests where id = p_request_id;

  if not found then raise exception 'Join request not found'; end if;

  if not exists (
    select 1 from org_members
    where org_id = v_org_id
      and user_id = auth.uid()
      and org_role in ('owner', 'head_coach', 'admin')
      and status = 'active'
  ) then
    raise exception 'Not authorized';
  end if;

  update org_join_requests
  set status = 'denied', reviewed_by = auth.uid(), reviewed_at = now()
  where id = p_request_id;
end;
$$;
