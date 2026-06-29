alter table public.profiles
  add column if not exists gender text;

create table if not exists public.user_settings (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  keep_me_signed_in boolean not null default true,
  profile_visibility text not null default 'public'
    check (profile_visibility in ('public', 'members', 'private')),
  message_permissions text not null default 'everyone'
    check (message_permissions in ('everyone', 'followers', 'nobody')),
  comment_permissions text not null default 'everyone'
    check (comment_permissions in ('everyone', 'followers', 'nobody')),
  notify_new_followers boolean not null default true,
  notify_new_subscribers boolean not null default true,
  notify_new_messages boolean not null default true,
  notify_post_likes boolean not null default true,
  notify_post_comments boolean not null default true,
  deactivated_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.user_settings enable row level security;

insert into public.user_settings (profile_id)
select p.id
from public.profiles p
on conflict (profile_id) do nothing;

create or replace function public.handle_new_user_settings()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_settings (profile_id)
  values (new.id)
  on conflict (profile_id) do nothing;

  return new;
end;
$$;

drop trigger if exists profiles_create_user_settings on public.profiles;

create trigger profiles_create_user_settings
after insert on public.profiles
for each row
execute procedure public.handle_new_user_settings();

drop trigger if exists user_settings_set_updated_at on public.user_settings;

create trigger user_settings_set_updated_at
before update on public.user_settings
for each row
execute procedure public.set_updated_at();

create or replace function public.guard_user_settings_danger_fields()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is not null then
    if tg_op = 'INSERT' and new.deactivated_at is not null then
      raise exception 'Account state can only be changed by secure server actions';
    end if;

    if tg_op = 'UPDATE' and new.deactivated_at is distinct from old.deactivated_at then
      raise exception 'Account state can only be changed by secure server actions';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists user_settings_guard_danger_fields on public.user_settings;

create trigger user_settings_guard_danger_fields
before insert or update on public.user_settings
for each row
execute procedure public.guard_user_settings_danger_fields();

drop policy if exists "Users can view their own settings" on public.user_settings;
drop policy if exists "Users can insert their own settings" on public.user_settings;
drop policy if exists "Users can update their own settings" on public.user_settings;

create policy "Users can view their own settings"
on public.user_settings
for select
to authenticated
using (auth.uid() = profile_id);

create policy "Users can insert their own settings"
on public.user_settings
for insert
to authenticated
with check (auth.uid() = profile_id);

create policy "Users can update their own settings"
on public.user_settings
for update
to authenticated
using (auth.uid() = profile_id)
with check (auth.uid() = profile_id);

create or replace function public.can_view_profile(target_profile_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  target_visibility text := 'public';
  target_deactivated_at timestamptz;
begin
  if target_profile_id is null then
    return false;
  end if;

  if auth.uid() = target_profile_id then
    return true;
  end if;

  select
    coalesce(settings.profile_visibility, 'public'),
    settings.deactivated_at
  into
    target_visibility,
    target_deactivated_at
  from public.user_settings settings
  where settings.profile_id = target_profile_id;

  if target_deactivated_at is not null then
    return false;
  end if;

  if target_visibility = 'public' then
    return true;
  end if;

  if target_visibility = 'members' then
    return auth.uid() is not null;
  end if;

  return false;
end;
$$;

create or replace function public.can_message_profile(
  target_profile_id uuid,
  viewer_profile_id uuid default auth.uid()
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  target_permissions text := 'everyone';
  target_deactivated_at timestamptz;
begin
  if target_profile_id is null or viewer_profile_id is null or target_profile_id = viewer_profile_id then
    return false;
  end if;

  select
    coalesce(settings.message_permissions, 'everyone'),
    settings.deactivated_at
  into
    target_permissions,
    target_deactivated_at
  from public.user_settings settings
  where settings.profile_id = target_profile_id;

  target_permissions := coalesce(target_permissions, 'everyone');

  if target_deactivated_at is not null then
    return false;
  end if;

  if target_permissions = 'everyone' then
    return true;
  end if;

  if target_permissions = 'followers' then
    return exists (
      select 1
      from public.profile_follows follows
      where follows.follower_id = viewer_profile_id
        and follows.followed_id = target_profile_id
    );
  end if;

  return false;
end;
$$;

create or replace function public.can_send_thread_message(
  target_thread_id uuid,
  sender_profile_id uuid default auth.uid()
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  peer_profile_id uuid;
begin
  if target_thread_id is null or sender_profile_id is null then
    return false;
  end if;

  select members.user_id
  into peer_profile_id
  from public.direct_thread_members members
  where members.thread_id = target_thread_id
    and members.user_id <> sender_profile_id
  limit 1;

  if peer_profile_id is null then
    return false;
  end if;

  return public.can_message_profile(peer_profile_id, sender_profile_id);
end;
$$;

create or replace function public.can_comment_on_post(
  target_post_id uuid,
  commenter_profile_id uuid default auth.uid()
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  post_author_id uuid;
  author_comment_permissions text := 'everyone';
  author_deactivated_at timestamptz;
begin
  if target_post_id is null or commenter_profile_id is null then
    return false;
  end if;

  select posts.author_id
  into post_author_id
  from public.posts posts
  where posts.id = target_post_id;

  if post_author_id is null then
    return false;
  end if;

  if post_author_id = commenter_profile_id then
    return true;
  end if;

  select
    coalesce(settings.comment_permissions, 'everyone'),
    settings.deactivated_at
  into
    author_comment_permissions,
    author_deactivated_at
  from public.user_settings settings
  where settings.profile_id = post_author_id;

  if author_deactivated_at is not null then
    return false;
  end if;

  if author_comment_permissions = 'everyone' then
    return true;
  end if;

  if author_comment_permissions = 'followers' then
    return exists (
      select 1
      from public.profile_follows follows
      where follows.follower_id = commenter_profile_id
        and follows.followed_id = post_author_id
    );
  end if;

  return false;
end;
$$;

create or replace function public.open_direct_thread(peer_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  existing_thread_id uuid;
  new_thread_id uuid;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if peer_id is null or peer_id = current_user_id then
    raise exception 'A valid peer profile is required';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = peer_id
  ) then
    raise exception 'Peer profile not found';
  end if;

  if not public.can_message_profile(peer_id, current_user_id) then
    raise exception 'This profile is not accepting direct messages from you';
  end if;

  select thread_id
  into existing_thread_id
  from (
    select m_self.thread_id
    from public.direct_thread_members m_self
    join public.direct_thread_members m_peer
      on m_peer.thread_id = m_self.thread_id
    where m_self.user_id = current_user_id
      and m_peer.user_id = peer_id
      and (
        select count(*)
        from public.direct_thread_members members
        where members.thread_id = m_self.thread_id
      ) = 2
    limit 1
  ) matched_thread;

  if existing_thread_id is not null then
    return existing_thread_id;
  end if;

  insert into public.direct_threads default values
  returning id into new_thread_id;

  insert into public.direct_thread_members (thread_id, user_id)
  values
    (new_thread_id, current_user_id),
    (new_thread_id, peer_id);

  return new_thread_id;
end;
$$;

drop policy if exists "Thread members can send direct messages" on public.direct_messages;

create policy "Thread members can send direct messages"
on public.direct_messages
for insert
to authenticated
with check (
  auth.uid() = sender_id
  and public.user_is_thread_member(thread_id)
  and public.can_send_thread_message(thread_id, sender_id)
);

drop policy if exists "Comments are insertable by the author" on public.post_comments;

create policy "Comments are insertable by the author"
on public.post_comments
for insert
to authenticated
with check (
  auth.uid() = author_id
  and public.can_comment_on_post(post_id, author_id)
);

create or replace function public.create_follow_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_name text;
begin
  if exists (
    select 1
    from public.user_settings settings
    where settings.profile_id = new.followed_id
      and settings.notify_new_followers = false
  ) then
    return new;
  end if;

  select full_name into actor_name
  from public.profiles
  where id = new.follower_id;

  insert into public.notifications (
    recipient_id,
    actor_id,
    type,
    title,
    body,
    link
  )
  values (
    new.followed_id,
    new.follower_id,
    'new_follower',
    'New follower',
    coalesce(actor_name, 'Someone') || ' followed your profile.',
    '/profiles/' || new.follower_id::text
  );

  return new;
end;
$$;

create or replace function public.create_subscription_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_name text;
begin
  if exists (
    select 1
    from public.user_settings settings
    where settings.profile_id = new.creator_id
      and settings.notify_new_subscribers = false
  ) then
    return new;
  end if;

  select full_name into actor_name
  from public.profiles
  where id = new.subscriber_id;

  insert into public.notifications (
    recipient_id,
    actor_id,
    type,
    title,
    body,
    link
  )
  values (
    new.creator_id,
    new.subscriber_id,
    'new_subscriber',
    'New subscriber',
    coalesce(actor_name, 'Someone') || ' subscribed to your creator profile.',
    '/profiles/' || new.subscriber_id::text
  );

  return new;
end;
$$;

create or replace function public.create_message_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_name text;
begin
  select full_name into actor_name
  from public.profiles
  where id = new.sender_id;

  insert into public.notifications (
    recipient_id,
    actor_id,
    type,
    title,
    body,
    link
  )
  select
    members.user_id,
    new.sender_id,
    'new_message',
    'New message',
    coalesce(actor_name, 'Someone') || ': ' || left(new.body, 120),
    '/messages?thread=' || new.thread_id::text
  from public.direct_thread_members members
  where members.thread_id = new.thread_id
    and members.user_id <> new.sender_id
    and not exists (
      select 1
      from public.user_settings settings
      where settings.profile_id = members.user_id
        and settings.notify_new_messages = false
    );

  return new;
end;
$$;

create or replace function public.create_post_like_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_name text;
  post_author_id uuid;
begin
  select full_name into actor_name
  from public.profiles
  where id = new.user_id;

  select author_id into post_author_id
  from public.posts
  where id = new.post_id;

  if post_author_id is null or post_author_id = new.user_id then
    return new;
  end if;

  if exists (
    select 1
    from public.user_settings settings
    where settings.profile_id = post_author_id
      and settings.notify_post_likes = false
  ) then
    return new;
  end if;

  insert into public.notifications (
    recipient_id,
    actor_id,
    type,
    title,
    body,
    link
  )
  values (
    post_author_id,
    new.user_id,
    'post_like',
    'New like',
    coalesce(actor_name, 'Someone') || ' liked your post.',
    '/feed'
  );

  return new;
end;
$$;

create or replace function public.create_post_comment_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_name text;
  post_author_id uuid;
begin
  select full_name into actor_name
  from public.profiles
  where id = new.author_id;

  select author_id into post_author_id
  from public.posts
  where id = new.post_id;

  if post_author_id is null or post_author_id = new.author_id then
    return new;
  end if;

  if exists (
    select 1
    from public.user_settings settings
    where settings.profile_id = post_author_id
      and settings.notify_post_comments = false
  ) then
    return new;
  end if;

  insert into public.notifications (
    recipient_id,
    actor_id,
    type,
    title,
    body,
    link
  )
  values (
    post_author_id,
    new.author_id,
    'post_comment',
    'New comment',
    coalesce(actor_name, 'Someone') || ' commented: ' || left(new.body, 120),
    '/feed'
  );

  return new;
end;
$$;

drop view if exists public.public_creator_profiles;

create view public.public_creator_profiles as
select
  cp.id,
  cp.slug,
  p.full_name,
  p.is_verified_artist,
  p.verified_artist_at,
  p.username,
  p.avatar_url,
  p.cover_url,
  p.gender,
  p.bio,
  p.website,
  p.location,
  cp.headline,
  cp.about,
  cp.featured_quote,
  coalesce(settings.profile_visibility, 'public') as profile_visibility
from public.creator_profiles cp
join public.profiles p on p.id = cp.id
left join public.user_settings settings on settings.profile_id = p.id
where cp.is_published = true
  and public.can_view_profile(cp.id);

drop view if exists public.public_member_profiles;

create view public.public_member_profiles as
select
  p.id,
  p.full_name,
  p.is_verified_artist,
  p.verified_artist_at,
  p.username,
  p.avatar_url,
  p.cover_url,
  p.gender,
  p.bio,
  p.website,
  p.location,
  p.role,
  cp.slug as creator_slug,
  cp.headline,
  cp.about,
  cp.featured_quote,
  coalesce(settings.profile_visibility, 'public') as profile_visibility,
  coalesce(settings.message_permissions, 'everyone') as message_permissions,
  public.can_message_profile(p.id) as viewer_can_message,
  coalesce((
    select count(*)
    from public.profile_follows f
    where f.followed_id = p.id
  ), 0)::integer as follower_count,
  coalesce((
    select count(*)
    from public.profile_follows f
    where f.follower_id = p.id
  ), 0)::integer as following_count,
  coalesce((
    select count(*)
    from public.creator_subscriptions s
    where s.creator_id = p.id
  ), 0)::integer as subscriber_count,
  coalesce((
    select count(*)
    from public.posts posts
    where posts.author_id = p.id
      and posts.is_published = true
  ), 0)::integer as post_count
from public.profiles p
left join public.creator_profiles cp
  on cp.id = p.id
  and cp.is_published = true
left join public.user_settings settings
  on settings.profile_id = p.id
where public.can_view_profile(p.id);

drop view if exists public.feed_posts;

create view public.feed_posts as
select
  p.id,
  p.author_id,
  p.post_type,
  p.title,
  coalesce(p.body, p.caption) as body,
  p.media_url,
  p.is_published,
  p.is_pinned,
  p.created_at,
  pr.full_name,
  pr.is_verified_artist,
  pr.username,
  pr.avatar_url,
  cp.slug as creator_slug,
  cp.headline,
  coalesce(settings.comment_permissions, 'everyone') as comment_permissions,
  public.can_comment_on_post(p.id) as viewer_can_comment
from public.posts p
join public.profiles pr on pr.id = p.author_id
left join public.creator_profiles cp on cp.id = p.author_id
left join public.user_settings settings on settings.profile_id = pr.id
where p.is_published = true
  and public.can_view_profile(pr.id)
order by p.created_at desc;

grant select on public.public_creator_profiles to anon, authenticated;
grant select on public.public_member_profiles to anon, authenticated;
grant select on public.feed_posts to authenticated;
