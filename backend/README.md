# CareerGrid Flask backend

This backend serves the vanilla HTML/CSS/JavaScript interface at `/` and exposes JSON APIs under `/api` over the existing CareerGrid MySQL database. It uses short-lived `mysql-connector-python` connections, parameterized SQL, the existing `active_opportunities`, `student_application_tracking`, and `placement_statistics` views, and the database's application-validation and offer-creation triggers. It does not create or alter tables. MySQL remains the source of truth for referential integrity, uniqueness, checks, and application eligibility.

## Configure and run

From the project root, use Python 3.10 or later. In PowerShell:

```powershell
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
notepad .env
python -m backend.app
```

Edit `.env` with the host, port, MySQL user, local password, and database name you use in MySQL Workbench. `MYSQL_DATABASE` should remain `CareerGrid`. Leave no actual password in `.env.example`; `.env` is excluded by `.gitignore`. MySQL must be running and the account must have suitable privileges on the project database. The backend never creates a schema or sample data.

The Flask development server binds to `127.0.0.1:5000`. Open `http://127.0.0.1:5000/` for the CareerGrid frontend. The UI calls the same-origin Flask API; no separate frontend server or CORS setup is needed. The database check remains at `http://127.0.0.1:5000/api/health/db` and active opportunities at `http://127.0.0.1:5000/api/opportunities`.

## Frontend

The vanilla frontend is in `../frontend/`. Use the landing page's Student tab to enter an existing `student_id`; it checks that real profile through the API. The Placement cell tab opens a local admin demo using an entered `admin_id`, which the API uses as `created_by_admin_id` for new opportunities. This is not account authentication.

Student opportunities, profile, skills, applications, interviews, placements, status updates and offer decisions call existing `/api` endpoints. The admin dashboard and application/interview management use existing admin/report endpoints. Opportunity management lists active opportunities from the public active view; the current backend has no admin endpoint to list Draft, Closed, or Cancelled opportunities. The skill manager can add a skill by ID, while a searchable catalog needs `GET /api/skills`.

The current backend has no login or authorization. The UI labels admin access as a demo and warns against public exposure. Before real deployment, add a verified authentication flow (for example `POST /api/auth/login`) and enforce role-based authorization in Flask, plus a suitable credential/identity source; student IDs and admin IDs alone are not credentials.

## Responses and errors

Successful responses have `{ "success": true, "data": ..., "error": null }`. Errors have `{ "success": false, "data": null, "error": { "code": ..., "message": ... } }`. Validation errors return 400, missing records 404, duplicate records 409, and database rule or constraint rejections 422. Unexpected failures return a generic message; connector details are written only to the local server log.

Application creation inserts only the student, opportunity, and optional resume reference. MySQL's `trg_application_validate_before_insert` checks existence, open status, time window, and CGPA eligibility. Duplicate applications are stopped by the existing unique key. Selecting an application through the administrator API invokes the existing after-update trigger, which creates its pending PLACEMENT row. No backend endpoint edits the database schema.

## API routes

All routes are rooted at `/api`; path IDs are positive database IDs. JSON write requests use `Content-Type: application/json`.

| Method | Route | Purpose |
|---|---|---|
| GET | `/health`, `/health/db` | Process and database checks |
| GET | `/opportunities` | Active opportunities from the existing view; optional `type`, `location`, `company`, `minimum_cgpa` (published cutoff floor), `eligible_cgpa` (show roles this CGPA can meet) filters |
| GET | `/opportunities/<id>` | Opportunity record and company details |
| GET, PUT | `/students/<id>` | Student profile; update supplied profile fields |
| GET, POST | `/students/<id>/skills` | List or add a skill association (`skill_id`, optional proficiency/date) |
| DELETE | `/students/<id>/skills/<skill_id>` | Remove a skill association |
| GET | `/students/<id>/applications` | Application history |
| GET | `/students/<id>/applications/<application_id>` | One application's current status |
| POST | `/students/<id>/applications` | Apply using `opportunity_id` and optional `resume_reference` |
| PATCH | `/students/<id>/applications/<application_id>` | Withdraw an application where its state permits |
| GET | `/students/<id>/interviews` | Interview rounds attached to the student's applications |
| GET | `/students/<id>/placements` | All offer records; supports multiple offers per student |
| PATCH | `/students/<id>/placements/<placement_id>` | Set an offer decision/status (`Offer Pending`, `Accepted`, `Declined`, `Joined`, `Withdrawn`) |
| GET | `/admin/students`, `/admin/companies` | Administrator lists |
| GET | `/admin/applications` | Application tracking; optional `status` and `company_id` filters |
| POST, PUT | `/admin/opportunities`, `/admin/opportunities/<id>` | Create or update opportunity records |
| PATCH | `/admin/applications/<id>` | Update status and/or remarks |
| POST | `/admin/applications/<id>/interviews` | Schedule a round (`round_number`, `scheduled_at`, `mode`) |
| PATCH | `/admin/interviews/<id>` | Update schedule, mode, result, or feedback |
| GET | `/reports/placement-statistics` | Existing company/type offer statistics view |
| GET | `/reports/application-statistics` | Applications grouped by status |
| GET | `/reports/applications-by-company` | Application counts per company |
| GET | `/reports/placements-by-department` | Offer and joined counts per department |
| GET | `/reports/average-compensation` | Average disclosed offer compensation by company/type |
| GET | `/reports/opportunity-application-counts` | Application count per opening |
| GET | `/reports/overview` | Total opportunities, applications, offers, and joined offers |

Dates sent in JSON should be ISO 8601 (`YYYY-MM-DD` for dates; `YYYY-MM-DDTHH:MM:SS` for date-times). IDs and enum values are validated before SQL, and all SQL parameters are bound by the connector.

## Smoke checks

After starting Flask and configuring a populated CareerGrid database, run:

```powershell
python -m backend.check_backend
```

The check calls the health, opportunities, applications, and placement-report endpoints. It then verifies that the real application trigger rejects a nonexistent opportunity within a transaction that is rolled back. It needs at least one existing student. The trigger check does not leave a row behind. Set `CAREERGRID_API_URL` if Flask is listening elsewhere.

## Frontend connection and access boundary

The future browser frontend can call these routes with `fetch`, parse the shared JSON response, and send JSON bodies for updates. The development API currently trusts student IDs supplied in URLs and exposes unauthenticated `/admin` endpoints to local clients. It is for the project/demo environment; before deployment or use with real student data, add authentication, authorization, HTTPS, and deployment-grade secret handling. Those are intentionally not represented as implemented features here.
