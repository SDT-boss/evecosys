-- EVE-55: tamper-evident, tenant-scoped audit log for sensitive platform ops
-- (provisioning, lifecycle/override, credential rotation, tenant config changes).
--
-- Tamper-evidence is enforced in the DB, not the app:
--   * BEFORE INSERT trigger builds a global SHA-256 hash chain
--     (row_hash = sha256(prev_hash || canonical(row))), serialized by an
--     advisory xact lock so concurrent inserts produce a consistent chain.
--   * BEFORE UPDATE/DELETE trigger rejects ALL mutations except an authorized
--     purge (purge sets a transaction-local flag). This holds even for the
--     service role: RLS is bypassed by service role, triggers are not.
--
-- tenant_id / actor_id are plain UUIDs (NO foreign key): audit evidence must
-- outlive the entities it references, and FK delete actions would either destroy
-- evidence or require the row mutations the append-only trigger forbids.

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- provides digest()

CREATE TABLE public.audit_logs (
  seq           BIGSERIAL PRIMARY KEY,
  id            UUID NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL,
  actor_id      UUID,
  actor_label   TEXT NOT NULL,
  actor_role    TEXT NOT NULL,
  action        TEXT NOT NULL,
  outcome       TEXT NOT NULL CHECK (outcome IN ('ok', 'error')),
  resource_type TEXT,
  resource_id   TEXT,
  details       JSONB,
  error         TEXT,
  prev_hash     TEXT NOT NULL,
  row_hash      TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_tenant_seq ON public.audit_logs(tenant_id, seq DESC);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX idx_audit_logs_actor ON public.audit_logs(actor_id);
CREATE INDEX idx_audit_logs_created ON public.audit_logs(created_at);

-- ── Canonical content + hash chain (BEFORE INSERT) ──────────────────────────
-- The canonical string is the immutable content of the row in a fixed order.
-- Defaults (seq, created_at) are applied BEFORE this BEFORE-INSERT trigger fires,
-- so NEW.seq and NEW.created_at are already populated here.
CREATE OR REPLACE FUNCTION public.audit_logs_chain()
RETURNS TRIGGER AS $$
DECLARE
  prev TEXT;
  canonical TEXT;
BEGIN
  -- Serialize audit inserts so the chain head read below is race-free.
  PERFORM pg_advisory_xact_lock(4827392001);

  SELECT row_hash INTO prev FROM public.audit_logs ORDER BY seq DESC LIMIT 1;
  IF prev IS NULL THEN
    prev := ''; -- genesis anchor
  END IF;

  canonical :=
        NEW.seq::text
    || '|' || NEW.tenant_id::text
    || '|' || COALESCE(NEW.actor_id::text, '')
    || '|' || NEW.actor_label
    || '|' || NEW.actor_role
    || '|' || NEW.action
    || '|' || NEW.outcome
    || '|' || COALESCE(NEW.resource_type, '')
    || '|' || COALESCE(NEW.resource_id, '')
    || '|' || COALESCE(NEW.details::text, '')
    || '|' || COALESCE(NEW.error, '')
    || '|' || NEW.created_at::text;

  NEW.prev_hash := prev;
  NEW.row_hash := encode(digest(prev || canonical, 'sha256'), 'hex');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_logs_chain
  BEFORE INSERT ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.audit_logs_chain();

-- ── Append-only enforcement (BEFORE UPDATE/DELETE) ──────────────────────────
-- DELETE is allowed ONLY inside purge_audit_logs(), which sets app.audit_purge.
CREATE OR REPLACE FUNCTION public.audit_logs_block_mutation()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF current_setting('app.audit_purge', true) = 'on' THEN
      RETURN OLD;
    END IF;
    RAISE EXCEPTION 'audit_logs is append-only: DELETE is not permitted';
  END IF;
  RAISE EXCEPTION 'audit_logs is append-only: UPDATE is not permitted';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_logs_block_update
  BEFORE UPDATE ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.audit_logs_block_mutation();

CREATE TRIGGER trg_audit_logs_block_delete
  BEFORE DELETE ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.audit_logs_block_mutation();

-- ── Chain verification ──────────────────────────────────────────────────────
-- Recomputes each row's hash and checks linkage. The lowest remaining seq is the
-- anchor (its prev_hash is accepted as-is — this is what makes a purge of the
-- oldest prefix non-destructive to verification). Any edit, or any gap created by
-- deleting a NON-prefix row, breaks linkage and is reported.
-- Returns ok=true/broken_seq=NULL when intact; ok=false/broken_seq=<seq> on first break.
CREATE OR REPLACE FUNCTION public.verify_audit_chain()
RETURNS TABLE(ok BOOLEAN, broken_seq BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  r RECORD;
  expected_prev TEXT := NULL; -- NULL => first row, accept its stored prev_hash
  recomputed TEXT;
  canonical TEXT;
BEGIN
  FOR r IN SELECT * FROM public.audit_logs ORDER BY seq ASC LOOP
    IF expected_prev IS NOT NULL AND r.prev_hash <> expected_prev THEN
      ok := false; broken_seq := r.seq; RETURN NEXT; RETURN;
    END IF;

    canonical :=
          r.seq::text
      || '|' || r.tenant_id::text
      || '|' || COALESCE(r.actor_id::text, '')
      || '|' || r.actor_label
      || '|' || r.actor_role
      || '|' || r.action
      || '|' || r.outcome
      || '|' || COALESCE(r.resource_type, '')
      || '|' || COALESCE(r.resource_id, '')
      || '|' || COALESCE(r.details::text, '')
      || '|' || COALESCE(r.error, '')
      || '|' || r.created_at::text;

    recomputed := encode(digest(r.prev_hash || canonical, 'sha256'), 'hex');
    IF recomputed <> r.row_hash THEN
      ok := false; broken_seq := r.seq; RETURN NEXT; RETURN;
    END IF;

    expected_prev := r.row_hash;
  END LOOP;

  ok := true; broken_seq := NULL; RETURN NEXT;
END;
$$;

-- ── Retention purge ─────────────────────────────────────────────────────────
-- Deletes rows older than `older_than`. This is the ONLY authorized deletion
-- path; it sets a transaction-local flag the append-only trigger honors.
-- Documented retention window: 365 days (enforced by the caller, e.g. a future
-- scheduler in EVE-41). Returns the number of rows purged.
CREATE OR REPLACE FUNCTION public.purge_audit_logs(older_than INTERVAL)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted INTEGER;
BEGIN
  PERFORM set_config('app.audit_purge', 'on', true); -- transaction-local
  DELETE FROM public.audit_logs WHERE created_at < NOW() - older_than;
  GET DIAGNOSTICS deleted = ROW_COUNT;
  RETURN deleted;
END;
$$;

-- ── RLS: read-only, tenant-scoped ───────────────────────────────────────────
-- No INSERT/UPDATE/DELETE policies for authenticated users: writes are
-- service-role only, mutations are blocked by triggers for everyone.
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_logs_select_own ON public.audit_logs
  FOR SELECT USING (
    tenant_id IN (SELECT id FROM public.tenants WHERE owner_id = auth.uid())
  );

CREATE POLICY audit_logs_select_platform_admin ON public.audit_logs
  FOR SELECT USING (public.get_my_role() = 'platform_admin');

-- Lock down the maintenance functions to the service role.
REVOKE ALL ON FUNCTION public.verify_audit_chain() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.purge_audit_logs(INTERVAL) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_audit_chain() TO service_role;
GRANT EXECUTE ON FUNCTION public.purge_audit_logs(INTERVAL) TO service_role;
