// Applies every .sql file in db/migrations in lexical order.
// Plain SQL files (not an ORM) keep the money/RLS logic transparent and reviewable —
// appropriate for a payroll datastore.
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

// Migrations run as the admin/owner role (creates extensions, tables, roles) —
// distinct from the non-superuser role the server uses at runtime.
const pool = new pg.Pool({
  connectionString:
    process.env.ADMIN_DATABASE_URL ??
    'postgres://payroll_admin:payroll_dev_pw@localhost:5544/payroll',
});

const here = dirname(fileURLToPath(import.meta.url));
const dir = join(here, 'migrations');

const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort();
if (files.length === 0) {
  console.log('no migrations found');
} else {
  for (const f of files) {
    const sql = await readFile(join(dir, f), 'utf8');
    process.stdout.write(`applying ${f} ... `);
    await pool.query(sql);
    console.log('ok');
  }
}
await pool.end();
