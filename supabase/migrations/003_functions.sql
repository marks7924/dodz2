-- ============================================================
-- DODZ FRIED CHICKEN — DATABASE FUNCTIONS & TRIGGERS
-- Migration 003: Functions, Triggers, and Stored Procedures
-- Run AFTER 002_rls.sql
-- ============================================================

-- ============================================================
-- TRIGGER: Auto-create profile on new auth user
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1), ''),
    NEW.raw_user_meta_data->>'phone',
    COALESCE(NEW.raw_user_meta_data->>'role', 'CUSTOMER')::user_role
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- TRIGGER: Update updated_at timestamp automatically
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_menu_items_updated_at
  BEFORE UPDATE ON public.menu_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_support_chats_updated_at
  BEFORE UPDATE ON public.support_chats
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_payment_transactions_updated_at
  BEFORE UPDATE ON public.payment_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- FUNCTION: Assign driver to order (atomic)
-- ============================================================

CREATE OR REPLACE FUNCTION public.assign_driver(
  p_order_id UUID,
  p_driver_id UUID
)
RETURNS public.orders AS $$
DECLARE
  v_driver public.profiles;
  v_order public.orders;
BEGIN
  -- Verify driver exists and has DRIVER role
  SELECT * INTO v_driver FROM public.profiles
  WHERE id = p_driver_id AND role = 'DRIVER' AND is_active = TRUE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Driver not found or not active';
  END IF;

  -- Update order
  UPDATE public.orders
  SET driver_id = p_driver_id, status = 'PREPARING', updated_at = NOW()
  WHERE id = p_order_id
  RETURNING * INTO v_order;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  RETURN v_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: Get or create support chat for customer
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_or_create_chat(p_customer_id UUID)
RETURNS public.support_chats AS $$
DECLARE
  v_chat public.support_chats;
BEGIN
  -- Try to find open chat
  SELECT * INTO v_chat FROM public.support_chats
  WHERE customer_id = p_customer_id AND status = 'OPEN'
  ORDER BY created_at DESC LIMIT 1;

  -- Create new chat if none exists
  IF NOT FOUND THEN
    INSERT INTO public.support_chats (customer_id, status)
    VALUES (p_customer_id, 'OPEN')
    RETURNING * INTO v_chat;
  END IF;

  RETURN v_chat;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: Dashboard stats (revenue, orders, pending)
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_dashboard_stats(p_branch_id UUID DEFAULT NULL)
RETURNS TABLE (
  total_revenue NUMERIC,
  total_orders BIGINT,
  pending_orders BIGINT,
  preparing_orders BIGINT,
  delivered_today BIGINT,
  active_drivers BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(CASE WHEN o.status = 'DELIVERED' THEN o.total ELSE 0 END), 0) AS total_revenue,
    COUNT(o.id) AS total_orders,
    COUNT(CASE WHEN o.status = 'PENDING' THEN 1 END) AS pending_orders,
    COUNT(CASE WHEN o.status = 'PREPARING' THEN 1 END) AS preparing_orders,
    COUNT(CASE WHEN o.status = 'DELIVERED' AND o.updated_at >= CURRENT_DATE THEN 1 END) AS delivered_today,
    (SELECT COUNT(*) FROM public.profiles WHERE role = 'DRIVER' AND is_active = TRUE) AS active_drivers
  FROM public.orders o
  WHERE (p_branch_id IS NULL OR o.branch_id = p_branch_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================
-- FUNCTION: Validate and apply coupon
-- ============================================================

CREATE OR REPLACE FUNCTION public.validate_coupon(p_code TEXT, p_order_total NUMERIC)
RETURNS TABLE (
  is_valid BOOLEAN,
  discount_type TEXT,
  discount_value NUMERIC,
  message TEXT
) AS $$
DECLARE
  v_coupon public.coupons;
BEGIN
  SELECT * INTO v_coupon FROM public.coupons
  WHERE UPPER(code) = UPPER(p_code) AND is_active = TRUE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::NUMERIC, 'Invalid or expired coupon code';
    RETURN;
  END IF;

  IF v_coupon.expiry_date < NOW() THEN
    RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::NUMERIC, 'Coupon has expired';
    RETURN;
  END IF;

  IF v_coupon.usage_limit IS NOT NULL AND v_coupon.used_count >= v_coupon.usage_limit THEN
    RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::NUMERIC, 'Coupon usage limit reached';
    RETURN;
  END IF;

  IF p_order_total < v_coupon.min_order_value THEN
    RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::NUMERIC,
      ('Minimum order value is ' || v_coupon.min_order_value || ' EGP');
    RETURN;
  END IF;

  RETURN QUERY SELECT TRUE, v_coupon.discount_type::TEXT, v_coupon.discount_value, 'Coupon applied successfully';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================
-- FUNCTION: Create notification for a user
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_type notification_type,
  p_title TEXT,
  p_body TEXT,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS public.notifications AS $$
DECLARE
  v_notification public.notifications;
BEGIN
  INSERT INTO public.notifications (user_id, type, title, body, metadata)
  VALUES (p_user_id, p_type, p_title, p_body, p_metadata)
  RETURNING * INTO v_notification;

  RETURN v_notification;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: Log an activity (audit trail)
-- ============================================================

CREATE OR REPLACE FUNCTION public.log_activity(
  p_actor_id UUID,
  p_actor_email TEXT,
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.activity_logs (actor_id, actor_email, action, resource_type, resource_id, metadata)
  VALUES (p_actor_id, p_actor_email, p_action, p_resource_type, p_resource_id, p_metadata);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: Mark all notifications as read for user
-- ============================================================

CREATE OR REPLACE FUNCTION public.mark_all_notifications_read(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.notifications
  SET is_read = TRUE
  WHERE user_id = p_user_id AND is_read = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Enable Realtime on required tables
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;
