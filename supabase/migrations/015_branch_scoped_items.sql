-- ============================================================
-- DIOCESE/DODZ — Migration 015: Branch Scoped Menu Items
-- Run this in Supabase SQL Editor
-- ============================================================

-- Add branch_id column to menu_items table
ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;

-- Create index for quick lookup
CREATE INDEX IF NOT EXISTS idx_menu_items_branch_id ON public.menu_items(branch_id);
