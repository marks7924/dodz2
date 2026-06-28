-- ============================================================
-- Migration 026: Final Platform Upgrades & Features
-- ============================================================

-- 1. Add CUSTOMER_SERVICE to user_role enum
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'CUSTOMER_SERVICE';

-- 2. Extend categories with is_default support if index doesn't exist
-- (Handled by 025 but here for safety)
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. Extend coupons with optional category scoping
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS applicable_category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;

-- 4. Extend reviews with moderation status
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'APPROVED'; -- default to APPROVED for compatibility, new reviews start as PENDING in code

-- 5. Extend menu_items with extra sizes and sandwich extras config
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS size_type TEXT NOT NULL DEFAULT 'NUMERIC'; -- 'NUMERIC' (Single/Double/Triple) or 'SIZE' (Small/Medium/Large/Family)
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS price_triple NUMERIC(10,2);
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS price_family NUMERIC(10,2);
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS extras_config JSONB DEFAULT '[]'::jsonb; -- lettuce, onions, patty, cheese defaults and extras pricing

-- 6. Extend branch_menu_items with branch pricing overrides for triple and family sizes
ALTER TABLE public.branch_menu_items ADD COLUMN IF NOT EXISTS price_triple NUMERIC(10,2);
ALTER TABLE public.branch_menu_items ADD COLUMN IF NOT EXISTS price_family NUMERIC(10,2);

-- 7. Extend order_items with extras payload
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS extras JSONB DEFAULT '[]'::jsonb;

-- 8. Add settings key for review toggle and footer settings in restaurant_settings if missing
INSERT INTO public.restaurant_settings (key, value, branch_id)
  VALUES ('reviews_active', 'true', NULL)
  ON CONFLICT (key) WHERE branch_id IS NULL DO NOTHING;
INSERT INTO public.restaurant_settings (key, value, branch_id)
  VALUES ('footer_settings', '{"phone": "19999", "facebook": "", "instagram": "", "whatsapp": ""}', NULL)
  ON CONFLICT (key) WHERE branch_id IS NULL DO NOTHING;
 
-- 9. Allow everyone to read settings (public settings like delivery fee, status, socials, reviews)
DROP POLICY IF EXISTS "settings_select_all" ON public.restaurant_settings;
CREATE POLICY "settings_select_all" ON public.restaurant_settings FOR SELECT USING (TRUE);

-- 10. Automatically insert profile database record upon registration using SQL triggers
--     Hardened with EXCEPTION handler — profile insert failure must never crash signup.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  _role user_role := 'CUSTOMER';
BEGIN
  -- Safely resolve role — default to CUSTOMER if value is invalid or missing
  BEGIN
    _role := COALESCE(NEW.raw_user_meta_data->>'role', 'CUSTOMER')::user_role;
  EXCEPTION WHEN invalid_text_representation OR others THEN
    _role := 'CUSTOMER';
  END;

  -- Insert profile row — ignore if already exists
  BEGIN
    INSERT INTO public.profiles (id, full_name, phone, role)
    VALUES (
      NEW.id,
      COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''), split_part(NEW.email, '@', 1), 'User'),
      NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'phone', '')), ''),
      _role
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN others THEN
    -- Log the error but never block signup
    RAISE WARNING 'handle_new_user: failed to create profile for user %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 11. Support CUSTOMER_SERVICE role in internal staff database checks
CREATE OR REPLACE FUNCTION public.is_internal_staff()
RETURNS BOOLEAN AS $$
  SELECT role IN ('STAFF', 'ADMIN', 'DEVELOPER', 'OWNER', 'CUSTOMER_SERVICE')
  FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- 12. Support notification deletion by owners
DROP POLICY IF EXISTS "notifications_delete_own" ON public.notifications;
CREATE POLICY "notifications_delete_own" ON public.notifications
  FOR DELETE USING (auth.uid() = user_id);
