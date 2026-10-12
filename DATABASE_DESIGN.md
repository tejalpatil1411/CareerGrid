# CareerGrid — Final Database Specification

**Status:** Architecture approved and frozen for the database-design stage  
**Database target:** MySQL with InnoDB tables  
**Scope:** Database specification only. This document does not create SQL, tables, application code, or UI.

## 1. Purpose and scope

CareerGrid manages student profiles and skills, company opportunities, applications, interview rounds, and placement offers. Students can browse openings, assess eligibility, apply, and track progress. Placement administrators can manage records and produce reports.

The design has nine core tables. It uses foreign keys and junction tables to represent relationships and avoids storing values that can be obtained through joins. MySQL users/roles for DCL are database accounts, not additional application tables.

## 2. Conventions and assumptions

- The institute uses a 10-point CGPA scale.
- Identifiers use `INT UNSIGNED`; text uses appropriately sized `VARCHAR` or `TEXT`; CGPA and money use `DECIMAL`.
- `DATETIME` is used where time-of-day matters. The database server's time zone must be configured consistently for deadlines and `CURRENT_TIMESTAMP` comparisons.
- Tables use InnoDB so foreign keys and transactions work.
- Status, type, result, and mode values are constrained to documented sets below. A future status change must update the allowed set and application behavior together.
- Internship opportunities use `stipend`; placement opportunities use `salary`. The field for the other opportunity type stays NULL. The applicable field can itself be NULL until the employer discloses compensation.
- A selected application creates one offer record with status `Offer Pending`. A student may receive multiple offers from different applications and can accept one while declining another.
- Placement offer history is retained if an application status later changes. The associated offer status is updated explicitly when needed.
- A NULL `minimum_cgpa` means no stated CGPA cutoff. If a cutoff exists, a student with unknown CGPA is not considered eligible.
- The exact MySQL version must be checked before implementation. `CHECK` enforcement and `INTERSECT`/`EXCEPT` availability vary by version.

## 3. Final entity and table list

### 3.1 STUDENT

**Purpose:** Student profile and academic attributes.

| Column | MySQL type | Null? | Key/default/rule |
|---|---|---:|---|
| `student_id` | `INT UNSIGNED` | No | PK; generated identifier |
| `roll_no` | `VARCHAR(30)` | No | UNIQUE |
| `full_name` | `VARCHAR(100)` | No | |
| `email` | `VARCHAR(254)` | No | UNIQUE |
| `phone` | `VARCHAR(20)` | Yes | Text preserves `+` and leading zeroes |
| `date_of_birth` | `DATE` | Yes | Optional profile information |
| `department` | `VARCHAR(80)` | No | Institute department name |
| `graduation_year` | `SMALLINT UNSIGNED` | No | Calendar year |
| `cgpa` | `DECIMAL(4,2)` | Yes | CHECK 0.00–10.00 |
| `created_at` | `TIMESTAMP` | No | DEFAULT `CURRENT_TIMESTAMP` |

**Keys:** PK `student_id`; candidate keys `roll_no`, `email`. No composite key.

**Null decisions:** CGPA may be unknown for a new student; phone and date of birth are optional. Identity, department, graduation cohort, and contact email are required for the intended system. When an opportunity has a CGPA cutoff, NULL CGPA does not satisfy eligibility.

### 3.2 COMPANY

**Purpose:** Employer identity and general contact/classification details.

| Column | MySQL type | Null? | Key/default/rule |
|---|---|---:|---|
| `company_id` | `INT UNSIGNED` | No | PK; generated identifier |
| `company_name` | `VARCHAR(150)` | No | Not unique by default; names can be shared by branches/entities |
| `website` | `VARCHAR(255)` | Yes | |
| `industry` | `VARCHAR(80)` | Yes | |
| `location` | `VARCHAR(120)` | Yes | General company location |
| `contact_email` | `VARCHAR(254)` | Yes | May be unavailable |
| `created_at` | `TIMESTAMP` | No | DEFAULT `CURRENT_TIMESTAMP` |

**Keys:** PK `company_id`; no natural candidate key is assumed. Company name is not unique.

