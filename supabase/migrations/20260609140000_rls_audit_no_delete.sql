-- Phase 3: RLS audit — confirm no DELETE policy exists for the authenticated
-- role on public.tenants. Tenant deletion/decommissioning is a service-role-only
-- operation (service role bypasses RLS by default in Supabase).
--
-- This is a defensive/audit migration: it asserts the security contract for
-- SEC-02 / SEC-04 and fails loudly if a DELETE policy is ever introduced for
-- the authenticated role. No schema changes to the tenants table.

DO $$
DECLARE
  delete_policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO delete_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'tenants'
    AND cmd = 'DELETE'
    AND 'authenticated' = ANY (roles);

  IF delete_policy_count > 0 THEN
    RAISE EXCEPTION
      'Phase 3 RLS audit FAILED: a DELETE policy exists for the authenticated role on public.tenants. Tenant deletion must be service-role only.';
  END IF;

  RAISE NOTICE 'Phase 3 RLS audit: no DELETE policy for authenticated on public.tenants — CONFIRMED';
END;
$$;
