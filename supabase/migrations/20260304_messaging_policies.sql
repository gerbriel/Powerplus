-- ── Messaging: insert/delete policies ────────────────────────────────────────

-- channels: org members (staff) can create channels
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
    -- or DM channels created by any org member
    or (
      channel_type in ('dm','group')
      and exists (
        select 1 from org_members
        where org_id = channels.org_id and user_id = auth.uid()
      )
    )
  );

-- channels: creator or owner/head_coach can update
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

-- channels: creator or owner/head_coach can delete
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

-- channel_members: org members can join/add
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

-- channel_members: members can remove themselves; owner/head_coach can remove anyone
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

-- messages: sender can delete own
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

-- Add gif_url and media_url columns to messages if not present
alter table messages add column if not exists gif_url text;
alter table messages add column if not exists media_url text;
alter table messages add column if not exists formatting jsonb;

-- Helper: find an existing DM channel between two users in an org
create or replace function find_dm_channel(p_org_id uuid, p_user_a uuid, p_user_b uuid)
returns uuid language sql stable as $$
  select c.id
  from channels c
  where c.org_id = p_org_id
    and c.channel_type = 'dm'
    and exists (select 1 from channel_members where channel_id = c.id and user_id = p_user_a)
    and exists (select 1 from channel_members where channel_id = c.id and user_id = p_user_b)
  limit 1;
$$;
