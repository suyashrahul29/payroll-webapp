import pg from 'pg';

const { Pool } = pg;

// node-pg returns BIGINT (oid 20) as string by default to avoid precision loss.
// Our paise values are well within Number.MAX_SAFE_INTEGER (₹90 trillion), so parse
// them to JS numbers for clean JSON.
pg.types.setTypeParser(20, (v) => (v === null ? null : Number(v)));

// The server connects as the least-privilege, non-superuser role so RLS applies.
export const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ??
    'postgres://payroll_app:payroll_app_pw@localhost:5544/payroll',
});

/**
 * Runs `fn` inside a transaction with the RLS tenant context set for that
 * transaction only (set_config(..., is_local => true)). Every query the callback
 * issues is automatically scoped to `tenantId` by the row-level policies.
 */
export async function withTenant<T>(
  tenantId: string,
  fn: (client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT set_config($1, $2, true)', ['app.tenant_id', tenantId]);
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
