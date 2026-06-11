-- Deterministic demo tenants so the prototype can send a known X-Tenant-Id and so
-- two-tenant isolation is demonstrable. Idempotent.
INSERT INTO tenant (id, name) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Acme Manufacturing Pvt Ltd'),
  ('22222222-2222-2222-2222-222222222222', 'Globex Pvt Ltd')
ON CONFLICT (id) DO NOTHING;
