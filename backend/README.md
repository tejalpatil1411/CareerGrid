# CareerGrid Flask backend

The Flask application serves the vanilla frontend at `/` and JSON endpoints under `/api`, backed by the existing MySQL `CareerGrid` database. It uses parameterized queries, the existing views and triggers, and short-lived MySQL connections. Starting Flask never creates or resets project tables or sample rows.

## Local setup

Use Python 3.10 or later and MySQL 8.0.31 or later. From the project root in PowerShell:

```powershell
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Set the existing MySQL connection values in the ignored local `.env`. Set `SECRET_KEY` to a randomly generated value of at least 32 characters; the application refuses to start without it. For example, create a random key in the current PowerShell environment without displaying it:

```powershell
$env:SECRET_KEY = [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
$env:SESSION_COOKIE_SECURE = "false"
python -m backend.app
```

For production, keep `SECRET_KEY` in the hosting platform's secret store, enable HTTPS, and set `SESSION_COOKIE_SECURE=true`. Do not commit `.env`, passwords, or generated keys. The local development server listens on `127.0.0.1:5000`.

## Authentication database setup

1. For a fresh database only, run `01_schema.sql`, `02_triggers.sql`, `03_views.sql`, and `04_sample_data.sql` in that order; run 04 only once. Do not replay 01 or 04 on a populated database.
2. Run `07_auth.sql` if the administrator credential table is missing, `08_auth_student_credentials.sql` if the student credential table is missing, and `09_student_registration_approval.sql` once. These migrations preserve existing records; 09 adds a default-active flag for existing students while registrations are inserted inactive.
3. Copy `.env.example` to the ignored local `.env` and set the MySQL host, port, user, password and database. Set `SECRET_KEY` to a random value of at least 32 characters. Never commit `.env` or put real credentials in documentation.
4. For existing accounts, run `python -m backend.set_password` from the repository root. Choose `student` or `admin`, identify an existing account, then enter a new password at the hidden prompt. It must be 12–72 UTF-8 bytes and is saved only as a Flask-Bcrypt hash. No default passwords are created.

Student sign-in uses email or roll number plus password; administrator sign-in uses email plus password. Both use signed Flask session cookies with `HttpOnly`, `SameSite=Lax`, and an eight-hour lifetime. All state-changing API requests require the session-bound `X-CSRF-Token` header. Set `SESSION_COOKIE_SECURE=true` when serving over HTTPS.

Start the backend from the repository root with `python -m backend.app` after configuring `.env` and the environment `SECRET_KEY`. Student registration (`POST /api/auth/register`) stores an inactive account; an administrator must approve it in the Students page before it can sign in. The server derives identity and role from the signed session. Students can use only routes scoped to their own student ID. `/admin/*` and `/reports/*` require an administrator session. Public routes are limited to health checks, the skill catalog, and opportunity browsing/detail. IDs submitted by the browser are never accepted as authentication proof.

## API response contract

Success responses use `{ "success": true, "data": ..., "error": null }`; errors use `{ "success": false, "data": null, "error": { "code": ..., "message": ... } }`. Unauthenticated requests return 401, authenticated but disallowed roles/records return 403, validation errors return 400, duplicates return 409, and database rule failures return 422.

| Method | Route | Access |
|---|---|---|
| GET | `/api/health`, `/api/health/db` | Public |
| GET | `/api/opportunities`, `/api/opportunities/<id>`, `/api/skills` | Public |
| GET | `/api/auth/session` | Public; restores session and supplies CSRF token |
| POST | `/api/auth/student/login`, `/api/auth/admin/login`, `/api/auth/logout` | CSRF token required |
| GET, PUT | `/api/students/<id>` | Own student |
| GET, POST | `/api/students/<id>/skills` | Own student |
| DELETE | `/api/students/<id>/skills/<skill_id>` | Own student |
| GET, POST, PATCH | `/api/students/<id>/applications` and `/api/students/<id>/applications/<application_id>` | Own student |
| GET | `/api/students/<id>/interviews`, `/api/students/<id>/placements` | Own student |
| PATCH | `/api/students/<id>/placements/<placement_id>` | Own student |
| GET | `/api/admin/students`, `/api/admin/companies`, `/api/admin/opportunities`, `/api/admin/applications` | Administrator |
| POST | `/api/admin/students/<id>/activate` | Administrator; approves a pending registration |
| POST, PUT | `/api/admin/companies`, `/api/admin/companies/<id>` | Administrator; company create/update |
| POST, PUT | `/api/admin/opportunities`, `/api/admin/opportunities/<id>` | Administrator; creator ID comes from session |
| PATCH | `/api/admin/applications/<id>`, `/api/admin/interviews/<id>` | Administrator |
| POST | `/api/admin/applications/<id>/interviews` | Administrator |
| GET | `/api/reports/*` | Administrator |

`trg_application_validate_before_insert` remains the source of application eligibility checks. `trg_application_selected_after_update` creates the pending offer when an application becomes selected. The Flask API does not duplicate either trigger.

Application statuses move forward through the recruitment process; `Selected`, `Rejected`, and `Withdrawn` are terminal. Student offer decisions permit `Offer Pending` to `Accepted`, `Declined`, or `Withdrawn`, and `Accepted` to `Joined` or `Withdrawn`. Terminal offers cannot be reopened. Company deletion is intentionally omitted because historical opportunities reference companies.

## Tests and live checks

Run the automated tests from the repository root with a test-only key in the process environment:

```powershell
$env:SECRET_KEY = "unit-test-only-secret-key-at-least-32-bytes"
python -m unittest discover -v
```

Tests mock database calls and verify auth, ownership, registration logic, company management, and workflow transitions; they do not prove MySQL integration. To check a configured live instance, start the server with `python -m backend.app`, then run `python -m backend.check_backend`; enter the administrator email and password when prompted. The checker performs a deliberately rejected application insert inside a transaction and rolls it back. It is not required for normal unit tests. Do not run sample-data scripts against an existing database.

Run the dashboard API-failure rendering regression with `node frontend/test_dashboard_failures.cjs`; this uses mocked responses and a minimal DOM shim, not a real browser.
