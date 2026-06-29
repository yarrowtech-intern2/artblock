alter table public.profiles
  add column if not exists cover_url text,
  add column if not exists gender text;

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

grant select on public.public_creator_profiles to anon, authenticated;
grant select on public.public_member_profiles to anon, authenticated;
