create or replace function public.can_message_profile(
  target_profile_id uuid,
  viewer_profile_id uuid default auth.uid()
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  target_permissions text := 'everyone';
  target_deactivated_at timestamptz;
begin
  if target_profile_id is null or viewer_profile_id is null or target_profile_id = viewer_profile_id then
    return false;
  end if;

  select
    coalesce(settings.message_permissions, 'everyone'),
    settings.deactivated_at
  into
    target_permissions,
    target_deactivated_at
  from public.user_settings settings
  where settings.profile_id = target_profile_id;

  target_permissions := coalesce(target_permissions, 'everyone');

  if target_deactivated_at is not null then
    return false;
  end if;

  if target_permissions = 'everyone' then
    return true;
  end if;

  if target_permissions = 'followers' then
    return exists (
      select 1
      from public.profile_follows follows
      where follows.follower_id = viewer_profile_id
        and follows.followed_id = target_profile_id
    );
  end if;

  return false;
end;
$$;
