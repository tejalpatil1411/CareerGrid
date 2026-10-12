-- CareerGrid DBMS syllabus examples. Run after the schema, triggers, views and sample data.
USE CareerGrid;

-- DDL practice (optional): run only in a disposable lab schema, never against CareerGrid tables.
-- CREATE DATABASE IF NOT EXISTS CareerGrid_Syllabus_Lab;
-- USE CareerGrid_Syllabus_Lab;
-- CREATE TABLE cg_ddl_practice_object (practice_id INT PRIMARY KEY, note_text VARCHAR(40));
-- ALTER TABLE cg_ddl_practice_object ADD COLUMN created_on DATE NULL;
-- RENAME TABLE cg_ddl_practice_object TO cg_ddl_practice_renamed;
-- TRUNCATE TABLE cg_ddl_practice_renamed;
-- DROP TABLE cg_ddl_practice_renamed;
-- Return to the project schema before running queries below.
USE CareerGrid;

-- SELECT: list active openings with their company and compensation/eligibility details.
SELECT opportunity_id, title, company_name, opportunity_type, stipend, salary, minimum_cgpa, deadline
FROM active_opportunities
ORDER BY deadline;

-- SELECT: track a student's applications (replace 1 with the required student_id).
SELECT application_id, opportunity_title, company_name, application_status, applied_at, deadline
FROM student_application_tracking
WHERE student_id = 1
ORDER BY applied_at DESC;

-- INSERT: safe example that inserts one eligible application only if the pair is not already present.
-- Choose an open opportunity and a student eligible for its CGPA cutoff; then inspect ROW_COUNT().
INSERT INTO APPLICATION (student_id, opportunity_id, status)
SELECT 31, 1, 'Applied'
WHERE NOT EXISTS (
  SELECT 1 FROM APPLICATION WHERE student_id = 31 AND opportunity_id = 1
);

-- UPDATE: advance an existing application status (use an application ID appropriate to your demo).
UPDATE APPLICATION SET status = 'Under Review' WHERE application_id = 70;

-- DELETE: demonstrate deletion only for an explicitly identified test application with no history.
-- The restrictive foreign keys reject deletion when interview/placement history exists.
-- Run inside a transaction and ROLLBACK if this is only a demonstration.
START TRANSACTION;
DELETE FROM APPLICATION WHERE application_id = 70 AND status = 'Under Review';
ROLLBACK;

-- Date/time: openings whose deadline is within the next seven days.
SELECT opportunity_id, title, deadline, TIMESTAMPDIFF(DAY, CURRENT_TIMESTAMP, deadline) AS days_remaining
FROM active_opportunities
WHERE deadline BETWEEN CURRENT_TIMESTAMP AND DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 7 DAY)
ORDER BY deadline;

-- Date/time: show scheduled interviews in the next fourteen days.
SELECT i.interview_id, i.application_id, i.round_number, i.scheduled_at, i.mode
FROM INTERVIEW AS i
WHERE i.scheduled_at BETWEEN CURRENT_TIMESTAMP AND DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 14 DAY)
ORDER BY i.scheduled_at;

-- Arithmetic: compare each student's CGPA to an opportunity's cutoff, only where a cutoff exists.
SELECT s.full_name, o.title, s.cgpa, o.minimum_cgpa,
       (s.cgpa - o.minimum_cgpa) AS cgpa_margin
FROM STUDENT AS s
JOIN APPLICATION AS a ON a.student_id = s.student_id
JOIN OPPORTUNITY AS o ON o.opportunity_id = a.opportunity_id
WHERE o.minimum_cgpa IS NOT NULL;

-- Arithmetic: estimate total offer compensation by company (NULL amounts are excluded by SUM).
SELECT c.company_name, SUM(p.offered_compensation) AS total_offered_compensation
FROM PLACEMENT AS p
JOIN APPLICATION AS a ON a.application_id = p.application_id
JOIN OPPORTUNITY AS o ON o.opportunity_id = a.opportunity_id
JOIN COMPANY AS c ON c.company_id = o.company_id
GROUP BY c.company_id, c.company_name;

-- UNION: combine internships and placements into a single compatible opportunity list.
SELECT opportunity_id, title, opportunity_type FROM OPPORTUNITY WHERE opportunity_type = 'Internship'
UNION ALL
SELECT opportunity_id, title, opportunity_type FROM OPPORTUNITY WHERE opportunity_type = 'Placement';

-- MySQL 8.0.31+: INTERSECT example; openings that are open and also meet a CGPA cutoff.
-- Comment out this block when running on a MySQL version before 8.0.31.
SELECT opportunity_id FROM OPPORTUNITY WHERE status = 'Open'
INTERSECT
SELECT opportunity_id FROM OPPORTUNITY WHERE minimum_cgpa <= 7.00;

-- MySQL 8.0.31+: EXCEPT example; companies with no opportunity rows.
-- Comment out this block when running on a MySQL version before 8.0.31.
SELECT company_id FROM COMPANY
EXCEPT
SELECT company_id FROM OPPORTUNITY;

-- Aggregates: show COUNT, SUM, AVG, MAX, and MIN for disclosed offers by company.
SELECT c.company_name,
       COUNT(p.placement_id) AS offer_count,
       SUM(p.offered_compensation) AS total_compensation,
       AVG(p.offered_compensation) AS average_compensation,
       MAX(p.offered_compensation) AS maximum_compensation,
       MIN(p.offered_compensation) AS minimum_compensation
