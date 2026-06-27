-- ============================================================
-- Migration 023: Menu Item Multiple Categories Support
-- ============================================================

-- Add category_ids text array column to menu_items table
ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS category_ids TEXT[] DEFAULT '{}';

-- Create an index to optimize array contains queries
CREATE INDEX IF NOT EXISTS idx_menu_items_category_ids ON public.menu_items USING gin(category_ids);

-- Example: Add Super Crunchy ('f1000000-0000-0000-0000-000000000006') secondary category
-- so it appears in both 'Chicken Sandwiches' and 'Offers & Bundles' ('c1000000-0000-0000-0000-000000000001')
UPDATE public.menu_items
SET category_ids = ARRAY['c1000000-0000-0000-0000-000000000001']
WHERE id = 'f1000000-0000-0000-0000-000000000006';
