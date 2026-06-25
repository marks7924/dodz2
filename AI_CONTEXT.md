# AI_CONTEXT.md — Dodz Fried Chicken Platform
> **Last Updated:** 2026-06-26 | **Session:** Phase 11 Complete — Mobile Responsiveness done, TypeScript build clean
> **Next AI:** Read this entire file before touching ANY code.

---

## 🏗️ Current Architecture Overview

**Type:** Next.js 16 App Router, TypeScript, TailwindCSS v4
**Rendering:** Client Components (`'use client'`) throughout all pages
**State:** Zustand (cart only) + TanStack Query (server data)
**Auth:** Supabase Auth via `@supabase/ssr` — **COMPLETE**
**Database:** Supabase PostgreSQL (replacing in-memory mock)
**Realtime:** Supabase Realtime — chat.ts ✅ + notifications.ts ✅
**Payments:** Paymob (architecture built — credentials as placeholders)
**Styling:** TailwindCSS v4 with custom CSS vars in `globals.css`
**i18n:** Custom LanguageContext (EN/AR, RTL supported)

---

## 📦 Technology Stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | Next.js 16.2.9 | App Router |
| Language | TypeScript 5 | Strict mode |
| UI | React 19.2.4 | |
| Styling | TailwindCSS v4 | Custom theme tokens |
| Icons | lucide-react 1.21.0 | |
| State (cart) | Zustand 5.0.14 | `src/store/useCartStore.ts` |
| Server state | TanStack Query 5.101.0 | In Providers.tsx |
| Auth | @supabase/ssr + supabase-js | Cookie-based sessions |
| Database | Supabase PostgreSQL | Row Level Security enabled |
| Realtime | Supabase Realtime | chat.ts + notifications.ts implemented |
| Payments | Paymob | Card + Fawry |
| Font | Geist Sans + Geist Mono | Google Fonts via next/font |

---

## 📁 File Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout, Providers wrapper
│   ├── globals.css             # CSS vars + TailwindCSS v4 theme tokens
│   ├── page.tsx                # Customer menu page (main)
│   ├── admin/
│   │   ├── page.tsx            # ✅ Admin/Staff/Owner dashboard (RBAC + Chat tab)
│   │   ├── users/page.tsx      # ✅ User management (OWNER/ADMIN only)
│   │   ├── analytics/page.tsx  # ✅ Analytics dashboard (Supabase data)
│   │   ├── logs/page.tsx       # ✅ Audit logs viewer
│   │   └── settings/page.tsx   # ✅ Restaurant settings
│   ├── auth/
│   │   ├── login/page.tsx      # ✅ Supabase Auth login
│   │   ├── signup/page.tsx     # ✅ Customer registration
│   │   ├── reset-password/     # ✅ Password reset (Suspense boundary added)
│   │   └── callback/route.ts   # ✅ OAuth/email confirm callback
│   ├── driver/page.tsx         # ✅ Driver portal (real auth + Realtime + PATCH API)
│   ├── checkout/page.tsx       # ✅ Checkout (Paymob Card, Fawry, COD)
│   ├── track/[id]/page.tsx     # Order tracking
│   ├── payment/
│   │   ├── success/page.tsx    # ✅ Payment success landing page
│   │   ├── failure/page.tsx    # ✅ Payment failure landing page
│   │   └── mock-iframe/        # ✅ Sandboxed local payment simulator
│   └── api/
│       ├── orders/route.ts     # ✅ Order listing and creation API
│       ├── orders/[id]/status/ # ✅ Order status update API
│       ├── menu/route.ts       # ✅ Menu data API
│       ├── admin/users/        # ✅ User management API
│       ├── chat/messages/      # ✅ Chat support messages API
│       ├── coupons/validate/   # ✅ Coupon validation API
│       └── payment/
│           ├── initiate/       # ✅ Paymob initiation API
│           └── webhook/        # ✅ Paymob callback webhook
├── components/
│   ├── layout/
│   │   ├── Header.tsx          # ✅ Nav + auth state + NotificationBell integrated
│   │   ├── Footer.tsx          # Footer links + social
│   │   ├── Providers.tsx       # QueryClient + LanguageProvider
│   │   └── NotificationBell.tsx# ✅ Realtime notifications bell (Phase 6)
│   └── cart/
│       └── CartSidebar.tsx     # Slide-out cart drawer
├── context/
│   ├── LanguageContext.tsx     # EN/AR translation + RTL
│   └── AuthContext.tsx         # ✅ Supabase auth state (all TS errors fixed)
├── lib/
│   ├── db.ts                   # ✅ Dual-mode DB (Supabase + in-memory mock fallback)
│   ├── permissions.ts          # ✅ RBAC permission map
│   ├── validation.ts           # ✅ Input sanitization + payload validation
│   ├── chat.ts                 # ✅ Supabase Realtime chat (Phase 5)
│   ├── notifications.ts        # ✅ Supabase Realtime notifications (Phase 6)
│   ├── paymob.ts               # ✅ Paymob API helpers (Phase 7)
│   └── supabase/
│       ├── client.ts           # ✅ Browser Supabase client
│       └── server.ts           # ✅ Server Supabase + admin client
├── store/
│   └── useCartStore.ts         # Cart state (Zustand)
supabase/
└── migrations/
    ├── 001_schema.sql          # ✅ Core tables + indexes + enums
    ├── 002_rls.sql             # ✅ Row Level Security policies
    ├── 003_functions.sql       # ✅ DB triggers + functions
    └── 004_seed.sql            # ✅ Initial data seed
