-- EVE-45: minimal storage metering bootstrap. Provisioning inserts a zeroed row
-- with a default quota. Real usage accounting is deferred to a later ticket.

CREATE TABLE public.tenant_storage_metering (
  tenant_id    UUID PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  bytes_used   BIGINT NOT NULL DEFAULT 0,
  quota_bytes  BIGINT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_tenant_storage_metering_updated_at
  BEFORE UPDATE ON public.tenant_storage_metering
  FOR EACH ROW EXECUTE FUNCTION public.set_tenants_updated_at();

ALTER TABLE public.tenant_storage_metering ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_storage_metering_select_own ON public.tenant_storage_metering
  FOR SELECT USING (
    tenant_id IN (SELECT id FROM public.tenants WHERE owner_id = auth.uid())
  );
