"""Request validation shared by the API routes."""

import re
from datetime import date, datetime
from decimal import Decimal, InvalidOperation

EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


class ValidationError(ValueError):
    pass


def require_object(value):
    if not isinstance(value, dict):
        raise ValidationError("Request body must be a JSON object.")
    return value


def positive_id(value, name="id"):
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        raise ValidationError(f"{name} must be a positive integer.")
    if parsed < 1 or parsed > 4294967295:
        raise ValidationError(f"{name} must be a positive integer.")
    return parsed


def required_text(data, key, limit):
    value = data.get(key)
    if not isinstance(value, str) or not value.strip():
        raise ValidationError(f"{key} is required.")
    value = value.strip()
    if len(value) > limit:
        raise ValidationError(f"{key} must be at most {limit} characters.")
    return value


def optional_text(data, key, limit):
    value = data.get(key)
    if value is None:
        return None
    if not isinstance(value, str) or len(value.strip()) > limit:
        raise ValidationError(f"{key} must be text of at most {limit} characters.")
    return value.strip() or None


def email_value(value, *, optional=False):
    if value is None and optional:
        return None
    if not isinstance(value, str) or len(value) > 254 or not EMAIL_RE.fullmatch(value.strip()):
        raise ValidationError("A valid email address is required.")
    return value.strip()


def decimal_value(value, name, *, minimum=None, maximum=None, optional=False):
    if value is None and optional:
        return None
    try:
        result = Decimal(str(value))
    except (InvalidOperation, ValueError):
        raise ValidationError(f"{name} must be numeric.")
    if not result.is_finite() or (minimum is not None and result < minimum) or (maximum is not None and result > maximum):
        raise ValidationError(f"{name} is outside the allowed range.")
    return result


def date_value(value, name, *, with_time=False, optional=False):
    if value is None and optional:
        return None
    if not isinstance(value, str):
        raise ValidationError(f"{name} must be an ISO date{ ' and time' if with_time else ''}.")
    try:
        if with_time:
            parsed = datetime.fromisoformat(value)
            if parsed.tzinfo is not None:
                raise ValueError("MySQL DATETIME values use the configured server-local timezone.")
            return parsed
        return date.fromisoformat(value)
    except ValueError:
        raise ValidationError(f"{name} must be an ISO date{ ' and time' if with_time else ''}.")
