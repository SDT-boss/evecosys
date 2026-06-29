-- Phase 4: Board Tenant Settings — add tenant_id FK to users table (BSET-02, D-15)
-- Required for Users tab to scope member list to the board member's tenant.
-- Also updates handle_new_user() trigger to write tenant_id from invite metadata.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL;

-- RLS: board members can select users in their tenant
CREATE POLICY "users_select_by_tenant" ON public.users
  FOR SELECT USING (
    tenant_id = (SELECT id FROM public.tenants WHERE owner_id = auth.uid())
  );

-- RLS: board members can delete users in their tenant (Remove action)
CREATE POLICY "users_delete_board_own_tenant" ON public.users
  FOR DELETE USING (
    get_my_role() = 'board' AND
    tenant_id = (SELECT id FROM public.tenants WHERE owner_id = auth.uid())
  );

-- Update handle_new_user() to write tenant_id from invite metadata.
-- Preserves ALL existing logic: provider_id variable, email-existence check,
-- UPDATE public.drivers, UPDATE public.users, INSERT ELSE branch.
-- The trigger on auth.users does NOT need to be recreated — only the function.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  existing_id UUID;
  provider_id TEXT;
BEGIN
  provider_id := COALESCE(NEW.raw_user_meta_data->>'sub', NEW.raw_user_meta_data->>'provider_id', NULL);

  SELECT id INTO existing_id FROM public.users WHERE email = NEW.email LIMIT 1;

  IF FOUND THEN
    UPDATE public.drivers SET user_id = NEW.id WHERE user_id = existing_id;

    UPDATE public.users
    SET id = NEW.id,
        google_id = COALESCE(provider_id, google_id),
        full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', full_name),
        role = COALESCE(NEW.raw_user_meta_data->>'role', role),
        avatar_url = COALESCE(NEW.raw_user_meta_data->>'avatar_url', avatar_url),
        tenant_id = COALESCE((NEW.raw_user_meta_data->>'tenant_id')::uuid, tenant_id)
    WHERE id = existing_id;

    RETURN NEW;
  ELSE
    INSERT INTO public.users (id, email, google_id, full_name, role, tenant_id)
    VALUES (
      NEW.id,
      NEW.email,
      provider_id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
      COALESCE(NEW.raw_user_meta_data->>'role', 'driver'),
      (NEW.raw_user_meta_data->>'tenant_id')::uuid
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
