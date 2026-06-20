-- Phase 4: Board Tenant Settings — add branding columns to tenants table (BSET-01)
-- logo_url: NULL until board member uploads a logo. primary_color: NULL until configured.
-- Both nullable, no DEFAULT — existing rows retain NULL until the board member sets them.

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS primary_color TEXT;

-- Storage bucket for tenant assets (BSET-01 logo upload)
INSERT INTO storage.buckets (id, name, public)
VALUES ('tenant-assets', 'tenant-assets', true)
ON CONFLICT (id) DO NOTHING;

-- RLS: only the tenant owner can upload to their own tenant path within tenant-assets.
-- Uses split_part to extract the second folder segment (the tenant UUID) from the object path.
-- Path convention: tenant-logos/<tenant_id>/<filename>
CREATE POLICY "tenant_owner_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'tenant-assets' AND
    split_part(name, '/', 2) = (
      SELECT id::text FROM public.tenants WHERE owner_id = auth.uid()
    )
  );
