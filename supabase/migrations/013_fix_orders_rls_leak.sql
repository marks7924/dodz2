-- ============================================================
-- DIOCESE/DODZ — Migration 013: Fix Orders RLS Policy Leak
-- Clean up legacy permissive RLS policies on the orders table
-- ============================================================

-- 1. Drop the legacy permissive select policies that bypass branch restrictions
DROP POLICY IF EXISTS "orders_select_staff" ON public.orders;
DROP POLICY IF EXISTS "orders_select_own" ON public.orders;

-- Now only the "orders_select_own_or_staff" (which handles branch isolation)
-- and "orders_select_driver" (driver specific) policies will control SELECT access.
