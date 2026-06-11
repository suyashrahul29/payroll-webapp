import type { Request, Response, NextFunction } from 'express';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Augment Express Request with the resolved tenant id.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      tenantId?: string;
    }
  }
}

/**
 * Resolves the tenant from the X-Tenant-Id header. In a real deployment this would
 * come from the authenticated session, not a client header — for this slice it lets
 * the prototype prove isolation by switching tenants.
 */
export function tenantContext(req: Request, res: Response, next: NextFunction) {
  const tenantId = req.header('x-tenant-id');
  if (!tenantId) {
    return res.status(400).json({ error: 'X-Tenant-Id header is required' });
  }
  if (!UUID_RE.test(tenantId)) {
    return res.status(400).json({ error: 'X-Tenant-Id must be a UUID' });
  }
  req.tenantId = tenantId;
  next();
}
