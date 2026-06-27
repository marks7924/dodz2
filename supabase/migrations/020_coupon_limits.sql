-- ============================================================
-- Migration 020: Add max_uses_per_user to coupons table
-- ============================================================

ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS max_uses_per_user INT;
