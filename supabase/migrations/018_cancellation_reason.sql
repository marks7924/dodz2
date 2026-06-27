-- ============================================================
-- DODZ FRIED CHICKEN — Migration 018: Order Cancellation Reason
-- Adds cancellation_reason column to orders table
-- ============================================================

-- Add cancellation_reason column to orders table
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
