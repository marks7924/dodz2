-- ============================================================
-- DODZ FRIED CHICKEN — Migration 019: Developer Show As Driver Column
-- Adds show_as_driver column to profiles table
-- ============================================================

-- Add show_as_driver column to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS show_as_driver BOOLEAN NOT NULL DEFAULT FALSE;
