-- Phase 2: Platform Admin Shell — add display name to tenants table.
-- The empty-string DEFAULT is intentional: existing rows need a valid name value
-- without a data-migration step. Phase 4 branding settings (BSET-01) allows
-- board members to set the canonical name. Platform admins see '' until then.

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT '';
