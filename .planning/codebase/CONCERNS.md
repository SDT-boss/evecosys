# Codebase Concerns
<!-- mapped: 2026-06-13 -->

## Tech Debt

1. **236+ hardcoded hex colors** violating the `var(--ds-*)` token contract — found in `components/board/BoardTabsClient.tsx`, `components/manager/VehicleDrawer.tsx`, `components/ui/Badge.tsx` and most other `.tsx` files. Design system tokens are defined but not consumed by the app layer.

2. **Inline service-role client construction** in `app/api/users/create/route.ts` instead of using `lib/supabase/service.ts`'s shared `createServiceClient()`.

3. **Three competing UI component layers** with zero actual imports reaching `@evecosys/design-system` from the app:
   - `app/components/ui/` — 21 orphaned shadcn files
   - `components/ui/` — 7 custom wrappers with hardcoded colors
   - `design-system/components/` — the intended home

4. **Entire `lib/tenant/` provisioning library has no API routes wiring it** — `BYODBRegistrationService`, `TenantAuthGuard`, `RealConnectivityProbe`, `SupabaseVaultStore` are all tested but uncalled in production.

## Known Bugs

1. **`connector_type` hardcoded to `''`** in `app/api/charging/route.ts` line 21 — driver dashboard renders `"22 kW · "` with a trailing dot-space. The test at `test/unit/api/charging.test.ts` line 65 encodes the bug as expected behavior.

2. **`force_password_reset_at` enforcement only at login page** — direct URL navigation bypasses the expiry check entirely.

## Security Concerns

1. **Raw Supabase/PostgreSQL error messages returned to clients** in all 5 API routes — leaks internal schema and query structure.

2. **No rate limiting on any API route** — all endpoints are unauthenticated-rate-limit-free.

3. **`rejectUnauthorized: false`** in `lib/tenant/probeDriver.ts` line 36 for Postgres SSL probes — disables certificate verification on tenant DB connections.

4. **MySQL ownership detection via `JSON.stringify` regex match on GRANTS rows** — false positives possible; not a reliable ownership signal.

5. **`app/api/linear/me/route.ts` has no session guard** before making Linear API calls — unauthenticated callers can trigger external API requests.

## Performance Bottlenecks

1. **`app/(dashboard)/board/page.tsx` fetches all trips/vehicles with no pagination** — will degrade with fleet size growth.

2. **Full `DbConnectionParams` (including password) JSON-serialised into Vault secret** — unnecessarily large secret payload.

## Fragile Areas

1. **Leaflet components silently render nothing** if not imported via `next/dynamic { ssr: false }` — fails silently, difficult to debug.

2. **`BYODBRegistrationService.register()` returns updated state but never writes to DB** — caller must persist or the updated state is lost on process restart.

3. **`handle_new_user` trigger mutates `public.users.id` on OAuth re-login (PK rewrite)** — FK cascade behavior unverified; could corrupt relational data silently.

## Missing Critical Features

1. **No `middleware.ts` for route protection / session refresh** — all route protection is ad-hoc per page/route.

2. **No tenant provisioning API routes** — the full `lib/tenant/` stack (BYODB registration, connectivity probe, vault store) has no HTTP entrypoint wiring it.

3. **No tenant switcher UI** — the active-branch feature under development has no UI entry point yet.

## Test Coverage Gaps

| Area | Priority | Notes |
|------|----------|-------|
| `RealConnectivityProbe` completely untested | High | Security-sensitive password-scrubbing behavior unverified |
| `force_password_reset_at` bypass via direct URL navigation | High | Untested; easy to reproduce manually |
| Tenant state persistence after `BYODBRegistrationService.register()` | High | Core provisioning flow has no persistence test |
| `connector_type` bug encoded as correct in test suite | Medium | Test at `test/unit/api/charging.test.ts:65` asserts the bug |

---
*Mapped: 2026-06-13*
