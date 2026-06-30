create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  image_url text not null,
  caption text,
  is_published boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

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

alter table public.posts enable row level security;

drop trigger if exists posts_set_updated_at on public.posts;

create trigger posts_set_updated_at
before update on public.posts
for each row
execute procedure public.set_updated_at();

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

drop view if exists public.feed_posts;

create view public.feed_posts as
select
  p.id,
  p.media_url,
  p.caption,
  p.created_at,
  p.author_id,
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

grant select on public.feed_posts to authenticated;

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
  5242880,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Post media is viewable by authenticated users" on storage.objects;
drop policy if exists "Users can upload their own post media" on storage.objects;
drop policy if exists "Users can update their own post media" on storage.objects;
drop policy if exists "Users can delete their own post media" on storage.objects;

create policy "Post media is viewable by authenticated users"
on storage.objects
for select
to authenticated
using (bucket_id = 'post-media');

create policy "Users can upload their own post media"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'post-media'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can update their own post media"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'post-media'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'post-media'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can delete their own post media"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'post-media'
  and auth.uid()::text = (storage.foldername(name))[1]
);
