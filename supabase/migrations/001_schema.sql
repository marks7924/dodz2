-- ============================================================
-- DODZ FRIED CHICKEN — DATABASE SCHEMA
-- Migration 001: Core Tables
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM ('CUSTOMER', 'DRIVER', 'STAFF', 'ADMIN', 'DEVELOPER', 'OWNER');
CREATE TYPE order_status AS ENUM ('PENDING', 'PREPARING', 'ON_THE_WAY', 'DELIVERED', 'CANCELLED');
CREATE TYPE order_type AS ENUM ('DELIVERY', 'PICKUP');
CREATE TYPE size_option AS ENUM ('SINGLE', 'DOUBLE', 'NONE');
CREATE TYPE payment_method AS ENUM ('COD', 'FAWRY', 'CARD');
CREATE TYPE payment_status AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');
CREATE TYPE discount_type AS ENUM ('PERCENT', 'FIXED');
CREATE TYPE chat_status AS ENUM ('OPEN', 'RESOLVED', 'CLOSED');
CREATE TYPE notification_type AS ENUM ('new_order', 'order_status', 'new_chat', 'payment', 'role_change', 'delivery_update', 'user_update');
CREATE TYPE delivery_status AS ENUM ('ASSIGNED', 'PICKED_UP', 'ON_THE_WAY', 'DELIVERED', 'CANCELLED');

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================

CREATE TABLE public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name     TEXT NOT NULL DEFAULT '',
  phone         TEXT,
  avatar_url    TEXT,
  role          user_role NOT NULL DEFAULT 'CUSTOMER',
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  is_suspended  BOOLEAN NOT NULL DEFAULT FALSE,
  branch_id     UUID, -- for staff: their assigned branch
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- BRANCHES
-- ============================================================

CREATE TABLE public.branches (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_en    TEXT NOT NULL,
  name_ar    TEXT NOT NULL,
  map_url    TEXT,
  address_en TEXT,
  address_ar TEXT,
  phone      TEXT,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CATEGORIES
-- ============================================================

CREATE TABLE public.categories (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_en    TEXT NOT NULL,
  name_ar    TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- MENU ITEMS
-- ============================================================

CREATE TABLE public.menu_items (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id   UUID NOT NULL REFERENCES public.categories(id) ON DELETE SET NULL,
  name_en       TEXT NOT NULL,
  name_ar       TEXT NOT NULL,
  desc_en       TEXT NOT NULL DEFAULT '',
  desc_ar       TEXT NOT NULL DEFAULT '',
  price_single  NUMERIC(10,2) NOT NULL,
  price_double  NUMERIC(10,2),
  image_url     TEXT NOT NULL DEFAULT '',
  is_available  BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order    INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- COUPONS
-- ============================================================

CREATE TABLE public.coupons (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code            TEXT NOT NULL UNIQUE,
  discount_type   discount_type NOT NULL,
  discount_value  NUMERIC(10,2) NOT NULL,
  min_order_value NUMERIC(10,2) NOT NULL DEFAULT 0,
  expiry_date     TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  usage_limit     INT,
  used_count      INT NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ORDERS
-- ============================================================

CREATE TABLE public.orders (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id     UUID NOT NULL REFERENCES public.profiles(id),
  branch_id       UUID REFERENCES public.branches(id),
  type            order_type NOT NULL DEFAULT 'DELIVERY',
  status          order_status NOT NULL DEFAULT 'PENDING',
  total           NUMERIC(10,2) NOT NULL,
  delivery_fee    NUMERIC(10,2) NOT NULL DEFAULT 0,
  address         TEXT,
  lat             DOUBLE PRECISION,
  lng             DOUBLE PRECISION,
  coupon_code     TEXT,
  discount        NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_method  payment_method NOT NULL DEFAULT 'COD',
  payment_status  payment_status NOT NULL DEFAULT 'PENDING',
  driver_id       UUID REFERENCES public.profiles(id),
  customer_name   TEXT NOT NULL DEFAULT '',
  customer_phone  TEXT NOT NULL DEFAULT '',
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ORDER ITEMS
-- ============================================================

CREATE TABLE public.order_items (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id      UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id  UUID REFERENCES public.menu_items(id) ON DELETE SET NULL,
  name_en       TEXT NOT NULL,
  name_ar       TEXT NOT NULL,
  size          size_option NOT NULL DEFAULT 'NONE',
  quantity      INT NOT NULL DEFAULT 1,
  price         NUMERIC(10,2) NOT NULL
);

-- ============================================================
-- PAYMENT TRANSACTIONS
-- ============================================================

CREATE TABLE public.payment_transactions (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id                UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  customer_id             UUID NOT NULL REFERENCES public.profiles(id),
  provider                TEXT NOT NULL DEFAULT 'paymob',
  method                  payment_method NOT NULL,
  amount                  NUMERIC(10,2) NOT NULL,
  currency                TEXT NOT NULL DEFAULT 'EGP',
  status                  payment_status NOT NULL DEFAULT 'PENDING',
  provider_order_id       TEXT,
  provider_transaction_id TEXT,
  fawry_ref_number        TEXT,
  payment_key             TEXT,
  metadata                JSONB NOT NULL DEFAULT '{}',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SUPPORT CHATS
-- ============================================================

CREATE TABLE public.support_chats (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id      UUID NOT NULL REFERENCES public.profiles(id),
  assigned_staff_id UUID REFERENCES public.profiles(id),
  status           chat_status NOT NULL DEFAULT 'OPEN',
  subject          TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SUPPORT MESSAGES
-- ============================================================

CREATE TABLE public.support_messages (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id      UUID NOT NULL REFERENCES public.support_chats(id) ON DELETE CASCADE,
  sender_id    UUID NOT NULL REFERENCES public.profiles(id),
  sender_role  user_role NOT NULL,
  content      TEXT NOT NULL,
  is_read      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE TABLE public.notifications (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type         notification_type NOT NULL,
  title        TEXT NOT NULL,
  body         TEXT NOT NULL,
  is_read      BOOLEAN NOT NULL DEFAULT FALSE,
  metadata     JSONB NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ACTIVITY LOGS (AUDIT)
-- ============================================================

CREATE TABLE public.activity_logs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_email   TEXT,
  action        TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id   TEXT,
  metadata      JSONB NOT NULL DEFAULT '{}',
  ip_address    INET,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- REVIEWS
-- ============================================================

CREATE TABLE public.reviews (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  rating       INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment      TEXT NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (customer_id, menu_item_id)
);

-- ============================================================
-- RESTAURANT SETTINGS
-- ============================================================

CREATE TABLE public.restaurant_settings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key             TEXT NOT NULL UNIQUE,
  value           TEXT NOT NULL,
  description     TEXT,
  updated_by      UUID REFERENCES public.profiles(id),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================

CREATE INDEX idx_orders_customer_id ON public.orders(customer_id);
CREATE INDEX idx_orders_driver_id ON public.orders(driver_id);
CREATE INDEX idx_orders_branch_id ON public.orders(branch_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX idx_menu_items_category_id ON public.menu_items(category_id);
CREATE INDEX idx_support_messages_chat_id ON public.support_messages(chat_id);
CREATE INDEX idx_support_messages_sender_id ON public.support_messages(sender_id);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX idx_activity_logs_actor_id ON public.activity_logs(actor_id);
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_payment_transactions_order_id ON public.payment_transactions(order_id);
