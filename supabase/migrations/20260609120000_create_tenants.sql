-- Create tenants table for control-plane tenant lifecycle (Phase 1).
-- State values must stay in sync with TenantState in lib/tenant/types.ts.

CREATE TABLE public.tenants (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  state       TEXT NOT NULL DEFAULT 'Registered'
              CHECK (state IN ('Registered', 'Provisioning', 'Active', 'Suspended', 'Decommissioned')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Keep updated_at fresh on every UPDATE
CREATE OR REPLACE FUNCTION public.set_tenants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tenants_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.set_tenants_updated_at();

-- Enable Row Level Security (service role bypasses RLS automatically)
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- A tenant owner can read only their own row
CREATE POLICY tenants_select_own ON public.tenants
  FOR SELECT USING (auth.uid() = owner_id);

-- A tenant owner can update only their own row
CREATE POLICY tenants_update_own ON public.tenants
  FOR UPDATE USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- A tenant owner can insert a row only for themselves
CREATE POLICY tenants_insert_own ON public.tenants
  FOR INSERT WITH CHECK (auth.uid() = owner_id);