middleware.ts                   # ✅ Route protection + session refresh
AI_CONTEXT.md                   # ✅ This file
```

---

## 🗄️ Database Schema Summary

### Tables Created (in `001_schema.sql`)
| Table | Purpose |
|---|---|
| `profiles` | Extends `auth.users` — name, phone, role, active status |
| `branches` | 7 restaurant branches (EN+AR names, map URLs) |
| `categories` | Menu categories (Burgers, Chicken, Sides, Drinks) |
| `menu_items` | Products with single/double pricing |
| `coupons` | Discount codes with usage limits |
| `orders` | Customer orders with status lifecycle |
| `order_items` | Line items per order |
| `payment_transactions` | Full payment audit trail |
| `support_chats` | Chat sessions per customer |
| `support_messages` | Individual chat messages |
| `notifications` | Real-time user notifications |
| `activity_logs` | Full audit log of all actions |
| `reviews` | Product reviews (1 per customer per item) |
| `restaurant_settings` | Key-value config store |

### Key Enums
- `user_role`: CUSTOMER, DRIVER, STAFF, ADMIN, DEVELOPER, OWNER
- `order_status`: PENDING, PREPARING, ON_THE_WAY, DELIVERED, CANCELLED
- `payment_status`: PENDING, PAID, FAILED, REFUNDED
- `chat_status`: OPEN, RESOLVED, CLOSED

---

## ✅ Implemented Features

| Feature | Status | Notes |
|---|---|---|
| Customer menu page | ✅ Complete | Browse, add to cart, reviews |
| Admin dashboard | ✅ Complete | RBAC, Orders, Menu, Coupons, Chat tabs |
| Admin sub-pages | ✅ Complete | Users, Analytics, Logs, Settings |
| Driver portal | ✅ Complete | Real auth, PATCH APIs, and Supabase Realtime order channel |
| Checkout page | ✅ Complete | Real payments (Paymob Card, Fawry, COD) |
| Order tracking | ✅ Partial | Mock data |
| Bilingual EN/AR | ✅ Complete | LanguageContext, RTL |
| Cart (Zustand) | ✅ Complete | Coupon, delivery fee, subtotal |
| Supabase clients | ✅ Complete | client.ts + server.ts |
| SQL Schema | ✅ Complete | All tables, RLS, functions, seed |
| Auth system | ✅ Complete | Login, signup, reset-password, callback, middleware |
| AuthContext | ✅ Complete | All TypeScript strict errors fixed |
| RBAC permissions | ✅ Complete | permissions.ts + role-gated UI |
| Internal user mgmt | ✅ Complete | Admin can create OWNER/ADMIN/DEVELOPER/STAFF accounts |
| Live chat (Realtime) | ✅ Complete | chat.ts — Supabase channels, typing indicator, history |
| Notification system | ✅ Complete | notifications.ts + NotificationBell component in Header |
| API: Admin Users | ✅ Complete | /api/admin/users + /api/admin/users/[id] |
| API: Orders | ✅ Complete | /api/orders + /api/orders/[id]/status |
| API: Menu | ✅ Complete | /api/menu |
| API: Chat support | ✅ Complete | /api/chat/messages |
| API: Coupons | ✅ Complete | /api/coupons/validate |
| Data Layer (db.ts) | ✅ Complete | Upgraded to dual-mode Supabase DB |
| Paymob integration | ✅ Complete | /api/payment/initiate + /api/payment/webhook |
| Mobile Responsiveness | ✅ Complete | Phase 11 — sticky bottom tab bar, responsive grids, CSS utilities |
| TypeScript build | ✅ Clean | 0 errors — Link import + isOrdering state fixes |

---

## 🔄 Pending Features

| Feature | Phase | Priority |
|---|---|---|
| Final handoff documentation | Phase 12 | LOW |

---

## 🔐 Authentication Implementation Status

- **Provider:** Supabase Auth (email + password)
- **Session:** Cookie-based via `@supabase/ssr`
- **Status:** ✅ COMPLETE
- **Login page:** `/auth/login` — ✅ Complete
- **Signup page:** `/auth/signup` — ✅ Complete (customers only)
- **Password reset:** `/auth/reset-password` — ✅ Complete (Suspense boundary fixed)
- **Email callback:** `/auth/callback` — ✅ Complete
- **Session refresh / protection:** `middleware.ts` at root — ✅ Complete
- **AuthContext:** `src/context/AuthContext.tsx` — ✅ Complete (all TypeScript errors resolved)

### How Auth Works
1. Customer/staff visits → middleware checks session cookie
2. No session → redirect to `/auth/login` (except public routes)
3. Login → Supabase issues JWT in cookie
4. `AuthContext` reads session on client via `onAuthStateChange`
5. Role stored in `profiles.role` column (fetched via profile lookup)
6. After login → role-based redirect (see RBAC section)

---

## 🛡️ RBAC Implementation Status

- **Status:** ✅ COMPLETE
- **Roles:**
  - `OWNER` — Full access to everything
  - `ADMIN` — Staff/driver/customer mgmt, orders, support
  - `DEVELOPER` — Technical settings, logs, analytics, integrations
  - `STAFF` — Orders, customers, support
  - `DRIVER` — Own deliveries only
  - `CUSTOMER` — Own orders + chat

### Post-Login Redirects
| Role | Redirect |
|---|---|
| OWNER | `/admin` |
| ADMIN | `/admin` |
| DEVELOPER | `/admin` |
| STAFF | `/admin` |
| DRIVER | `/driver` |
| CUSTOMER | `/` |

### Internal Account Creation
- OWNER, ADMIN, DEVELOPER can create internal accounts
- Internal accounts NOT available via public `/auth/signup`
- Creation via `/admin/users` → calls server API `/api/admin/users` → creates Supabase auth user + profile

---

## 💬 Live Chat Implementation Status

- **Status:** ✅ COMPLETE (Phase 5)
- **File:** `src/lib/chat.ts`
- **Functions:**
  - `getOrCreateChatSession(customerId)` — get/create OPEN chat session
  - `getChatMessages(chatId)` — fetch message history
  - `sendChatMessage(chatId, senderId, role, content)` — insert message
  - `subscribeToChatMessages(chatId, callback)` — Realtime INSERT subscription
  - `subscribeToTyping(chatId, callback)` — broadcast typing indicator
- **Admin side:** `src/app/admin/page.tsx` CHAT tab — `activeChatUserId` logic, 2s polling fallback
- **Customer side:** `src/app/page.tsx` — uses chat.ts hooks

---

## 🔔 Notification System Status

- **Status:** ✅ COMPLETE (Phase 6)
- **Files:**
  - `src/lib/notifications.ts` — Supabase Realtime subscription, CRUD helpers
  - `src/components/layout/NotificationBell.tsx` — UI bell with unread badge
  - `src/components/layout/Header.tsx` — NotificationBell integrated (authenticated users only)
- **Features:**
  - Real-time delivery via `postgres_changes` INSERT subscription
  - Browser push notifications (if permission granted)
  - Animated unread count badge
  - Mark single / mark-all-as-read
  - Type-based icons (order, chat, payment, role_change, etc.)
  - RTL/EN-AR compatible

---

## 💳 Payment Integration Status

- **Provider:** Paymob
- **Methods:** Credit/Debit Card (iframe), Fawry (reference code), COD
- **Status:** ✅ COMPLETE (Phase 7) — Fully integrated Card checkout via Paymob secure redirection, Fawry reference codes modal, and COD direct placement. Local sandbox simulator enabled for dev environment testing.
- **Env vars needed:**
  - `PAYMOB_API_KEY`
  - `PAYMOB_INTEGRATION_ID_CARD`
  - `PAYMOB_INTEGRATION_ID_FAWRY`
  - `PAYMOB_HMAC_SECRET`
- **Flow (Card):** Checkout → `/api/payment/initiate` → Paymob auth → create order → get payment key → embed iframe → webhook confirms → update DB
- **Flow (Fawry):** Checkout → `/api/payment/initiate` → get Fawry ref → show to customer → Paymob webhook confirms → update DB

---

## 🌍 Environment Variables

```env
# Supabase (add to .env)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Paymob (add to .env)
PAYMOB_API_KEY=your-paymob-api-key
PAYMOB_INTEGRATION_ID_CARD=card-integration-id
PAYMOB_INTEGRATION_ID_FAWRY=fawry-integration-id
PAYMOB_HMAC_SECRET=hmac-secret

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 🔒 Security Measures Implemented

