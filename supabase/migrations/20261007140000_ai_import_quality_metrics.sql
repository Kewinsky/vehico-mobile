-- Content-free import quality metrics. Request IDs prevent retry duplication.
create table public.ai_import_quality_events (
  request_id text primary key check (
    length(request_id) between 16 and 120
    and request_id ~ '^[A-Za-z0-9:_-]+$'
  ),
  feature text not null check (feature in (
    'service_invoice_import',
    'fuel_receipt_import'
  )),
  created_at timestamptz not null default now()
);

create table public.ai_import_quality_daily (
  metric_date date not null,
  feature text not null check (feature in (
    'service_invoice_import',
    'fuel_receipt_import'
  )),
  prompt_version text not null,
  schema_version text not null,
  completed_imports bigint not null default 0,
  recognized_fields bigint not null default 0,
  uncertain_fields bigint not null default 0,
  missing_fields bigint not null default 0,
  rejected_fields bigint not null default 0,
  correction_count bigint not null default 0,
  category_correction_count bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (metric_date, feature, prompt_version, schema_version)
);

alter table public.ai_import_quality_events enable row level security;
alter table public.ai_import_quality_daily enable row level security;
revoke all on table public.ai_import_quality_events from anon, authenticated;
revoke all on table public.ai_import_quality_daily from anon, authenticated;

create or replace function public.record_ai_import_quality(
  p_feature text,
  p_request_id text,
  p_recognized_fields integer,
  p_uncertain_fields integer,
  p_missing_fields integer,
  p_rejected_fields integer,
  p_correction_count integer,
  p_category_correction_count integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_prompt_version text;
  v_schema_version text;
  v_inserted integer;
begin
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = 'P0001';
  end if;
  if p_request_id is null
     or length(p_request_id) not between 16 and 120
     or p_request_id !~ '^[A-Za-z0-9:_-]+$' then
    raise exception 'invalid_request_id' using errcode = '22023';
  end if;
  if p_feature = 'service_invoice_import' then
    v_prompt_version := 'service_invoice_v2';
    v_schema_version := 'service_invoice_extraction_v2';
  elsif p_feature = 'fuel_receipt_import' then
    v_prompt_version := 'fuel_receipt_v2';
    v_schema_version := 'fuel_receipt_extraction_v2';
  else
    raise exception 'invalid_ai_feature' using errcode = '22023';
  end if;
  if num_nonnulls(
       p_recognized_fields,
       p_uncertain_fields,
       p_missing_fields,
       p_rejected_fields,
       p_correction_count,
       p_category_correction_count
     ) <> 6
     or p_recognized_fields not between 0 and 100
     or p_uncertain_fields not between 0 and 100
     or p_missing_fields not between 0 and 100
     or p_rejected_fields not between 0 and 100
     or p_correction_count not between 0 and 100
     or p_category_correction_count not between 0 and 100
     or p_recognized_fields + p_uncertain_fields + p_missing_fields
        + p_rejected_fields < 1
     or p_recognized_fields + p_uncertain_fields + p_missing_fields
        + p_rejected_fields > 100 then
    raise exception 'invalid_metric_counts' using errcode = '22023';
  end if;

  insert into public.ai_import_quality_events (request_id, feature)
  values (p_request_id, p_feature)
  on conflict (request_id) do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then
    return jsonb_build_object('recorded', false, 'duplicate', true);
  end if;

  insert into public.ai_import_quality_daily (
    metric_date, feature, prompt_version, schema_version, completed_imports,
    recognized_fields, uncertain_fields, missing_fields, rejected_fields,
    correction_count, category_correction_count
  ) values (
    current_date, p_feature, v_prompt_version, v_schema_version, 1,
    p_recognized_fields, p_uncertain_fields, p_missing_fields,
    p_rejected_fields, p_correction_count, p_category_correction_count
  )
  on conflict (metric_date, feature, prompt_version, schema_version)
  do update set
    completed_imports = public.ai_import_quality_daily.completed_imports + 1,
    recognized_fields = public.ai_import_quality_daily.recognized_fields
      + excluded.recognized_fields,
    uncertain_fields = public.ai_import_quality_daily.uncertain_fields
      + excluded.uncertain_fields,
    missing_fields = public.ai_import_quality_daily.missing_fields
      + excluded.missing_fields,
    rejected_fields = public.ai_import_quality_daily.rejected_fields
      + excluded.rejected_fields,
    correction_count = public.ai_import_quality_daily.correction_count
      + excluded.correction_count,
    category_correction_count =
      public.ai_import_quality_daily.category_correction_count
      + excluded.category_correction_count,
    updated_at = now();

  return jsonb_build_object('recorded', true, 'duplicate', false);
end;
$$;

revoke all on function public.record_ai_import_quality(
  text, text, integer, integer, integer, integer, integer, integer
) from public;
grant execute on function public.record_ai_import_quality(
  text, text, integer, integer, integer, integer, integer, integer
) to authenticated;
