"""CareerGrid API application factory and consistent error responses."""

import logging

import mysql.connector
from pathlib import Path

from flask import Flask, jsonify
from werkzeug.exceptions import HTTPException

from .config import Config
from .routes import api
from .validation import ValidationError


def create_app(config_object=Config):
    frontend_dir = Path(__file__).resolve().parent.parent / "frontend"
    app = Flask(__name__, static_folder=str(frontend_dir), static_url_path="/frontend")
    app.config.from_object(config_object)
    app.register_blueprint(api)
    logging.basicConfig(level=logging.INFO)

    @app.errorhandler(ValidationError)
    def validation_error(error):
        return jsonify({"success": False, "data": None, "error": {
            "code": "validation_error", "message": str(error)}}), 400

    @app.errorhandler(mysql.connector.Error)
    def database_error(error):
        # Connector diagnostics stay in the server log; clients receive a safe explanation.
        logging.warning("CareerGrid database operation failed (type=%s, errno=%s, sqlstate=%s)",
                        type(error).__name__, error.errno, error.sqlstate)
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
