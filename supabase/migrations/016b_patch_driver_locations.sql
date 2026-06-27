-- ============================================================
-- DODZ FRIED CHICKEN — Migration 016b: Patch driver_locations
-- Run this if 016 was already applied.
-- Makes lat/lng nullable so offline rows don't cause 400 errors.
-- ============================================================

-- Allow lat/lng to be NULL (needed for offline-only rows)
ALTER TABLE public.driver_locations
  ALTER COLUMN lat DROP NOT NULL;

ALTER TABLE public.driver_locations
  ALTER COLUMN lng DROP NOT NULL;
