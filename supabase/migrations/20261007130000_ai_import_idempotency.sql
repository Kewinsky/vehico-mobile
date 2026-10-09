-- Client-generated keys make confirmed AI draft saves safe to retry after a
-- timeout or lost response. Existing manual inserts remain unchanged.
alter table public.service_entries
  add column client_request_id text;

alter table public.service_entries
  add constraint service_entries_client_request_id_format check (
    client_request_id is null
    or (
      length(client_request_id) between 16 and 120
      and client_request_id ~ '^[A-Za-z0-9:_-]+$'
    )
  );

create unique index service_entries_vehicle_client_request_uidx
  on public.service_entries (vehicle_id, client_request_id)
  where client_request_id is not null;

alter table public.fueling_entries
  add column client_request_id text;

alter table public.fueling_entries
  add constraint fueling_entries_client_request_id_format check (
    client_request_id is null
    or (
      length(client_request_id) between 16 and 120
      and client_request_id ~ '^[A-Za-z0-9:_-]+$'
    )
  );

create unique index fueling_entries_vehicle_client_request_uidx
  on public.fueling_entries (vehicle_id, client_request_id)
  where client_request_id is not null;
