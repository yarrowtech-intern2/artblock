drop policy if exists "Users can view their own story view markers" on public.story_views;
drop policy if exists "Story viewers and authors can view story view markers" on public.story_views;

create policy "Story viewers and authors can view story view markers"
on public.story_views
for select
to authenticated
using (
  auth.uid() = viewer_id
  or exists (
    select 1
    from public.stories s
    where s.id = story_id
      and s.author_id = auth.uid()
  )
);
