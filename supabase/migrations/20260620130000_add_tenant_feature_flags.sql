-- Phase 4: Board Tenant Settings — feature flags JSONB on tenants (BSET-04, D-11)
-- Default all-true so existing tenants retain full feature access when migration runs.
-- The 8 flag keys are the canonical V1 set defined in 04-CONTEXT.md (D-08).

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS feature_flags JSONB NOT NULL DEFAULT '{
    "member_invitations": true,
    "fleet": true,
    "carbon": true,
    "trips": true,
    "driver_behaviour_score": true,
    "alerts": true,
    "charging_stations": true,
    "auth_troubleshooting": true
  }'::jsonb;
