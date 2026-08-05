-- Rejected workshop intake entries are deleted instead of soft-rejected.

create or replace function public.reject_workshop_service_entry(p_entry_id uuid)
returns public.service_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry public.service_entries;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  delete from public.service_entries se
  using public.vehicles v
  where se.id = p_entry_id
    and se.vehicle_id = v.id
    and v.owner_id = auth.uid()
    and se.source = 'workshop'
    and se.status = 'pending'
  returning se.* into v_entry;

  if not found then
    raise exception 'Entry not found or not pending';
  end if;

  return v_entry;
end;
$$;

grant execute on function public.reject_workshop_service_entry(uuid)
  to authenticated;
