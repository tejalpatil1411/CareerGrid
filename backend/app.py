"""CareerGrid API application factory and consistent error responses."""

import logging
from datetime import timedelta
from pathlib import Path

import mysql.connector
from flask import Flask, jsonify
from werkzeug.exceptions import HTTPException

from .auth import auth_api, authorization_guard, bcrypt, csrf_guard
from .config import Config
from .routes import api
from .validation import ValidationError


def create_app(config_object=Config):
    frontend_dir = Path(__file__).resolve().parent.parent / "frontend"
    app = Flask(__name__, static_folder=str(frontend_dir), static_url_path="/frontend")
    if isinstance(config_object, dict):
        app.config.from_mapping(config_object)
    else:
        app.config.from_object(config_object)

    secret_key = app.config.get("SECRET_KEY")
    if not isinstance(secret_key, str) or len(secret_key) < 32:
        raise RuntimeError("Set SECRET_KEY to a random value of at least 32 characters before starting CareerGrid.")

    app.config.update(
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SAMESITE="Lax",
        SESSION_COOKIE_SECURE=bool(app.config.get("SESSION_COOKIE_SECURE", False)),
        SESSION_REFRESH_EACH_REQUEST=False,
        PERMANENT_SESSION_LIFETIME=app.config.get("PERMANENT_SESSION_LIFETIME", timedelta(hours=8)),
    )
    bcrypt.init_app(app)
    app.register_blueprint(api)
    app.register_blueprint(auth_api)
    logging.basicConfig(level=logging.INFO)

    @app.before_request
    def protect_api():
        csrf_error = csrf_guard()
        if csrf_error is not None:
            return csrf_error
        return authorization_guard()

    @app.errorhandler(ValidationError)
    def validation_error(error):
        return jsonify({"success": False, "data": None, "error": {
            "code": "validation_error", "message": str(error)}}), 400

    @app.errorhandler(mysql.connector.Error)
    def database_error(error):
        logging.warning(
            "CareerGrid database operation failed (type=%s, errno=%s, sqlstate=%s, message=%s)",
            type(error).__name__,
            error.errno,
            error.sqlstate,
            error.msg,
        )
        if error.errno == 1062:
            code, message, status = "duplicate_record", "A record with those unique values already exists.", 409
        elif error.errno == 1644 or error.sqlstate == "45000":
            code, message, status = "database_rule_rejected", str(error.msg), 422
        elif error.errno == 1452:
            code, message, status = "related_record_not_found", "A referenced student, company, skill, admin, opportunity, or application does not exist.", 404
        elif isinstance(error, mysql.connector.ProgrammingError):
            code, message, status = "database_query_error", "CareerGrid could not process this database request. Please retry; contact the administrator if it continues.", 500
        elif error.errno in (1045, 1049, 2002, 2003, 2005, 2013):
            code, message, status = "database_unavailable", "Could not connect to the configured CareerGrid database. Check the backend configuration and MySQL service.", 503
        elif error.errno in (3819, 4025, 1264, 1265, 1451):
            code, message, status = "database_constraint_failed", "The database rejected one or more values because they violate a CareerGrid constraint.", 422
        else:
            code, message, status = "database_error", "The database could not complete this request.", 500
        return jsonify({"success": False, "data": None, "error": {"code": code, "message": message}}), status

    @app.errorhandler(HTTPException)
    def http_error(error):
        code = "not_found" if error.code == 404 else "method_not_allowed" if error.code == 405 else "http_error"
        return jsonify({"success": False, "data": None, "error": {
            "code": code, "message": error.description}}), error.code

    @app.errorhandler(Exception)
    def unexpected_error(error):
        logging.exception("Unexpected CareerGrid API error")
        return jsonify({"success": False, "data": None, "error": {
            "code": "internal_error", "message": "An unexpected server error occurred."}}), 500

    @app.get("/")
    def index():
        return app.send_static_file("index.html")

    return app


app = create_app()


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=False)
