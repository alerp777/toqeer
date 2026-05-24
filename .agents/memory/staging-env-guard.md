---
name: Staging env guard pattern
description: Which files need production+staging guard and which already have it.
---

The correct pattern for fatal secret checks is:
```typescript
if (process.env.NODE_ENV === "production" || process.env.NODE_ENV === "staging") {
  logger.fatal(msg);
  process.exit(1);
}
```

**Files that already had the correct dual guard (production + staging):**
- `artifacts/api-server/src/middleware/security.ts` — lines 102, 145

**Files that were missing the staging guard (fixed):**
- `artifacts/api-server/src/routes/admin-shared.ts` — `resolveAdminSecret()` + `_ADMIN_REFRESH_SECRET` IIFE
- `artifacts/api-server/src/utils/admin-jwt.ts` — `resolveSecret()`
- `artifacts/api-server/src/utils/admin-csrf.ts` — `resolveCsrfSecret()`

**Why:** Staging environments are production-like and must not silently use padded dev fallback secrets. Only true local development (NODE_ENV=development or unset) should allow the fallback.