### 3.3 ADMIN

**Purpose:** Placement-cell staff identity for application-level ownership/auditing.

| Column | MySQL type | Null? | Key/default/rule |
|---|---|---:|---|
| `admin_id` | `INT UNSIGNED` | No | PK; generated identifier |
| `full_name` | `VARCHAR(100)` | No | |
| `email` | `VARCHAR(254)` | No | UNIQUE |
| `role_name` | `VARCHAR(30)` | No | For example `PlacementAdmin` or `Coordinator` |
| `is_active` | `BOOLEAN` | No | DEFAULT `TRUE` |
| `created_at` | `TIMESTAMP` | No | DEFAULT `CURRENT_TIMESTAMP` |

**Keys:** PK `admin_id`; candidate key `email`. MySQL database accounts used for DCL are separate from this table.

### 3.4 OPPORTUNITY

**Purpose:** Internship and placement openings posted by companies.

| Column | MySQL type | Null? | Key/default/rule |
|---|---|---:|---|
| `opportunity_id` | `INT UNSIGNED` | No | PK; generated identifier |
| `company_id` | `INT UNSIGNED` | No | FK → `COMPANY.company_id` |
| `created_by_admin_id` | `INT UNSIGNED` | No | FK → `ADMIN.admin_id` |
| `title` | `VARCHAR(150)` | No | |
| `opportunity_type` | `VARCHAR(20)` | No | `Internship` or `Placement` |
| `description` | `TEXT` | Yes | Optional long description |
| `location` | `VARCHAR(120)` | Yes | Can differ from general company location |
| `stipend` | `DECIMAL(10,2)` | Yes | Nonnegative; used for internships |
| `salary` | `DECIMAL(12,2)` | Yes | Nonnegative; used for placement roles |
| `minimum_cgpa` | `DECIMAL(4,2)` | Yes | NULL means no stated threshold; otherwise 0.00–10.00 |
| `open_date` | `DATETIME` | No | Beginning of application window |
| `deadline` | `DATETIME` | No | Exact application cutoff |
| `status` | `VARCHAR(20)` | No | `Draft`, `Open`, `Closed`, `Cancelled` |
| `created_at` | `TIMESTAMP` | No | DEFAULT `CURRENT_TIMESTAMP` |

**Keys:** PK `opportunity_id`; FKs `company_id`, `created_by_admin_id`; no candidate key assumed.

**Checks:** Valid opportunity type/status; `open_date <= deadline`; nonnegative stipend/salary; minimum CGPA from 0.00 to 10.00; an Internship must have `salary IS NULL`, and a Placement must have `stipend IS NULL`. The applicable compensation amount may be NULL until disclosed. This avoids falsely requiring an employer to disclose compensation at posting time.

### 3.5 APPLICATION

**Purpose:** Records a student's application to an opportunity and its progress.

| Column | MySQL type | Null? | Key/default/rule |
|---|---|---:|---|
| `application_id` | `INT UNSIGNED` | No | PK; generated identifier |
| `student_id` | `INT UNSIGNED` | No | FK → `STUDENT.student_id` |
| `opportunity_id` | `INT UNSIGNED` | No | FK → `OPPORTUNITY.opportunity_id` |
| `applied_at` | `DATETIME` | No | DEFAULT `CURRENT_TIMESTAMP` |
| `status` | `VARCHAR(20)` | No | DEFAULT `Applied`; allowed values below |
| `resume_reference` | `VARCHAR(255)` | Yes | Optional file/path reference, not file contents |
| `remarks` | `VARCHAR(500)` | Yes | Optional administrator note |

**Keys:** PK `application_id`; FKs `student_id`, `opportunity_id`; UNIQUE (`student_id`, `opportunity_id`) prevents repeat applications to the same opportunity. This pair is also a candidate key. No composite PK is used because the application has its own identifier and dependent interview/placement records.

**Allowed status values:** `Applied`, `Under Review`, `Shortlisted`, `Interview`, `Selected`, `Rejected`, `Withdrawn`.

### 3.6 INTERVIEW

**Purpose:** One row per interview round for an application.

