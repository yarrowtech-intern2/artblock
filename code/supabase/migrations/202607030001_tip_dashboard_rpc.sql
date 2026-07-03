create or replace function public.get_tip_dashboard()
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  current_user_id uuid := auth.uid();
  is_admin boolean := false;
  result jsonb;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  is_admin := public.is_admin(current_user_id);

  with visible_tips as (
    select t.*
    from public.artist_tips t
    where is_admin
      or t.sender_id = current_user_id
      or t.recipient_id = current_user_id
  ),
  profile_rows as (
    select
      p.id,
      p.full_name,
      p.username,
      p.avatar_url,
      p.role,
      coalesce(p.is_verified_artist, false) as is_verified_artist,
      cp.slug as creator_slug
    from public.profiles p
    left join public.creator_profiles cp
      on cp.id = p.id
      and cp.is_published = true
    where p.id in (
      select sender_id from visible_tips
      union
      select recipient_id from visible_tips
    )
  ),
  post_rows as (
    select
      p.id,
      p.title,
      p.body,
      p.caption
    from public.posts p
    where p.id in (
      select post_id
      from visible_tips
      where post_id is not null
    )
  ),
  top_sender_rows as (
    select
      t.sender_id as profile_id,
      count(*)::integer as tip_count,
      coalesce(sum(t.amount_paise), 0)::bigint as amount_paise
    from visible_tips t
    where t.status = 'paid'
    group by t.sender_id
  ),
  top_recipient_rows as (
    select
      t.recipient_id as profile_id,
      count(*)::integer as tip_count,
      coalesce(sum(t.amount_paise), 0)::bigint as amount_paise
    from visible_tips t
    where t.status = 'paid'
    group by t.recipient_id
  ),
  records as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', t.id,
          'created_at', t.created_at,
          'paid_at', t.paid_at,
          'amount_paise', t.amount_paise,
          'currency', t.currency,
          'message', t.message,
          'status', t.status,
          'sender', jsonb_build_object(
            'id', sender.id,
            'full_name', sender.full_name,
            'username', sender.username,
            'avatar_url', sender.avatar_url,
            'role', sender.role,
            'is_verified_artist', sender.is_verified_artist,
            'creator_slug', sender.creator_slug
          ),
          'recipient', jsonb_build_object(
            'id', recipient.id,
            'full_name', recipient.full_name,
            'username', recipient.username,
            'avatar_url', recipient.avatar_url,
            'role', recipient.role,
            'is_verified_artist', recipient.is_verified_artist,
            'creator_slug', recipient.creator_slug
          ),
          'viewer_relation', case
            when t.sender_id = current_user_id then 'sender'
            when t.recipient_id = current_user_id then 'recipient'
            else 'other'
          end,
          'context', jsonb_build_object(
            'kind', case when t.post_id is null then 'profile' else 'post' end,
            'href', case
              when t.post_id is not null then
                case
                  when recipient.creator_slug is not null then '/creators/' || recipient.creator_slug || '/posts/' || t.post_id::text
                  else '/profiles/' || recipient.id::text || '/posts/' || t.post_id::text
                end
              else
                case
                  when recipient.creator_slug is not null then '/creators/' || recipient.creator_slug
                  else '/profiles/' || recipient.id::text
                end
            end,
            'title', case
              when t.post_id is not null then
                coalesce(nullif(trim(post.title), ''), nullif(trim(post.caption), ''), nullif(trim(post.body), ''), 'Post tip')
              when recipient.role = 'creator' then 'Artist profile'
              else 'Profile tip'
            end,
            'post_id', t.post_id
          )
        )
        order by t.created_at desc
      ),
      '[]'::jsonb
    ) as data
    from visible_tips t
    left join profile_rows sender on sender.id = t.sender_id
    left join profile_rows recipient on recipient.id = t.recipient_id
    left join post_rows post on post.id = t.post_id
  )
  select jsonb_build_object(
    'is_admin', is_admin,
    'summary', jsonb_build_object(
      'total_tips', count(*)::integer,
      'paid_tips', count(*) filter (where status = 'paid')::integer,
      'pending_tips', count(*) filter (where status = 'created')::integer,
      'failed_tips', count(*) filter (where status = 'failed')::integer,
      'total_amount_paise', coalesce(sum(amount_paise) filter (where status = 'paid'), 0)::bigint,
      'sent_tips', count(*) filter (where sender_id = current_user_id)::integer,
      'sent_amount_paise', coalesce(sum(amount_paise) filter (where sender_id = current_user_id and status = 'paid'), 0)::bigint,
      'received_tips', count(*) filter (where recipient_id = current_user_id)::integer,
      'received_amount_paise', coalesce(sum(amount_paise) filter (where recipient_id = current_user_id and status = 'paid'), 0)::bigint
    ),
    'records', (select data from records),
    'top_senders', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'profile', jsonb_build_object(
            'id', profile_rows.id,
            'full_name', profile_rows.full_name,
            'username', profile_rows.username,
            'avatar_url', profile_rows.avatar_url,
            'role', profile_rows.role,
            'is_verified_artist', profile_rows.is_verified_artist,
            'creator_slug', profile_rows.creator_slug
          ),
          'tip_count', top_sender_rows.tip_count,
          'amount_paise', top_sender_rows.amount_paise
        )
        order by top_sender_rows.amount_paise desc, top_sender_rows.tip_count desc
      )
      from top_sender_rows
      join profile_rows on profile_rows.id = top_sender_rows.profile_id
    ), '[]'::jsonb),
    'top_recipients', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'profile', jsonb_build_object(
            'id', profile_rows.id,
            'full_name', profile_rows.full_name,
            'username', profile_rows.username,
            'avatar_url', profile_rows.avatar_url,
            'role', profile_rows.role,
            'is_verified_artist', profile_rows.is_verified_artist,
            'creator_slug', profile_rows.creator_slug
          ),
          'tip_count', top_recipient_rows.tip_count,
          'amount_paise', top_recipient_rows.amount_paise
        )
        order by top_recipient_rows.amount_paise desc, top_recipient_rows.tip_count desc
      )
      from top_recipient_rows
      join profile_rows on profile_rows.id = top_recipient_rows.profile_id
    ), '[]'::jsonb)
  )
  into result
  from visible_tips;

  return coalesce(
    result,
    jsonb_build_object(
      'is_admin', is_admin,
      'summary', jsonb_build_object(
        'total_tips', 0,
        'paid_tips', 0,
        'pending_tips', 0,
        'failed_tips', 0,
        'total_amount_paise', 0,
        'sent_tips', 0,
        'sent_amount_paise', 0,
        'received_tips', 0,
        'received_amount_paise', 0
      ),
      'records', '[]'::jsonb,
      'top_senders', '[]'::jsonb,
      'top_recipients', '[]'::jsonb
    )
  );
end;
$$;

grant execute on function public.get_tip_dashboard() to authenticated;