- [x] Cookie-based sessions (httpOnly, SameSite) via @supabase/ssr
- [x] Service role key NEVER exposed to client
- [x] Protected routes via Next.js middleware
- [x] Role-based UI gating (RBAC)
- [x] Supabase RLS policies on all tables
- [x] HMAC verification on payment webhooks
- [x] Input validation on all API routes (Phase 10)
- [x] Role-based API authorization on all routes

---

## ⚠️ Known Issues

1. **Mock data resets on server restart** — ✅ Resolved (db.ts now queries Supabase PostgreSQL with mock fallback)
2. **Chat still uses 2s polling** in admin tab — Realtime channel subscription to be wired in Phase 5 completion pass
3. **Payment UI is fake** — ✅ Resolved (integrated Paymob iframe and Fawry codes)
4. **viewport metadata warning** — multiple pages export `viewport` inside `metadata` export; non-breaking but should be migrated to `export const viewport = {...}`
5. **No error boundaries** on any page
6. **TypeScript errors in checkout + driver** — ✅ Fixed (isOrdering state + Link import)

---

## 📋 Technical Debt

1. `src/app/admin/page.tsx` — ~1100 lines, should be split into sub-components
2. `src/lib/db.ts` — 566 lines of mock data, fully replace with Supabase API routes (Phase 8)
3. Driver status logic in `driver/page.tsx` — status transitions don't match new delivery enum
4. `Header.tsx` — branch list hardcoded (should come from Supabase `branches` table)
5. `confirm()` dialogs used for delete confirmation — should use modal
6. Analytics + Logs pages import `createClient()` inside component body (should be hoisted)

