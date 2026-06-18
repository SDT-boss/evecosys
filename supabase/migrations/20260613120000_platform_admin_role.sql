-- Phase 1: Auth & Role Foundation — add platform_admin as a first-class role.
-- Concerns: (1) extend users.role CHECK constraint, (2) set_active_tenant() session-variable helper, (3) tenants RLS policy for platform_admin.

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 1: Extend users.role CHECK constraint
--
-- The inline CHECK constraint on public.users.role must be dropped and
-- recreated to include 'platform_admin'. Use the safe DO block pattern
-- (Risk 1 from RESEARCH.md) to guard against constraint-name mismatches.
-- The handle_new_user() trigger reads raw_user_meta_data->>'role' directly;
-- no trigger changes are needed — the new value is valid once the constraint
-- accepts it.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

ALTER TABLE public.users
  ADD CONSTRAINT users_role_check
    CHECK (role IN ('manager', 'board', 'driver', 'platform_admin'));

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 2: set_active_tenant() session-variable helper
--
-- Called by createPlatformClient(tenantId) in lib/supabase/server.ts via
-- client.rpc('set_active_tenant', { tenant_id: tenantId }).
--
-- The third argument to set_config is TRUE (transaction-local scope).
-- In Supabase's PgBouncer transaction-mode pooling, this is the correct and
-- safe pattern: the variable resets at transaction end, preventing any
-- cross-request data bleed in a stateless serverless environment (T-01-03).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_active_tenant(tenant_id TEXT)
RETURNS void
LANGUAGE SQL
SECURITY INVOKER
AS $$
  SELECT set_config('app.active_tenant_id', tenant_id, true);
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 3: tenants RLS policy for platform_admin
--
-- Phase 2 will use this policy to list all tenants in the Platform Admin area.
-- Without this policy, platform_admin queries against public.tenants return
-- zero rows (RLS silent data starvation, not an error) — T-01-04.
-- Uses the existing get_my_role() helper (defined in initial_schema.sql).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY tenants_select_platform_admin ON public.tenants
  FOR SELECT USING (get_my_role() = 'platform_admin');
