# AJKMart Super App

## Project Overview
AJKMart is a full-stack super-app for Azad Jammu & Kashmir (AJK), Pakistan. It provides Grocery (Mart), Food Delivery, Taxi/Bike Rides, Pharmacy, and Parcel Delivery — unified by a digital wallet.

---

## User Preferences
- Iterative development — ask before major changes.
- **Do NOT modify** `artifacts/ajkmart/` folder.
- **Do NOT modify** `artifacts/api-server/src/routes/auth.ts`.
- Prefer clear and concise explanations.

---

## Monorepo Structure

```
/
├── artifacts/
│   ├── api-server/          Express 5 REST API (TypeScript, Drizzle ORM, PostgreSQL)
│   ├── admin/               Admin dashboard (React + Vite)
│   ├── rider-app/           Rider web app (React + Vite, dark theme)
│   ├── vendor-app/          Vendor web app (React + Vite)
│   └── ajkmart/             Customer mobile app (Expo React Native) — DO NOT EDIT
├── lib/
│   ├── db/                  Drizzle schema + migrations (PostgreSQL)
│   ├── i18n/                Shared translations (EN / UR / Roman UR)
│   ├── api-client-react/    React Query hooks + API client
│   └── auth-react/          Shared auth SDK
```

**Package manager:** pnpm workspaces  
**Language:** TypeScript throughout

---

## Technology Stack

| Layer | Technology |
|---|---|
| Backend | Express 5, Drizzle ORM, PostgreSQL, Socket.io, Pino logging |
| Web frontends | React 18, Vite, TailwindCSS, React Query, Wouter |
| Mobile | Expo React Native, NativeWind, expo-router |
| Auth | Phone OTP, Email OTP, Password, Google, Facebook, Magic Link, Biometric, TOTP 2FA |
| Maps | Leaflet (OSM/Mapbox/Google), provider loaded from DB config at runtime |
| i18n | `@workspace/i18n` — EN, UR (Nastaliq), Roman UR, dual-display modes |

---

## Design Tokens

| App | Primary | Accent | Background |
|---|---|---|---|
| Admin | `#1A56DB` (blue) | `#F59E0B` (amber) | white |
| Rider | `#F0B90B` (gold) | — | `#0b0e11` (dark) |
| Vendor | `#1A56DB` (blue) | `#F59E0B` (amber) | white |

**Font:** Inter (400–700). Noto Nastaliq Urdu for RTL Urdu text.

---

## Key Backend Files

| File | Purpose |
|---|---|
| `artifacts/api-server/src/routes/auth/` | Auth routes (phone OTP, password, magic link, OAuth, 2FA) |
| `artifacts/api-server/src/routes/admin/` | Admin sub-routers (auth, users, orders, rides, finance, content, system) |
| `artifacts/api-server/src/routes/home-feed.ts` | `GET /api/home-feed` — banners + flash-deals + trending in one parallel fetch (P1) |
| `artifacts/api-server/src/routes/rides.ts` | Ride booking, fare estimation, OTP verify, parcel |
| `artifacts/api-server/src/routes/wallet.ts` | Deposit, P2P transfer (SELECT FOR UPDATE), withdraw |
| `artifacts/api-server/src/routes/rider.ts` | Rider profile, KYC, ride status transitions |
| `artifacts/api-server/src/routes/vendor.ts` | Vendor profile, orders, store settings |
| `artifacts/api-server/src/middleware/security.ts` | `requireRole()` factory — customerAuth / riderAuth / vendorAuth / adminAuth |
| `artifacts/api-server/src/lib/socketio.ts` | Socket.io rooms, rider location broadcast, ghost-rider cleanup |
| `artifacts/api-server/src/services/password.ts` | bcrypt hashing, JWT signing — no hardcoded fallback secrets |

---

## Key Frontend Files

| App | File | Purpose |
|---|---|---|
| rider-app | `src/lib/auth/LoginScreen.tsx` | All 7 login methods — each calls `fetchRiderProfile()` then `api.getMe()` |
| rider-app | `src/lib/auth/RegisterWizard.tsx` | Multi-step registration wizard |
| rider-app | `src/App.tsx` | Router, magic link handler (`/auth/magic-link?token=`) |
| vendor-app | `src/lib/auth/LoginScreen.tsx` | Login — `handleSuccess()` always calls `api.getMe()` internally |
| vendor-app | `src/lib/auth/RegisterWizard.tsx` | Vendor registration with store details |
| vendor-app | `src/App.tsx` | Router, magic link handler (`/auth/magic-link?token=`) |
| admin | `src/pages/live-riders-map.tsx` | Fleet map — real-time rider tracking, history playback |

---

## Database Schema (Key Tables)

```
users                — all roles (customer/rider/vendor/admin), phone, email, CNIC
rider_profiles       — vehicle info, license, documents (FK → users)
vendor_profiles      — store info, business details (FK → users)
rides                — trip_otp, otp_verified, is_parcel, event timestamps
wallets              — balance per user
wallet_transactions  — all credits/debits
orders               — mart/food/pharmacy orders
categories           — hierarchical (parentId self-ref), type: mart/food/pharmacy
magic_link_tokens    — tokenHash (SHA-256), expiresAt, usedAt
```

---

## Auth Flow Notes

- **Magic link URL format:** `{APP_BASE_URL}/auth/magic-link?token=<raw_token>`
- **Rider/Vendor login:** After any successful auth, `fetchRiderProfile()` / `handleSuccess()` calls `api.getMe()` for real profile — no hardcoded `{ id: "", roles: [] }` profiles.
- **Dev OTP:** Requires BOTH `NODE_ENV=development` AND `ALLOW_DEV_OTP=true` env vars.
- **JWT secrets:** No hardcoded fallbacks — missing `JWT_SECRET` throws at startup.

---

## Environment Variables (Required)

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | JWT signing key (throws if missing) |
| `TOTP_ENCRYPTION_KEY` | AES key for TOTP secrets |
| `TOKEN_HASH_SECRET` | HMAC key for magic link / email verify tokens |
| `ALLOW_DEV_OTP` | Set `true` in dev to expose OTP in API response |
| `APP_BASE_URL` | Base URL used in magic link emails |

---

## TypeScript Status
All three compiled artifacts are error-free:
- `artifacts/rider-app` — `tsc --noEmit` ✅
- `artifacts/vendor-app` — `tsc --noEmit` ✅
- `artifacts/api-server` — `tsc --noEmit` ✅
