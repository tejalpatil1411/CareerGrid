-- CareerGrid business-rule triggers. Requires MySQL 8.0.16+.
USE CareerGrid;

DROP TRIGGER IF EXISTS trg_application_validate_before_insert;
DROP TRIGGER IF EXISTS trg_application_selected_after_update;
DELIMITER $$

-- Reject missing, closed, out-of-window, or CGPA-ineligible applications.
CREATE TRIGGER trg_application_validate_before_insert
BEFORE INSERT ON APPLICATION
FOR EACH ROW
BEGIN
  DECLARE v_opportunity_status VARCHAR(20) DEFAULT NULL;
  DECLARE v_open_date DATETIME DEFAULT NULL;
  DECLARE v_deadline DATETIME DEFAULT NULL;
  DECLARE v_minimum_cgpa DECIMAL(4,2) DEFAULT NULL;
  DECLARE v_student_cgpa DECIMAL(4,2) DEFAULT NULL;

  -- Aggregates return one row even for a missing ID, allowing a clear SIGNAL below.
  SELECT MAX(status), MAX(open_date), MAX(deadline), MAX(minimum_cgpa)
    INTO v_opportunity_status, v_open_date, v_deadline, v_minimum_cgpa
  FROM OPPORTUNITY
  WHERE opportunity_id = NEW.opportunity_id;

  IF v_opportunity_status IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Application rejected: opportunity does not exist';
  END IF;

  IF v_opportunity_status <> 'Open' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Application rejected: opportunity is not open';
  END IF;

  IF CURRENT_TIMESTAMP < v_open_date OR CURRENT_TIMESTAMP > v_deadline THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Application rejected: outside the opportunity window';
  END IF;

  IF v_minimum_cgpa IS NOT NULL THEN
    SELECT MAX(cgpa) INTO v_student_cgpa
    FROM STUDENT
    WHERE student_id = NEW.student_id;

    IF v_student_cgpa IS NULL OR v_student_cgpa < v_minimum_cgpa THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Application rejected: student does not meet the CGPA requirement';
    END IF;
  END IF;
END$$

-- Create one pending offer only when status transitions into Selected.
-- The UNIQUE placement.application_id key remains the final duplicate guard.
CREATE TRIGGER trg_application_selected_after_update
AFTER UPDATE ON APPLICATION
FOR EACH ROW
BEGIN
  IF OLD.status <> 'Selected' AND NEW.status = 'Selected' THEN
    INSERT INTO PLACEMENT (application_id, placement_status)
    SELECT NEW.application_id, 'Offer Pending'
    WHERE NOT EXISTS (
      SELECT 1 FROM PLACEMENT WHERE application_id = NEW.application_id
    );
  END IF;
END$$

DELIMITER ;
