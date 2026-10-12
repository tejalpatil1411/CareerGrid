-- CareerGrid access-control and transaction demonstrations.
-- Run with an authorized MySQL administrator in a dedicated project database.
USE CareerGrid;

-- DCL: roles separate read-only student access from placement-cell maintenance access.
CREATE ROLE IF NOT EXISTS 'careergrid_student'@'localhost';
CREATE ROLE IF NOT EXISTS 'careergrid_admin'@'localhost';

-- Students can browse openings. Do not grant broad SELECT on student records.
GRANT SELECT ON CareerGrid.active_opportunities TO 'careergrid_student'@'localhost';

-- Placement administrators can review views and manage rows, but historical deletes are not granted.
GRANT SELECT ON CareerGrid.* TO 'careergrid_admin'@'localhost';
GRANT INSERT, UPDATE ON CareerGrid.STUDENT TO 'careergrid_admin'@'localhost';
GRANT INSERT, UPDATE ON CareerGrid.COMPANY TO 'careergrid_admin'@'localhost';
GRANT INSERT, UPDATE ON CareerGrid.OPPORTUNITY TO 'careergrid_admin'@'localhost';
GRANT INSERT, UPDATE ON CareerGrid.APPLICATION TO 'careergrid_admin'@'localhost';
GRANT INSERT, UPDATE ON CareerGrid.INTERVIEW TO 'careergrid_admin'@'localhost';
GRANT INSERT, UPDATE ON CareerGrid.PLACEMENT TO 'careergrid_admin'@'localhost';
GRANT INSERT, UPDATE ON CareerGrid.SKILL TO 'careergrid_admin'@'localhost';
GRANT INSERT, UPDATE ON CareerGrid.STUDENT_SKILL TO 'careergrid_admin'@'localhost';
GRANT INSERT, UPDATE ON CareerGrid.ADMIN TO 'careergrid_admin'@'localhost';

-- Optional account templates only: replace the placeholder locally; never commit a real password.
-- CREATE USER 'cg_student_demo'@'localhost' IDENTIFIED BY '<SET_A_LOCAL_STRONG_PASSWORD>';
-- CREATE USER 'cg_admin_demo'@'localhost' IDENTIFIED BY '<SET_A_LOCAL_STRONG_PASSWORD>';
-- GRANT 'careergrid_student'@'localhost' TO 'cg_student_demo'@'localhost';
-- GRANT 'careergrid_admin'@'localhost' TO 'cg_admin_demo'@'localhost';
-- SET DEFAULT ROLE 'careergrid_student'@'localhost' TO 'cg_student_demo'@'localhost';
-- SET DEFAULT ROLE 'careergrid_admin'@'localhost' TO 'cg_admin_demo'@'localhost';

-- REVOKE demonstration: remove the student's opportunity-view permission when required.
-- REVOKE SELECT ON CareerGrid.active_opportunities FROM 'careergrid_student'@'localhost';
-- Restore it with the matching GRANT statement above if continuing the demo.

-- TCL: update a non-selected application, use a savepoint, undo the second change, then commit.
-- This leaves application 70 Under Review and restores its original remarks.
START TRANSACTION;
UPDATE APPLICATION SET status = 'Under Review' WHERE application_id = 70;
SAVEPOINT before_remarks_change;
UPDATE APPLICATION SET remarks = 'Temporary savepoint demonstration' WHERE application_id = 70;
ROLLBACK TO SAVEPOINT before_remarks_change;
COMMIT;

-- TCL: selecting an application fires the trigger and inserts its pending offer in this transaction.
-- ROLLBACK TO SAVEPOINT undoes the offer-status edit; full ROLLBACK also undoes selection and offer creation.
START TRANSACTION;
UPDATE APPLICATION SET status = 'Selected' WHERE application_id = 14;
SAVEPOINT after_trigger_created_offer;
UPDATE PLACEMENT SET placement_status = 'Accepted'
WHERE application_id = 14;
ROLLBACK TO SAVEPOINT after_trigger_created_offer;
ROLLBACK;

-- Example role cleanup (optional; does not drop project data).
-- DROP ROLE 'careergrid_student'@'localhost';
-- DROP ROLE 'careergrid_admin'@'localhost';
