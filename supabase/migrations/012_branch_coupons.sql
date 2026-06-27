-- ============================================================
-- DODZ — Migration 012: Branch-Scoped Coupons & Discounts
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Add branch_id to coupons and discounts tables
ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;

ALTER TABLE public.discounts
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_coupons_branch_id ON public.coupons(branch_id);
CREATE INDEX IF NOT EXISTS idx_discounts_branch_id ON public.discounts(branch_id);

-- 2. Restrict branch creation and edits to is_super_admin (Owner, Developer, Head Admin)
DROP POLICY IF EXISTS "Branches manager write" ON public.branches;
CREATE POLICY "Branches manager write" ON public.branches
  FOR ALL USING (public.is_super_admin());

-- 3. Restrict coupon creation and edits to is_super_admin (Owner, Developer, Head Admin)
DROP POLICY IF EXISTS "coupons_write_manager" ON public.coupons;
CREATE POLICY "coupons_write_manager" ON public.coupons
  FOR ALL USING (public.is_super_admin());

-- 4. Restrict discount creation and edits to is_super_admin (Owner, Developer, Head Admin)
DROP POLICY IF EXISTS "discounts_write_manager" ON public.discounts;
CREATE POLICY "discounts_write_manager" ON public.discounts
  FOR ALL USING (public.is_super_admin());
