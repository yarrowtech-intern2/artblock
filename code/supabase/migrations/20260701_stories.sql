create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  media_kind public.feed_post_type not null,
  media_url text not null,
  media_storage_path text,
  thumbnail_url text,
  thumbnail_storage_path text,
  body text,
  media_duration_seconds numeric(8, 2),
  media_width integer,
  media_height integer,
  compression_status text not null default 'original',
  expires_at timestamptz not null default timezone('utc', now()) + interval '24 hours',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint stories_media_kind_check check (media_kind in ('image', 'video')),
  constraint stories_compression_status_check check (compression_status in ('original', 'compressed')),
  constraint stories_expiry_window_check check (expires_at > created_at)
);

create index if not exists stories_author_expires_idx
on public.stories (author_id, expires_at desc, created_at desc);

create index if not exists stories_expires_created_idx
on public.stories (expires_at desc, created_at desc);

alter table public.stories enable row level security;

drop trigger if exists stories_set_updated_at on public.stories;

create trigger stories_set_updated_at
before update on public.stories
for each row
execute procedure public.set_updated_at();

drop policy if exists "Authenticated users can view active stories they are allowed to see" on public.stories;
drop policy if exists "Creators can insert their own stories" on public.stories;
drop policy if exists "Creators can update their own stories" on public.stories;
drop policy if exists "Creators can delete their own stories" on public.stories;

create policy "Authenticated users can view active stories they are allowed to see"
on public.stories
for select
to authenticated
using (
  expires_at > timezone('utc', now())
  and public.can_view_profile(author_id)
);

create policy "Creators can insert their own stories"
on public.stories
for insert
to authenticated
with check (auth.uid() = author_id);

create policy "Creators can update their own stories"
on public.stories
for update
to authenticated
using (auth.uid() = author_id)
with check (auth.uid() = author_id);

create policy "Creators can delete their own stories"
on public.stories
for delete
to authenticated
using (auth.uid() = author_id);

create table if not exists public.story_views (
  story_id uuid not null references public.stories (id) on delete cascade,
  viewer_id uuid not null references public.profiles (id) on delete cascade,
  viewed_at timestamptz not null default timezone('utc', now()),
  primary key (story_id, viewer_id)
);

create index if not exists story_views_viewer_idx
on public.story_views (viewer_id, viewed_at desc);

alter table public.story_views enable row level security;

drop policy if exists "Users can view their own story view markers" on public.story_views;
drop policy if exists "Users can insert their own story view markers" on public.story_views;
drop policy if exists "Users can update their own story view markers" on public.story_views;

create policy "Users can view their own story view markers"
on public.story_views
for select
to authenticated
using (auth.uid() = viewer_id);

create policy "Users can insert their own story view markers"
on public.story_views
for insert
to authenticated
with check (auth.uid() = viewer_id);

create policy "Users can update their own story view markers"
on public.story_views
for update
to authenticated
using (auth.uid() = viewer_id)
with check (auth.uid() = viewer_id);

drop view if exists public.active_stories;

create view public.active_stories as
select
  s.id,
  s.author_id,
  s.media_kind,
  s.media_url,
  s.media_storage_path,
  s.thumbnail_url,
  s.thumbnail_storage_path,
  s.body,
  s.media_duration_seconds,
  s.media_width,
  s.media_height,
  s.compression_status,
  s.expires_at,
  s.created_at,
  pr.full_name,
  pr.is_verified_artist,
  pr.username,
  pr.avatar_url,
  cp.slug as creator_slug,
  cp.headline
from public.stories s
join public.profiles pr on pr.id = s.author_id
left join public.creator_profiles cp on cp.id = s.author_id
where s.expires_at > timezone('utc', now())
  and public.can_view_profile(pr.id)
order by s.created_at asc;

grant select on public.active_stories to authenticated;
