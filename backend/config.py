import os

from dotenv import load_dotenv

load_dotenv()


class Config:
    """Application settings are read from the process environment or .env."""

    MYSQL_HOST = os.getenv("MYSQL_HOST", "127.0.0.1")
    MYSQL_PORT = int(os.getenv("MYSQL_PORT", "3306"))
    MYSQL_USER = os.getenv("MYSQL_USER", "root")
    MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "")
    MYSQL_DATABASE = os.getenv("MYSQL_DATABASE", "CareerGrid")
    MYSQL_CONNECT_TIMEOUT = int(os.getenv("MYSQL_CONNECT_TIMEOUT", "5"))
    JSON_SORT_KEYS = False
    SECRET_KEY = os.getenv("SECRET_KEY")