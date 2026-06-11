# payroll-webapp — backend (employee-master slice)

The first vertical slice moved **off browser `localStorage` onto a real Node/TS + Postgres
backend**, per `_bmad-output/planning-artifacts/architecture.md` §2 & §4. It proves the
production stack on one slice: **tenant isolation (RLS), integer-paise money, and an
append-only import audit log.**

Scope is deliberately one slice — the **employee master** (`tenant`, `employee`,
`employment_detail`, `import_audit`). Everything else in `app/` still runs on localStorage.

## Stack

- **Node + TypeScript** (run directly via `tsx`, no build step)
- **Express** HTTP API
- **PostgreSQL 16** (Docker Compose), accessed with `pg` and **plain SQL migrations**
  (no ORM — money/RLS logic stays transparent)
- **zod** request validation

## Prerequisites

Docker Desktop + Node 18×/20×/24×. (Verified on Node 24, Docker 29, Compose v5.)

## Run it

```powershell
cd server
npm install
npm run db:up      # start Postgres 16 (host port 5544 -> container 5432)
npm run migrate    # create schema + RLS + seed two demo tenants + app role
npm run dev        # API on http://localhost:3000  (npm start for no-watch)
```

Then open `app/import.html` (via any static server, e.g. `python -m http.server 8000`
from the repo root → http://localhost:8000/app/import.html). Importing a CSV now writes to
Postgres; if the API is down it transparently falls back to localStorage so the demo still
works offline.

Reset everything (wipes data): `npm run db:reset && npm run migrate`.

## Architecture notes

- **Two roles, on purpose.** Migrations run as the admin/owner (`payroll_admin`); the server
  connects as a **non-superuser** role (`payroll_app`). PostgreSQL superusers *bypass RLS
  entirely* — even `FORCE ROW LEVEL SECURITY` — so the app must not be a superuser, or tenant
  isolation silently does nothing.
- **RLS tenant context** is set per-request inside a transaction via
  `set_config('app.tenant_id', <id>, true)` (see `src/db.ts` `withTenant`). The policies read
  that GUC; unset → `NULL` → zero rows (fail closed).
- **Money is `bigint` paise**, never float. Formatting to ₹ happens only at the UI edge.
- Tenant is resolved here from the `X-Tenant-Id` header for demo convenience. In production it
  must come from the authenticated session, not a client header.

## API

All `/api/*` routes except `/api/health` require an `X-Tenant-Id` UUID header.
Seeded demo tenants: `11111111-…-111111111111` (Acme), `22222222-…-222222222222` (Globex).

| Method | Path | Purpose |
|---|---|---|
| GET  | `/api/health` | Liveness, no tenant needed |
| GET  | `/api/employees` | List this tenant's employee master |
| POST | `/api/employees/import` | Bulk upsert by `(tenant, employee_id)` + audit row |
| GET  | `/api/import-audit` | Append-only import trail (latest 50) |

`POST /api/employees/import` body:

```json
{
  "source": "CSV",
  "row_count": 2,
  "employees": [
    { "employee_id": "EMP001", "name": "Priya Sharma", "email": "priya@acme.in",
      "department": "Engineering", "ctc_annual_paise": 60000000, "doj": "2022-03-15", "state": "MH" }
  ]
}
```

Returns `{ "imported": <new>, "updated": <existing>, "total": <n> }`.
```
