-- Grant the Supabase API roles access to the public schema.
--
-- Supabase Cloud auto-applies these grants when objects are created via the
-- dashboard, but a database built purely by replaying these migrations
-- (local `supabase db reset`, or a freshly provisioned tenant DB) does NOT get
-- them — every public table then returns "permission denied" (SQLSTATE 42501)
-- through PostgREST. This migration makes the grant explicit so any
-- migration-built database is API-accessible.
--
-- Table-level grants do NOT bypass Row Level Security: anon/authenticated row
-- access is still governed by RLS policies. service_role retains BYPASSRLS.
-- All statements are idempotent and safe to re-run on databases that already
-- have these grants (e.g. existing staging).

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT ALL ON ALL TABLES    IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

-- Apply to objects created by future migrations too.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES    TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;