| Column | MySQL type | Null? | Key/default/rule |
|---|---|---:|---|
| `interview_id` | `INT UNSIGNED` | No | PK; generated identifier |
| `application_id` | `INT UNSIGNED` | No | FK → `APPLICATION.application_id` |
| `round_number` | `SMALLINT UNSIGNED` | No | CHECK > 0 |
| `scheduled_at` | `DATETIME` | No | Required for a scheduled round |
| `mode` | `VARCHAR(20)` | No | `Online`, `In Person`, `Phone` |
| `result` | `VARCHAR(20)` | Yes | NULL until decision recorded; then `Passed`, `Failed`, or `No Show` |
| `feedback` | `VARCHAR(500)` | Yes | Optional |

**Keys:** PK `interview_id`; FK `application_id`; UNIQUE (`application_id`, `round_number`), also a candidate key. Multiple rounds are supported.

### 3.7 PLACEMENT

**Purpose:** Retains each offer resulting from a selected application, including its decision and joining progress.

| Column | MySQL type | Null? | Key/default/rule |
|---|---|---:|---|
| `placement_id` | `INT UNSIGNED` | No | PK; generated identifier |
| `application_id` | `INT UNSIGNED` | No | UNIQUE FK → `APPLICATION.application_id` |
| `offer_date` | `DATE` | Yes | May not be known on initial selection |
| `joining_date` | `DATE` | Yes | May not yet be confirmed |
| `offered_compensation` | `DECIMAL(12,2)` | Yes | May be undisclosed/pending; nonnegative when present |
| `placement_status` | `VARCHAR(20)` | No | DEFAULT `Offer Pending`; allowed values below |

**Keys:** PK `placement_id`; unique FK `application_id` is a candidate key and enforces zero-or-one offer per application. It deliberately does not enforce one offer per student. Student, company, and opportunity are obtained by joining through APPLICATION and OPPORTUNITY.

**Allowed status values:** `Offer Pending`, `Accepted`, `Declined`, `Joined`, `Withdrawn`. A student may receive multiple offers and may accept one while declining another. Enforcing at most one simultaneously accepted/joined offer per student is explicitly outside this schema's current rules.

**Checks:** Nonnegative offered compensation; when both dates are present, `joining_date >= offer_date`.

### 3.8 SKILL

**Purpose:** Shared controlled list of skill names.

| Column | MySQL type | Null? | Key/default/rule |
|---|---|---:|---|
| `skill_id` | `INT UNSIGNED` | No | PK; generated identifier |
| `skill_name` | `VARCHAR(80)` | No | UNIQUE |
| `skill_category` | `VARCHAR(50)` | Yes | Optional classification |

**Keys:** PK `skill_id`; candidate key `skill_name`.

### 3.9 STUDENT_SKILL

**Purpose:** Resolves the student–skill many-to-many relationship and stores facts specific to that association.

| Column | MySQL type | Null? | Key/default/rule |
|---|---|---:|---|
| `student_id` | `INT UNSIGNED` | No | PK component and FK → `STUDENT.student_id` |
| `skill_id` | `INT UNSIGNED` | No | PK component and FK → `SKILL.skill_id` |
| `proficiency_level` | `VARCHAR(20)` | Yes | Optional; if present: `Beginner`, `Intermediate`, `Advanced` |
| `acquired_on` | `DATE` | Yes | Optional; exact date may be unknown |

**Keys:** Composite PK (`student_id`, `skill_id`); both FKs. This pair prevents duplicate assignment of the same skill to a student.

## 4. Constraint and default summary

