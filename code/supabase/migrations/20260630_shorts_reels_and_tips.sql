do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'post_surface'
      and n.nspname = 'public'
  ) then
    create type public.post_surface as enum ('feed', 'short');
  end if;
end
$$;

alter table public.posts
  add column if not exists surface public.post_surface not null default 'feed',
  add column if not exists thumbnail_url text,
  add column if not exists media_storage_path text,
  add column if not exists thumbnail_storage_path text,
  add column if not exists media_duration_seconds numeric(8, 2),
  add column if not exists media_width integer,
  add column if not exists media_height integer,
  add column if not exists compression_status text not null default 'original',
  add column if not exists tip_enabled boolean not null default true;

alter table public.posts
  drop constraint if exists posts_surface_media_check;

alter table public.posts
  add constraint posts_surface_media_check
  check (
    surface <> 'short'
    or post_type in ('image', 'video')
  );

alter table public.posts
  drop constraint if exists posts_compression_status_check;

alter table public.posts
  add constraint posts_compression_status_check
  check (compression_status in ('original', 'compressed'));

create index if not exists posts_surface_published_created_idx
on public.posts (surface, is_published, created_at desc);

create table if not exists public.post_shares (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  platform text not null default 'system',
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists post_shares_post_idx
on public.post_shares (post_id, created_at desc);

create index if not exists post_shares_user_idx
on public.post_shares (user_id, created_at desc);

alter table public.post_shares enable row level security;

drop policy if exists "Users can view their own shares" on public.post_shares;
drop policy if exists "Users can insert their own shares" on public.post_shares;

create policy "Users can view their own shares"
on public.post_shares
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own shares"
on public.post_shares
for insert
to authenticated
with check (auth.uid() = user_id);

create table if not exists public.artist_tips (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.posts (id) on delete set null,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  razorpay_order_id text not null unique,
  razorpay_payment_id text unique,
  amount_paise integer not null check (amount_paise > 0),
  currency text not null default 'INR',
  message text,
  status text not null default 'created' check (status in ('created', 'paid', 'failed')),
  metadata jsonb not null default '{}'::jsonb,
  paid_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists artist_tips_recipient_idx
on public.artist_tips (recipient_id, created_at desc);

create index if not exists artist_tips_sender_idx
on public.artist_tips (sender_id, created_at desc);

create index if not exists artist_tips_post_status_idx
on public.artist_tips (post_id, status, created_at desc);

alter table public.artist_tips enable row level security;

drop trigger if exists artist_tips_set_updated_at on public.artist_tips;

create trigger artist_tips_set_updated_at
before update on public.artist_tips
for each row
execute procedure public.set_updated_at();

drop policy if exists "Users can view their sent or received tips" on public.artist_tips;

create policy "Users can view their sent or received tips"
on public.artist_tips
for select
to authenticated
using (
  auth.uid() = sender_id
  or auth.uid() = recipient_id
);

drop view if exists public.post_engagement_stats;

create view public.post_engagement_stats as
select
  p.id as post_id,
  count(distinct r.id) filter (where r.reaction_type = 'like') as like_count,
  count(distinct c.id) as comment_count,
  count(distinct s.id) as share_count,
  coalesce(sum(t.amount_paise) filter (where t.status = 'paid'), 0)::bigint as tip_total_paise
from public.posts p
left join public.post_reactions r on r.post_id = p.id
left join public.post_comments c on c.post_id = p.id
left join public.post_shares s on s.post_id = p.id
left join public.artist_tips t on t.post_id = p.id
group by p.id;

drop view if exists public.feed_posts;

create view public.feed_posts as
select
  p.id,
  p.author_id,
  p.post_type,
  p.surface,
  p.title,
  coalesce(p.body, p.caption) as body,
  p.media_url,
  p.thumbnail_url,
  p.media_duration_seconds,
  p.media_width,
  p.media_height,
  p.tip_enabled,
  coalesce(engagement.share_count, 0)::integer as share_count,
  coalesce(engagement.tip_total_paise, 0)::bigint as tip_total_paise,
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
left join public.post_engagement_stats engagement on engagement.post_id = p.id
where p.is_published = true
  and p.surface = 'feed'
  and public.can_view_profile(pr.id)
order by p.created_at desc;

drop view if exists public.short_posts;

create view public.short_posts as
select
  p.id,
  p.author_id,
  p.post_type,
  p.surface,
  p.title,
  coalesce(p.body, p.caption) as body,
  p.media_url,
  p.thumbnail_url,
  p.media_duration_seconds,
  p.media_width,
  p.media_height,
  p.tip_enabled,
  coalesce(engagement.share_count, 0)::integer as share_count,
  coalesce(engagement.tip_total_paise, 0)::bigint as tip_total_paise,
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
left join public.post_engagement_stats engagement on engagement.post_id = p.id
where p.is_published = true
  and p.surface = 'short'
  and public.can_view_profile(pr.id)
order by p.created_at desc;

grant select on public.feed_posts to authenticated;
grant select on public.short_posts to authenticated;
grant select on public.post_engagement_stats to authenticated;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'post-media',
  'post-media',
  true,
  104857600,
  array['image/png', 'image/jpeg', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
