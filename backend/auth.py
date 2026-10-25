"""Cookie-session authentication, CSRF checks, and API authorization."""

import hmac
import secrets
from decimal import Decimal

import mysql.connector
from flask import Blueprint, jsonify, request, session
from flask_bcrypt import Bcrypt

from .db import connect_db, fetch_one
from .validation import (ValidationError, date_value, decimal_value, email_value,
                         optional_text, positive_id, required_text, require_object)

bcrypt = Bcrypt()
auth_api = Blueprint("auth_api", __name__, url_prefix="/api/auth")


def success(data, status=200):
    return jsonify({"success": True, "data": data, "error": None}), status


def error_response(code, message, status):
    return jsonify({"success": False, "data": None,
                    "error": {"code": code, "message": message}}), status


def hash_password(password: str) -> str:
    byte_length = len(password.encode("utf-8")) if isinstance(password, str) else 0
    if byte_length < 12 or byte_length > 72:
        raise ValueError("Password must be between 12 and 72 UTF-8 bytes.")
    return bcrypt.generate_password_hash(password).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    if not isinstance(password, str) or not isinstance(password_hash, str) or len(password.encode("utf-8")) > 72:
        return False
    try:
        return bcrypt.check_password_hash(password_hash, password)
    except (ValueError, TypeError):
        return False


def _credential_body():
    if not request.is_json:
        raise ValidationError("Content-Type must be application/json.")
    body = require_object(request.get_json(silent=True))
    identifier = required_text(body, "identifier", 254)
    password = body.get("password")
    if not isinstance(password, str) or not password:
        raise ValidationError("password is required.")
    return identifier, password


def _login(role, identifier, password):
    # A failed account switch must not leave a previous privileged session active.
    csrf_token = session.get("csrf_token")
    session.clear()
    if csrf_token:
        session["csrf_token"] = csrf_token
    if role == "student":
        user = fetch_one(
            "SELECT s.student_id AS user_id, s.full_name AS display_name, sc.password_hash "
            "FROM STUDENT AS s JOIN STUDENT_CREDENTIALS AS sc ON sc.student_id=s.student_id "
            "WHERE (s.email=%s OR s.roll_no=%s) AND s.is_active=TRUE LIMIT 1", (identifier, identifier))
    else:
        user = fetch_one(
            "SELECT a.admin_id AS user_id, a.full_name AS display_name, ac.password_hash "
            "FROM ADMIN AS a JOIN ADMIN_CREDENTIALS AS ac ON ac.admin_id=a.admin_id "
            "WHERE a.email=%s AND a.is_active=TRUE LIMIT 1", (identifier,))
    if user is None or not verify_password(password, user.get("password_hash")):
        return error_response("invalid_credentials", "The email/roll number or password is incorrect.", 401)
    session.permanent = True
    session["role"] = role
    session["user_id"] = int(user["user_id"])
    session["display_name"] = user["display_name"]
    session["csrf_token"] = secrets.token_urlsafe(32)
    return success({"authenticated": True, "role": role, "user_id": int(user["user_id"]),
                    "display_name": user["display_name"], "csrf_token": session["csrf_token"]})


@auth_api.get("/session")
def session_status():
    token = session.get("csrf_token")
    if not token:
        token = secrets.token_urlsafe(32)
        session["csrf_token"] = token
    role, user_id = session.get("role"), session.get("user_id")
    if role not in ("student", "admin") or not isinstance(user_id, int):
        return success({"authenticated": False, "csrf_token": token})
    return success({"authenticated": True, "role": role, "user_id": user_id,
                    "display_name": session.get("display_name", ""), "csrf_token": token})


@auth_api.post("/student/login")
def student_login():
    return _login("student", *_credential_body())


@auth_api.post("/admin/login")
def admin_login():
    return _login("admin", *_credential_body())


