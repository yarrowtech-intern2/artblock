-- Allow thread members to delete direct messages and entire direct threads.

drop policy if exists "Thread members can delete direct messages" on public.direct_messages;

create policy "Thread members can delete direct messages"
on public.direct_messages
for delete
to authenticated
using (public.user_is_thread_member(thread_id));

create or replace function public.delete_direct_thread(target_thread_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  if not exists (
    select 1
    from public.direct_thread_members members
    where members.thread_id = target_thread_id
      and members.user_id = auth.uid()
  ) then
    raise exception 'You are not a member of this thread.';
  end if;

  delete from public.direct_threads
  where id = target_thread_id;
end;
$$;

grant execute on function public.delete_direct_thread(uuid) to authenticated;
