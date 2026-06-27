-- ============================================================
-- Migration 024: Add Category Descriptions
-- ============================================================

-- Add desc_en and desc_ar text columns to categories table
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS desc_en TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS desc_ar TEXT DEFAULT '';
