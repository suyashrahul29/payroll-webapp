-- [1.1] Readiness Service Schema
--
-- Creates the foundational database schema for blockers and source freshness tracking.
-- Enforces tenant isolation via Row-Level Security (RLS).

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Create PostgreSQL enum types for type safety and data integrity

CREATE TYPE blocker_type AS ENUM (
  'FRESHNESS_VITALS',
  'CHANGE_HANDSHAKE',
  'LIFECYCLE_CLOCK',
  'PREFLIGHT'
);

CREATE TYPE severity AS ENUM (
  'LOW',
  'MEDIUM',
  'HIGH'
);

CREATE TYPE source_type AS ENUM (
  'BIOMETRIC',
  'FINANCE',
  'BANK',
  'MANUAL'
);

CREATE TYPE freshness_state AS ENUM (
  'FRESH',
  'STALE',
  'DEAD'
);

-- ============================================================================
-- TABLES
-- ============================================================================

-- Blockers: Discrete input problems that hold score below 100%
-- Append-only: creation, resolution, and reopening are immutable timestamps
CREATE TABLE IF NOT EXISTS blockers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  blocker_type blocker_type NOT NULL,
  blocker_category VARCHAR(255) NOT NULL,
  severity severity NOT NULL,
  description TEXT NOT NULL,
  blocking_record_ids JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP WITH TIME ZONE,
  reopened_at TIMESTAMP WITH TIME ZONE,

  -- Foreign key constraint
  CONSTRAINT fk_blockers_tenant
    FOREIGN KEY (tenant_id)
    REFERENCES tenants(id) ON DELETE CASCADE,

  -- Data integrity: reopened_at only makes sense if resolved_at is set
  CONSTRAINT chk_reopened_after_resolved
    CHECK (reopened_at IS NULL OR resolved_at IS NOT NULL),

  -- Invariant: resolved_at and reopened_at are immutable once set
  -- (enforced by application logic, not DB triggers in v1)

  CONSTRAINT chk_resolved_before_reopened
    CHECK (resolved_at IS NULL OR reopened_at IS NULL OR resolved_at < reopened_at)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_blockers_tenant
  ON blockers(tenant_id);

CREATE INDEX IF NOT EXISTS idx_blockers_tenant_type
  ON blockers(tenant_id, blocker_type);

CREATE INDEX IF NOT EXISTS idx_blockers_created
  ON blockers(tenant_id, created_at DESC);

-- Row-Level Security: Users can only see their tenant's blockers
ALTER TABLE blockers ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS blockers_tenant_isolation
  ON blockers
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY IF NOT EXISTS blockers_tenant_insert
  ON blockers
  FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- ============================================================================

-- Source Freshness: Per-source sync state tracking
-- One row per (tenant_id, source_name) pair
CREATE TABLE IF NOT EXISTS source_freshness (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  source_name VARCHAR(255) NOT NULL,
  source_type source_type NOT NULL,
  last_success_at TIMESTAMP WITH TIME ZONE,
  last_failure_at TIMESTAMP WITH TIME ZONE,
  state freshness_state NOT NULL DEFAULT 'FRESH',
  staleness_threshold_seconds INTEGER NOT NULL DEFAULT 7200, -- 2 hours
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Foreign key constraint
  CONSTRAINT fk_source_freshness_tenant
    FOREIGN KEY (tenant_id)
    REFERENCES tenants(id) ON DELETE CASCADE,

  -- Unique constraint: one source per tenant
  CONSTRAINT uq_source_freshness_tenant_name
    UNIQUE (tenant_id, source_name),

  -- Data integrity
  CONSTRAINT chk_positive_staleness_threshold
    CHECK (staleness_threshold_seconds > 0),

  CONSTRAINT chk_last_success_before_failure
    CHECK (
      last_success_at IS NULL OR last_failure_at IS NULL OR
      last_success_at <= last_failure_at
    )
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_source_freshness_tenant
  ON source_freshness(tenant_id);

CREATE INDEX IF NOT EXISTS idx_source_freshness_state
  ON source_freshness(tenant_id, state);

CREATE INDEX IF NOT EXISTS idx_source_freshness_updated
  ON source_freshness(updated_at DESC);

-- Row-Level Security: Users can only see their tenant's sources
ALTER TABLE source_freshness ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS source_freshness_tenant_isolation
  ON source_freshness
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY IF NOT EXISTS source_freshness_tenant_insert
  ON source_freshness
  FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- ============================================================================
-- HELPER VIEWS (Optional, for future use)
-- ============================================================================

-- View: Active blockers per tenant
-- Useful for monitoring and debugging
CREATE OR REPLACE VIEW active_blockers AS
SELECT
  tenant_id,
  blocker_type,
  severity,
  COUNT(*) as count
FROM blockers
WHERE resolved_at IS NULL
GROUP BY tenant_id, blocker_type, severity;

-- View: Source health per tenant
-- Quick overview of source freshness states
CREATE OR REPLACE VIEW source_health AS
SELECT
  tenant_id,
  source_type,
  state,
  COUNT(*) as source_count,
  MAX(updated_at) as last_update
FROM source_freshness
GROUP BY tenant_id, source_type, state;

-- ============================================================================
-- MIGRATION METADATA
-- ============================================================================

-- Track which migrations have been applied
CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(255) PRIMARY KEY,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Mark this migration as applied
INSERT INTO schema_migrations (version)
VALUES ('001_readiness_schema')
ON CONFLICT DO NOTHING;
