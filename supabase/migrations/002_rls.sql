-- ============================================================
-- DODZ FRIED CHICKEN — ROW LEVEL SECURITY
-- Migration 002: RLS Policies
-- Run AFTER 001_schema.sql
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_settings ENABLE ROW LEVEL SECURITY;

-- Helper function: get current user's role
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Helper function: is internal staff (STAFF, ADMIN, DEVELOPER, OWNER)
CREATE OR REPLACE FUNCTION public.is_internal_staff()
RETURNS BOOLEAN AS $$
  SELECT role IN ('STAFF', 'ADMIN', 'DEVELOPER', 'OWNER')
  FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Helper function: is manager (ADMIN, DEVELOPER, OWNER)
CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS BOOLEAN AS $$
  SELECT role IN ('ADMIN', 'DEVELOPER', 'OWNER')
  FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ============================================================
-- PROFILES
-- ============================================================
-- Users can read their own profile
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Internal staff can read all profiles
CREATE POLICY "profiles_select_staff" ON public.profiles
  FOR SELECT USING (public.is_internal_staff());

-- Users can update their own profile
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Managers can update any profile (role changes, suspension)
CREATE POLICY "profiles_update_manager" ON public.profiles
  FOR UPDATE USING (public.is_manager());

-- Service role can insert (used by auth trigger)
CREATE POLICY "profiles_insert_service" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id OR public.is_manager());

-- Managers can delete profiles
CREATE POLICY "profiles_delete_manager" ON public.profiles
  FOR DELETE USING (public.is_manager());

-- ============================================================
-- BRANCHES — Public read, manager write
-- ============================================================
CREATE POLICY "branches_select_all" ON public.branches
  FOR SELECT USING (TRUE);

CREATE POLICY "branches_write_manager" ON public.branches
  FOR ALL USING (public.is_manager());

-- ============================================================
-- CATEGORIES — Public read, manager write
-- ============================================================
CREATE POLICY "categories_select_all" ON public.categories
  FOR SELECT USING (TRUE);

CREATE POLICY "categories_write_manager" ON public.categories
  FOR ALL USING (public.is_manager());

-- ============================================================
-- MENU ITEMS — Public read, internal staff write
-- ============================================================
CREATE POLICY "menu_items_select_all" ON public.menu_items
  FOR SELECT USING (TRUE);

CREATE POLICY "menu_items_write_staff" ON public.menu_items
  FOR ALL USING (public.is_internal_staff());

-- ============================================================
-- COUPONS — Internal staff read, manager write
-- ============================================================
CREATE POLICY "coupons_select_staff" ON public.coupons
  FOR SELECT USING (public.is_internal_staff());

-- Customers can read active coupons to validate
CREATE POLICY "coupons_select_active" ON public.coupons
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "coupons_write_manager" ON public.coupons
  FOR ALL USING (public.is_manager());

-- ============================================================
-- ORDERS — Customers see own, staff see all
-- ============================================================
CREATE POLICY "orders_select_own" ON public.orders
  FOR SELECT USING (auth.uid() = customer_id);

CREATE POLICY "orders_select_driver" ON public.orders
  FOR SELECT USING (auth.uid() = driver_id);

CREATE POLICY "orders_select_staff" ON public.orders
  FOR SELECT USING (public.is_internal_staff());

CREATE POLICY "orders_insert_customer" ON public.orders
  FOR INSERT WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "orders_update_staff" ON public.orders
  FOR UPDATE USING (public.is_internal_staff());

CREATE POLICY "orders_update_driver" ON public.orders
  FOR UPDATE USING (auth.uid() = driver_id);

-- ============================================================
-- ORDER ITEMS — Follow order visibility
-- ============================================================
CREATE POLICY "order_items_select" ON public.order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id
        AND (o.customer_id = auth.uid() OR public.is_internal_staff() OR o.driver_id = auth.uid())
    )
  );

CREATE POLICY "order_items_insert" ON public.order_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND o.customer_id = auth.uid()
    )
  );

-- ============================================================
-- PAYMENT TRANSACTIONS — Own + staff
-- ============================================================
CREATE POLICY "payments_select_own" ON public.payment_transactions
  FOR SELECT USING (auth.uid() = customer_id);

CREATE POLICY "payments_select_staff" ON public.payment_transactions
  FOR SELECT USING (public.is_internal_staff());

CREATE POLICY "payments_insert" ON public.payment_transactions
  FOR INSERT WITH CHECK (auth.uid() = customer_id OR public.is_internal_staff());

CREATE POLICY "payments_update_staff" ON public.payment_transactions
  FOR UPDATE USING (public.is_internal_staff());

-- ============================================================
-- SUPPORT CHATS — Customer sees own, staff sees all
-- ============================================================
CREATE POLICY "chats_select_own" ON public.support_chats
  FOR SELECT USING (auth.uid() = customer_id);

CREATE POLICY "chats_select_staff" ON public.support_chats
  FOR SELECT USING (public.is_internal_staff());

CREATE POLICY "chats_insert_customer" ON public.support_chats
  FOR INSERT WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "chats_update_staff" ON public.support_chats
  FOR UPDATE USING (public.is_internal_staff());

-- ============================================================
-- SUPPORT MESSAGES — Sender sees own, chat participants see all
-- ============================================================
CREATE POLICY "messages_select_participant" ON public.support_messages
  FOR SELECT USING (
    auth.uid() = sender_id
    OR public.is_internal_staff()
    OR EXISTS (
      SELECT 1 FROM public.support_chats sc
      WHERE sc.id = chat_id AND sc.customer_id = auth.uid()
    )
  );

CREATE POLICY "messages_insert_participant" ON public.support_messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND (
      public.is_internal_staff()
      OR EXISTS (
        SELECT 1 FROM public.support_chats sc
        WHERE sc.id = chat_id AND sc.customer_id = auth.uid()
      )
    )
  );

CREATE POLICY "messages_update_read_staff" ON public.support_messages
  FOR UPDATE USING (public.is_internal_staff());

-- ============================================================
-- NOTIFICATIONS — Own only
-- ============================================================
CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "notifications_insert_staff" ON public.notifications
  FOR INSERT WITH CHECK (public.is_internal_staff() OR auth.uid() = user_id);

CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================
-- ACTIVITY LOGS — Managers and developers only
-- ============================================================
CREATE POLICY "logs_select_manager" ON public.activity_logs
  FOR SELECT USING (public.is_manager());

CREATE POLICY "logs_insert_all" ON public.activity_logs
  FOR INSERT WITH CHECK (TRUE); -- Triggered server-side

-- ============================================================
-- REVIEWS — Public read, own customer write
-- ============================================================
CREATE POLICY "reviews_select_all" ON public.reviews
  FOR SELECT USING (TRUE);

CREATE POLICY "reviews_insert_own" ON public.reviews
  FOR INSERT WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "reviews_update_own" ON public.reviews
  FOR UPDATE USING (auth.uid() = customer_id);

CREATE POLICY "reviews_delete_staff" ON public.reviews
  FOR DELETE USING (public.is_internal_staff());

-- ============================================================
-- RESTAURANT SETTINGS — Staff read, manager write
-- ============================================================
CREATE POLICY "settings_select_staff" ON public.restaurant_settings
  FOR SELECT USING (public.is_internal_staff());

CREATE POLICY "settings_write_manager" ON public.restaurant_settings
  FOR ALL USING (public.is_manager());