@auth_api.post("/register")
def register_student():
    if not request.is_json:
        raise ValidationError("Content-Type must be application/json.")
    body = require_object(request.get_json(silent=True))
    allowed = {"roll_no", "full_name", "email", "phone", "date_of_birth", "department",
               "graduation_year", "cgpa", "password"}
    if set(body) - allowed:
        raise ValidationError("Request contains unsupported registration fields.")
    roll_no = required_text(body, "roll_no", 30)
    full_name = required_text(body, "full_name", 100)
    email = email_value(body.get("email"))
    phone = optional_text(body, "phone", 20)
    date_of_birth = date_value(body.get("date_of_birth"), "date_of_birth", optional=True)
    department = required_text(body, "department", 80)
    graduation_year = positive_id(body.get("graduation_year"), "graduation_year")
    if graduation_year > 9999:
        raise ValidationError("graduation_year is outside the allowed range.")
    cgpa = decimal_value(body.get("cgpa"), "cgpa", minimum=Decimal("0"), maximum=Decimal("10"), optional=True)
    password = body.get("password")
    if not isinstance(password, str):
        raise ValidationError("password is required.")
    try:
        password_hash = hash_password(password)
    except ValueError as error:
        raise ValidationError(str(error)) from error

    connection = connect_db()
    cursor = connection.cursor()
    try:
        cursor.execute(
            "INSERT INTO STUDENT (roll_no, full_name, email, phone, date_of_birth, department, graduation_year, cgpa, is_active) "
            "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,FALSE)",
            (roll_no, full_name, email, phone, date_of_birth, department, graduation_year, cgpa),
        )
        student_id = int(cursor.lastrowid)
        cursor.execute("INSERT INTO STUDENT_CREDENTIALS (student_id, password_hash) VALUES (%s,%s)",
                       (student_id, password_hash))
        connection.commit()
    except mysql.connector.IntegrityError as error:
        connection.rollback()
        if error.errno == 1062:
            return error_response("duplicate_student", "A student with that email or roll number already exists.", 409)
        raise
    except Exception:
        connection.rollback()
        raise
    finally:
        cursor.close()
        connection.close()

    return success({"registered": True, "approval_required": True}, 202)


@auth_api.post("/logout")
def logout():
    session.clear()
    return success({"authenticated": False})


def csrf_guard():
    if not request.path.startswith("/api/") or request.method not in {"POST", "PUT", "PATCH", "DELETE"}:
        return None
    expected, supplied = session.get("csrf_token"), request.headers.get("X-CSRF-Token", "")
    if not expected or not supplied or not hmac.compare_digest(expected, supplied):
        return error_response("csrf_failed", "The request token is missing or expired. Refresh the page and sign in again.", 403)
    return None


def authorization_guard():
    if not request.path.startswith("/api/") or request.endpoint is None:
        return None
    path = request.path.removeprefix("/api/").strip("/")
    if path in {"auth/session", "auth/student/login", "auth/admin/login", "auth/logout", "auth/register"}:
        return None
    if request.method == "GET" and (path in {"health", "health/db", "skills", "opportunities"} or path.startswith("opportunities/")):
        return None
    role, user_id = session.get("role"), session.get("user_id")
    if not role or not isinstance(user_id, int):
        return error_response("unauthenticated", "Sign in to access this resource.", 401)
    if path.startswith(("admin/", "reports/")):
        return None if role == "admin" else error_response("forbidden", "Placement administrator access is required.", 403)
    if path.startswith("students/"):
        parts = path.split("/")
        try:
            requested_id = int(parts[1])
        except (IndexError, ValueError):
            return error_response("unauthenticated", "Sign in to access this resource.", 401)
        if role != "student":
            return error_response("forbidden", "This resource is available to the student account only.", 403)
        if requested_id != user_id:
            return error_response("forbidden", "You may access only your own student record.", 403)
        return None
    return error_response("unauthenticated", "Sign in to access this resource.", 401)
