alter table public.profiles
  add column if not exists is_verified_artist boolean not null default false,
  add column if not exists verified_artist_at timestamptz;

create table if not exists public.artist_verification_payments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  razorpay_order_id text not null unique,
  razorpay_payment_id text unique,
  amount_paise integer not null check (amount_paise > 0),
  currency text not null default 'INR',
  status text not null default 'created' check (status in ('created', 'paid', 'failed')),
  metadata jsonb not null default '{}'::jsonb,
  verified_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists artist_verification_payments_profile_idx
on public.artist_verification_payments (profile_id, created_at desc);

create index if not exists artist_verification_payments_status_idx
on public.artist_verification_payments (status, created_at desc);

alter table public.artist_verification_payments enable row level security;

drop trigger if exists artist_verification_payments_set_updated_at on public.artist_verification_payments;

create trigger artist_verification_payments_set_updated_at
before update on public.artist_verification_payments
for each row
execute procedure public.set_updated_at();

drop policy if exists "Users can view their own artist verification payments" on public.artist_verification_payments;

create policy "Users can view their own artist verification payments"
on public.artist_verification_payments
for select
to authenticated
using (auth.uid() = profile_id);

create or replace function public.slugify(value text)
returns text
language sql
immutable
as $$
  select trim(both '-' from regexp_replace(
    regexp_replace(
      regexp_replace(lower(coalesce(value, '')), '[^a-z0-9\s-]', '', 'g'),
      '\s+',
      '-',
      'g'
    ),
    '-+',
    '-',
    'g'
  ));
$$;

create or replace function public.convert_profile_to_creator(desired_slug text default null)
returns table (
  role public.app_role,
  creator_slug text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_username text;
  current_full_name text;
  existing_slug text;
  base_slug text;
  next_slug text;
  suffix integer := 1;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select p.username, p.full_name
  into current_username, current_full_name
  from public.profiles p
  where p.id = current_user_id;

  if current_full_name is null then
    raise exception 'Profile not found';
  end if;

  update public.profiles
  set role = 'creator'
  where id = current_user_id;

  select cp.slug
  into existing_slug
  from public.creator_profiles cp
  where cp.id = current_user_id;

  if existing_slug is null then
    base_slug := nullif(public.slugify(desired_slug), '');

    if base_slug is null then
      base_slug := nullif(public.slugify(coalesce(current_username, current_full_name)), '');
    end if;

    if base_slug is null then
      base_slug := 'artist-' || left(replace(current_user_id::text, '-', ''), 8);
    end if;

    next_slug := base_slug;

    while exists (
      select 1
      from public.creator_profiles cp
      where cp.slug = next_slug
        and cp.id <> current_user_id
    ) loop
      suffix := suffix + 1;
      next_slug := base_slug || '-' || suffix::text;
    end loop;

    insert into public.creator_profiles (id, slug)
    values (current_user_id, next_slug)
    on conflict (id) do nothing;

    existing_slug := next_slug;
  end if;

  return query
  select p.role, existing_slug
  from public.profiles p
  where p.id = current_user_id;
end;
$$;

grant execute on function public.convert_profile_to_creator(text) to authenticated;

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
  p.bio,
  p.website,
  p.location,
  cp.headline,
  cp.about,
  cp.featured_quote
from public.creator_profiles cp
join public.profiles p on p.id = cp.id
where cp.is_published = true;

drop view if exists public.public_member_profiles;

create view public.public_member_profiles as
select
  p.id,
  p.full_name,
  p.is_verified_artist,
  p.verified_artist_at,
  p.username,
  p.avatar_url,
  p.bio,
  p.website,
  p.location,
  p.role,
  cp.slug as creator_slug,
  cp.headline,
  cp.about,
  cp.featured_quote,
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
  and cp.is_published = true;

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
  cp.headline
from public.posts p
join public.profiles pr on pr.id = p.author_id
left join public.creator_profiles cp on cp.id = p.author_id
where p.is_published = true
order by p.created_at desc;

drop view if exists public.comment_threads;

create view public.comment_threads as
select
  c.id,
  c.post_id,
  c.body,
  c.created_at,
  c.author_id,
  p.full_name,
  p.is_verified_artist as author_is_verified_artist,
  p.username,
  p.avatar_url
from public.post_comments c
join public.profiles p on p.id = c.author_id;

drop view if exists public.direct_thread_previews;

create view public.direct_thread_previews as
select
  t.id as thread_id,
  peer.id as peer_id,
  peer.full_name as peer_full_name,
  peer.is_verified_artist as peer_is_verified_artist,
  peer.username as peer_username,
  peer.avatar_url as peer_avatar_url,
  peer.role as peer_role,
  last_message.body as last_message_body,
  last_message.created_at as last_message_created_at,
  coalesce(members.unread_count, 0)::integer as unread_count,
  coalesce(message_count.message_count, 0)::integer as message_count
from public.direct_threads t
join public.direct_thread_members self_member
  on self_member.thread_id = t.id
  and self_member.user_id = auth.uid()
join public.direct_thread_members peer_member
  on peer_member.thread_id = t.id
  and peer_member.user_id <> auth.uid()
join public.direct_thread_members members
  on members.thread_id = t.id
  and members.user_id = auth.uid()
join public.profiles peer
  on peer.id = peer_member.user_id
left join lateral (
  select dm.body, dm.created_at
  from public.direct_messages dm
  where dm.thread_id = t.id
  order by dm.created_at desc
  limit 1
) last_message on true
left join lateral (
  select count(*) as message_count
  from public.direct_messages dm
  where dm.thread_id = t.id
) message_count on true
where (
  select count(*)
  from public.direct_thread_members thread_members
  where thread_members.thread_id = t.id
) = 2;

drop view if exists public.direct_message_entries;

create view public.direct_message_entries as
select
  dm.id,
  dm.thread_id,
  dm.sender_id,
  dm.body,
  dm.created_at,
  p.full_name,
  p.is_verified_artist,
  p.username,
  p.avatar_url
from public.direct_messages dm
join public.profiles p on p.id = dm.sender_id
where exists (
  select 1
  from public.direct_thread_members members
  where members.thread_id = dm.thread_id
    and members.user_id = auth.uid()
);

drop view if exists public.notification_items;

create view public.notification_items as
select
  n.id,
  n.recipient_id,
  n.actor_id,
  n.type,
  n.title,
  n.body,
  n.link,
  n.is_read,
  n.created_at,
  p.full_name as actor_full_name,
  p.is_verified_artist as actor_is_verified_artist,
  p.username as actor_username,
  p.avatar_url as actor_avatar_url
from public.notifications n
left join public.profiles p on p.id = n.actor_id
where n.recipient_id = auth.uid();

grant select on public.public_creator_profiles to anon, authenticated;
grant select on public.public_member_profiles to anon, authenticated;
grant select on public.feed_posts to authenticated;
grant select on public.comment_threads to authenticated;
grant select on public.direct_thread_previews to authenticated;
grant select on public.direct_message_entries to authenticated;
grant select on public.notification_items to authenticated;
