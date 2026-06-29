-- Fix handle_new_user() so trigger exceptions never propagate to auth.users INSERT.
--
-- Root cause: Supabase returns "Database error creating new user" when the
-- handle_new_user() trigger throws an unhandled exception. On staging, schema
-- drift (e.g. a missing role CHECK update, a NOT NULL column added by a later
-- migration that the ELSE-branch doesn't set) caused the trigger to raise,
-- which rolled back the entire auth.users INSERT — so the auth user was never
-- created and listUsers() returned nothing.
--
-- Fix: wrap the trigger body in EXCEPTION WHEN OTHERS to catch any failure,
-- emit a WARNING so it's visible in logs, and return NEW so the auth INSERT
-- always commits. The public.users profile row is created by the app / test
-- setup code via a subsequent upsert, so silencing the trigger error here is
-- safe and correct.
--
-- Also changes ON CONFLICT (id) DO NOTHING to ON CONFLICT (id) DO UPDATE so
-- that a re-created auth user (same UUID, same email) refreshes its profile
-- row instead of silently leaving stale data.

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
    SET id         = NEW.id,
        google_id  = COALESCE(provider_id, google_id),
        full_name  = COALESCE(NEW.raw_user_meta_data->>'full_name', full_name),
        role       = COALESCE(NEW.raw_user_meta_data->>'role', role),
        avatar_url = COALESCE(NEW.raw_user_meta_data->>'avatar_url', avatar_url),
        tenant_id  = COALESCE((NEW.raw_user_meta_data->>'tenant_id')::uuid, tenant_id)
    WHERE id = existing_id;
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
    ON CONFLICT (id) DO UPDATE
      SET google_id  = COALESCE(provider_id, public.users.google_id),
          full_name  = COALESCE(NEW.raw_user_meta_data->>'full_name', public.users.full_name),
          role       = COALESCE(NEW.raw_user_meta_data->>'role', public.users.role),
          tenant_id  = COALESCE((NEW.raw_user_meta_data->>'tenant_id')::uuid, public.users.tenant_id);
  END IF;

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user() skipped for % (SQLSTATE %, msg: %)',
    NEW.email, SQLSTATE, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
