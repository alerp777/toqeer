# AJKMart Super-App

A multi-service super-app platform for the AJK region of Pakistan — e-commerce, food delivery, ride-hailing, pharmacy, parcel delivery, and inter-city transport in a single monorepo.

## Quick Start

```bash
pnpm install
pnpm --filter @workspace/api-server run dev
```

See `setup.md` for full setup instructions and required environment variables.

## Applications

| App | Port | Purpose |
|---|---|---|
| API Server | 5000 | Unified backend for all clients |
| Admin Panel | 3000 | Operations, inventory, finance, safety |
| Rider App | 3002 | PWA for delivery riders |
| Vendor App | 3001 | Vendor product and order management |
| Customer App | — | Expo/React Native super-app |

## Authentication

AJKMart uses a multi-method authentication system with admin-configurable methods per role.

- **Access tokens** expire in 15 minutes
- **Refresh tokens** rotate on every use and expire in 7 days
- **Token family breach detection** revokes all sessions on token replay
- Methods: Phone OTP, Email OTP, Password, Magic Link, Google/Facebook OAuth, TOTP 2FA

📖 **Full documentation:** [docs/AUTH.md](./docs/AUTH.md)

🔍 **Interactive API docs:** `/api-docs` (when the API server is running)

## Architecture

- **Backend:** Node.js / Express / Drizzle ORM / PostgreSQL / Socket.IO
- **Frontend:** React 19 + Vite (admin/rider/vendor) · Expo (customer mobile)
- **Shared packages:** `@workspace/auth-react`, `@workspace/db`, `@workspace/api-zod`, `@workspace/i18n`
- **Auth SDK:** `@workspace/auth-react` — drop-in hooks and components for all web apps

## Running Tests

```bash
# Backend auth tests
pnpm --filter @workspace/api-server run test

# Shared SDK tests
pnpm --filter @workspace/auth-react run test

# E2E tests (requires running API server)
pnpm --filter @workspace/e2e run test
```

## Key Docs

All documentation lives in the [`docs/`](./docs/) folder:

- [docs/AUTH.md](./docs/AUTH.md) — token lifecycle, rate limits, error codes, SDK guide
- [docs/OTP_GUIDE.md](./docs/OTP_GUIDE.md) — OTP system architecture, bypass layers, emergency procedures
- [docs/REGISTRATION_GUIDE.md](./docs/REGISTRATION_GUIDE.md) — how to register users in dev/test without real SMS
- [docs/RIDER_APP_AUDIT.md](./docs/RIDER_APP_AUDIT.md) — rider app audit: 27 issues, 5 critical fixes
- [docs/ADMIN_GUIDE.md](./docs/ADMIN_GUIDE.md) — admin panel guide
- [docs/RIDER_GUIDE.md](./docs/RIDER_GUIDE.md) — rider app guide
- [docs/BUG_REPORT.md](./docs/BUG_REPORT.md) — known bugs and status
- `replit.md` — architecture overview and user preferences
- `/api-docs` — Swagger UI (live when API server is running)
