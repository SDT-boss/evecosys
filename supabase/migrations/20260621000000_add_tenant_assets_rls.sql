-- Phase 4: Board Tenant Settings — complete tenant-assets bucket RLS (BSET-01)
-- Adds DELETE and UPDATE policies so authenticated users cannot delete or
-- overwrite another tenant's assets. Companion to tenant_owner_upload in
-- 20260620120000_add_tenant_branding.sql.

CREATE POLICY "tenant_owner_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'tenant-assets'
    AND split_part(name, '/', 2) = (
      SELECT id::text FROM public.tenants WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "tenant_owner_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'tenant-assets'
    AND split_part(name, '/', 2) = (
      SELECT id::text FROM public.tenants WHERE owner_id = auth.uid()
    )
  );
