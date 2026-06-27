-- ============================================================
-- DODZ FRIED CHICKEN — Migration 017: Branch Connected Settings
-- Alters restaurant_settings to support branch-scoped configurations
-- ============================================================

-- Add branch_id column to restaurant_settings table
ALTER TABLE public.restaurant_settings
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE;

-- Add lat/lng columns to branches table
ALTER TABLE public.branches
  ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;

-- Drop the old unique constraint on key (which prevented duplicate keys across branches)
ALTER TABLE public.restaurant_settings
  DROP CONSTRAINT IF EXISTS restaurant_settings_key_key;

-- Create unique partial index for global settings (branch_id is NULL)
CREATE UNIQUE INDEX IF NOT EXISTS restaurant_settings_global_key_idx
  ON public.restaurant_settings (key)
  WHERE branch_id IS NULL;

-- Create unique partial index for branch-specific settings (branch_id is NOT NULL)
CREATE UNIQUE INDEX IF NOT EXISTS restaurant_settings_branch_key_idx
  ON public.restaurant_settings (key, branch_id)
  WHERE branch_id IS NOT NULL;
