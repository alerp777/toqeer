---
name: Permission catalog rules
description: How requirePermission() validates at module load time — must register before using.
---

`requirePermission(id)` calls `assertPermissionId(id)` synchronously at module load time (not request time). If `id` is not in the `PERMISSIONS` array in `lib/auth-utils/src/permissions.ts`, the server **crashes on startup** with "Unknown permission id: X".

**Rule:** Always add new permission strings to `lib/auth-utils/src/permissions.ts` BEFORE using them in any route file.

**Why:** The assertion runs when the route module is first imported (ESM static init), so a missing entry is a fatal crash, not a 403.

**How to apply:** When adding `requirePermission("x.y.z")` to any route, first add `{ id: "x.y.z", label: "...", category: "..." }` to the `PERMISSIONS` array. `super_admin` automatically gets all permissions via `PERMISSION_IDS = PERMISSIONS.map(p => p.id)`.

**Categories in use:** system, users, orders, finance, vendors, content, promotions, fleet, support, vendor_staff, rider_ops. Use existing categories — adding a new category requires updating `PermissionCategory` type too.
