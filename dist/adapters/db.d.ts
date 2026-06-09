/**
 * Database Adapter
 *
 * Handles PostgreSQL connections, migrations, and RLS setup.
 * Provides methods for querying blockers and source freshness records.
 */
import { PoolClient } from "pg";
import { Blocker } from "../domain/models/blocker.js";
import { SourceFreshness } from "../domain/models/source-freshness.js";
/**
 * Database adapter for PostgreSQL
 */
export declare class Database {
    private pool;
    constructor(connectionString?: string);
    /**
     * Run database migrations
     */
    runMigrations(): Promise<void>;
    /**
     * Set the current tenant for RLS enforcement
     * Must be called before any tenant-scoped queries
     */
    setTenant(client: PoolClient, tenant_id: string): Promise<void>;
    /**
     * Query all active blockers for a tenant
     */
    getBlockers(tenant_id: string): Promise<Blocker[]>;
    /**
     * Query all blockers (resolved and unresolved) for a tenant
     */
    getAllBlockers(tenant_id: string): Promise<Blocker[]>;
    /**
     * Insert a new blocker
     */
    createBlocker(blocker: Blocker): Promise<Blocker>;
    /**
     * Update blocker resolution state
     */
    resolveBlocker(blocker_id: string, resolved_at: Date): Promise<Blocker>;
    /**
     * Query all source freshness records for a tenant
     */
    getSourceFreshness(tenant_id: string): Promise<SourceFreshness[]>;
    /**
     * Get a specific source freshness record
     */
    getSource(tenant_id: string, source_name: string): Promise<SourceFreshness | null>;
    /**
     * Insert or update source freshness record
     */
    upsertSourceFreshness(record: SourceFreshness): Promise<SourceFreshness>;
    /**
     * Health check: verify database connection
     */
    healthCheck(): Promise<boolean>;
    /**
     * Close database connection pool
     */
    close(): Promise<void>;
    private rowToBlocker;
    private rowToSourceFreshness;
}
//# sourceMappingURL=db.d.ts.map