| Table | Unique/candidate constraints | Checks | Defaults |
|---|---|---|---|
| STUDENT | `roll_no`, `email` | CGPA 0–10 | `created_at = CURRENT_TIMESTAMP` |
| COMPANY | None assumed | None necessary | `created_at = CURRENT_TIMESTAMP` |
| ADMIN | `email` | Optional boolean domain is inherent | `is_active = TRUE`; `created_at = CURRENT_TIMESTAMP` |
| OPPORTUNITY | None assumed | Type/status domains; CGPA 0–10; nonnegative compensation; type-specific compensation; opening date ≤ deadline | `created_at = CURRENT_TIMESTAMP` |
| APPLICATION | (`student_id`, `opportunity_id`) | Status domain | `applied_at = CURRENT_TIMESTAMP`; `status = 'Applied'` |
| INTERVIEW | (`application_id`, `round_number`) | Round > 0; mode and result domains | None required |
| PLACEMENT | `application_id` | Status domain; nonnegative compensation; joining date ≥ offer date when both exist | `placement_status = 'Offer Pending'` |
| SKILL | `skill_name` | None necessary | None |
| STUDENT_SKILL | Composite PK (`student_id`, `skill_id`) | Proficiency domain if present | None |

All primary-key and foreign-key columns are `NOT NULL`. Required identity, relationship, workflow status, and scheduling columns are `NOT NULL`; optional facts stay nullable where they may genuinely be unknown or not applicable. Avoid checks that merely restate `NOT NULL` or have no business meaning.

## 5. Relationships and cardinalities

| Relationship | Cardinality | Implementation |
|---|---|---|
| COMPANY offers OPPORTUNITY | 1:N | `OPPORTUNITY.company_id` FK |
| ADMIN creates OPPORTUNITY | 1:N | `OPPORTUNITY.created_by_admin_id` FK |
| STUDENT submits APPLICATION | 1:N | `APPLICATION.student_id` FK |
| OPPORTUNITY receives APPLICATION | 1:N | `APPLICATION.opportunity_id` FK |
| APPLICATION has INTERVIEW rounds | 1:0..N | `INTERVIEW.application_id` FK and unique round number |
| APPLICATION results in PLACEMENT offer | 1:0..1 | Unique `PLACEMENT.application_id` FK |
| STUDENT has SKILL | M:N | `STUDENT_SKILL` junction table with composite PK |
| STUDENT applies to OPPORTUNITY | M:N | `APPLICATION` associative entity with `applied_at`, status, and resume reference |

## 6. Referential integrity and deletion policy

- Use restrictive/default-restrict behavior for company → opportunity, opportunity → application, student → application, application → interview, and application → placement. Preserve historical records; close/cancel/deactivate records instead of deleting them.
- For `STUDENT_SKILL`, cascading deletion of association rows when a student or skill is deleted is justified because those rows have no independent history. Alternatively, restrict and explicitly remove associations. Do not cascade from student/application into application, interview, or placement history.
- Foreign keys already reject references to missing parent rows. The application trigger's explicit existence check is for a clear business error; the FK remains the authoritative integrity backstop.

## 7. Trigger specifications

### `BEFORE INSERT` on APPLICATION — validate a new application

1. Look up the referenced opportunity. If it does not exist, reject with a clear application error (the FK also protects this case).
2. Require opportunity status `Open`.
3. Require database current time to be within the opportunity window: not before `open_date` and not after `deadline`. The selected policy accepts an application exactly at the deadline (`CURRENT_TIMESTAMP <= deadline`).
4. Enforce eligibility at the database boundary: if `minimum_cgpa` is set, require the student's CGPA to be present and `student.cgpa >= opportunity.minimum_cgpa`. This matches the advertised eligibility check and prevents bypass through a non-Flask client.
5. Reject violations with a clear database error. Duplicate application attempts are separately rejected by the composite unique key.

This trigger centralizes a rule that must apply to every database client. The application can also show eligibility before submit, but that display is not a substitute for the database rule.

### `AFTER UPDATE` on APPLICATION — create offer on selection

When `OLD.status` is not `Selected` and `NEW.status` is `Selected`, insert one PLACEMENT row for `NEW.application_id` with `placement_status = 'Offer Pending'`. Do not run for unrelated updates while the status remains Selected. Use a duplicate-safe guard, with the unique `PLACEMENT.application_id` constraint as the final protection.

If an application later leaves `Selected`, preserve the offer row. Update its `placement_status` explicitly according to the placement-cell decision; do not delete the offer history or silently infer acceptance. This keeps the lifecycle understandable and auditable.

## 8. View specifications

### `student_application_tracking`