FROM COMPANY AS c
JOIN OPPORTUNITY AS o ON o.company_id = c.company_id
JOIN APPLICATION AS a ON a.opportunity_id = o.opportunity_id
JOIN PLACEMENT AS p ON p.application_id = a.application_id
GROUP BY c.company_id, c.company_name;

-- GROUP BY: count applications by opportunity, including openings with zero applications.
SELECT o.opportunity_id, o.title, COUNT(a.application_id) AS application_count
FROM OPPORTUNITY AS o
LEFT JOIN APPLICATION AS a ON a.opportunity_id = o.opportunity_id
GROUP BY o.opportunity_id, o.title
ORDER BY application_count DESC;

-- HAVING: companies with at least five applications across their opportunities.
SELECT c.company_id, c.company_name, COUNT(a.application_id) AS application_count
FROM COMPANY AS c
JOIN OPPORTUNITY AS o ON o.company_id = c.company_id
JOIN APPLICATION AS a ON a.opportunity_id = o.opportunity_id
GROUP BY c.company_id, c.company_name
HAVING COUNT(a.application_id) >= 5;

-- Equijoin: applications with student, opportunity, and company using matching key columns.
SELECT a.application_id, s.full_name, o.title, c.company_name, a.status
FROM APPLICATION AS a
JOIN STUDENT AS s ON s.student_id = a.student_id
JOIN OPPORTUNITY AS o ON o.opportunity_id = a.opportunity_id
JOIN COMPANY AS c ON c.company_id = o.company_id;

-- Non-equijoin: meaningful CGPA eligibility comparison (required syllabus example).
SELECT s.student_id, s.full_name, s.cgpa, o.opportunity_id, o.title, o.minimum_cgpa
FROM STUDENT AS s
JOIN OPPORTUNITY AS o ON s.cgpa >= o.minimum_cgpa
WHERE o.status = 'Open' AND o.minimum_cgpa IS NOT NULL;

-- Include openings without a stated cutoff as eligible; NULL CGPA cannot pass a stated cutoff.
SELECT s.student_id, s.full_name, o.opportunity_id, o.title
FROM STUDENT AS s
CROSS JOIN active_opportunities AS o
WHERE o.minimum_cgpa IS NULL OR s.cgpa >= o.minimum_cgpa;

-- Self join: compare unique student pairs in the same department and graduation year.
SELECT s1.full_name AS student_one, s2.full_name AS student_two,
       s1.department, s1.graduation_year
FROM STUDENT AS s1
JOIN STUDENT AS s2
  ON s1.department = s2.department
 AND s1.graduation_year = s2.graduation_year
 AND s1.student_id < s2.student_id;

-- LEFT OUTER JOIN: retain opportunities even when they have no applications.
SELECT o.opportunity_id, o.title, a.application_id
FROM OPPORTUNITY AS o
LEFT JOIN APPLICATION AS a ON a.opportunity_id = o.opportunity_id
ORDER BY o.opportunity_id;

-- RIGHT OUTER JOIN: equivalent preservation, written with the preserved table on the right.
SELECT o.opportunity_id, o.title, a.application_id
FROM APPLICATION AS a
RIGHT JOIN OPPORTUNITY AS o ON o.opportunity_id = a.opportunity_id
ORDER BY o.opportunity_id;

-- MySQL has no FULL OUTER JOIN keyword. This UNION ALL pattern emulates one.
-- The second anti-join branch is normally empty because APPLICATION has a restrictive opportunity FK.
SELECT o.opportunity_id, o.title, a.application_id
FROM OPPORTUNITY AS o
LEFT JOIN APPLICATION AS a ON a.opportunity_id = o.opportunity_id
UNION ALL
SELECT o.opportunity_id, o.title, a.application_id
FROM APPLICATION AS a
LEFT JOIN OPPORTUNITY AS o ON o.opportunity_id = a.opportunity_id
WHERE o.opportunity_id IS NULL;

-- CROSS JOIN: potential student/opening pairs, filtered by the actual eligibility rule.
SELECT s.student_id, s.full_name, o.opportunity_id, o.title
FROM STUDENT AS s
CROSS JOIN active_opportunities AS o
WHERE o.minimum_cgpa IS NULL OR s.cgpa >= o.minimum_cgpa;

-- Subquery: students whose application count is above the average count per student.
SELECT s.student_id, s.full_name, COUNT(a.application_id) AS application_count
FROM STUDENT AS s
JOIN APPLICATION AS a ON a.student_id = s.student_id
GROUP BY s.student_id, s.full_name
HAVING COUNT(a.application_id) > (
  SELECT AVG(student_application_counts.application_count)
  FROM (
    SELECT COUNT(a2.application_id) AS application_count
    FROM STUDENT AS s2
    LEFT JOIN APPLICATION AS a2 ON a2.student_id = s2.student_id
    GROUP BY s2.student_id
  ) AS student_application_counts
);

-- Subquery: companies with no opportunities, equivalent in purpose to the EXCEPT example.
SELECT c.company_id, c.company_name
FROM COMPANY AS c
WHERE NOT EXISTS (
  SELECT 1 FROM OPPORTUNITY AS o WHERE o.company_id = c.company_id
);
