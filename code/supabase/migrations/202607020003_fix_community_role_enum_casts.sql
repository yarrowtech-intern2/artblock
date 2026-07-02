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
        when public.community_memberships.role = 'admin'::public.community_member_role then public.community_memberships.role
        else 'member'::public.community_member_role
      end,
      status = case
        when public.community_memberships.role = 'admin'::public.community_member_role then public.community_memberships.status
        else 'invited'::public.community_membership_status
      end,
      invited_by = current_user_id,
      updated_at = timezone('utc', now())
    where public.community_memberships.role <> 'admin'::public.community_member_role
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

  if existing_status = 'active'::public.community_membership_status then
    return target_community_id;
  end if;

  if not exists (
    select 1
    from public.community_memberships memberships
    where memberships.community_id = target_community_id
      and memberships.user_id = current_user_id
      and memberships.status = 'invited'::public.community_membership_status
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
      when public.community_memberships.role = 'admin'::public.community_member_role then public.community_memberships.role
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
    and status = 'invited'::public.community_membership_status;

  return 'rejected'::public.community_membership_status;
end;
$$;
