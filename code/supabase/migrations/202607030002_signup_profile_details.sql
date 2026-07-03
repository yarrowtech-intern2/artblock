alter table public.profiles
  add column if not exists phone text,
  add column if not exists country text,
  add column if not exists city text;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role text := coalesce(new.raw_user_meta_data ->> 'role', 'visitor');
  next_role public.app_role := 'visitor';
  requested_gender text := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'gender', '')), '');
  requested_phone text := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'phone', '')), '');
  requested_country text := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'country', '')), '');
  requested_city text := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'city', '')), '');
  requested_location text := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'location', '')), '');
  next_location text := coalesce(
    requested_location,
    nullif(concat_ws(', ', requested_city, requested_country), '')
  );
begin
  if requested_role in ('visitor', 'creator') then
    next_role := requested_role::public.app_role;
  end if;

  if requested_gender not in ('male', 'female', 'non_binary', 'prefer_not_to_say') then
    requested_gender := null;
  end if;

  insert into public.profiles (
    id,
    email,
    full_name,
    role,
    gender,
    phone,
    country,
    city,
    location
  )
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', 'New User'),
    next_role,
    requested_gender,
    requested_phone,
    requested_country,
    requested_city,
    next_location
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = excluded.full_name,
    role = case
      when public.profiles.role = 'admin' then public.profiles.role
      else excluded.role
    end,
    gender = coalesce(excluded.gender, public.profiles.gender),
    phone = coalesce(excluded.phone, public.profiles.phone),
    country = coalesce(excluded.country, public.profiles.country),
    city = coalesce(excluded.city, public.profiles.city),
    location = coalesce(excluded.location, public.profiles.location),
    updated_at = timezone('utc', now());

  return new;
end;
$$;
