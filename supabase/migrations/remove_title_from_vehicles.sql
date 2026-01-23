-- Migration script: Remove title column from vehicles table
-- This script modifies the existing vehicles table to remove the title column

-- ================
-- Remove title column
-- ================
-- Drop title column if it exists (safe for existing databases)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'vehicles'
      AND column_name = 'title'
  ) THEN
    ALTER TABLE public.vehicles
    DROP COLUMN title;
  END IF;
END $$;

-- ================
-- Verification
-- ================
-- Uncomment to verify the migration:
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND table_name = 'vehicles'
-- ORDER BY ordinal_position;
