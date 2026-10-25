# CareerGrid — Internship and Placement Management

CareerGrid is a DBMS mini project using Flask, vanilla JavaScript, and MySQL 8. The application supports opportunity browsing, student profiles and skills, applications, interview rounds, placement offers, administrator opportunity management, and database-backed reports.

## Start locally

Follow [backend/README.md](backend/README.md) for Python setup, ignored local `.env` configuration, database migration order, account review, password setup, startup, and tests. From PowerShell at this repository root, start the app with `python -m backend.app` after setting a random `SECRET_KEY` and the MySQL connection values in `.env`.

## Database files

The SQL scripts are in `database/`. Use `database/README.md` for the MySQL version and complete SQL order. A fresh database uses `01_schema.sql` through `04_sample_data.sql` once, then auth scripts `07_auth.sql`, `08_auth_student_credentials.sql`, and `09_student_registration_approval.sql`. On an existing populated database, do not replay the schema or sample-data scripts; apply only required auth additions, checking whether each has already run. Never reset or reload sample data.

## Authentication

Student and active administrator credentials are stored as Flask-Bcrypt hashes in separate credential tables. Existing accounts receive passwords with `python -m backend.set_password` (hidden prompt). New student registrations are stored inactive until an authenticated administrator approves them in the Students page; existing students remain active after migration 09. The application requires a strong environment-provided `SECRET_KEY`; signed session cookies are HttpOnly and SameSite=Lax, and state-changing requests require CSRF tokens. Students are limited to their own records and administrator APIs require an administrator session. Company management supports create/update; deletion is intentionally unavailable to preserve history.

## Verification

Run automated tests with a test-only environment key using `python -m unittest discover -v`, and run the browserless frontend error-state check with `node frontend/test_dashboard_failures.cjs`. Run `python -m backend.check_backend` with Flask running and a configured MySQL database to perform its API checks and rolled-back trigger rejection check. Unit tests use mocked database calls and do not establish MySQL integration.