---

## 🚀 Recommended Next Steps for Incoming AI

1. **Read this file fully first**
2. Check `task.md` for the current phase
3. Add your Supabase credentials to `.env.local` before running the app
4. Run `supabase/migrations/*.sql` files IN ORDER (001 → 004) in Supabase SQL Editor
5. **Next phase is Phase 7** — Paymob payment integration
6. After that, **Phase 8** — API routes to replace `src/lib/db.ts` mock
7. Never switch away from Supabase Auth — it is the sole auth provider
8. Never hardcode credentials — always use `process.env.*`
9. Preserve EN/AR bilingual support in all new UI
10. Maintain dark theme (`#0A0A0B` background, `primary-red`, `accent-amber`)
11. **Always update AI_CONTEXT.md AND task.md after every change**

---

## 📝 Implementation Log

| Date | Phase | Action | Status |
|---|---|---|---|
| 2026-06-25 | 1 | Install `@supabase/supabase-js` + `@supabase/ssr` | ✅ |
| 2026-06-25 | 1 | Update `.env` with Supabase + Paymob vars | ✅ |
| 2026-06-25 | 1 | Create `src/lib/supabase/client.ts` | ✅ |
| 2026-06-25 | 1 | Create `src/lib/supabase/server.ts` | ✅ |
| 2026-06-25 | 2 | Create `supabase/migrations/001_schema.sql` | ✅ |
| 2026-06-25 | 2 | Create `supabase/migrations/002_rls.sql` | ✅ |
| 2026-06-25 | 2 | Create `supabase/migrations/003_functions.sql` | ✅ |
| 2026-06-25 | 2 | Create `supabase/migrations/004_seed.sql` | ✅ |
| 2026-06-25 | 3 | Create Auth pages, callback, middleware & context | ✅ |
| 2026-06-25 | 4 | Create RBAC permissions matrix & admin sub-pages | ✅ |
| 2026-06-26 | 4 | Fix: Restore `handleOpenEditProduct` + `handleSaveProduct` in admin/page.tsx | ✅ |
| 2026-06-26 | 4 | Fix: AuthContext TypeScript strict errors (implicit any) | ✅ |
| 2026-06-26 | 4 | Fix: auth/reset-password Suspense boundary for useSearchParams | ✅ |
| 2026-06-26 | 5 | Create `src/lib/chat.ts` — Supabase Realtime chat | ✅ |
| 2026-06-26 | 5 | Wire chat.ts types (RealtimePostgresChangesPayload) | ✅ |
| 2026-06-26 | 6 | Create `src/lib/notifications.ts` — Supabase Realtime notifications | ✅ |
| 2026-06-26 | 6 | Create `src/components/layout/NotificationBell.tsx` | ✅ |
| 2026-06-26 | 6 | Integrate NotificationBell into Header.tsx | ✅ |
| 2026-06-26 | 7 | Paymob payment integration (initiate + webhook + pages) | ✅ |
| 2026-06-26 | 8 | API routes: orders, menu, coupons, chat, admin/users | ✅ |
| 2026-06-26 | 8 | Upgrade db.ts to dual-mode Supabase + mock fallback | ✅ |
| 2026-06-26 | 9 | Driver portal: real auth + Realtime channel + PATCH API | ✅ |
| 2026-06-26 | 10 | Security: validation.ts + security headers in middleware | ✅ |
| 2026-06-26 | 11 | Mobile: no-scrollbar + slide-in CSS utilities in globals.css | ✅ |
| 2026-06-26 | 11 | Mobile: sticky bottom tab bar in admin dashboard (md:hidden) | ✅ |
| 2026-06-26 | 11 | Mobile: chat panel stacks vertically on small screens | ✅ |
| 2026-06-26 | 11 | Mobile: admin header/title bar full-width on mobile | ✅ |
| 2026-06-26 | 11 | Fix: checkout isOrdering state missing (TSC error) | ✅ |
| 2026-06-26 | 11 | Fix: driver/page.tsx Link import missing (TSC error) | ✅ |
| 2026-06-26 | 11 | Fix: Add default fallbacks for Supabase client configuration in client.ts, server.ts, middleware.ts, and db.ts to prevent Next.js build-time static prerendering crash | ✅ |
| 2026-06-26 | 11 | Fix: Move viewport configuration out of layout.tsx metadata export into its own dedicated viewport export to resolve Next.js 14+ warnings | ✅ |
| 2026-06-26 | 2 | Fix: Supabase seed data syntax error due to non-hex digit 'm' in menu item UUIDs (replaced 'm1000000-' with 'f1000000-') | ✅ |


