create or replace function public.create_post_like_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_name text;
  post_author_id uuid;
begin
  select full_name into actor_name
  from public.profiles
  where id = new.user_id;

  select author_id into post_author_id
  from public.posts
  where id = new.post_id;

  if post_author_id is null or post_author_id = new.user_id then
    return new;
  end if;

  if exists (
    select 1
    from public.user_settings settings
    where settings.profile_id = post_author_id
      and settings.notify_post_likes = false
  ) then
    return new;
  end if;

  insert into public.notifications (
    recipient_id,
    actor_id,
    type,
    title,
    body,
    link
  )
  values (
    post_author_id,
    new.user_id,
    'post_like',
    'New like',
    coalesce(actor_name, 'Someone') || ' liked your post.',
    '/feed?post=' || new.post_id::text
  );

  return new;
end;
$$;

create or replace function public.create_post_comment_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_name text;
  post_author_id uuid;
begin
  select full_name into actor_name
  from public.profiles
  where id = new.author_id;

  select author_id into post_author_id
  from public.posts
  where id = new.post_id;

  if post_author_id is null or post_author_id = new.author_id then
    return new;
  end if;

  if exists (
    select 1
    from public.user_settings settings
    where settings.profile_id = post_author_id
      and settings.notify_post_comments = false
  ) then
    return new;
  end if;

  insert into public.notifications (
    recipient_id,
    actor_id,
    type,
    title,
    body,
    link
  )
  values (
    post_author_id,
    new.author_id,
    'post_comment',
    'New comment',
    coalesce(actor_name, 'Someone') || ' commented: ' || left(new.body, 120),
    '/feed?post=' || new.post_id::text || '&action=comments'
  );

  return new;
end;
$$;
