-- ============================================================
-- DODZ — Migration 011: Multi-Branch System
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Enhance branches table with full fields
ALTER TABLE public.branches
  ADD COLUMN IF NOT EXISTS address_en   TEXT,
  ADD COLUMN IF NOT EXISTS address_ar   TEXT,
  ADD COLUMN IF NOT EXISTS phone        TEXT,
  ADD COLUMN IF NOT EXISTS opening_hours JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS status       TEXT NOT NULL DEFAULT 'OPEN',
  ADD COLUMN IF NOT EXISTS updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 2. Create user_branch_assignments (many-to-many: user ↔ branch)
CREATE TABLE IF NOT EXISTS public.user_branch_assignments (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  branch_id  UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, branch_id)
);

CREATE INDEX IF NOT EXISTS idx_user_branch_assignments_user_id  ON public.user_branch_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_branch_assignments_branch_id ON public.user_branch_assignments(branch_id);
CREATE INDEX IF NOT EXISTS idx_branches_is_active ON public.branches(is_active);

-- 3. Migrate existing profiles.branch_id into the new assignments table
INSERT INTO public.user_branch_assignments (user_id, branch_id)
SELECT id, branch_id
FROM   public.profiles
WHERE  branch_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- 4. RLS for branches (public read, managers write)
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Branches public read" ON public.branches;
CREATE POLICY "Branches public read" ON public.branches
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Branches manager write" ON public.branches;
CREATE POLICY "Branches manager write" ON public.branches
  FOR ALL USING (public.is_manager());

-- 5. RLS for user_branch_assignments
ALTER TABLE public.user_branch_assignments ENABLE ROW LEVEL SECURITY;

-- Managers can read all assignments (needed for admin panel)
DROP POLICY IF EXISTS "Branch assignments manager read" ON public.user_branch_assignments;
CREATE POLICY "Branch assignments manager read" ON public.user_branch_assignments
  FOR SELECT USING (public.is_manager());

-- Users can read their own assignments
DROP POLICY IF EXISTS "Branch assignments self read" ON public.user_branch_assignments;
CREATE POLICY "Branch assignments self read" ON public.user_branch_assignments
  FOR SELECT USING (user_id = auth.uid());

-- Only super admins can insert/update/delete assignments
DROP POLICY IF EXISTS "Branch assignments super admin write" ON public.user_branch_assignments;
CREATE POLICY "Branch assignments super admin write" ON public.user_branch_assignments
  FOR ALL USING (public.is_super_admin());

-- 6. Update orders RLS to enforce branch isolation
--    OWNER/DEV/HEAD_ADMIN see all orders.
--    ADMIN/STAFF see only their assigned branches' orders.
--    Customers see only their own orders.

DROP POLICY IF EXISTS "orders_select_own_or_staff" ON public.orders;
CREATE POLICY "orders_select_own_or_staff" ON public.orders
  FOR SELECT USING (
    -- Customers see their own
    customer_id = auth.uid()
    OR
    -- Global admins see all
    public.is_super_admin()
    OR
    -- Branch staff see their assigned branches
    (
      public.is_internal_staff()
      AND (
        -- If branch_id is null, show all staff (legacy support)
        branch_id IS NULL
        OR
        EXISTS (
          SELECT 1 FROM public.user_branch_assignments uba
          WHERE uba.user_id = auth.uid()
            AND uba.branch_id = orders.branch_id
        )
      )
    )
  );

-- Keep existing write policies for staff
DROP POLICY IF EXISTS "orders_update_staff" ON public.orders;
CREATE POLICY "orders_update_staff" ON public.orders
  FOR UPDATE USING (public.is_internal_staff());

DROP POLICY IF EXISTS "orders_insert_customer" ON public.orders;
CREATE POLICY "orders_insert_customer" ON public.orders
  FOR INSERT WITH CHECK (
    customer_id = auth.uid() OR public.is_internal_staff()
  );

-- 7. Helper function: get user's assigned branch IDs
CREATE OR REPLACE FUNCTION public.get_user_branch_ids(p_user_id UUID DEFAULT auth.uid())
RETURNS UUID[] AS $$
  SELECT ARRAY_AGG(branch_id)
  FROM public.user_branch_assignments
  WHERE user_id = p_user_id;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;
