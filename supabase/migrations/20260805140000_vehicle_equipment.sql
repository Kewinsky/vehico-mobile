-- Vehicle equipment checklist (presets + custom items per vehicle)

create table public.vehicle_equipment (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  preset_key text,
  label text not null,
  created_at timestamptz not null default now(),
  constraint vehicle_equipment_label_not_empty check (length(trim(label)) > 0)
);

create index vehicle_equipment_vehicle_id_idx on public.vehicle_equipment(vehicle_id);

create unique index vehicle_equipment_vehicle_preset_key_idx
  on public.vehicle_equipment(vehicle_id, preset_key)
  where preset_key is not null;

create unique index vehicle_equipment_vehicle_custom_label_idx
  on public.vehicle_equipment(vehicle_id, lower(label))
  where preset_key is null;

alter table public.vehicle_equipment enable row level security;

create policy vehicle_equipment_select_own_vehicle
on public.vehicle_equipment for select
to authenticated
using (
  exists (
    select 1 from public.vehicles v
    where v.id = vehicle_equipment.vehicle_id
      and v.owner_id = auth.uid()
  )
);

create policy vehicle_equipment_insert_own_vehicle
on public.vehicle_equipment for insert
to authenticated
with check (
  exists (
    select 1 from public.vehicles v
    where v.id = vehicle_equipment.vehicle_id
      and v.owner_id = auth.uid()
  )
);

create policy vehicle_equipment_delete_own_vehicle
on public.vehicle_equipment for delete
to authenticated
using (
  exists (
    select 1 from public.vehicles v
    where v.id = vehicle_equipment.vehicle_id
      and v.owner_id = auth.uid()
  )
);
