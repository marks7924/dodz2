-- ============================================================
-- DIOCESE/DODZ — Migration 014: Branch Customizations & Chat Isolation
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Create branch_menu_items table for per-branch pricing and availability overrides
CREATE TABLE IF NOT EXISTS public.branch_menu_items (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id     UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  menu_item_id  UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  price_single  NUMERIC(10,2),
  price_double  NUMERIC(10,2),
  is_available  BOOLEAN,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(branch_id, menu_item_id)
);

CREATE INDEX IF NOT EXISTS idx_branch_menu_items_branch_id ON public.branch_menu_items(branch_id);
CREATE INDEX IF NOT EXISTS idx_branch_menu_items_menu_item_id ON public.branch_menu_items(menu_item_id);

-- Enable RLS on branch_menu_items
ALTER TABLE public.branch_menu_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "branch_menu_items_select" ON public.branch_menu_items;
CREATE POLICY "branch_menu_items_select" ON public.branch_menu_items
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "branch_menu_items_write" ON public.branch_menu_items;
CREATE POLICY "branch_menu_items_write" ON public.branch_menu_items
  FOR ALL USING (
    public.is_super_admin()
    OR
    (
      public.is_internal_staff()
      AND EXISTS (
        SELECT 1 FROM public.user_branch_assignments uba
        WHERE uba.user_id = auth.uid()
          AND uba.branch_id = branch_menu_items.branch_id
      )
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR
    (
      public.is_internal_staff()
      AND EXISTS (
        SELECT 1 FROM public.user_branch_assignments uba
        WHERE uba.user_id = auth.uid()
          AND uba.branch_id = branch_menu_items.branch_id
      )
    )
  );

-- 2. Add branch_id to support_chats table
ALTER TABLE public.support_chats
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_support_chats_branch_id ON public.support_chats(branch_id);

-- 3. Update RLS policies for support_chats
DROP POLICY IF EXISTS "Staff view chats" ON public.support_chats;
CREATE POLICY "Staff view chats" ON public.support_chats
  FOR SELECT USING (
    public.is_super_admin()
    OR
    (
      public.is_internal_staff()
      AND status != 'CLOSED'
      AND (
        branch_id IS NULL
        OR
        EXISTS (
          SELECT 1 FROM public.user_branch_assignments uba
          WHERE uba.user_id = auth.uid()
            AND uba.branch_id = support_chats.branch_id
        )
      )
    )
  );

DROP POLICY IF EXISTS "Staff update chats" ON public.support_chats;
CREATE POLICY "Staff update chats" ON public.support_chats
  FOR UPDATE USING (
    public.is_super_admin()
    OR
    (
      public.is_internal_staff()
      AND status != 'CLOSED'
      AND (
        branch_id IS NULL
        OR
        EXISTS (
          SELECT 1 FROM public.user_branch_assignments uba
          WHERE uba.user_id = auth.uid()
            AND uba.branch_id = support_chats.branch_id
        )
      )
    )
  );

DROP POLICY IF EXISTS "Staff insert chats" ON public.support_chats;
CREATE POLICY "Staff insert chats" ON public.support_chats
  FOR INSERT WITH CHECK (
    public.is_super_admin()
    OR
    (
      public.is_internal_staff()
      AND (
        branch_id IS NULL
        OR
        EXISTS (
          SELECT 1 FROM public.user_branch_assignments uba
          WHERE uba.user_id = auth.uid()
            AND uba.branch_id = branch_id
        )
      )
    )
  );

-- 4. Update RLS policy for support_messages (restrict select to branch isolation)
DROP POLICY IF EXISTS "messages_select_participant" ON public.support_messages;
CREATE POLICY "messages_select_participant" ON public.support_messages
  FOR SELECT USING (
    auth.uid() = sender_id
    OR EXISTS (
      SELECT 1 FROM public.support_chats sc
      WHERE sc.id = chat_id
        AND (
          public.is_super_admin()
          OR
          (
            public.is_internal_staff()
            AND (
              sc.branch_id IS NULL
              OR
              EXISTS (
                SELECT 1 FROM public.user_branch_assignments uba
                WHERE uba.user_id = auth.uid()
                  AND uba.branch_id = sc.branch_id
              )
            )
          )
        )
    )
    OR EXISTS (
      SELECT 1 FROM public.support_chats sc
      WHERE sc.id = chat_id AND sc.customer_id = auth.uid()
    )
  );

-- 5. Restrict coupons writes (allowing branch admins to write scoped coupons)
DROP POLICY IF EXISTS "coupons_write_manager" ON public.coupons;
DROP POLICY IF EXISTS "coupons_write_policy" ON public.coupons;

CREATE POLICY "coupons_write_policy" ON public.coupons
  FOR ALL USING (
    public.is_super_admin()
    OR
    (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN')
      AND branch_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.user_branch_assignments uba
        WHERE uba.user_id = auth.uid()
          AND uba.branch_id = branch_id
      )
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR
    (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN')
      AND branch_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.user_branch_assignments uba
        WHERE uba.user_id = auth.uid()
          AND uba.branch_id = branch_id
      )
    )
  );

-- 6. Restrict discounts writes (allowing branch admins to write scoped discounts)
DROP POLICY IF EXISTS "discounts_write_manager" ON public.discounts;
DROP POLICY IF EXISTS "discounts_write_policy" ON public.discounts;

CREATE POLICY "discounts_write_policy" ON public.discounts
  FOR ALL USING (
    public.is_super_admin()
    OR
    (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN')
      AND branch_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.user_branch_assignments uba
        WHERE uba.user_id = auth.uid()
          AND uba.branch_id = branch_id
      )
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR
    (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN')
      AND branch_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.user_branch_assignments uba
        WHERE uba.user_id = auth.uid()
          AND uba.branch_id = branch_id
      )
    )
  );
