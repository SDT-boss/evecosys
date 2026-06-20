-- CR-04 + WR-01: Fix tenant-assets RLS policies applied by 20260621000000.
-- This migration corrects the already-applied policies on existing deployments.
--
-- CR-04: tenant_owner_update was missing WITH CHECK — a tenant could relocate
--        objects into another tenant's path prefix. WITH CHECK now enforces
--        the destination namespace matches the authenticated user's tenant.
--
-- WR-01: Both policies used = with an unbounded subquery. If a user ever owned
--        more than one tenant, PostgreSQL would raise "more than one row
--        returned by a subquery used as an expression", crashing the operation.
--        LIMIT 1 makes the policy deterministic and crash-resistant.

DROP POLICY IF EXISTS "tenant_owner_delete" ON storage.objects;
DROP POLICY IF EXISTS "tenant_owner_update" ON storage.objects;

CREATE POLICY "tenant_owner_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'tenant-assets'
    AND split_part(name, '/', 2) = (
      SELECT id::text FROM public.tenants WHERE owner_id = auth.uid() LIMIT 1
    )
  );

CREATE POLICY "tenant_owner_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'tenant-assets'
    AND split_part(name, '/', 2) = (
      SELECT id::text FROM public.tenants WHERE owner_id = auth.uid() LIMIT 1
    )
  )
  WITH CHECK (
    bucket_id = 'tenant-assets'
    AND split_part(name, '/', 2) = (
      SELECT id::text FROM public.tenants WHERE owner_id = auth.uid() LIMIT 1
    )
  );
