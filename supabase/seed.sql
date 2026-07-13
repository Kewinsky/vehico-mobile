-- Local dev seed: test users from AuthScreen.tsx (password: testuser)
-- Run automatically on `supabase db reset` when [db.seed] is enabled.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Stable IDs so seed_data.sql can reference the test vehicle.
-- test@user.com
-- test-empty@user.com
-- test-onboarding@user.com
-- test vehicle (owned by test@user.com)

CREATE OR REPLACE FUNCTION public.dev_seed_auth_user(
  p_id uuid,
  p_email text,
  p_password text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public, extensions
AS $$
DECLARE
  v_pw text := crypt(p_password, gen_salt('bf'));
BEGIN
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    invited_at,
    confirmation_token,
    confirmation_sent_at,
    recovery_token,
    recovery_sent_at,
    email_change_token_new,
    email_change,
    email_change_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at,
    phone,
    phone_confirmed_at,
    phone_change,
    phone_change_token,
    phone_change_sent_at,
    email_change_token_current,
    email_change_confirm_status,
    banned_until,
    reauthentication_token,
    reauthentication_sent_at,
    is_sso_user,
    deleted_at,
    is_anonymous
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    p_id,
    'authenticated',
    'authenticated',
    p_email,
    v_pw,
    now(),
    null,
    '',
    null,
    '',
    null,
    '',
    '',
    null,
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    p_metadata,
    false,
    now(),
    now(),
    null,
    null,
    '',
    '',
    null,
    '',
    0,
    null,
    '',
    null,
    false,
    null,
    false
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  )
  VALUES (
    p_id,
    p_id,
    jsonb_build_object(
      'sub', p_id::text,
      'email', p_email,
      'email_verified', true,
      'phone_verified', false
    ),
    'email',
    p_id::text,
    now(),
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;
END;
$$;

DO $$
DECLARE
  v_test_user_id uuid := 'a0000001-0000-4000-8000-000000000001';
  v_empty_user_id uuid := 'a0000001-0000-4000-8000-000000000002';
  v_onboarding_user_id uuid := 'a0000001-0000-4000-8000-000000000003';
  v_test_vehicle_id uuid := 'b0000001-0000-4000-8000-000000000001';
BEGIN
  PERFORM public.dev_seed_auth_user(
    v_test_user_id,
    'test@user.com',
    'testuser',
    '{"has_completed_onboarding": true, "full_name": "Test User"}'::jsonb
  );

  PERFORM public.dev_seed_auth_user(
    v_empty_user_id,
    'test-empty@user.com',
    'testuser',
    '{"has_completed_onboarding": true, "full_name": "Empty Data User"}'::jsonb
  );

  PERFORM public.dev_seed_auth_user(
    v_onboarding_user_id,
    'test-onboarding@user.com',
    'testuser',
    '{"has_completed_onboarding": true, "full_name": "Onboarding User"}'::jsonb
  );

  INSERT INTO public.vehicles (
    id,
    owner_id,
    type,
    vin,
    make,
    model,
    production_year,
    initial_mileage,
    mileage,
    mileage_updated_at,
    first_registration_date,
    license_plate,
    engine_capacity,
    power_hp,
    fuel_type,
    transmission,
    drive_type,
    insurance_valid_until,
    inspection_valid_until
  )
  VALUES (
    v_test_vehicle_id,
    v_test_user_id,
    'car',
    'WVWZZZ1KZAW123456',
    'Volkswagen',
    'Golf',
    2018,
    74200,
    78200,
    '2025-01-02',
    '2018-03-15',
    'WA 12345',
    1395,
    150,
    'petrol',
    'manual',
    'FWD',
    '2026-12-31',
    '2026-06-30'
  )
  ON CONFLICT (id) DO NOTHING;

  UPDATE public.entitlements
  SET free_plan_vehicle_id = v_test_vehicle_id
  WHERE user_id = v_test_user_id
    AND free_plan_vehicle_id IS NULL;
END;
$$;
