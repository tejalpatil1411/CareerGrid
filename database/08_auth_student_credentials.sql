-- Additive migration for student password credentials.
-- Run after 07_auth.sql. Existing student and project rows are not changed.
USE CareerGrid;

CREATE TABLE IF NOT EXISTS STUDENT_CREDENTIALS (
    student_id INT UNSIGNED NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT pk_student_credentials PRIMARY KEY (student_id),
    CONSTRAINT fk_student_credentials_student
        FOREIGN KEY (student_id) REFERENCES STUDENT(student_id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;
