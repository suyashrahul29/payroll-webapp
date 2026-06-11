-- The app MUST connect as a non-superuser role: PostgreSQL superusers (and BYPASSRLS
-- roles) ignore row-level security entirely, even ALTER TABLE ... FORCE. The default
-- POSTGRES_USER is a superuser, so we create a dedicated least-privilege role for the
-- API. Migrations still run as the admin/owner; the server connects as payroll_app.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'payroll_app') THEN
    CREATE ROLE payroll_app LOGIN PASSWORD 'payroll_app_pw' NOSUPERUSER NOBYPASSRLS;
  END IF;
END $$;

GRANT USAGE ON SCHEMA public TO payroll_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO payroll_app;
