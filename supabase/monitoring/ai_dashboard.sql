-- Run as an operator/service-role query. These tables are intentionally hidden
-- from mobile clients by RLS and revoked grants.

-- Current quota pressure by feature. No user content is stored here.
select
  feature,
  count(*) as active_users,
  sum(hour_request_count) as requests_in_current_hour_buckets,
  sum(day_request_count) as requests_in_current_day_buckets,
  sum(day_reserved_output_tokens) as reserved_output_tokens_today,
  max(updated_at) as last_activity_at
from public.ai_usage_limits
group by feature
order by feature;

-- Import quality trend by prompt and schema version.
select
  metric_date,
  feature,
  prompt_version,
  schema_version,
  completed_imports,
  recognized_fields,
  uncertain_fields,
  missing_fields,
  rejected_fields,
  correction_count,
  category_correction_count,
  round(
    correction_count::numeric / nullif(completed_imports, 0),
    2
  ) as corrections_per_import
from public.ai_import_quality_daily
order by metric_date desc, feature;