Join STUDENT → APPLICATION → OPPORTUNITY → COMPANY. Include student ID/name, application ID, opportunity ID/title/type, company ID/name, application status, `applied_at`, and deadline. It supports a student's tracking page and administrator application review. Filter by student in the consuming query or use access-controlled views/queries appropriate to the deployed MySQL version.

### `active_opportunities`

Join OPPORTUNITY to COMPANY and expose opportunity details and company name where status is `Open`, current time is at/after `open_date`, and current time is at/before `deadline`. This is time-dependent: a row can leave the view as time advances without an update to the opportunity record.

### `placement_statistics`

Group offers by company and opportunity type, reached through PLACEMENT → APPLICATION → OPPORTUNITY → COMPANY. Provide offer count and average, maximum, and minimum offered compensation, with NULL compensation values naturally excluded from compensation aggregates. A separate report query can demonstrate `SUM`; do not label offer count as successful joins unless it filters to `Joined`.

## 9. DCL and TCL plan

### DCL

- Create separate MySQL roles such as `careergrid_student` and `careergrid_admin` in a controlled demo database.
- Give students read access to appropriate opportunity data and their own data through the application's access-controlled queries; a broad table grant would expose other students' information, so do not present unrestricted SELECT as production-safe student access.
- Give placement administrators only the table/view operations needed to manage records and run reports.
- Demonstrate `GRANT` and `REVOKE` on these roles, and assign demo MySQL accounts to roles. Never store MySQL passwords in this document or grant application users global privileges.
- The nine-table schema does not need a database `USER` table: authentication is outside this stage and should not be added without a concrete requirement.

### TCL

Use InnoDB and demonstrate an administrator workflow in a transaction: begin a transaction, update an application status, create or update its offer as needed, establish a savepoint before a second change, demonstrate rollback to that savepoint, then either commit the final valid state or roll back the whole transaction. The status-selection trigger and its placement insert participate in the same transaction, so rollback also undoes the trigger's insert.

## 10. Syllabus coverage matrix

| Syllabus concept | CareerGrid implementation | Meaningful example | Viva explanation |
|---|---|---|---|
| ER diagram and ER-to-relational mapping | Nine entities/associations, FKs and junction tables | Diagram company–opportunity–application and student–skill | M:N relationships become junction/associative tables; APPLICATION stores attributes of applying. |
| DDL: CREATE | Create the nine schema tables and later views/triggers | Define keys and checks with tables | DDL defines database structures. |
| DDL: ALTER | Schema evolution | Add an optional opportunity field | ALTER changes an existing structure. |
| DDL: DROP | Controlled disposable practice object | Drop a temporary practice table/view | DROP removes an object; use care in a real database. |
| DDL: RENAME | Disposable practice table or an approved schema change | Rename a practice table | RENAME changes an object's name. |
| DDL: TRUNCATE | Disposable practice table only | Empty test rows without deleting the table definition | TRUNCATE removes all rows and is not for historical project tables. |
| DML | All core tables | Add a student/application, update status, query reports, delete a disposable record | DML reads and changes records. |
| Constraints | PK/FK/UNIQUE/NOT NULL/CHECK/DEFAULT | Duplicate application blocked; invalid CGPA rejected | Constraints protect integrity even when writes bypass the UI. |
| DCL | MySQL roles/accounts | Grant/revoke role permissions | Database principals control access; ADMIN rows are application records. |
| TCL | InnoDB transaction and trigger changes | Status/offer update with savepoint, rollback, commit | Related changes are atomic; savepoint supports partial rollback. |
| Date/time and arithmetic | Deadlines, application/interview/offer timestamps | Deadline-window filtering; days from offer to joining | DATETIME captures exact cutoffs; arithmetic derives intervals and compensation summaries. |
| Set operations | `UNION` / `UNION ALL`; version-check other operators | Combine internship and placement listings with aligned columns | Set operations combine compatible result sets; confirm server support for `INTERSECT`/`EXCEPT`. |
| COUNT/SUM/AVG/MAX/MIN | Application, offer, CGPA, compensation reports | Applications per company; compensation totals/averages/extremes | Aggregates summarize groups; NULL values are handled according to each aggregate's rules. |
| GROUP BY / HAVING | Group applications/offers by company, type, or department | Companies with more than five applications | WHERE filters rows before grouping; HAVING filters groups after aggregation. |
| Equijoin | Equality joins across FKs | Application + Student + Opportunity + Company | Related rows match on key equality. |
| Non-equijoin | CGPA threshold comparison | `STUDENT.cgpa >= OPPORTUNITY.minimum_cgpa` | Eligibility compares values by a range/threshold, not key equality. |
| Self join | STUDENT joined to STUDENT using aliases | Compare students in the same department or graduation year | One table can be used twice to compare its rows. |
| Outer join | Opportunity LEFT JOIN Application | List openings including zero-application openings | Preserves unmatched rows from the left side. |
| Cross join | Student × open opportunity pairs, then eligibility filter | Potential eligible-opportunity matching report | Produces candidate pairs; filter promptly because combinations grow multiplicatively. |
| Subqueries | Nested aggregate/eligibility/report query | Students with applications above the average count | A nested query supplies values or rows to an outer query. |
| Views | Tracking, active openings, placement statistics | Reuse consistent display/report queries | A view is a stored query definition, not a copied data table. |
| Triggers | Deadline/eligibility validation and selection-to-offer creation | Reject late/ineligible application; create pending offer on selection | Trigger logic runs at the database boundary for any client. |

