-- Migration: reminders redesign (no type; date and/or mileage; recurrence)
-- Run this on an existing database to apply the new reminder model.
-- Existing reminder rows are removed (schema change is breaking).

-- 1) Remove existing reminder rows
DELETE FROM public.reminders;

-- 2) Relax and replace constraint, drop type, add recurrence columns
ALTER TABLE public.reminders
  DROP CONSTRAINT IF EXISTS reminders_due_check;

ALTER TABLE public.reminders
  DROP COLUMN IF EXISTS type;

ALTER TABLE public.reminders
  ADD COLUMN IF NOT EXISTS recurrence_interval_value integer,
  ADD COLUMN IF NOT EXISTS recurrence_interval_unit text,
  ADD COLUMN IF NOT EXISTS recurrence_interval_km integer,
  ADD COLUMN IF NOT EXISTS recurrence_anchor_mileage integer;

ALTER TABLE public.reminders
  ADD CONSTRAINT recurrence_interval_unit_check
  CHECK (recurrence_interval_unit IS NULL OR recurrence_interval_unit IN ('days', 'weeks', 'months', 'years'));

ALTER TABLE public.reminders
  ADD CONSTRAINT reminders_due_check
  CHECK (due_date IS NOT NULL OR due_mileage IS NOT NULL);

-- 3) Replace create_reminder function (new signature, no p_type)
DROP FUNCTION IF EXISTS public.create_reminder(uuid, text, date, integer, text);
DROP FUNCTION IF EXISTS public.create_reminder(uuid, text, date, integer, integer, text, text, text, boolean, boolean, boolean);

CREATE OR REPLACE FUNCTION public.create_reminder(
  p_vehicle_id uuid,
  p_due_date date,
  p_due_mileage integer,
  p_days_before integer,
  p_title text,
  p_notes text,
  p_status text,
  p_channel_email boolean,
  p_channel_push boolean,
  p_enabled boolean,
  p_recurrence_interval_value integer DEFAULT NULL,
  p_recurrence_interval_unit text DEFAULT NULL,
  p_recurrence_interval_km integer DEFAULT NULL,
  p_recurrence_anchor_mileage integer DEFAULT NULL
)
RETURNS public.reminders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reminder public.reminders;
  v_can_create jsonb;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.vehicles v
    WHERE v.id = p_vehicle_id AND v.owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Vehicle not found or access denied';
  END IF;

  IF p_due_date IS NULL AND p_due_mileage IS NULL THEN
    RAISE EXCEPTION 'At least one of due_date or due_mileage must be set';
  END IF;

  v_can_create := public.check_resource_limit('reminder', p_vehicle_id);
  IF NOT (v_can_create->>'allowed')::boolean THEN
    RAISE EXCEPTION '%', COALESCE(v_can_create->>'reason', 'Cannot create reminder');
  END IF;

  INSERT INTO public.reminders (
    vehicle_id,
    due_date,
    due_mileage,
    days_before,
    title,
    notes,
    status,
    channel_email,
    channel_push,
    enabled,
    recurrence_interval_value,
    recurrence_interval_unit,
    recurrence_interval_km,
    recurrence_anchor_mileage
  ) VALUES (
    p_vehicle_id,
    p_due_date,
    p_due_mileage,
    p_days_before,
    p_title,
    p_notes,
    COALESCE(p_status, 'active'),
    COALESCE(p_channel_email, true),
    COALESCE(p_channel_push, true),
    COALESCE(p_enabled, true),
    p_recurrence_interval_value,
    p_recurrence_interval_unit,
    p_recurrence_interval_km,
    p_recurrence_anchor_mileage
  )
  RETURNING * INTO v_reminder;

  RETURN v_reminder;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_reminder(
  uuid, date, integer, integer, text, text, text, boolean, boolean, boolean, integer, text, integer, integer
) TO authenticated;
