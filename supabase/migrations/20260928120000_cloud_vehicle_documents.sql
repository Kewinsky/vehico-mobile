-- Private, vehicle-scoped document storage for AI retrieval stages.

create table public.vehicle_documents (
  id uuid primary key,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  storage_bucket text not null default 'documents'
    check (storage_bucket = 'documents'),
  storage_path text not null unique,
  original_name text not null check (length(trim(original_name)) between 1 and 255),
  content_type text not null check (
    content_type in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')
  ),
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 20971520),
  description text,
  upload_status text not null default 'uploading'
    check (upload_status in ('uploading', 'ready')),
  created_at timestamptz not null default now(),
  constraint vehicle_documents_path_scoped check (
    storage_path like vehicle_id::text || '/vehicle-documents/' || id::text || '.%'
  )
);

create index vehicle_documents_vehicle_created_idx
  on public.vehicle_documents(vehicle_id, created_at desc);

alter table public.vehicle_documents enable row level security;

create policy vehicle_documents_select_own_vehicle
on public.vehicle_documents for select
to authenticated
using (
  exists (
    select 1 from public.vehicles v
    where v.id = vehicle_documents.vehicle_id
      and v.owner_id = auth.uid()
  )
);

create policy vehicle_documents_insert_own_vehicle
on public.vehicle_documents for insert
to authenticated
with check (
  exists (
    select 1 from public.vehicles v
    where v.id = vehicle_documents.vehicle_id
      and v.owner_id = auth.uid()
  )
);

create policy vehicle_documents_update_own_vehicle
on public.vehicle_documents for update
to authenticated
using (
  exists (
    select 1 from public.vehicles v
    where v.id = vehicle_documents.vehicle_id
      and v.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.vehicles v
    where v.id = vehicle_documents.vehicle_id
      and v.owner_id = auth.uid()
  )
);

create policy vehicle_documents_delete_own_vehicle
on public.vehicle_documents for delete
to authenticated
using (
  exists (
    select 1 from public.vehicles v
    where v.id = vehicle_documents.vehicle_id
      and v.owner_id = auth.uid()
  )
);

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'documents',
  'documents',
  false,
  20971520,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy storage_documents_select_own_vehicle
on storage.objects for select
to authenticated
using (
  bucket_id = 'documents'
  and exists (
    select 1
    from public.vehicle_documents d
    join public.vehicles v on v.id = d.vehicle_id
    where d.storage_path = name
      and v.owner_id = auth.uid()
  )
);

create policy storage_documents_insert_own_vehicle
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'documents'
  and exists (
    select 1
    from public.vehicle_documents d
    join public.vehicles v on v.id = d.vehicle_id
    where d.storage_path = name
      and v.owner_id = auth.uid()
  )
);

create policy storage_documents_update_own_vehicle
on storage.objects for update
to authenticated
using (
  bucket_id = 'documents'
  and exists (
    select 1
    from public.vehicle_documents d
    join public.vehicles v on v.id = d.vehicle_id
    where d.storage_path = name
      and v.owner_id = auth.uid()
  )
)
with check (
  bucket_id = 'documents'
  and exists (
    select 1
    from public.vehicle_documents d
    join public.vehicles v on v.id = d.vehicle_id
    where d.storage_path = name
      and v.owner_id = auth.uid()
  )
);

create policy storage_documents_delete_own_vehicle
on storage.objects for delete
to authenticated
using (
  bucket_id = 'documents'
  and exists (
    select 1
    from public.vehicle_documents d
    join public.vehicles v on v.id = d.vehicle_id
    where d.storage_path = name
      and v.owner_id = auth.uid()
  )
);
