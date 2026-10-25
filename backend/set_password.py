"""Set or replace one password hash for an existing CareerGrid account."""

from getpass import getpass

from .app import app
from .auth import hash_password
from .db import connect_db


def main():
    role = input("Account type (student/admin): ").strip().lower()
    if role not in {"student", "admin"}:
        raise SystemExit("Choose student or admin.")
    identifier = input("Student email/roll number or admin email: ").strip()
    if not identifier:
        raise SystemExit("An account identifier is required.")
    password = getpass("New password (12–72 UTF-8 bytes): ")
    confirmation = getpass("Confirm password: ")
    if password != confirmation:
        raise SystemExit("Passwords did not match.")

    table = "STUDENT_CREDENTIALS" if role == "student" else "ADMIN_CREDENTIALS"
    id_column = "student_id" if role == "student" else "admin_id"
    with app.app_context():
        password_hash = hash_password(password)
        connection = connect_db()
        cursor = connection.cursor()
        try:
            if role == "student":
                cursor.execute("SELECT student_id FROM STUDENT WHERE email=%s OR roll_no=%s LIMIT 1",
                               (identifier, identifier))
            else:
                cursor.execute("SELECT admin_id FROM ADMIN WHERE email=%s AND is_active=TRUE LIMIT 1",
                               (identifier,))
            row = cursor.fetchone()
            if row is None:
                raise SystemExit("No matching active CareerGrid account was found.")
            account_id = int(row[0])
            cursor.execute(f"SELECT 1 FROM {table} WHERE {id_column}=%s", (account_id,))
            if cursor.fetchone():
                cursor.execute(f"UPDATE {table} SET password_hash=%s WHERE {id_column}=%s",
                               (password_hash, account_id))
            else:
                cursor.execute(f"INSERT INTO {table} ({id_column}, password_hash) VALUES (%s, %s)",
                               (account_id, password_hash))
            connection.commit()
            print(f"Password hash saved for {role} account ID {account_id}.")
        except Exception:
            connection.rollback()
            raise
        finally:
            cursor.close()
            connection.close()


if __name__ == "__main__":
    main()
