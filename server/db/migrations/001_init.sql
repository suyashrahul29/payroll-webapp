-- Employee-master vertical slice.
-- Design points enforced here (from architecture.md §4):
--   * tenant isolation via Row-Level Security on tenant_id (FORCE so even the table
--     owner is subject to it — we run a single dev role, RLS must still bite)
--   * money is integer paise (BIGINT), never float
--   * append-only import audit log
-- RLS reads the tenant from the GUC `app.tenant_id`, set per-request via set_config()
-- inside a transaction (see src/db.ts withTenant). Unset -> NULL -> zero rows (fail closed).

CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- gen_random_uuid()

-- ── Directory of tenants (not tenant-scoped itself) ───────────────────────────
CREATE TABLE IF NOT EXISTS tenant (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── Employee master ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS employee (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  employee_id       text NOT NULL,                 -- external business id, e.g. EMP001
  name              text NOT NULL,
  email             text NOT NULL,
  department        text NOT NULL DEFAULT '',
  ctc_annual_paise  bigint NOT NULL CHECK (ctc_annual_paise >= 0),
  doj               date NOT NULL,
  state             char(2) NOT NULL,              -- 2-letter Indian state code
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, employee_id)
);

-- ── Statutory IDs (the "employment_detail" of the planned schema) ─────────────
CREATE TABLE IF NOT EXISTS employment_detail (
  employee_uuid  uuid PRIMARY KEY REFERENCES employee(id) ON DELETE CASCADE,
  tenant_id      uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  pan            text,
  uan            text,
  esi            text,
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- ── Append-only import audit log ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS import_audit (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  source          text NOT NULL,
  row_count       integer NOT NULL,
  imported_count  integer NOT NULL,
  updated_count   integer NOT NULL DEFAULT 0,
  rejected_count  integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_import_audit_tenant_time
  ON import_audit (tenant_id, created_at DESC);

-- ── Row-Level Security ────────────────────────────────────────────────────────
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['employee', 'employment_detail', 'import_audit'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE  ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
    EXECUTE format($f$
      CREATE POLICY tenant_isolation ON %I
        USING      (tenant_id = current_setting('app.tenant_id', true)::uuid)
        WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid)
    $f$, t);
  END LOOP;
END $$;
