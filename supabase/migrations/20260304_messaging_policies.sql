-- ── Messaging: full RLS policy set (safe to re-run) ─────────────────────────

-- ── channels ─────────────────────────────────────────────────────────────────

-- SELECT: any org member can read their org's channels
drop policy if exists "channels: org members can read" on channels;
create policy "channels: org members can read"
  on channels for select
  using (
    exists (
      select 1 from org_members
      where org_id = channels.org_id and user_id = auth.uid()
    )
  );

-- INSERT: staff can create public/private channels; any org member can create DM/group channels
drop policy if exists "channels: org staff can insert" on channels;
create policy "channels: org staff can insert"
  on channels for insert
  with check (
    exists (
      select 1 from org_members
      where org_id = channels.org_id
        and user_id = auth.uid()
        and org_role in ('owner','head_coach','coach','nutritionist','analyst')
    )
    or (
      channel_type in ('dm','group')
      and exists (
        select 1 from org_members
        where org_id = channels.org_id and user_id = auth.uid()
      )
    )
  );

-- UPDATE: creator or owner/head_coach can update
drop policy if exists "channels: creator or admin can update" on channels;
create policy "channels: creator or admin can update"
  on channels for update
  using (
    created_by = auth.uid()
    or exists (
      select 1 from org_members
      where org_id = channels.org_id
        and user_id = auth.uid()
        and org_role in ('owner','head_coach')
    )
  );

-- DELETE: creator or owner/head_coach can delete
drop policy if exists "channels: creator or admin can delete" on channels;
create policy "channels: creator or admin can delete"
  on channels for delete
  using (
    created_by = auth.uid()
    or exists (
      select 1 from org_members
      where org_id = channels.org_id
        and user_id = auth.uid()
        and org_role in ('owner','head_coach')
    )
  );

-- ── channel_members ───────────────────────────────────────────────────────────

-- SELECT: users can see their own memberships + all memberships in channels they belong to
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

-- INSERT: any org member of the channel's org can add members
drop policy if exists "channel_members: org members can insert" on channel_members;
create policy "channel_members: org members can insert"
  on channel_members for insert
  with check (
    exists (
      select 1 from channels ch
      join org_members om on om.org_id = ch.org_id
      where ch.id = channel_members.channel_id
        and om.user_id = auth.uid()
    )
  );

-- DELETE: members can remove themselves; owner/head_coach can remove anyone
drop policy if exists "channel_members: can delete" on channel_members;
create policy "channel_members: can delete"
  on channel_members for delete
  using (
    user_id = auth.uid()
    or exists (
      select 1 from channels ch
      join org_members om on om.org_id = ch.org_id
      where ch.id = channel_members.channel_id
        and om.user_id = auth.uid()
        and om.org_role in ('owner','head_coach')
    )
  );

-- ── messages ──────────────────────────────────────────────────────────────────

-- SELECT: channel members can read messages
drop policy if exists "messages: channel members can read" on messages;
create policy "messages: channel members can read"
  on messages for select
  using (
    exists (
      select 1 from channel_members
      where channel_id = messages.channel_id and user_id = auth.uid()
    )
  );

-- INSERT: channel members can post messages
drop policy if exists "messages: channel members can insert" on messages;
create policy "messages: channel members can insert"
  on messages for insert
  with check (
    exists (
      select 1 from channel_members
      where channel_id = messages.channel_id and user_id = auth.uid()
    )
  );

-- UPDATE: sender can edit their own messages
drop policy if exists "messages: sender can update own" on messages;
create policy "messages: sender can update own"
  on messages for update
  using (sender_id = auth.uid());

-- DELETE: sender or owner/head_coach can delete
drop policy if exists "messages: sender or admin can delete" on messages;
create policy "messages: sender or admin can delete"
  on messages for delete
  using (
    sender_id = auth.uid()
    or exists (
      select 1 from channel_members cm
      join channels ch on ch.id = cm.channel_id
      join org_members om on om.org_id = ch.org_id
      where cm.channel_id = messages.channel_id
        and om.user_id = auth.uid()
        and om.org_role in ('owner','head_coach')
    )
  );

-- ── message_reactions ─────────────────────────────────────────────────────────

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

-- ── Schema additions ──────────────────────────────────────────────────────────

alter table messages add column if not exists gif_url    text;
alter table messages add column if not exists media_url  text;
alter table messages add column if not exists formatting jsonb;

-- ── Helper function ───────────────────────────────────────────────────────────

-- find_dm_channel: returns the channel id of an existing DM between two users in an org
create or replace function find_dm_channel(p_org_id uuid, p_user_a uuid, p_user_b uuid)
returns uuid language sql stable security definer as $$
  select c.id
  from channels c
  where c.org_id = p_org_id
    and c.channel_type = 'dm'
    and exists (select 1 from channel_members where channel_id = c.id and user_id = p_user_a)
    and exists (select 1 from channel_members where channel_id = c.id and user_id = p_user_b)
  limit 1;
$$;

