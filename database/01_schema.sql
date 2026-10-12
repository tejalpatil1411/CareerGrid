-- CareerGrid schema. Requires MySQL 8.0.16+ for enforced CHECK constraints.
-- Run this file first in MySQL Workbench.
CREATE DATABASE IF NOT EXISTS CareerGrid
  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE CareerGrid;

-- Parent tables are created before their dependants.
CREATE TABLE IF NOT EXISTS STUDENT (
  student_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  roll_no VARCHAR(30) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(254) NOT NULL,
  phone VARCHAR(20) NULL,
  date_of_birth DATE NULL,
  department VARCHAR(80) NOT NULL,
  graduation_year SMALLINT UNSIGNED NOT NULL,
  cgpa DECIMAL(4,2) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_student PRIMARY KEY (student_id),
  CONSTRAINT uq_student_roll_no UNIQUE (roll_no),
  CONSTRAINT uq_student_email UNIQUE (email),
  CONSTRAINT chk_student_cgpa CHECK (cgpa IS NULL OR cgpa BETWEEN 0.00 AND 10.00)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS COMPANY (
  company_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  company_name VARCHAR(150) NOT NULL,
  website VARCHAR(255) NULL,
  industry VARCHAR(80) NULL,
  location VARCHAR(120) NULL,
  contact_email VARCHAR(254) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_company PRIMARY KEY (company_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS ADMIN (
  admin_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(254) NOT NULL,
  role_name VARCHAR(30) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_admin PRIMARY KEY (admin_id),
  CONSTRAINT uq_admin_email UNIQUE (email)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS SKILL (
  skill_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  skill_name VARCHAR(80) NOT NULL,
  skill_category VARCHAR(50) NULL,
  CONSTRAINT pk_skill PRIMARY KEY (skill_id),
  CONSTRAINT uq_skill_name UNIQUE (skill_name)
) ENGINE=InnoDB;

-- Opportunity history is retained; company/admin deletion is restricted.
CREATE TABLE IF NOT EXISTS OPPORTUNITY (
  opportunity_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  company_id INT UNSIGNED NOT NULL,
  created_by_admin_id INT UNSIGNED NOT NULL,
  title VARCHAR(150) NOT NULL,
  opportunity_type VARCHAR(20) NOT NULL,
  description TEXT NULL,
  location VARCHAR(120) NULL,
  stipend DECIMAL(10,2) NULL,
  salary DECIMAL(12,2) NULL,
  minimum_cgpa DECIMAL(4,2) NULL,
  open_date DATETIME NOT NULL,
  deadline DATETIME NOT NULL,
  status VARCHAR(20) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_opportunity PRIMARY KEY (opportunity_id),
  CONSTRAINT fk_opportunity_company FOREIGN KEY (company_id)
    REFERENCES COMPANY (company_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_opportunity_admin FOREIGN KEY (created_by_admin_id)
    REFERENCES ADMIN (admin_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT chk_opportunity_type CHECK (opportunity_type IN ('Internship', 'Placement')),
  CONSTRAINT chk_opportunity_status CHECK (status IN ('Draft', 'Open', 'Closed', 'Cancelled')),
  CONSTRAINT chk_opportunity_stipend CHECK (stipend IS NULL OR stipend >= 0),
  CONSTRAINT chk_opportunity_salary CHECK (salary IS NULL OR salary >= 0),
  CONSTRAINT chk_opportunity_cgpa CHECK (minimum_cgpa IS NULL OR minimum_cgpa BETWEEN 0.00 AND 10.00),
  CONSTRAINT chk_opportunity_dates CHECK (open_date <= deadline),
  -- Compensation for the other opportunity type must remain NULL; own amount may be undisclosed.
  CONSTRAINT chk_opportunity_compensation_type CHECK (
    (opportunity_type = 'Internship' AND salary IS NULL) OR
    (opportunity_type = 'Placement' AND stipend IS NULL)
  ),
  INDEX idx_opportunity_status_window (status, open_date, deadline),
  INDEX idx_opportunity_company (company_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS APPLICATION (
  application_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_id INT UNSIGNED NOT NULL,
  opportunity_id INT UNSIGNED NOT NULL,
  applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(20) NOT NULL DEFAULT 'Applied',
  resume_reference VARCHAR(255) NULL,
  remarks VARCHAR(500) NULL,
  CONSTRAINT pk_application PRIMARY KEY (application_id),
  CONSTRAINT uq_application_student_opportunity UNIQUE (student_id, opportunity_id),
  CONSTRAINT fk_application_student FOREIGN KEY (student_id)
    REFERENCES STUDENT (student_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_application_opportunity FOREIGN KEY (opportunity_id)
    REFERENCES OPPORTUNITY (opportunity_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT chk_application_status CHECK (status IN
    ('Applied', 'Under Review', 'Shortlisted', 'Interview', 'Selected', 'Rejected', 'Withdrawn')),
  INDEX idx_application_opportunity_status (opportunity_id, status),
  INDEX idx_application_student_date (student_id, applied_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS INTERVIEW (
  interview_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  application_id INT UNSIGNED NOT NULL,
  round_number SMALLINT UNSIGNED NOT NULL,
  scheduled_at DATETIME NOT NULL,
  mode VARCHAR(20) NOT NULL,
  result VARCHAR(20) NULL,
  feedback VARCHAR(500) NULL,
  CONSTRAINT pk_interview PRIMARY KEY (interview_id),
  CONSTRAINT uq_interview_application_round UNIQUE (application_id, round_number),
  CONSTRAINT fk_interview_application FOREIGN KEY (application_id)
    REFERENCES APPLICATION (application_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT chk_interview_round CHECK (round_number > 0),
  CONSTRAINT chk_interview_mode CHECK (mode IN ('Online', 'In Person', 'Phone')),
  CONSTRAINT chk_interview_result CHECK (result IS NULL OR result IN ('Passed', 'Failed', 'No Show')),
  INDEX idx_interview_schedule (scheduled_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS PLACEMENT (
  placement_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  application_id INT UNSIGNED NOT NULL,
  offer_date DATE NULL,
  joining_date DATE NULL,
  offered_compensation DECIMAL(12,2) NULL,
  placement_status VARCHAR(20) NOT NULL DEFAULT 'Offer Pending',
  CONSTRAINT pk_placement PRIMARY KEY (placement_id),
  CONSTRAINT uq_placement_application UNIQUE (application_id),
  CONSTRAINT fk_placement_application FOREIGN KEY (application_id)
    REFERENCES APPLICATION (application_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT chk_placement_status CHECK (placement_status IN
    ('Offer Pending', 'Accepted', 'Declined', 'Joined', 'Withdrawn')),
  CONSTRAINT chk_placement_compensation CHECK (offered_compensation IS NULL OR offered_compensation >= 0),
  CONSTRAINT chk_placement_dates CHECK (
    offer_date IS NULL OR joining_date IS NULL OR joining_date >= offer_date
  )
) ENGINE=InnoDB;

-- Junction rows have no independent history, so only these links cascade on parent deletion.
CREATE TABLE IF NOT EXISTS STUDENT_SKILL (
  student_id INT UNSIGNED NOT NULL,
  skill_id INT UNSIGNED NOT NULL,
  proficiency_level VARCHAR(20) NULL,
  acquired_on DATE NULL,
  CONSTRAINT pk_student_skill PRIMARY KEY (student_id, skill_id),
  CONSTRAINT fk_student_skill_student FOREIGN KEY (student_id)
    REFERENCES STUDENT (student_id) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT fk_student_skill_skill FOREIGN KEY (skill_id)
    REFERENCES SKILL (skill_id) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT chk_student_skill_proficiency CHECK (proficiency_level IS NULL OR
    proficiency_level IN ('Beginner', 'Intermediate', 'Advanced')),
  INDEX idx_student_skill_skill (skill_id)
) ENGINE=InnoDB;
