
USE CareerGrid;

-- Stores login credentials separately from the existing ADMIN table.
-- Passwords must be stored as secure hashes, never as plain text.
CREATE TABLE IF NOT EXISTS ADMIN_CREDENTIALS (
    admin_id INT UNSIGNED NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_admin_credentials
        PRIMARY KEY (admin_id),

    CONSTRAINT fk_admin_credentials_admin
        FOREIGN KEY (admin_id)
        REFERENCES ADMIN(admin_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB;
