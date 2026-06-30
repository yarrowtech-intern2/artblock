do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'feed_post_type' and n.nspname = 'public'
  ) then
    create type public.feed_post_type as enum ('image', 'video', 'poll', 'text');
  end if;
end
$$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'posts'
      and column_name = 'image_url'
  )
  and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'posts'
      and column_name = 'media_url'
  ) then
    alter table public.posts rename column image_url to media_url;
  end if;
end
$$;

alter table public.posts
  add column if not exists post_type public.feed_post_type not null default 'image',
  add column if not exists body text,
  add column if not exists title text;

alter table public.posts
  alter column media_url drop not null;

create table if not exists public.post_poll_options (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  label text not null,
  position integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  unique (post_id, position)
);

create table if not exists public.post_poll_votes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  option_id uuid not null references public.post_poll_options (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique (post_id, user_id)
);

create table if not exists public.post_reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  reaction_type text not null default 'like',
  created_at timestamptz not null default timezone('utc', now()),
  unique (post_id, user_id, reaction_type)
);

create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.post_poll_options enable row level security;
alter table public.post_poll_votes enable row level security;
alter table public.post_reactions enable row level security;
alter table public.post_comments enable row level security;

drop policy if exists "Published posts are viewable by authenticated users" on public.posts;
drop policy if exists "Posts are insertable by the owner" on public.posts;
drop policy if exists "Posts are updatable by the owner" on public.posts;
drop policy if exists "Posts are deletable by the owner" on public.posts;

create policy "Published posts are viewable by authenticated users"
on public.posts
for select
to authenticated
using (is_published = true);

create policy "Posts are insertable by the owner"
on public.posts
for insert
to authenticated
with check (auth.uid() = author_id);

create policy "Posts are updatable by the owner"
on public.posts
for update
to authenticated
using (auth.uid() = author_id)
with check (auth.uid() = author_id);

create policy "Posts are deletable by the owner"
on public.posts
for delete
to authenticated
using (auth.uid() = author_id);

drop policy if exists "Published poll options are viewable" on public.post_poll_options;
drop policy if exists "Poll options are insertable by the post owner" on public.post_poll_options;
drop policy if exists "Poll options are updatable by the post owner" on public.post_poll_options;
drop policy if exists "Poll options are deletable by the post owner" on public.post_poll_options;

create policy "Published poll options are viewable"
on public.post_poll_options
for select
to authenticated
using (
  exists (
    select 1
    from public.posts p
    where p.id = post_id
      and p.is_published = true
  )
);

create policy "Poll options are insertable by the post owner"
on public.post_poll_options
for insert
to authenticated
with check (
  exists (
    select 1
    from public.posts p
    where p.id = post_id
      and p.author_id = auth.uid()
  )
);

create policy "Poll options are updatable by the post owner"
on public.post_poll_options
for update
to authenticated
using (
  exists (
    select 1
    from public.posts p
    where p.id = post_id
      and p.author_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.posts p
    where p.id = post_id
      and p.author_id = auth.uid()
  )
);

create policy "Poll options are deletable by the post owner"
on public.post_poll_options
for delete
to authenticated
using (
  exists (
    select 1
    from public.posts p
    where p.id = post_id
      and p.author_id = auth.uid()
  )
);

drop policy if exists "Users can view their own poll votes" on public.post_poll_votes;
drop policy if exists "Users can insert or update their own poll votes" on public.post_poll_votes;
drop policy if exists "Users can update their own poll votes" on public.post_poll_votes;
drop policy if exists "Users can delete their own poll votes" on public.post_poll_votes;

create policy "Users can view their own poll votes"
on public.post_poll_votes
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert or update their own poll votes"
on public.post_poll_votes
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own poll votes"
on public.post_poll_votes
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own poll votes"
on public.post_poll_votes
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can view their own reactions" on public.post_reactions;
drop policy if exists "Users can insert their own reactions" on public.post_reactions;
drop policy if exists "Users can delete their own reactions" on public.post_reactions;

create policy "Users can view their own reactions"
on public.post_reactions
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own reactions"
on public.post_reactions
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can delete their own reactions"
on public.post_reactions
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Published comments are viewable" on public.post_comments;
drop policy if exists "Comments are insertable by the author" on public.post_comments;
drop policy if exists "Comments are updatable by the author" on public.post_comments;
drop policy if exists "Comments are deletable by the author" on public.post_comments;

create policy "Published comments are viewable"
on public.post_comments
for select
to authenticated
using (
  exists (
    select 1
    from public.posts p
    where p.id = post_id
      and p.is_published = true
  )
);

create policy "Comments are insertable by the author"
on public.post_comments
for insert
to authenticated
with check (auth.uid() = author_id);

create policy "Comments are updatable by the author"
on public.post_comments
for update
to authenticated
using (auth.uid() = author_id)
with check (auth.uid() = author_id);

create policy "Comments are deletable by the author"
on public.post_comments
for delete
to authenticated
using (auth.uid() = author_id);

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
  p.created_at,
  pr.full_name,
  pr.username,
  pr.avatar_url,
  cp.slug as creator_slug,
  cp.headline
from public.posts p
join public.profiles pr on pr.id = p.author_id
left join public.creator_profiles cp on cp.id = p.author_id
where p.is_published = true
order by p.created_at desc;

drop view if exists public.post_engagement_stats;

create view public.post_engagement_stats as
select
  p.id as post_id,
  count(distinct r.id) filter (where r.reaction_type = 'like') as like_count,
  count(distinct c.id) as comment_count
from public.posts p
left join public.post_reactions r on r.post_id = p.id
left join public.post_comments c on c.post_id = p.id
group by p.id;

drop view if exists public.poll_option_results;

create view public.poll_option_results as
select
  o.id as option_id,
  o.post_id,
  o.label,
  o.position,
  count(v.id) as vote_count
from public.post_poll_options o
left join public.post_poll_votes v on v.option_id = o.id
group by o.id, o.post_id, o.label, o.position;

drop view if exists public.comment_threads;

create view public.comment_threads as
select
  c.id,
  c.post_id,
  c.body,
  c.created_at,
  c.author_id,
  p.full_name,
  p.username,
  p.avatar_url
from public.post_comments c
join public.profiles p on p.id = c.author_id;

grant select on public.feed_posts to authenticated;
grant select on public.post_engagement_stats to authenticated;
grant select on public.poll_option_results to authenticated;
grant select on public.comment_threads to authenticated;

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
  26214400,
  array['image/png', 'image/jpeg', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
