/**
 * Database Adapter
 *
 * Handles PostgreSQL connections, migrations, and RLS setup.
 * Provides methods for querying blockers and source freshness records.
 */

import { Pool, PoolClient } from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Blocker } from "../domain/models/blocker.js";
import { SourceFreshness } from "../domain/models/source-freshness.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Database adapter for PostgreSQL
 */
export class Database {
  private pool: Pool;

  constructor(connectionString: string = process.env.DATABASE_URL || "") {
    if (!connectionString) {
      throw new Error(
        "DATABASE_URL must be set or passed as connectionString"
      );
    }

    this.pool = new Pool({
      connectionString,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.pool.on("error", (err) => {
      console.error("Unexpected error on idle client", err);
    });
  }

  /**
   * Run database migrations
   */
  async runMigrations(): Promise<void> {
    const client = await this.pool.connect();

    try {
      // Read migration file
      const migrationPath = path.join(
        __dirname,
        "../../migrations/001_readiness_schema.sql"
      );
      const migrationSQL = fs.readFileSync(migrationPath, "utf8");

      // Execute migration
      await client.query(migrationSQL);
      console.log("✅ Migrations completed successfully");
    } catch (error) {
      console.error("❌ Migration failed:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Set the current tenant for RLS enforcement
   * Must be called before any tenant-scoped queries
   */
  async setTenant(
    client: PoolClient,
    tenant_id: string
  ): Promise<void> {
    await client.query("SET app.current_tenant_id = $1", [tenant_id]);
  }

  /**
   * Query all active blockers for a tenant
   */
  async getBlockers(tenant_id: string): Promise<Blocker[]> {
    const result = await this.pool.query<any>(
      `SELECT
        id, tenant_id, blocker_type, blocker_category, severity,
        description, blocking_record_ids, created_at, resolved_at, reopened_at
       FROM blockers
       WHERE tenant_id = $1 AND resolved_at IS NULL
       ORDER BY created_at DESC`,
      [tenant_id]
    );

    return result.rows.map(row => this.rowToBlocker(row));
  }

  /**
   * Query all blockers (resolved and unresolved) for a tenant
   */
  async getAllBlockers(tenant_id: string): Promise<Blocker[]> {
    const result = await this.pool.query<any>(
      `SELECT
        id, tenant_id, blocker_type, blocker_category, severity,
        description, blocking_record_ids, created_at, resolved_at, reopened_at
       FROM blockers
       WHERE tenant_id = $1
       ORDER BY created_at DESC`,
      [tenant_id]
    );

    return result.rows.map(row => this.rowToBlocker(row));
  }

  /**
   * Insert a new blocker
   */
  async createBlocker(blocker: Blocker): Promise<Blocker> {
    const result = await this.pool.query<any>(
      `INSERT INTO blockers
        (id, tenant_id, blocker_type, blocker_category, severity,
         description, blocking_record_ids, created_at, resolved_at, reopened_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        blocker.id,
        blocker.tenant_id,
        blocker.blocker_type,
        blocker.blocker_category,
        blocker.severity,
        blocker.description,
        JSON.stringify(blocker.blocking_record_ids),
        blocker.created_at,
        blocker.resolved_at,
        blocker.reopened_at,
      ]
    );

    return this.rowToBlocker(result.rows[0]);
  }

  /**
   * Update blocker resolution state
   */
  async resolveBlocker(
    blocker_id: string,
    resolved_at: Date
  ): Promise<Blocker> {
    const result = await this.pool.query<any>(
      `UPDATE blockers
       SET resolved_at = $2
       WHERE id = $1
       RETURNING *`,
      [blocker_id, resolved_at]
    );

    if (result.rows.length === 0) {
      throw new Error(`Blocker not found: ${blocker_id}`);
    }

    return this.rowToBlocker(result.rows[0]);
  }

  /**
   * Query all source freshness records for a tenant
   */
  async getSourceFreshness(
    tenant_id: string
  ): Promise<SourceFreshness[]> {
    const result = await this.pool.query<any>(
      `SELECT
        id, tenant_id, source_name, source_type, last_success_at,
        last_failure_at, state, staleness_threshold_seconds, updated_at
       FROM source_freshness
       WHERE tenant_id = $1
       ORDER BY updated_at DESC`,
      [tenant_id]
    );

    return result.rows.map(row => this.rowToSourceFreshness(row));
  }

  /**
   * Get a specific source freshness record
   */
  async getSource(
    tenant_id: string,
    source_name: string
  ): Promise<SourceFreshness | null> {
    const result = await this.pool.query<any>(
      `SELECT
        id, tenant_id, source_name, source_type, last_success_at,
        last_failure_at, state, staleness_threshold_seconds, updated_at
       FROM source_freshness
       WHERE tenant_id = $1 AND source_name = $2`,
      [tenant_id, source_name]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.rowToSourceFreshness(result.rows[0]);
  }

  /**
   * Insert or update source freshness record
   */
  async upsertSourceFreshness(
    record: SourceFreshness
  ): Promise<SourceFreshness> {
    const result = await this.pool.query<any>(
      `INSERT INTO source_freshness
        (id, tenant_id, source_name, source_type, last_success_at,
         last_failure_at, state, staleness_threshold_seconds, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (tenant_id, source_name) DO UPDATE SET
        last_success_at = EXCLUDED.last_success_at,
        last_failure_at = EXCLUDED.last_failure_at,
        state = EXCLUDED.state,
        updated_at = EXCLUDED.updated_at
       RETURNING *`,
      [
        record.id,
        record.tenant_id,
        record.source_name,
        record.source_type,
        record.last_success_at,
        record.last_failure_at,
        record.state,
        record.staleness_threshold_seconds,
        record.updated_at,
      ]
    );

    return this.rowToSourceFreshness(result.rows[0]);
  }

  /**
   * Health check: verify database connection
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.pool.query("SELECT 1");
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Close database connection pool
   */
  async close(): Promise<void> {
    await this.pool.end();
  }

  // ========================================================================
  // PRIVATE HELPERS
  // ========================================================================

  private rowToBlocker(row: any): Blocker {
    return {
      id: row.id,
      tenant_id: row.tenant_id,
      blocker_type: row.blocker_type,
      blocker_category: row.blocker_category,
      severity: row.severity,
      description: row.description,
      blocking_record_ids: row.blocking_record_ids,
      created_at: new Date(row.created_at),
      resolved_at: row.resolved_at ? new Date(row.resolved_at) : null,
      reopened_at: row.reopened_at ? new Date(row.reopened_at) : null,
    };
  }

  private rowToSourceFreshness(row: any): SourceFreshness {
    return {
      id: row.id,
      tenant_id: row.tenant_id,
      source_name: row.source_name,
      source_type: row.source_type,
      last_success_at: row.last_success_at
        ? new Date(row.last_success_at)
        : null,
      last_failure_at: row.last_failure_at
        ? new Date(row.last_failure_at)
        : null,
      state: row.state,
      staleness_threshold_seconds: row.staleness_threshold_seconds,
      updated_at: new Date(row.updated_at),
    };
  }
}
