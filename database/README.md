# CareerGrid MySQL database files

These files implement the CareerGrid database. Authentication migrations add credential tables only; they do not contain Flask, Python, frontend, or API code. No SQL has been executed as part of preparing these files.

## MySQL version

Use **MySQL 8.0.31 or later** for the complete examples. The schema and triggers require **MySQL 8.0.16 or later** because enforced `CHECK` constraints were introduced in MySQL 8.0.16. The query file includes `INTERSECT` and `EXCEPT` examples, supported by MySQL 8.0.31 and later; comment out those two sections on older versions. `UNION` and `UNION ALL` are used independently and are supported on older MySQL versions too.

The scripts use `utf8mb4_0900_ai_ci` when creating the database. That collation is available in MySQL 8.0. If using a compatible non-MySQL server or an older version, select a supported `utf8mb4` collation before running the schema and note that behavior may differ.

## File list and execution order

1. **`01_schema.sql`** — Creates the `CareerGrid` database and nine InnoDB tables, constraints, keys, and indexes. Parent tables precede dependent tables.
2. **`02_triggers.sql`** — Creates the application validation and selection-to-offer triggers.
3. **`03_views.sql`** — Creates the tracking, active-opportunities, and placement-statistics views.
4. **`04_sample_data.sql`** — Inserts the demonstration records. Application status updates near the end invoke the placement trigger.
5. **`05_syllabus_queries.sql`** — Contains labeled DML, joins, aggregates, date/time, arithmetic, set-operation, subquery, and safe DDL practice examples. Some statements intentionally change a demo row; the delete example is rolled back. The DDL practice block is commented and targets a separate lab schema.
6. **`06_dcl_tcl.sql`** — Contains role grants, optional commented user templates, a revoke example, and transaction/savepoint demonstrations. Run role management with a MySQL account authorized to create roles and grant privileges.
7. **`07_auth.sql`** — Additively creates `ADMIN_CREDENTIALS` for password hashes; it does not add or reset administrator records.
8. **`08_auth_student_credentials.sql`** — Additively creates `STUDENT_CREDENTIALS` for existing students. It does not create student accounts or passwords.
9. **`09_student_registration_approval.sql`** — Adds `STUDENT.is_active` with a default of TRUE so existing students remain active. New registrations explicitly start inactive and require administrator approval. Run once after 08; it uses additive `ALTER TABLE` and preserves all existing rows.

For a new demo database, run 01, 02, 03, then 04 once, followed by 07, 08 and 09. Scripts 05 and 06 are syllabus/lab exercises, not required by the app. On a populated database, do not rerun 01 or 04; inspect which auth scripts are already applied and run only missing additive migrations. Migration 09 is run once, not repeatedly.

## Application authentication setup

Run 07 if `ADMIN_CREDENTIALS` is absent, then 08 if `STUDENT_CREDENTIALS` is absent, and run 09 once. These steps preserve existing account and project rows; 09 makes existing student rows active through its default. Existing administrators and students receive hashes with `python -m backend.set_password`, which prompts for account type, an existing account identifier, and a new password without echo. New student registrations remain inactive until approved on the administrator Students page. No default passwords are installed. The backend/bootstrap database account needs read access to account tables and write access to credential tables; registration and approval also require writes to `STUDENT`.

## Running files in MySQL Workbench

1. Open MySQL Workbench and connect to your local MySQL server.
2. Open a script with **File → Open SQL Script** (or the open-file toolbar button).
3. Run one file at a time in the order above using the lightning-bolt **Execute** button. Review the result/output panels before moving to the next file.
4. In `05_syllabus_queries.sql`, execute query sections individually. The optional DDL demo is commented out. To demonstrate it, uncomment and run only that block in a dedicated disposable lab schema; it never targets the CareerGrid tables.
5. `06_dcl_tcl.sql` requires elevated database-management privileges. User-creation statements are commented templates with a password placeholder; set credentials locally and do not save real credentials in this project. The role GRANT statements are active, while the REVOKE and role-cleanup examples are commented to avoid changing permissions unexpectedly.

Run `04_sample_data.sql` once only against a fresh schema. It uses fixed example IDs and is intentionally not a repeatable seed/reset script; rerunning it will encounter unique-key conflicts. No reset/drop script is provided because the design preserves historical data.

## Important assumptions

- The design in `../DATABASE_DESIGN.md` is authoritative. The schema contains the approved nine tables only.
- CGPA uses a 0.00–10.00 scale. An opportunity with a cutoff rejects an application from a student whose CGPA is NULL or below the cutoff.
- Application inserts require an Open opportunity and a current time from `open_date` through `deadline`, inclusive. The MySQL server time zone should match the institute's policy.
- For Internship, `salary` must be NULL; for Placement, `stipend` must be NULL. The applicable compensation may be NULL until disclosed.
- A transition into `Selected` creates one `Offer Pending` placement. Each application has at most one offer; students may have multiple offers. Offer rows are retained when application status later changes.
- Foreign keys restrict deletion of historical records. `STUDENT_SKILL` association rows cascade when their student or skill is deleted.
- Demo email domains and resume references are fictional. Replace sample records with approved data before any real use.

## Known limitations and safety notes

- MySQL does not implement `FULL OUTER JOIN` syntax. The query file demonstrates the standard `LEFT JOIN` plus unmatched-right `UNION ALL` emulation. Because valid application rows must reference an opportunity, its unmatched-application branch should return no rows; this also illustrates the FK guarantee.
- `active_opportunities` depends on `CURRENT_TIMESTAMP`, so membership changes as time passes without changing stored rows.
- `student_application_tracking` includes all students' application data. It is useful for administrator reporting, but should not be granted broadly to student database accounts. Student-specific access must be filtered by the application or an appropriately secured database design.
- The DCL role grants are examples for a dedicated database. Review existing grants and account policies before running them on a shared server.
- Do not run DROP or TRUNCATE against CareerGrid tables. The optional DDL syllabus examples are scoped to a disposable practice database/table.
- The scripts use MySQL-specific syntax (`SIGNAL`, trigger delimiters, roles, and MySQL date functions) and are not intended for SQLite, PostgreSQL, or MariaDB without review.
