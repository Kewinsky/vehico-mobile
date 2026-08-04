-- Android waitlist for landing page (Google Play coming soon)
create table if not exists public.android_waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  locale text,
  created_at timestamptz not null default now(),
  constraint android_waitlist_email_format check (
    email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  )
);

create unique index if not exists android_waitlist_email_lower_uidx
  on public.android_waitlist (lower(email));

alter table public.android_waitlist enable row level security;

create policy android_waitlist_insert_anon
  on public.android_waitlist
  for insert
  to anon, authenticated
  with check (true);

comment on table public.android_waitlist is
  'Android Play Store waitlist emails from landing page';
