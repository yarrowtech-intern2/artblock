do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'community_member_role'
      and n.nspname = 'public'
  ) then
    create type public.community_member_role as enum ('admin', 'moderator', 'member');
  end if;

  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'community_membership_status'
      and n.nspname = 'public'
  ) then
    create type public.community_membership_status as enum ('invited', 'active', 'rejected');
  end if;
end
$$;

create table if not exists public.artist_communities (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null unique references public.profiles (id) on delete cascade,
  name text not null check (length(trim(name)) between 3 and 80),
  description text,
  fan_interactions_enabled boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.community_memberships (
  community_id uuid not null references public.artist_communities (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.community_member_role not null default 'member',
  status public.community_membership_status not null default 'invited',
  invited_by uuid references public.profiles (id) on delete set null,
  joined_at timestamptz,
  last_read_at timestamptz not null default timezone('utc', now()),
  last_message_at timestamptz not null default timezone('utc', now()),
  unread_count integer not null default 0 check (unread_count >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (community_id, user_id)
);

create table if not exists public.community_messages (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.artist_communities (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (length(trim(body)) > 0),
  parent_message_id uuid references public.community_messages (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.community_message_reactions (
  message_id uuid not null references public.community_messages (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  emoji text not null check (length(trim(emoji)) between 1 and 16),
  created_at timestamptz not null default timezone('utc', now()),
  primary key (message_id, user_id, emoji)
);

create index if not exists artist_communities_creator_idx
on public.artist_communities (creator_id);

create index if not exists community_memberships_user_idx
on public.community_memberships (user_id, created_at desc);

create index if not exists community_memberships_status_idx
on public.community_memberships (community_id, status, created_at desc);

create index if not exists community_messages_community_idx
on public.community_messages (community_id, created_at desc);

create index if not exists community_messages_parent_idx
on public.community_messages (parent_message_id);

create index if not exists community_message_reactions_message_idx
on public.community_message_reactions (message_id, created_at desc);

alter table public.artist_communities enable row level security;
alter table public.community_memberships enable row level security;
alter table public.community_messages enable row level security;
alter table public.community_message_reactions enable row level security;

drop trigger if exists artist_communities_set_updated_at on public.artist_communities;
create trigger artist_communities_set_updated_at
before update on public.artist_communities
for each row
execute procedure public.set_updated_at();

drop trigger if exists community_memberships_set_updated_at on public.community_memberships;
create trigger community_memberships_set_updated_at
before update on public.community_memberships
for each row
execute procedure public.set_updated_at();

create or replace function public.user_is_community_member(
  target_community_id uuid,
  target_user_id uuid default auth.uid()
)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.community_memberships memberships
    where memberships.community_id = target_community_id
      and memberships.user_id = target_user_id
      and memberships.status in ('invited', 'active')
  );
$$;

create or replace function public.user_is_community_active_member(
  target_community_id uuid,
  target_user_id uuid default auth.uid()
)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.community_memberships memberships
    where memberships.community_id = target_community_id
      and memberships.user_id = target_user_id
      and memberships.status = 'active'
  );
$$;

create or replace function public.user_is_community_manager(
  target_community_id uuid,
  target_user_id uuid default auth.uid()
)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.community_memberships memberships
    where memberships.community_id = target_community_id
      and memberships.user_id = target_user_id
      and memberships.status = 'active'
      and memberships.role in ('admin', 'moderator')
  );
$$;

create or replace function public.user_is_community_admin(
  target_community_id uuid,
  target_user_id uuid default auth.uid()
)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.community_memberships memberships
    where memberships.community_id = target_community_id
      and memberships.user_id = target_user_id
      and memberships.status = 'active'
      and memberships.role = 'admin'
  );
$$;

create or replace function public.can_view_community(
  target_community_id uuid,
  target_user_id uuid default auth.uid()
)
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.user_is_community_member(target_community_id, target_user_id);
$$;

create or replace function public.can_send_community_message(
  target_community_id uuid,
  sender_profile_id uuid default auth.uid()
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  member_role public.community_member_role;
  interactions_enabled boolean := false;
begin
  if target_community_id is null or sender_profile_id is null then
    return false;
  end if;

  select memberships.role, communities.fan_interactions_enabled
  into member_role, interactions_enabled
  from public.community_memberships memberships
  join public.artist_communities communities
    on communities.id = memberships.community_id
  where memberships.community_id = target_community_id
    and memberships.user_id = sender_profile_id
    and memberships.status = 'active';

  if member_role is null then
    return false;
  end if;

  if member_role in ('admin', 'moderator') then
    return true;
  end if;

  return coalesce(interactions_enabled, false);
end;
$$;

create or replace function public.can_react_to_community_message(
  target_message_id uuid,
  reactor_profile_id uuid default auth.uid()
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  target_community_id uuid;
begin
  if target_message_id is null or reactor_profile_id is null then
    return false;
  end if;

  select community_id
  into target_community_id
  from public.community_messages
  where id = target_message_id;

  if target_community_id is null then
    return false;
  end if;

  return public.can_send_community_message(target_community_id, reactor_profile_id);
end;
$$;

create or replace function public.handle_artist_community_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.community_memberships (
    community_id,
    user_id,
    role,
    status,
    invited_by,
    joined_at,
    last_read_at,
    last_message_at,
    unread_count
  )
  values (
    new.id,
    new.creator_id,
    'admin',
    'active',
    new.creator_id,
    timezone('utc', now()),
    timezone('utc', now()),
    timezone('utc', now()),
    0
  )
  on conflict (community_id, user_id) do update
  set
    role = 'admin',
    status = 'active',
    invited_by = new.creator_id,
    joined_at = coalesce(public.community_memberships.joined_at, timezone('utc', now())),
    unread_count = 0,
    last_read_at = timezone('utc', now()),
    last_message_at = greatest(public.community_memberships.last_message_at, timezone('utc', now())),
    updated_at = timezone('utc', now());

  return new;
end;
$$;

drop trigger if exists artist_communities_create_owner_membership on public.artist_communities;
create trigger artist_communities_create_owner_membership
after insert on public.artist_communities
for each row
execute procedure public.handle_artist_community_owner_membership();

create or replace function public.handle_community_message_counters()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.community_memberships memberships
  set
    last_message_at = new.created_at,
    unread_count = case
      when memberships.user_id = new.sender_id then 0
      else memberships.unread_count + 1
    end,
    last_read_at = case
      when memberships.user_id = new.sender_id then greatest(memberships.last_read_at, new.created_at)
      else memberships.last_read_at
    end,
    updated_at = timezone('utc', now())
  where memberships.community_id = new.community_id
    and memberships.status = 'active';

  return new;
end;
$$;

drop trigger if exists community_messages_update_counters on public.community_messages;
create trigger community_messages_update_counters
after insert on public.community_messages
for each row
execute procedure public.handle_community_message_counters();

create or replace function public.create_artist_community(
  community_name text,
  community_description text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  existing_community_id uuid;
  new_community_id uuid;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1
    from public.profiles profiles
    where profiles.id = current_user_id
      and profiles.role = 'creator'
  ) then
    raise exception 'Only creators can create a community';
  end if;

  select id
  into existing_community_id
  from public.artist_communities
  where creator_id = current_user_id
  limit 1;

  if existing_community_id is not null then
    return existing_community_id;
  end if;

  insert into public.artist_communities (creator_id, name, description)
  values (current_user_id, trim(community_name), nullif(trim(coalesce(community_description, '')), ''))
  returning id into new_community_id;

  return new_community_id;
end;
$$;

create or replace function public.update_artist_community(
  target_community_id uuid,
  community_name text,
  community_description text default null,
  enable_fan_interactions boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.user_is_community_admin(target_community_id, auth.uid()) then
    raise exception 'Only the community admin can update this community';
  end if;

  update public.artist_communities
  set
    name = trim(community_name),
    description = nullif(trim(coalesce(community_description, '')), ''),
    fan_interactions_enabled = enable_fan_interactions,
    updated_at = timezone('utc', now())
  where id = target_community_id;
end;
$$;

create or replace function public.invite_community_members(
  target_community_id uuid,
  member_ids uuid[]
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  community_name text;
  community_creator_id uuid;
  invited_count integer := 0;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if not public.user_is_community_admin(target_community_id, current_user_id) then
    raise exception 'Only the community admin can invite members';
  end if;

  select communities.name, communities.creator_id
  into community_name, community_creator_id
  from public.artist_communities communities
  where communities.id = target_community_id;

  if community_creator_id is null then
    raise exception 'Community not found';
  end if;

  with valid_recipients as (
    select distinct profile_id
    from unnest(coalesce(member_ids, array[]::uuid[])) as profile_id
    where profile_id is not null
      and profile_id <> community_creator_id
      and exists (
        select 1
        from public.profiles profiles
        where profiles.id = profile_id
      )
  ),
  pending_invites as (
    select recipients.profile_id
    from valid_recipients recipients
    where not exists (
      select 1
      from public.community_memberships memberships
      where memberships.community_id = target_community_id
        and memberships.user_id = recipients.profile_id
        and memberships.status = 'active'
    )
  ),
  upserted as (
    insert into public.community_memberships (
      community_id,
      user_id,
      role,
      status,
      invited_by,
      last_read_at,
      last_message_at,
      unread_count
    )
    select
      target_community_id,
      recipients.profile_id,
      'member'::public.community_member_role,
      'invited'::public.community_membership_status,
      current_user_id,
      timezone('utc', now()),
      timezone('utc', now()),
      0
    from pending_invites recipients
    on conflict (community_id, user_id) do update
    set
      role = case
        when public.community_memberships.role = 'admin' then public.community_memberships.role
        else 'member'::public.community_member_role
      end,
      status = case
        when public.community_memberships.role = 'admin' then public.community_memberships.status
        else 'invited'::public.community_membership_status
      end,
      invited_by = current_user_id,
      updated_at = timezone('utc', now())
    where public.community_memberships.role <> 'admin'
    returning user_id
  )
  insert into public.notifications (
    recipient_id,
    actor_id,
    type,
    title,
    body,
    link
  )
  select
    recipients.user_id,
    current_user_id,
    'community_invite',
    'Community invite',
    coalesce(community_name, 'A creator community') || ' invited you to join.',
    '/messages?community=' || target_community_id::text
  from upserted recipients;

  get diagnostics invited_count = row_count;
  return invited_count;
end;
$$;

create or replace function public.join_artist_community(target_community_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  community_creator_id uuid;
  community_name text;
  actor_name text;
  existing_status public.community_membership_status;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select communities.creator_id, communities.name
  into community_creator_id, community_name
  from public.artist_communities communities
  where communities.id = target_community_id;

  if community_creator_id is null then
    raise exception 'Community not found';
  end if;

  select memberships.status
  into existing_status
  from public.community_memberships memberships
  where memberships.community_id = target_community_id
    and memberships.user_id = current_user_id;

  if existing_status = 'active' then
    return target_community_id;
  end if;

  if not exists (
    select 1
    from public.community_memberships memberships
    where memberships.community_id = target_community_id
      and memberships.user_id = current_user_id
      and memberships.status = 'invited'
  ) and not exists (
    select 1
    from public.profile_follows follows
    where follows.follower_id = current_user_id
      and follows.followed_id = community_creator_id
  ) and not exists (
    select 1
    from public.creator_subscriptions subscriptions
    where subscriptions.subscriber_id = current_user_id
      and subscriptions.creator_id = community_creator_id
  ) then
    raise exception 'Only followers or subscribers can join this community';
  end if;

  insert into public.community_memberships (
    community_id,
    user_id,
    role,
    status,
    invited_by,
    joined_at,
    last_read_at,
    last_message_at,
    unread_count
  )
  values (
    target_community_id,
    current_user_id,
    case
      when current_user_id = community_creator_id then 'admin'::public.community_member_role
      else 'member'::public.community_member_role
    end,
    'active'::public.community_membership_status,
    community_creator_id,
    timezone('utc', now()),
    timezone('utc', now()),
    timezone('utc', now()),
    0
  )
  on conflict (community_id, user_id) do update
  set
    role = case
      when public.community_memberships.role = 'admin' then public.community_memberships.role
      else excluded.role
    end,
    status = 'active'::public.community_membership_status,
    joined_at = coalesce(public.community_memberships.joined_at, excluded.joined_at),
    last_read_at = excluded.last_read_at,
    last_message_at = greatest(public.community_memberships.last_message_at, excluded.last_message_at),
    unread_count = 0,
    updated_at = timezone('utc', now());

  if current_user_id <> community_creator_id then
    select profiles.full_name
    into actor_name
    from public.profiles profiles
    where profiles.id = current_user_id;

    insert into public.notifications (
      recipient_id,
      actor_id,
      type,
      title,
      body,
      link
    )
    values (
      community_creator_id,
      current_user_id,
      'community_joined',
      'New community member',
      coalesce(actor_name, 'Someone') || ' joined ' || coalesce(community_name, 'your community') || '.',
      '/messages?community=' || target_community_id::text
    );
  end if;

  return target_community_id;
end;
$$;

create or replace function public.respond_to_community_invite(
  target_community_id uuid,
  accept_invite boolean
)
returns public.community_membership_status
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if accept_invite then
    perform public.join_artist_community(target_community_id);
    return 'active'::public.community_membership_status;
  end if;

  update public.community_memberships
  set
    status = 'rejected'::public.community_membership_status,
    role = case
      when role = 'admin'::public.community_member_role then role
      else 'member'::public.community_member_role
    end,
    unread_count = 0,
    updated_at = timezone('utc', now())
  where community_id = target_community_id
    and user_id = auth.uid()
    and status = 'invited';

  return 'rejected'::public.community_membership_status;
end;
$$;

create or replace function public.set_community_member_role(
  target_community_id uuid,
  target_user_id uuid,
  target_role public.community_member_role
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  community_creator_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.user_is_community_admin(target_community_id, auth.uid()) then
    raise exception 'Only the community admin can change member roles';
  end if;

  if target_role = 'admin' then
    raise exception 'Promoting another admin is not supported';
  end if;

  select creator_id
  into community_creator_id
  from public.artist_communities
  where id = target_community_id;

  if target_user_id = community_creator_id then
    raise exception 'The creator always remains the admin';
  end if;

  update public.community_memberships
  set
    role = target_role,
    updated_at = timezone('utc', now())
  where community_id = target_community_id
    and user_id = target_user_id
    and status = 'active';
end;
$$;

create or replace function public.remove_community_member(
  target_community_id uuid,
  target_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  community_creator_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.user_is_community_admin(target_community_id, auth.uid()) then
    raise exception 'Only the community admin can remove members';
  end if;

  select creator_id
  into community_creator_id
  from public.artist_communities
  where id = target_community_id;

  if target_user_id = community_creator_id then
    raise exception 'The creator cannot be removed from the community';
  end if;

  delete from public.community_memberships
  where community_id = target_community_id
    and user_id = target_user_id;
end;
$$;

create or replace function public.leave_artist_community(target_community_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  community_creator_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select creator_id
  into community_creator_id
  from public.artist_communities
  where id = target_community_id;

  if community_creator_id = auth.uid() then
    raise exception 'The community admin cannot leave their own community';
  end if;

  delete from public.community_memberships
  where community_id = target_community_id
    and user_id = auth.uid();
end;
$$;

create or replace function public.mark_community_read(target_community_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  update public.community_memberships
  set
    unread_count = 0,
    last_read_at = timezone('utc', now()),
    updated_at = timezone('utc', now())
  where community_id = target_community_id
    and user_id = auth.uid();
end;
$$;

drop policy if exists "Artist communities are visible to eligible viewers" on public.artist_communities;

create policy "Artist communities are visible to eligible viewers"
on public.artist_communities
for select
to authenticated
using (
  creator_id = auth.uid()
  or public.user_is_community_member(id, auth.uid())
  or exists (
    select 1
    from public.profile_follows follows
    where follows.follower_id = auth.uid()
      and follows.followed_id = creator_id
  )
  or exists (
    select 1
    from public.creator_subscriptions subscriptions
    where subscriptions.subscriber_id = auth.uid()
      and subscriptions.creator_id = creator_id
  )
);

drop policy if exists "Community memberships are visible to members and admins" on public.community_memberships;

create policy "Community memberships are visible to members and admins"
on public.community_memberships
for select
to authenticated
using (
  user_id = auth.uid()
  or public.user_is_community_admin(community_id, auth.uid())
  or (
    status = 'active'
    and public.user_is_community_active_member(community_id, auth.uid())
  )
);

drop policy if exists "Community members can view community messages" on public.community_messages;
drop policy if exists "Eligible community members can send messages" on public.community_messages;

create policy "Community members can view community messages"
on public.community_messages
for select
to authenticated
using (public.can_view_community(community_id, auth.uid()));

create policy "Eligible community members can send messages"
on public.community_messages
for insert
to authenticated
with check (
  auth.uid() = sender_id
  and public.can_send_community_message(community_id, sender_id)
);

drop policy if exists "Community members can view reactions" on public.community_message_reactions;
drop policy if exists "Eligible community members can react" on public.community_message_reactions;
drop policy if exists "Users can remove their own reactions" on public.community_message_reactions;

create policy "Community members can view reactions"
on public.community_message_reactions
for select
to authenticated
using (
  exists (
    select 1
    from public.community_messages messages
    where messages.id = message_id
      and public.can_view_community(messages.community_id, auth.uid())
  )
);

create policy "Eligible community members can react"
on public.community_message_reactions
for insert
to authenticated
with check (
  auth.uid() = user_id
  and public.can_react_to_community_message(message_id, user_id)
);

create policy "Users can remove their own reactions"
on public.community_message_reactions
for delete
to authenticated
using (
  auth.uid() = user_id
  and public.can_react_to_community_message(message_id, user_id)
);

drop view if exists public.community_access_profiles;

create view public.community_access_profiles as
select
  communities.id as community_id,
  communities.creator_id,
  communities.name,
  communities.description,
  communities.fan_interactions_enabled,
  membership.role as viewer_role,
  membership.status as viewer_status,
  public.can_send_community_message(communities.id, auth.uid()) as can_send_messages,
  (
    auth.uid() is not null
    and (
      membership.status in ('invited', 'active')
      or exists (
        select 1
        from public.profile_follows follows
        where follows.follower_id = auth.uid()
          and follows.followed_id = communities.creator_id
      )
      or exists (
        select 1
        from public.creator_subscriptions subscriptions
        where subscriptions.subscriber_id = auth.uid()
          and subscriptions.creator_id = communities.creator_id
      )
    )
  ) as can_join,
  coalesce(member_count.member_count, 0)::integer as member_count
from public.artist_communities communities
left join public.community_memberships membership
  on membership.community_id = communities.id
  and membership.user_id = auth.uid()
left join lateral (
  select count(*)::integer as member_count
  from public.community_memberships memberships
  where memberships.community_id = communities.id
    and memberships.status = 'active'
) member_count on true
where auth.uid() is not null
  and (
    communities.creator_id = auth.uid()
    or membership.status in ('invited', 'active')
    or exists (
      select 1
      from public.profile_follows follows
      where follows.follower_id = auth.uid()
        and follows.followed_id = communities.creator_id
    )
    or exists (
      select 1
      from public.creator_subscriptions subscriptions
      where subscriptions.subscriber_id = auth.uid()
        and subscriptions.creator_id = communities.creator_id
    )
  );

drop view if exists public.community_previews;

create view public.community_previews as
select
  communities.id as community_id,
  communities.creator_id,
  communities.name,
  communities.description,
  communities.fan_interactions_enabled,
  memberships.role as viewer_role,
  memberships.status as viewer_status,
  memberships.unread_count,
  memberships.joined_at,
  memberships.last_read_at,
  memberships.last_message_at,
  creator.full_name as creator_full_name,
  creator.is_verified_artist as creator_is_verified_artist,
  creator.username as creator_username,
  creator.avatar_url as creator_avatar_url,
  creator.role as creator_role,
  last_message.id as last_message_id,
  last_message.body as last_message_body,
  last_message.created_at as last_message_created_at,
  last_sender.id as last_message_sender_id,
  last_sender.full_name as last_message_sender_full_name,
  last_sender.username as last_message_sender_username,
  public.can_send_community_message(communities.id, auth.uid()) as can_send_messages,
  coalesce(member_count.member_count, 0)::integer as member_count
from public.artist_communities communities
join public.community_memberships memberships
  on memberships.community_id = communities.id
  and memberships.user_id = auth.uid()
  and memberships.status in ('invited', 'active')
join public.profiles creator
  on creator.id = communities.creator_id
left join lateral (
  select messages.id, messages.body, messages.created_at, messages.sender_id
  from public.community_messages messages
  where messages.community_id = communities.id
  order by messages.created_at desc
  limit 1
) last_message on true
left join public.profiles last_sender
  on last_sender.id = last_message.sender_id
left join lateral (
  select count(*)::integer as member_count
  from public.community_memberships memberships_rollup
  where memberships_rollup.community_id = communities.id
    and memberships_rollup.status = 'active'
) member_count on true;

drop view if exists public.community_member_directory;

create view public.community_member_directory as
select
  memberships.community_id,
  memberships.user_id,
  memberships.role,
  memberships.status,
  memberships.joined_at,
  memberships.created_at,
  profiles.full_name,
  profiles.role as profile_role,
  profiles.is_verified_artist,
  profiles.username,
  profiles.avatar_url,
  creator_profiles.slug as creator_slug,
  creator_profiles.headline
from public.community_memberships memberships
join public.profiles profiles
  on profiles.id = memberships.user_id
left join public.creator_profiles creator_profiles
  on creator_profiles.id = profiles.id
  and creator_profiles.is_published = true
where memberships.user_id = auth.uid()
  or public.user_is_community_admin(memberships.community_id, auth.uid())
  or (
    memberships.status = 'active'
    and public.user_is_community_active_member(memberships.community_id, auth.uid())
  );

drop view if exists public.community_message_entries;

create view public.community_message_entries as
select
  messages.id,
  messages.community_id,
  messages.sender_id,
  messages.body,
  messages.parent_message_id,
  messages.created_at,
  sender.full_name,
  sender.role as sender_role,
  sender.is_verified_artist,
  sender.username,
  sender.avatar_url,
  parent_message.body as parent_body,
  parent_sender.full_name as parent_sender_full_name,
  parent_sender.username as parent_sender_username,
  coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'emoji', reaction_rollup.emoji,
        'count', reaction_rollup.reaction_count,
        'reacted_by_viewer', reaction_rollup.reacted_by_viewer
      )
      order by reaction_rollup.emoji
    )
    from (
      select
        reactions.emoji,
        count(*)::integer as reaction_count,
        bool_or(reactions.user_id = auth.uid()) as reacted_by_viewer
      from public.community_message_reactions reactions
      where reactions.message_id = messages.id
      group by reactions.emoji
    ) reaction_rollup
  ), '[]'::jsonb) as reaction_summary
from public.community_messages messages
join public.profiles sender
  on sender.id = messages.sender_id
left join public.community_messages parent_message
  on parent_message.id = messages.parent_message_id
left join public.profiles parent_sender
  on parent_sender.id = parent_message.sender_id
where public.can_view_community(messages.community_id, auth.uid());

grant execute on function public.user_is_community_member(uuid, uuid) to authenticated;
grant execute on function public.user_is_community_active_member(uuid, uuid) to authenticated;
grant execute on function public.user_is_community_manager(uuid, uuid) to authenticated;
grant execute on function public.user_is_community_admin(uuid, uuid) to authenticated;
grant execute on function public.can_view_community(uuid, uuid) to authenticated;
grant execute on function public.can_send_community_message(uuid, uuid) to authenticated;
grant execute on function public.can_react_to_community_message(uuid, uuid) to authenticated;
grant execute on function public.create_artist_community(text, text) to authenticated;
grant execute on function public.update_artist_community(uuid, text, text, boolean) to authenticated;
grant execute on function public.invite_community_members(uuid, uuid[]) to authenticated;
grant execute on function public.join_artist_community(uuid) to authenticated;
grant execute on function public.respond_to_community_invite(uuid, boolean) to authenticated;
grant execute on function public.set_community_member_role(uuid, uuid, public.community_member_role) to authenticated;
grant execute on function public.remove_community_member(uuid, uuid) to authenticated;
grant execute on function public.leave_artist_community(uuid) to authenticated;
grant execute on function public.mark_community_read(uuid) to authenticated;

grant select on public.community_access_profiles to authenticated;
grant select on public.community_previews to authenticated;
grant select on public.community_member_directory to authenticated;
grant select on public.community_message_entries to authenticated;
