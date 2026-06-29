-- EVE-45: per-tenant configuration seeded during provisioning (seed_config step).
-- Distinct from feature_flags (which live on tenants). One row per tenant.

CREATE TABLE public.tenant_config (
  tenant_id   UUID PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  settings    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_tenant_config_updated_at
  BEFORE UPDATE ON public.tenant_config
  FOR EACH ROW EXECUTE FUNCTION public.set_tenants_updated_at();

ALTER TABLE public.tenant_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_config_select_own ON public.tenant_config
  FOR SELECT USING (
    tenant_id IN (SELECT id FROM public.tenants WHERE owner_id = auth.uid())
  );
