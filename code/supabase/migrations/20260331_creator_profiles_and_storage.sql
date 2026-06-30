alter table public.profiles
  add column if not exists username text,
  add column if not exists avatar_url text,
  add column if not exists cover_url text,
  add column if not exists gender text,
  add column if not exists website text,
  add column if not exists location text;

alter table public.profiles
  drop constraint if exists profiles_gender_check;

alter table public.profiles
  add constraint profiles_gender_check
  check (
    gender is null
    or gender in ('male', 'female', 'non_binary', 'prefer_not_to_say')
  );

create unique index if not exists profiles_username_unique_idx
on public.profiles (username)
where username is not null;

create table if not exists public.creator_profiles (
  id uuid primary key references public.profiles (id) on delete cascade,
  slug text not null unique,
  headline text,
  about text,
  featured_quote text,
  is_published boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.creator_profiles enable row level security;

drop trigger if exists creator_profiles_set_updated_at on public.creator_profiles;

create trigger creator_profiles_set_updated_at
before update on public.creator_profiles
for each row
execute procedure public.set_updated_at();

drop policy if exists "Creator profiles are viewable by the owner" on public.creator_profiles;
drop policy if exists "Published creator profiles are publicly viewable" on public.creator_profiles;
drop policy if exists "Creator profiles are insertable by the owner" on public.creator_profiles;
drop policy if exists "Creator profiles are updatable by the owner" on public.creator_profiles;
drop policy if exists "Creator profiles are deletable by the owner" on public.creator_profiles;

create policy "Creator profiles are viewable by the owner"
on public.creator_profiles
for select
to authenticated
using (auth.uid() = id);

create policy "Published creator profiles are publicly viewable"
on public.creator_profiles
for select
to anon, authenticated
using (is_published = true);

create policy "Creator profiles are insertable by the owner"
on public.creator_profiles
for insert
to authenticated
with check (auth.uid() = id);

create policy "Creator profiles are updatable by the owner"
on public.creator_profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "Creator profiles are deletable by the owner"
on public.creator_profiles
for delete
to authenticated
using (auth.uid() = id);

drop view if exists public.public_creator_profiles;

create view public.public_creator_profiles as
select
  cp.id,
  cp.slug,
  p.full_name,
  p.username,
  p.avatar_url,
  p.cover_url,
  p.gender,
  p.bio,
  p.website,
  p.location,
  cp.headline,
  cp.about,
  cp.featured_quote
from public.creator_profiles cp
join public.profiles p on p.id = cp.id
where cp.is_published = true;

grant select on public.public_creator_profiles to anon, authenticated;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'avatars',
  'avatars',
  true,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Avatar images are publicly viewable" on storage.objects;
drop policy if exists "Users can upload their own avatar images" on storage.objects;
drop policy if exists "Users can update their own avatar images" on storage.objects;
drop policy if exists "Users can delete their own avatar images" on storage.objects;

create policy "Avatar images are publicly viewable"
on storage.objects
for select
to public
using (bucket_id = 'avatars');

create policy "Users can upload their own avatar images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can update their own avatar images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can delete their own avatar images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);
