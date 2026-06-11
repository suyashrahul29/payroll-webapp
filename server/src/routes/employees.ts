import { Router } from 'express';
import { withTenant } from '../db.ts';
import { importRequest } from '../validation.ts';

const router = Router();

// GET /api/employees — list this tenant's employee master (RLS-scoped).
router.get('/employees', async (req, res, next) => {
  try {
    const rows = await withTenant(req.tenantId!, async (c) => {
      const { rows } = await c.query(
        `SELECT employee_id, name, email, department,
                ctc_annual_paise, doj, state, updated_at
           FROM employee
          ORDER BY employee_id`,
      );
      return rows;
    });
    res.json({ employees: rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/employees/import — bulk upsert by (tenant, employee_id) + audit row.
router.post('/employees/import', async (req, res, next) => {
  const parsed = importRequest.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'validation failed', issues: parsed.error.issues });
  }
  const { source, row_count, employees } = parsed.data;

  try {
    const summary = await withTenant(req.tenantId!, async (c) => {
      let imported = 0;
      let updated = 0;
      for (const e of employees) {
        const { rows } = await c.query(
          `INSERT INTO employee
             (tenant_id, employee_id, name, email, department, ctc_annual_paise, doj, state)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (tenant_id, employee_id) DO UPDATE SET
             name = EXCLUDED.name,
             email = EXCLUDED.email,
             department = EXCLUDED.department,
             ctc_annual_paise = EXCLUDED.ctc_annual_paise,
             doj = EXCLUDED.doj,
             state = EXCLUDED.state,
             updated_at = now()
           RETURNING (xmax = 0) AS inserted`,
          [
            req.tenantId,
            e.employee_id,
            e.name,
            e.email,
            e.department,
            e.ctc_annual_paise,
            e.doj,
            e.state,
          ],
        );
        if (rows[0].inserted) imported++;
        else updated++;
      }

      await c.query(
        `INSERT INTO import_audit
           (tenant_id, source, row_count, imported_count, updated_count, rejected_count)
         VALUES ($1, $2, $3, $4, $5, 0)`,
        [req.tenantId, source, row_count, imported, updated],
      );

      return { imported, updated, total: employees.length };
    });

    res.status(201).json(summary);
  } catch (err) {
    next(err);
  }
});

// GET /api/import-audit — append-only audit trail for this tenant.
router.get('/import-audit', async (req, res, next) => {
  try {
    const rows = await withTenant(req.tenantId!, async (c) => {
      const { rows } = await c.query(
        `SELECT source, row_count, imported_count, updated_count, rejected_count, created_at
           FROM import_audit
          ORDER BY created_at DESC
          LIMIT 50`,
      );
      return rows;
    });
    res.json({ audit: rows });
  } catch (err) {
    next(err);
  }
});

export default router;
