-- EVE-45: provisioning run tracking. One run per provisioning attempt for a tenant,
-- with per-step progress. Tenant lifecycle state stays in public.tenants; these
-- tables only track the orchestration. Service role writes; tenant owner can read.

CREATE TABLE public.provisioning_runs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'Running'
              CHECK (status IN ('Running', 'Provisioned', 'RolledBack', 'AwaitingManualIntervention')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.provisioning_run_steps (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id      UUID NOT NULL REFERENCES public.provisioning_runs(id) ON DELETE CASCADE,
  step_name   TEXT NOT NULL
              CHECK (step_name IN ('bind_byodb', 'seed_config', 'bootstrap_feature_flags',
                                   'bootstrap_metering', 'readiness_gate', 'activate')),
  status      TEXT NOT NULL
              CHECK (status IN ('Running', 'Completed', 'Failed', 'Compensated')),
  attempts    INTEGER NOT NULL DEFAULT 0,
  error       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_provisioning_runs_tenant ON public.provisioning_runs(tenant_id);
CREATE INDEX idx_provisioning_run_steps_run ON public.provisioning_run_steps(run_id);

CREATE TRIGGER trg_provisioning_runs_updated_at
  BEFORE UPDATE ON public.provisioning_runs
  FOR EACH ROW EXECUTE FUNCTION public.set_tenants_updated_at();

CREATE TRIGGER trg_provisioning_run_steps_updated_at
  BEFORE UPDATE ON public.provisioning_run_steps
  FOR EACH ROW EXECUTE FUNCTION public.set_tenants_updated_at();

ALTER TABLE public.provisioning_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provisioning_run_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY provisioning_runs_select_own ON public.provisioning_runs
  FOR SELECT USING (
    tenant_id IN (SELECT id FROM public.tenants WHERE owner_id = auth.uid())
  );

CREATE POLICY provisioning_run_steps_select_own ON public.provisioning_run_steps
  FOR SELECT USING (
    run_id IN (
      SELECT pr.id FROM public.provisioning_runs pr
      JOIN public.tenants t ON t.id = pr.tenant_id
      WHERE t.owner_id = auth.uid()
    )
  );
