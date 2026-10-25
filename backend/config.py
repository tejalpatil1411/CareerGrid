import os
from datetime import timedelta

from dotenv import load_dotenv

load_dotenv()


def _env_bool(name, default=False):
    value = os.getenv(name)
    return default if value is None else value.strip().lower() in {"1", "true", "yes", "on"}


class Config:
    """Application settings are read from the process environment or .env."""

    MYSQL_HOST = os.getenv("MYSQL_HOST", "127.0.0.1")
    MYSQL_PORT = int(os.getenv("MYSQL_PORT", "3306"))
    MYSQL_USER = os.getenv("MYSQL_USER", "root")
    MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "")
    MYSQL_DATABASE = os.getenv("MYSQL_DATABASE", "CareerGrid")
    MYSQL_CONNECT_TIMEOUT = int(os.getenv("MYSQL_CONNECT_TIMEOUT", "5"))
    SECRET_KEY = os.getenv("SECRET_KEY")
    SESSION_COOKIE_SECURE = _env_bool("SESSION_COOKIE_SECURE", False)
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"
    PERMANENT_SESSION_LIFETIME = timedelta(hours=8)
    JSON_SORT_KEYS = False
