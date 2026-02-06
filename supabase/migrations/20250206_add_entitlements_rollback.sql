-- Rollback migration: Remove entitlements system
-- Date: 2025-02-06
-- Description: Reverts all changes from 20250206_add_entitlements.sql

-- ================
-- Drop RPC Functions: Create resources with entitlement checks
-- ================

drop function if exists public.create_reminder(uuid, text, date, integer, text);
drop function if exists public.create_workshop(text, text, text, text);
drop function if exists public.create_wheel(uuid, text, numeric, integer, integer, text, numeric, text, numeric, boolean);
drop function if exists public.create_tire(uuid, text, integer, integer, integer, text, text, boolean);
drop function if exists public.create_vehicle(text, text, text, text, integer, integer, integer, integer, text, text, text, text, date, date);
drop function if exists public.create_marketplace_post(uuid, text, numeric, jsonb);

-- ================
-- Drop RPC Functions: Check entitlements
-- ================

drop function if exists public.can_create_reminder();
drop function if exists public.can_create_workshop();
drop function if exists public.can_add_wheel(uuid);
drop function if exists public.can_add_tire(uuid);
drop function if exists public.can_create_vehicle();
drop function if exists public.consume_listing();
drop function if exists public.consume_report();
drop function if exists public.can_generate_listing();
drop function if exists public.can_generate_report();

-- ================
-- Restore original create_report_snapshot_with_options (without entitlements)
-- ================
-- Note: You need to restore the original version from before entitlements were added.
-- This is a placeholder - restore the original function body that doesn't call can_generate_report() or consume_report()

-- ================
-- Drop trigger and function
-- ================

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- ================
-- Drop entitlements table
-- ================

drop policy if exists entitlements_update_own on public.entitlements;
drop policy if exists entitlements_select_own on public.entitlements;
drop table if exists public.entitlements cascade;
