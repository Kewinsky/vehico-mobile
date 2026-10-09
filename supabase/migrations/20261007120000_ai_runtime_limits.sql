-- Atomic per-user limits for AI requests. Quota is reserved before a provider call,
-- so failures cannot be used to bypass cost controls.
create table public.ai_usage_limits (
  user_id uuid not null references auth.users(id) on delete cascade,
  feature text not null check (feature in (
    'vehicle_chat',
    'service_invoice_import',
    'fuel_receipt_import'
  )),
  hour_started_at timestamptz not null default date_trunc('hour', now()),
  hour_request_count integer not null default 0 check (hour_request_count >= 0),
  day_started_at timestamptz not null default date_trunc('day', now()),
  day_request_count integer not null default 0 check (day_request_count >= 0),
  day_reserved_output_tokens bigint not null default 0 check (day_reserved_output_tokens >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, feature)
);

alter table public.ai_usage_limits enable row level security;
revoke all on table public.ai_usage_limits from anon, authenticated;

create or replace function public.consume_ai_request_budget(
  p_feature text,
  p_reserved_output_tokens integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz := now();
  v_limit public.ai_usage_limits;
  v_hour_limit integer;
  v_day_limit integer;
  v_day_token_limit integer;
  v_retry_after integer;
begin
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = 'P0001';
  end if;

  if p_reserved_output_tokens is null
     or p_reserved_output_tokens < 1
     or p_reserved_output_tokens > 10000 then
    raise exception 'invalid_token_reservation' using errcode = '22023';
  end if;

  case p_feature
    when 'vehicle_chat' then
      v_hour_limit := 30;
      v_day_limit := 100;
      v_day_token_limit := 120000;
    when 'service_invoice_import' then
      v_hour_limit := 10;
      v_day_limit := 25;
      v_day_token_limit := 60000;
    when 'fuel_receipt_import' then
      v_hour_limit := 15;
      v_day_limit := 40;
      v_day_token_limit := 48000;
    else
      raise exception 'invalid_ai_feature' using errcode = '22023';
  end case;

  insert into public.ai_usage_limits (user_id, feature)
  values (v_user_id, p_feature)
  on conflict (user_id, feature) do nothing;

  select * into v_limit
  from public.ai_usage_limits
  where user_id = v_user_id and feature = p_feature
  for update;

  if v_limit.hour_started_at < date_trunc('hour', v_now) then
    v_limit.hour_started_at := date_trunc('hour', v_now);
    v_limit.hour_request_count := 0;
  end if;
  if v_limit.day_started_at < date_trunc('day', v_now) then
    v_limit.day_started_at := date_trunc('day', v_now);
    v_limit.day_request_count := 0;
    v_limit.day_reserved_output_tokens := 0;
  end if;

  if v_limit.hour_request_count >= v_hour_limit then
    v_retry_after := greatest(
      1,
      ceil(extract(epoch from (
        v_limit.hour_started_at + interval '1 hour' - v_now
      )))::integer
    );
    return jsonb_build_object(
      'allowed', false,
      'reason', 'rate_limited',
      'retryAfterSeconds', v_retry_after
    );
  end if;

  if v_limit.day_request_count >= v_day_limit then
    v_retry_after := greatest(
      1,
      ceil(extract(epoch from (
        v_limit.day_started_at + interval '1 day' - v_now
      )))::integer
    );
    return jsonb_build_object(
      'allowed', false,
      'reason', 'rate_limited',
      'retryAfterSeconds', v_retry_after
    );
  end if;

  if v_limit.day_reserved_output_tokens + p_reserved_output_tokens
     > v_day_token_limit then
    v_retry_after := greatest(
      1,
      ceil(extract(epoch from (
        v_limit.day_started_at + interval '1 day' - v_now
      )))::integer
    );
    return jsonb_build_object(
      'allowed', false,
      'reason', 'budget_exceeded',
      'retryAfterSeconds', v_retry_after
    );
  end if;

  update public.ai_usage_limits
  set
    hour_started_at = v_limit.hour_started_at,
    hour_request_count = v_limit.hour_request_count + 1,
    day_started_at = v_limit.day_started_at,
    day_request_count = v_limit.day_request_count + 1,
    day_reserved_output_tokens =
      v_limit.day_reserved_output_tokens + p_reserved_output_tokens,
    updated_at = v_now
  where user_id = v_user_id and feature = p_feature;

  return jsonb_build_object(
    'allowed', true,
    'reason', null,
    'retryAfterSeconds', null
  );
end;
$$;

revoke all on function public.consume_ai_request_budget(text, integer) from public;
grant execute on function public.consume_ai_request_budget(text, integer) to authenticated;
