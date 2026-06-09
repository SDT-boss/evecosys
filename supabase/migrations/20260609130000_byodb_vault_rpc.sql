-- BYODB credential storage via Supabase Vault (Phase 2).
-- Wraps the vault schema so the service-role client can store/delete secrets via RPC.

CREATE EXTENSION IF NOT EXISTS supabase_vault;

-- Add vault_secret_id column to tenants for secret-to-tenant association and rollback support
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS vault_secret_id UUID;

-- RPC wrapper: store a BYODB credential secret in Supabase Vault
-- SECURITY DEFINER runs as the function owner (postgres) with access to the vault schema.
-- The secret value is passed as an argument and written only into the vault — never into
-- a plaintext column on tenants or any other public table.
CREATE OR REPLACE FUNCTION public.store_byodb_secret(p_name text, p_secret text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
BEGIN
  RETURN vault.create_secret(p_secret, p_name, 'BYODB credential for tenant');
END;
$$;

-- RPC wrapper: delete a BYODB credential secret from Supabase Vault (used for rollback)
CREATE OR REPLACE FUNCTION public.delete_byodb_secret(p_secret_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
BEGIN
  DELETE FROM vault.secrets WHERE id = p_secret_id;
END;
$$;

-- Restrict both RPCs to service_role only — anon/authenticated must never call these
REVOKE EXECUTE ON FUNCTION public.store_byodb_secret(text, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_byodb_secret(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.store_byodb_secret(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_byodb_secret(uuid) TO service_role;
