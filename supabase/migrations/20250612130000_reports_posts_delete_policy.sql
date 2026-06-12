-- Allow owners to delete their own reports and marketplace posts from the mobile app.

create policy reports_delete_own
on public.reports for delete
to authenticated
using (
  exists (
    select 1
    from public.vehicles v
    where v.id = reports.vehicle_id
      and v.owner_id = auth.uid()
  )
);

create policy posts_delete_own
on public.posts for delete
to authenticated
using (user_id = auth.uid());
