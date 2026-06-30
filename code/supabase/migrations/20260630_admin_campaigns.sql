do $$
begin
  if not exists (
    select 1
    from pg_enum enum
    join pg_type type on type.oid = enum.enumtypid
    join pg_namespace namespace on namespace.oid = type.typnamespace
    where namespace.nspname = 'public'
      and type.typname = 'app_role'
      and enum.enumlabel = 'admin'
  ) then
    alter type public.app_role add value 'admin';
  end if;
end
$$;

do $$
declare
  missing_items text[] := array[]::text[];
begin
  if not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'profiles'
  ) then
    missing_items := array_append(missing_items, 'public.profiles');
  end if;

  if not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'creator_profiles'
  ) then
    missing_items := array_append(missing_items, 'public.creator_profiles');
  end if;

  if not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'posts'
  ) then
    missing_items := array_append(missing_items, 'public.posts');
  end if;

  if not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'user_settings'
  ) then
    missing_items := array_append(missing_items, 'public.user_settings');
  end if;

  if not exists (
    select 1
    from pg_proc proc
    join pg_namespace namespace on namespace.oid = proc.pronamespace
    where namespace.nspname = 'public'
      and proc.proname = 'set_updated_at'
  ) then
    missing_items := array_append(missing_items, 'public.set_updated_at()');
  end if;

  if array_length(missing_items, 1) is not null then
    raise exception
      'Missing prerequisites for 20260630_admin_campaigns.sql: %. Apply the earlier migrations first, especially 20260629_user_settings_and_account_controls.sql.',
      array_to_string(missing_items, ', ');
  end if;
end
$$;

create or replace function public.is_admin(target_user_id uuid default auth.uid())
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if target_user_id is null then
    return false;
  end if;

  return exists (
    select 1
    from public.profiles p
    where p.id = target_user_id
      and p.role = 'admin'
  );
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role text := coalesce(new.raw_user_meta_data ->> 'role', 'visitor');
  next_role public.app_role := 'visitor';
begin
  if requested_role in ('visitor', 'creator') then
    next_role := requested_role::public.app_role;
  end if;

  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', 'New User'),
    next_role
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = excluded.full_name,
    role = case
      when public.profiles.role = 'admin' then public.profiles.role
      else excluded.role
    end,
    updated_at = timezone('utc', now());

  return new;
end;
$$;

create or replace function public.guard_profile_privileged_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if tg_op = 'INSERT' and (new.role = 'admin' or new.is_verified_artist = true or new.verified_artist_at is not null) then
      raise exception 'Privileged profile fields require admin access';
    end if;

    if tg_op = 'UPDATE' then
      if new.role is distinct from old.role then
        if current_setting('app.allow_role_change', true) = 'creator'
          and old.role = 'visitor'
          and new.role = 'creator'
          and auth.uid() = new.id then
          return new;
        end if;

        raise exception 'Role changes require a secure workflow';
      end if;

      if new.is_verified_artist is distinct from old.is_verified_artist
        or new.verified_artist_at is distinct from old.verified_artist_at then
        raise exception 'Verification fields require admin access';
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_guard_privileged_fields on public.profiles;

create trigger profiles_guard_privileged_fields
before insert or update on public.profiles
for each row
execute procedure public.guard_profile_privileged_fields();

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

  perform set_config('app.allow_role_change', 'creator', true);

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

create or replace function public.guard_user_settings_danger_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
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

drop policy if exists "Admins can view all profiles" on public.profiles;
drop policy if exists "Admins can update any profile" on public.profiles;
drop policy if exists "Admins can view all user settings" on public.user_settings;
drop policy if exists "Admins can update any user settings" on public.user_settings;
drop policy if exists "Admins can view all creator profiles" on public.creator_profiles;
drop policy if exists "Admins can view all posts" on public.posts;
drop policy if exists "Admins can update any posts" on public.posts;
drop policy if exists "Admins can delete any posts" on public.posts;

create policy "Admins can view all profiles"
on public.profiles
for select
to authenticated
using (public.is_admin());

create policy "Admins can update any profile"
on public.profiles
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can view all user settings"
on public.user_settings
for select
to authenticated
using (public.is_admin());

create policy "Admins can update any user settings"
on public.user_settings
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can view all creator profiles"
on public.creator_profiles
for select
to authenticated
using (public.is_admin());

create policy "Admins can view all posts"
on public.posts
for select
to authenticated
using (public.is_admin());

create policy "Admins can update any posts"
on public.posts
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can delete any posts"
on public.posts
for delete
to authenticated
using (public.is_admin());

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  image_url text not null,
  destination_url text not null,
  cta_label text not null default 'Open',
  open_in_new_tab boolean not null default false,
  desktop_enabled boolean not null default true,
  feed_enabled boolean not null default true,
  priority integer not null default 100,
  is_active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.campaigns enable row level security;

drop trigger if exists campaigns_set_updated_at on public.campaigns;

create trigger campaigns_set_updated_at
before update on public.campaigns
for each row
execute procedure public.set_updated_at();

drop policy if exists "Active campaigns are viewable by authenticated users" on public.campaigns;
drop policy if exists "Admins can insert campaigns" on public.campaigns;
drop policy if exists "Admins can update campaigns" on public.campaigns;
drop policy if exists "Admins can delete campaigns" on public.campaigns;

create policy "Active campaigns are viewable by authenticated users"
on public.campaigns
for select
to authenticated
using (
  public.is_admin()
  or (
    is_active = true
    and (starts_at is null or starts_at <= timezone('utc', now()))
    and (ends_at is null or ends_at >= timezone('utc', now()))
  )
);

create policy "Admins can insert campaigns"
on public.campaigns
for insert
to authenticated
with check (public.is_admin());

create policy "Admins can update campaigns"
on public.campaigns
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can delete campaigns"
on public.campaigns
for delete
to authenticated
using (public.is_admin());

grant select on public.campaigns to authenticated;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'campaign-media',
  'campaign-media',
  true,
  10485760,
  array['image/png', 'image/jpeg', 'image/webp', 'image/avif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Campaign media is viewable by authenticated users" on storage.objects;
drop policy if exists "Admins can upload campaign media" on storage.objects;
drop policy if exists "Admins can update campaign media" on storage.objects;
drop policy if exists "Admins can delete campaign media" on storage.objects;

create policy "Campaign media is viewable by authenticated users"
on storage.objects
for select
to authenticated
using (bucket_id = 'campaign-media');

create policy "Admins can upload campaign media"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'campaign-media'
  and public.is_admin()
);

create policy "Admins can update campaign media"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'campaign-media'
  and public.is_admin()
)
with check (
  bucket_id = 'campaign-media'
  and public.is_admin()
);

create policy "Admins can delete campaign media"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'campaign-media'
  and public.is_admin()
);
