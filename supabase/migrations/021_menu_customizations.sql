-- ============================================================
-- Migration 021: Menu Item Customizations
-- ============================================================

-- 1. Create customization_groups table
CREATE TABLE IF NOT EXISTS public.customization_groups (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_en       TEXT NOT NULL,
  name_ar       TEXT NOT NULL,
  min_selected  INT NOT NULL DEFAULT 0,
  max_selected  INT NOT NULL DEFAULT 1,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create customization_options table
CREATE TABLE IF NOT EXISTS public.customization_options (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id      UUID NOT NULL REFERENCES public.customization_groups(id) ON DELETE CASCADE,
  name_en       TEXT NOT NULL,
  name_ar       TEXT NOT NULL,
  price         NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Create menu_item_customization_groups join table
CREATE TABLE IF NOT EXISTS public.menu_item_customization_groups (
  menu_item_id  UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  group_id      UUID NOT NULL REFERENCES public.customization_groups(id) ON DELETE CASCADE,
  PRIMARY KEY (menu_item_id, group_id)
);

-- 4. Add customizations column to order_items
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS customizations JSONB DEFAULT '[]'::jsonb;

-- 5. Enable RLS
ALTER TABLE public.customization_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customization_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_item_customization_groups ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies
DROP POLICY IF EXISTS "customization_groups_select" ON public.customization_groups;
CREATE POLICY "customization_groups_select" ON public.customization_groups
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "customization_groups_write" ON public.customization_groups;
CREATE POLICY "customization_groups_write" ON public.customization_groups
  FOR ALL USING (public.is_super_admin());

DROP POLICY IF EXISTS "customization_options_select" ON public.customization_options;
CREATE POLICY "customization_options_select" ON public.customization_options
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "customization_options_write" ON public.customization_options;
CREATE POLICY "customization_options_write" ON public.customization_options
  FOR ALL USING (public.is_super_admin());

DROP POLICY IF EXISTS "menu_item_customization_groups_select" ON public.menu_item_customization_groups;
CREATE POLICY "menu_item_customization_groups_select" ON public.menu_item_customization_groups
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "menu_item_customization_groups_write" ON public.menu_item_customization_groups;
CREATE POLICY "menu_item_customization_groups_write" ON public.menu_item_customization_groups
  FOR ALL USING (public.is_super_admin());
