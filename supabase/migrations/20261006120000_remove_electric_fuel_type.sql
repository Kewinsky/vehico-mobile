create or replace function public.reject_new_electric_vehicle_fuel_type()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' and new.fuel_type = 'electric' then
    raise exception 'electric vehicle fuel type is not supported'
      using errcode = '23514';
  end if;

  if tg_op = 'UPDATE'
    and new.fuel_type = 'electric'
    and old.fuel_type is distinct from new.fuel_type
  then
    raise exception 'electric vehicle fuel type is not supported'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists reject_new_electric_vehicle_fuel_type on public.vehicles;

-- Existing electric rows remain editable until their fuel type is changed.
create trigger reject_new_electric_vehicle_fuel_type
before insert or update of fuel_type on public.vehicles
for each row
execute function public.reject_new_electric_vehicle_fuel_type();
