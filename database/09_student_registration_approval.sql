-- Additive student account review state for self-registration.
-- Existing student rows remain active; new registration explicitly sets is_active=FALSE.
USE CareerGrid;

ALTER TABLE STUDENT
    ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;
