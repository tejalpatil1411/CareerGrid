"""Read-only backend smoke checks plus a rolled-back application-trigger check.

Run with the Flask server already started: python -m backend.check_backend
The trigger check inserts one intentionally invalid application in a transaction
and immediately rolls it back; no persistent data is changed.
"""

import json
import os
import sys
from getpass import getpass
from http.cookiejar import CookieJar
from urllib.error import HTTPError
from urllib.request import HTTPCookieProcessor, Request, build_opener

import mysql.connector

from .config import Config


BASE_URL = os.getenv("CAREERGRID_API_URL", "http://127.0.0.1:5000")
OPENER = build_opener(HTTPCookieProcessor(CookieJar()))


def get_json(path):
    with OPENER.open(BASE_URL + path, timeout=10) as response:
        return response.status, json.loads(response.read().decode("utf-8"))


def login_admin():
    _, session = get_json("/api/auth/session")
    identifier = input("Placement administrator email: ").strip()
    password = getpass("Placement administrator password: ")
    request = Request(
        BASE_URL + "/api/auth/admin/login",
        data=json.dumps({"identifier": identifier, "password": password}).encode("utf-8"),
        headers={"Content-Type": "application/json", "X-CSRF-Token": session["data"]["csrf_token"]},
        method="POST",
    )
    try:
        with OPENER.open(request, timeout=10) as response:
            body = json.loads(response.read().decode("utf-8"))
            return body.get("success") is True
    except HTTPError as error:
        body = json.loads(error.read().decode("utf-8"))
        print(f"FAIL Administrator sign-in: {body.get('error', {}).get('message', 'Sign-in failed.')}")
        return False


def check_trigger():
    connection = mysql.connector.connect(
        host=Config.MYSQL_HOST, port=Config.MYSQL_PORT, user=Config.MYSQL_USER,
        password=Config.MYSQL_PASSWORD, database=Config.MYSQL_DATABASE,
        connection_timeout=Config.MYSQL_CONNECT_TIMEOUT,
    )
    try:
        cursor = connection.cursor()
        cursor.execute("SELECT student_id FROM STUDENT ORDER BY student_id LIMIT 1")
        student = cursor.fetchone()
        if not student:
            raise RuntimeError("Trigger check requires at least one existing student in the database.")
        try:
            # Trigger rejects a nonexistent opportunity before the FK check; transaction is rolled back.
            cursor.execute(
                "INSERT INTO APPLICATION (student_id, opportunity_id) VALUES (%s, %s)",
                (student[0], 4294967295),
            )
            connection.rollback()
            raise RuntimeError("Expected the application validation trigger to reject the invalid opportunity.")
        except mysql.connector.Error as error:
            connection.rollback()
            if error.errno != 1644 or error.sqlstate != "45000":
                raise RuntimeError(f"Expected trigger rejection (1644/45000), got {error.errno}/{error.sqlstate}.") from error
            return error.msg
    finally:
        connection.close()


def main():
    try:
        if not login_admin():
            return 1
    except Exception as error:
        print(f"FAIL Administrator sign-in: {error}")
        return 1
    checks = [
        ("Flask health", "/api/health", lambda body: body.get("success") is True),
        ("MySQL connection", "/api/health/db", lambda body: body.get("data", {}).get("status") == "connected"),
        ("Active opportunities", "/api/opportunities", lambda body: isinstance(body.get("data"), list)),
        ("Applications", "/api/admin/applications", lambda body: isinstance(body.get("data"), list)),
        ("Placement statistics", "/api/reports/placement-statistics", lambda body: isinstance(body.get("data"), list)),
    ]
    failed = False
    for label, path, predicate in checks:
        try:
            status, body = get_json(path)
            if status != 200 or not predicate(body):
                raise RuntimeError(f"Unexpected response: HTTP {status} {body}")
            print(f"PASS {label}")
        except Exception as error:
            failed = True
            print(f"FAIL {label}: {error}")
    try:
        message = check_trigger()
        print(f"PASS Database trigger rejection: {message}")
    except Exception as error:
        failed = True
        print(f"FAIL Database trigger rejection: {error}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
