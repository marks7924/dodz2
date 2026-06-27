-- ============================================================
-- DODZ FRIED CHICKEN — Migration 016: Live Driver Location Tracking
-- Creates driver_locations table for real-time GPS updates
-- ============================================================

-- Table: stores the latest GPS position per driver
-- lat/lng are nullable so drivers can have an "offline" row without coordinates
CREATE TABLE IF NOT EXISTS public.driver_locations (
  driver_id   UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  lat         DOUBLE PRECISION,             -- nullable: null when offline/no GPS yet
  lng         DOUBLE PRECISION,             -- nullable: null when offline/no GPS yet
  accuracy    DOUBLE PRECISION,             -- GPS accuracy in metres
  speed       DOUBLE PRECISION,             -- speed in km/h
  heading     DOUBLE PRECISION,             -- compass degrees 0-360
  is_online   BOOLEAN NOT NULL DEFAULT TRUE,
  order_id    UUID REFERENCES public.orders(id) ON DELETE SET NULL, -- active delivery
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index so we can quickly look up all locations for a given order
CREATE INDEX IF NOT EXISTS idx_driver_locations_order_id
  ON public.driver_locations(order_id);

-- Enable Realtime on this table so clients can subscribe
ALTER TABLE public.driver_locations REPLICA IDENTITY FULL;

-- ============================================================
-- RLS POLICIES
-- ============================================================

ALTER TABLE public.driver_locations ENABLE ROW LEVEL SECURITY;

-- Drivers can upsert their own location row
CREATE POLICY "driver_location_self_upsert"
  ON public.driver_locations
  FOR ALL
  USING (driver_id = auth.uid())
  WITH CHECK (driver_id = auth.uid());

-- Customers can read the driver location for their own orders
CREATE POLICY "driver_location_customer_read"
  ON public.driver_locations
  FOR SELECT
  USING (
    order_id IN (
      SELECT id FROM public.orders WHERE customer_id = auth.uid()
    )
  );

-- Admins / staff can read all driver locations
CREATE POLICY "driver_location_admin_read"
  ON public.driver_locations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('OWNER', 'HEAD_ADMIN', 'ADMIN', 'DEVELOPER', 'STAFF')
    )
  );