DDL practice operations that are destructive (DROP/TRUNCATE) should use a disposable practice object, not the historical project tables. MySQL's exact set-operator support and CHECK behavior must be verified against the institute server version.

## 11. Normalization and design rationale

- Company and administrator attributes are stored once and referenced by opportunities.
- Student–opportunity applications are represented once, with their own attributes. A unique pair prevents duplicate applications without repeating company details.
- Interview rounds are separate rows instead of repeating round-specific columns.
- Skill names are stored once, with student-specific links/proficiency in STUDENT_SKILL.
- Placement offers are separate from applications because only some applications produce offers and offer dates/status/compensation have their own lifecycle. PLACEMENT stores only the application FK and offer facts; student/company/opportunity are derived through joins.
- Counts, averages, and statistics are queried rather than duplicated as stored totals.
- Department, compensation, recruiter, authentication, and login tables are omitted until a specific requirement justifies them.
- The design is normalized to avoid repeating groups and transitive copies of company/opportunity/student data. The junctions represent M:N relationships; the remaining columns describe their own table's key.

## 12. Recommended eventual sample data

| Table | Approximate records |
|---|---:|
| STUDENT | 30–50 |
| COMPANY | 8–12 |
| ADMIN | 2–3 |
| OPPORTUNITY | 15–25 |
| SKILL | 12–20 |
| STUDENT_SKILL | 80–150 |
| APPLICATION | 60–120 |
| INTERVIEW | 25–60 |
| PLACEMENT | 5–15 |

Include students with no applications; opportunities with none; companies with multiple openings; multiple departments and CGPAs; both opportunity types; varied application and offer statuses; multi-round interviews; and some students with multiple offers. This supports meaningful outer joins, aggregates, HAVING, subqueries, and statistics.

## 13. Remaining assumptions and version checks

- Selection means the company selected the student, but offer particulars may still be pending; that event creates the PLACEMENT offer row.
- There is no rule preventing one student from accepting/joining multiple offers in the current design.
- If an application leaves Selected after an offer row exists, staff update the offer status explicitly and retain history.
- Students with NULL CGPA cannot apply to a cutoff-based opportunity under the database trigger rule.
- `stipend`/`salary` may be NULL when the employer has not disclosed compensation, but the field for the other opportunity type must be NULL.
- The database server's time zone is consistent with the institute's deadline policy.
- Before implementation, confirm MySQL version and test its enforcement of CHECK constraints, support for desired set operators, and trigger syntax.

## 14. Implementation boundary

This document is the final frozen architecture artifact. It does not authorize implementation of MySQL tables or SQL scripts, Flask, authentication, dashboards, or frontend files. Those remain a separate approved stage.
