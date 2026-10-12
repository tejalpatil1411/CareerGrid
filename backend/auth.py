
"""Password hashing utilities for CareerGrid."""

from flask_bcrypt import Bcrypt

bcrypt = Bcrypt()


def hash_password(password: str) -> str:
    """Return a secure hash of a password."""
    if not isinstance(password, str) or len(password) < 12:
        raise ValueError("Password must contain at least 12 characters.")

    return bcrypt.generate_password_hash(password).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    """Check a password against its stored hash."""
    if not isinstance(password, str) or not isinstance(password_hash, str):
        return False

    try:
        return bcrypt.check_password_hash(password_hash, password)
    except (ValueError, TypeError):
        return False
