-- supabase/seed.sql
-- LOCAL DEVELOPMENT SEED ONLY.
-- Applied automatically by: make db-reset (supabase db reset)
-- DO NOT run against production.
--
-- Creates a platform_admin dev user for local testing of the /platform route.
-- Credentials are intentionally hardcoded — this is a private, local-dev-only file.

-- pgcrypto is required for crypt() / gen_salt() used in encrypted_password below.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Create the auth user in Supabase auth.users
--    handle_new_user() trigger fires on INSERT and creates the public.users row.
--    The manual public.users INSERT below is a safety net in case the trigger
--    does not fire in the seed context (e.g. seed runs before trigger is active).
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data,
  created_at,
  updated_at,
  aud,
  role
) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'platform-admin@evecosys.local',
  crypt('DevPassword123!', gen_salt('bf')),
  NOW(),
  '{"role": "platform_admin", "full_name": "Dev Platform Admin"}'::jsonb,
  NOW(),
  NOW(),
  'authenticated',
  'authenticated'
) ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Ensure the public.users row exists (idempotent safety net)
--    The trigger inserts this row on auth.users INSERT; this INSERT is a
--    belt-and-suspenders guard for seed runs where trigger order may vary.
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO public.users (id, email, full_name, role)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'platform-admin@evecosys.local',
  'Dev Platform Admin',
  'platform_admin'
) ON CONFLICT (id) DO NOTHING;
