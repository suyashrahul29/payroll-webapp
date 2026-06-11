import express from 'express';
import { tenantContext } from './middleware/tenant.ts';
import employees from './routes/employees.ts';

const app = express();
app.use(express.json({ limit: '4mb' }));

// Permissive CORS for local dev: the static prototype in app/ (file:// or any static
// server) needs to call this API across origins. Tighten for production.
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, X-Tenant-Id');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Everything past here requires a tenant context (RLS).
app.use('/api', tenantContext, employees);

// Centralized error handler.
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  const message = err instanceof Error ? err.message : 'internal error';
  res.status(500).json({ error: message });
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => console.log(`payroll api listening on http://localhost:${port}`));
