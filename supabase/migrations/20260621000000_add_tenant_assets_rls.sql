-- Phase 4: Board Tenant Settings — complete tenant-assets bucket RLS (BSET-01)
-- Adds DELETE and UPDATE policies so authenticated users cannot delete or
-- overwrite another tenant's assets. Companion to tenant_owner_upload in
-- 20260620120000_add_tenant_branding.sql.
--
-- WR-01: LIMIT 1 added to subqueries to prevent ERROR when a user owns multiple tenants.
-- CR-04: WITH CHECK added to UPDATE policy to prevent a tenant relocating objects
--        into another tenant's path prefix.

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
