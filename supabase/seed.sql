-- supabase/seed.sql
-- LOCAL DEVELOPMENT SEED ONLY.
-- Applied automatically by: make db-reset (supabase db reset)
-- DO NOT run against production.
--
-- Auth users are created via GoTrue admin API in seed-users.mjs (called by make db-reset).
-- Direct INSERT into auth.users is intentionally omitted — pgcrypto.crypt() produces bcrypt
-- hashes that GoTrue cannot verify (GoTrue uses argon2id in newer versions).

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Public users safety net
--    handle_new_user() trigger creates this row on auth.users INSERT.
--    This INSERT is a belt-and-suspenders guard in case the trigger fires
--    before seed-users.mjs has created the auth row (should not happen in
--    practice since seed-users.mjs runs after db reset completes).
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO public.users (id, email, full_name, role)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'platform-admin@evecosys.local',
  'Dev Platform Admin',
  'platform_admin'
) ON CONFLICT (id) DO NOTHING;
