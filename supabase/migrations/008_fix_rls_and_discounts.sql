-- ============================================================
-- DODZ — Migration 008: Fix RLS + Add HEAD_ADMIN to helpers
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Update helper functions to include HEAD_ADMIN
CREATE OR REPLACE FUNCTION public.is_internal_staff()
RETURNS BOOLEAN AS $$
  SELECT role IN ('STAFF', 'ADMIN', 'HEAD_ADMIN', 'DEVELOPER', 'OWNER')
  FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS BOOLEAN AS $$
  SELECT role IN ('ADMIN', 'HEAD_ADMIN', 'DEVELOPER', 'OWNER')
  FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- 2. Fix restaurant_settings: allow PUBLIC read (so banner shows to all users)
DROP POLICY IF EXISTS "settings_select_staff" ON public.restaurant_settings;
CREATE POLICY "settings_select_all" ON public.restaurant_settings
  FOR SELECT USING (TRUE);

-- Write still restricted to managers only (no change needed there)

-- 3. Create discounts table if it doesn't exist, then add RLS
CREATE TABLE IF NOT EXISTS public.discounts (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  discount_type discount_type NOT NULL,
  discount_value NUMERIC(10,2) NOT NULL,
  applies_to    TEXT NOT NULL DEFAULT 'ALL',
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  starts_at     TIMESTAMPTZ,
  ends_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.discounts ENABLE ROW LEVEL SECURITY;

-- Public can read active discounts (so homepage applies them)
DROP POLICY IF EXISTS "discounts_select_all" ON public.discounts;
CREATE POLICY "discounts_select_all" ON public.discounts
  FOR SELECT USING (TRUE);

-- Managers can insert/update/delete discounts
DROP POLICY IF EXISTS "discounts_write_manager" ON public.discounts;
CREATE POLICY "discounts_write_manager" ON public.discounts
  FOR ALL USING (public.is_manager());
