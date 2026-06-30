do $$
begin
  if not exists (
    select 1
    from pg_type type
    join pg_namespace namespace on namespace.oid = type.typnamespace
    where namespace.nspname = 'public'
      and type.typname = 'app_role'
  ) then
    create type public.app_role as enum ('visitor', 'creator');
  end if;
end
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text not null,
  role public.app_role not null default 'visitor',
  bio text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.profiles enable row level security;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute procedure public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', 'New User'),
    coalesce((new.raw_user_meta_data ->> 'role')::public.app_role, 'visitor')
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = excluded.full_name,
    role = excluded.role,
    updated_at = timezone('utc', now());

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute procedure public.handle_new_user();

drop policy if exists "Profiles are viewable by the owner" on public.profiles;
drop policy if exists "Profiles are insertable by the owner" on public.profiles;
drop policy if exists "Profiles are updatable by the owner" on public.profiles;

create policy "Profiles are viewable by the owner"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

create policy "Profiles are insertable by the owner"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

create policy "Profiles are updatable by the owner"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);
