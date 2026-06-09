---
plan: 03-03
phase: 03-tenant-isolation-layer
status: complete
completed: 2026-06-09
commits:
  - ba949a3 feat(03-03): add server-only service-role client factory
  - 768b5aa feat(03-03): add RLS audit migration — no authenticated DELETE on tenants
key-files:
  created:
    - lib/supabase/service.ts
    - supabase/migrations/20260609140000_rls_audit_no_delete.sql
requirements: [SEC-02, SEC-03]
---

# Plan 03-03 Summary: Service-Role Factory + RLS Audit Migration

`lib/supabase/service.ts` created with `createServiceClient()` as a function (not module-scope constant) behind an `import 'server-only'` barrier — any Client Component import triggers a Next.js build error (SEC-03). New migration `20260609140000_rls_audit_no_delete.sql` queries `pg_policies` and raises an exception if a DELETE policy for the `authenticated` role is ever added to `public.tenants` (SEC-02). No existing migration files modified.

## Self-Check: PASSED

- `lib/supabase/service.ts` first line is `import 'server-only'`
- Exports `createServiceClient()` as a function, not `export const`
- Contains `SUPABASE_SERVICE_ROLE_KEY`
- Migration queries `pg_policies` with `cmd = 'DELETE'` and `'authenticated' = ANY (roles)`
- Migration raises exception on violation, notice on clean audit
