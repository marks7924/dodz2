-- ============================================================
-- Migration 025: Category Default Selection Support
-- ============================================================

-- Add is_default boolean column to categories table
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT FALSE;

-- Ensure at most one category can be set as default
CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_is_default_true 
  ON public.categories (is_default) 
  WHERE (is_default = TRUE);
