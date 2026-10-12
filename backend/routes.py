"""REST endpoints for students, opportunities, administration, and reporting."""

from datetime import datetime
from decimal import Decimal

import mysql.connector
from flask import Blueprint, jsonify, request

from .db import connect_db, execute, fetch_all, fetch_one
from .validation import (
    ValidationError, date_value, decimal_value, email_value, optional_text,
    positive_id, require_object, required_text,
)

api = Blueprint("api", __name__, url_prefix="/api")

APPLICATION_STATUSES = ("Applied", "Under Review", "Shortlisted", "Interview", "Selected", "Rejected", "Withdrawn")
INTERVIEW_MODES = ("Online", "In Person", "Phone")
INTERVIEW_RESULTS = ("Passed", "Failed", "No Show")
PLACEMENT_STATUSES = ("Offer Pending", "Accepted", "Declined", "Joined", "Withdrawn")
OPPORTUNITY_TYPES = ("Internship", "Placement")
OPPORTUNITY_STATUSES = ("Draft", "Open", "Closed", "Cancelled")
PROFICIENCY_LEVELS = ("Beginner", "Intermediate", "Advanced")


def success(data, status=200):
    return jsonify({"success": True, "data": data, "error": None}), status


def missing(label="Record"):
    return jsonify({"success": False, "data": None, "error": {"code": "not_found", "message": f"{label} not found."}}), 404


def ensure_found(row, label="Record"):
    return row if row is not None else missing(label)


def json_body():
    if not request.is_json:
        raise ValidationError("Content-Type must be application/json.")
    return require_object(request.get_json(silent=True))


def enum_value(value, name, choices):
    if value not in choices:
        raise ValidationError(f"{name} must be one of: {', '.join(choices)}.")
    return value


@api.get("/health")
def health():
    return success({"status": "ok", "database": "not checked; use /api/health/db"})


@api.get("/health/db")
def database_health():
    row = fetch_one("SELECT DATABASE() AS database_name, VERSION() AS mysql_version")
    return success({"status": "connected", **row})


# Opportunities -------------------------------------------------------------
@api.get("/opportunities")
def list_opportunities():
    clauses, values = [], []
    opportunity_type = request.args.get("type")
    if opportunity_type:
        clauses.append("ao.opportunity_type = %s")
        values.append(enum_value(opportunity_type, "type", OPPORTUNITY_TYPES))
    location = request.args.get("location")
    if location:
        clauses.append("ao.location LIKE %s")
        values.append(f"%{location.strip()}%")
    company = request.args.get("company")
    if company:
        clauses.append("ao.company_name LIKE %s")
        values.append(f"%{company.strip()}%")
    if request.args.get("minimum_cgpa") is not None:
        # Find roles whose published cutoff is at least this value; NULL cutoffs remain visible.
        floor = decimal_value(request.args["minimum_cgpa"], "minimum_cgpa", minimum=Decimal("0"), maximum=Decimal("10"))
        clauses.append("(ao.minimum_cgpa IS NULL OR ao.minimum_cgpa >= %s)")
        values.append(floor)
    if request.args.get("eligible_cgpa") is not None:
        cgpa = decimal_value(request.args["eligible_cgpa"], "eligible_cgpa", minimum=Decimal("0"), maximum=Decimal("10"))
        clauses.append("(ao.minimum_cgpa IS NULL OR ao.minimum_cgpa <= %s)")
        values.append(cgpa)
    sql = "SELECT ao.* FROM active_opportunities AS ao"
    if clauses:
        sql += " WHERE " + " AND ".join(clauses)
    sql += " ORDER BY ao.deadline, ao.opportunity_id"
    return success(fetch_all(sql, tuple(values)))


@api.get("/opportunities/<int:opportunity_id>")
def get_opportunity(opportunity_id):
    row = fetch_one(
        "SELECT o.opportunity_id, o.company_id, o.created_by_admin_id, o.title, o.opportunity_type, "
        "o.description, o.location, o.stipend, o.salary, o.minimum_cgpa, "
        "DATE_FORMAT(o.open_date, '%Y-%m-%dT%H:%i:%S') AS open_date, "
        "DATE_FORMAT(o.deadline, '%Y-%m-%dT%H:%i:%S') AS deadline, o.status, o.created_at, "
        "c.company_name, c.website, c.industry, c.location AS company_location "
        "FROM OPPORTUNITY o JOIN COMPANY c ON c.company_id=o.company_id WHERE o.opportunity_id=%s",
        (positive_id(opportunity_id, "opportunity_id"),),
    )
    return missing("Opportunity") if row is None else success(row)


# Student profile and skills ------------------------------------------------
@api.get("/skills")
def list_skills():
    rows = fetch_all("SELECT skill_id, skill_name, skill_category FROM SKILL ORDER BY skill_name, skill_id")
    return success(rows)


@api.get("/students/<int:student_id>")
def get_student(student_id):
    row = fetch_one(
        "SELECT student_id, roll_no, full_name, email, phone, date_of_birth, department, graduation_year, cgpa, created_at "
        "FROM STUDENT WHERE student_id=%s", (positive_id(student_id, "student_id"),),
    )
    return missing("Student") if row is None else success(row)


@api.put("/students/<int:student_id>")
def update_student(student_id):
    student_id = positive_id(student_id, "student_id")
    body = json_body()
    allowed = {"full_name", "email", "phone", "date_of_birth", "department", "graduation_year", "cgpa"}
    if not body or set(body) - allowed:
        raise ValidationError("Provide one or more supported profile fields only.")
    values, assignments = [], []
    for key, value in body.items():
        if key in ("full_name", "department"):
            value = required_text({key: value}, key, 100 if key == "full_name" else 80)
        elif key == "email":
            value = email_value(value)
        elif key == "phone":
            value = optional_text({key: value}, key, 20)
        elif key == "date_of_birth":
            value = date_value(value, key, optional=True)
        elif key == "graduation_year":
            value = positive_id(value, key)
            if value > 9999:
                raise ValidationError("graduation_year is outside the allowed range.")
        elif key == "cgpa":
            value = decimal_value(value, key, minimum=Decimal("0"), maximum=Decimal("10"), optional=True)
        assignments.append(f"{key}=%s")
        values.append(value)
    values.append(student_id)
    result = execute(f"UPDATE STUDENT SET {', '.join(assignments)} WHERE student_id=%s", tuple(values))
    if result["rowcount"] == 0 and fetch_one("SELECT student_id FROM STUDENT WHERE student_id=%s", (student_id,)) is None:
        return missing("Student")
    return get_student(student_id)


@api.get("/students/<int:student_id>/skills")
def list_student_skills(student_id):
    student_id = positive_id(student_id, "student_id")
    if fetch_one("SELECT student_id FROM STUDENT WHERE student_id=%s", (student_id,)) is None:
        return missing("Student")
    rows = fetch_all(
        "SELECT sk.skill_id, sk.skill_name, sk.skill_category, ss.proficiency_level, ss.acquired_on "
        "FROM STUDENT_SKILL ss JOIN SKILL sk ON sk.skill_id=ss.skill_id WHERE ss.student_id=%s ORDER BY sk.skill_name",
        (student_id,),
    )
    return success(rows)


@api.post("/students/<int:student_id>/skills")
def add_student_skill(student_id):
    student_id = positive_id(student_id, "student_id")
    body = json_body()
    skill_id = positive_id(body.get("skill_id"), "skill_id")
    proficiency = body.get("proficiency_level")
    if proficiency is not None:
        proficiency = enum_value(proficiency, "proficiency_level", PROFICIENCY_LEVELS)
    acquired = date_value(body.get("acquired_on"), "acquired_on", optional=True)
    if fetch_one("SELECT student_id FROM STUDENT WHERE student_id=%s", (student_id,)) is None:
        return missing("Student")
    if fetch_one("SELECT skill_id FROM STUDENT_SKILL WHERE student_id=%s AND skill_id=%s", (student_id, skill_id)):
        return jsonify({"success": False, "data": None, "error": {
            "code": "duplicate_student_skill", "message": "This skill is already in your profile."}}), 409
    try:
        execute("INSERT INTO STUDENT_SKILL (student_id, skill_id, proficiency_level, acquired_on) VALUES (%s,%s,%s,%s)",
                (student_id, skill_id, proficiency, acquired))
    except mysql.connector.IntegrityError as error:
        # The composite primary key also protects against duplicate requests arriving together.
        if error.errno == 1062:
            return jsonify({"success": False, "data": None, "error": {
                "code": "duplicate_student_skill", "message": "This skill is already in your profile."}}), 409
        raise
    return success({"student_id": student_id, "skill_id": skill_id}, 201)


@api.delete("/students/<int:student_id>/skills/<int:skill_id>")
def remove_student_skill(student_id, skill_id):
    result = execute("DELETE FROM STUDENT_SKILL WHERE student_id=%s AND skill_id=%s",
                     (positive_id(student_id, "student_id"), positive_id(skill_id, "skill_id")))
    return missing("Student skill") if not result["rowcount"] else success({"deleted": True})


# Applications, interviews, and offers --------------------------------------
@api.get("/students/<int:student_id>/applications")
def list_student_applications(student_id):
    student_id = positive_id(student_id, "student_id")
    student = fetch_one("SELECT student_id FROM STUDENT WHERE student_id=%s", (student_id,))
    if student is None:
        return missing("Student")
    rows = fetch_all(
        "SELECT application_id, opportunity_id, opportunity_title, opportunity_type, company_id, company_name, "
        "application_status AS status, applied_at, deadline FROM student_application_tracking "
        "WHERE student_id=%s ORDER BY applied_at DESC, application_id DESC", (student_id,),
    )
    return success(rows)


@api.get("/students/<int:student_id>/applications/<int:application_id>")
def get_student_application(student_id, application_id):
    row = fetch_one(
        "SELECT application_id, student_id, opportunity_id, opportunity_title, opportunity_type, company_id, company_name, "
        "application_status AS status, applied_at, deadline FROM student_application_tracking "
        "WHERE student_id=%s AND application_id=%s",
        (positive_id(student_id, "student_id"), positive_id(application_id, "application_id")),
    )
    return missing("Application") if row is None else success(row)


@api.post("/students/<int:student_id>/applications")
def apply_to_opportunity(student_id):
    student_id = positive_id(student_id, "student_id")
    body = json_body()
    opportunity_id = positive_id(body.get("opportunity_id"), "opportunity_id")
    resume = optional_text(body, "resume_reference", 255)
    result = execute("INSERT INTO APPLICATION (student_id, opportunity_id, resume_reference) VALUES (%s,%s,%s)",
                     (student_id, opportunity_id, resume))
    return success({"application_id": result["lastrowid"], "student_id": student_id,
                    "opportunity_id": opportunity_id, "status": "Applied"}, 201)


@api.patch("/students/<int:student_id>/applications/<int:application_id>")
def withdraw_application(student_id, application_id):
    student_id, application_id = positive_id(student_id, "student_id"), positive_id(application_id, "application_id")
    row = fetch_one("SELECT status FROM APPLICATION WHERE student_id=%s AND application_id=%s", (student_id, application_id))
    if row is None:
        return missing("Application")
    if row["status"] in ("Selected", "Rejected", "Withdrawn"):
        return jsonify({"success": False, "data": None, "error": {"code": "invalid_state", "message": "This application can no longer be withdrawn."}}), 409
    execute("UPDATE APPLICATION SET status='Withdrawn' WHERE student_id=%s AND application_id=%s", (student_id, application_id))
    return success({"application_id": application_id, "status": "Withdrawn"})


@api.get("/students/<int:student_id>/interviews")
def list_student_interviews(student_id):
    student_id = positive_id(student_id, "student_id")
    if fetch_one("SELECT student_id FROM STUDENT WHERE student_id=%s", (student_id,)) is None:
        return missing("Student")
    rows = fetch_all(
        "SELECT i.interview_id, i.application_id, i.round_number, "
        "DATE_FORMAT(i.scheduled_at, '%Y-%m-%dT%H:%i:%S') AS scheduled_at, i.mode, i.result, i.feedback, "
        "o.opportunity_id, o.title AS opportunity_title, c.company_name "
        "FROM INTERVIEW i JOIN APPLICATION a ON a.application_id=i.application_id "
        "JOIN OPPORTUNITY o ON o.opportunity_id=a.opportunity_id JOIN COMPANY c ON c.company_id=o.company_id "
        "WHERE a.student_id=%s ORDER BY i.scheduled_at, i.round_number", (student_id,),
    )
    return success(rows)


@api.get("/students/<int:student_id>/placements")
def list_student_placements(student_id):
    student_id = positive_id(student_id, "student_id")
    if fetch_one("SELECT student_id FROM STUDENT WHERE student_id=%s", (student_id,)) is None:
        return missing("Student")
    rows = fetch_all(
        "SELECT p.placement_id, p.application_id, p.offer_date, p.joining_date, p.offered_compensation, "
        "p.placement_status, a.opportunity_id, o.title AS opportunity_title, c.company_name "
        "FROM PLACEMENT p JOIN APPLICATION a ON a.application_id=p.application_id "
        "JOIN OPPORTUNITY o ON o.opportunity_id=a.opportunity_id JOIN COMPANY c ON c.company_id=o.company_id "
        "WHERE a.student_id=%s ORDER BY p.offer_date DESC, p.placement_id", (student_id,),
    )
    return success(rows)


@api.patch("/students/<int:student_id>/placements/<int:placement_id>")
def update_student_placement(student_id, placement_id):
    student_id, placement_id = positive_id(student_id, "student_id"), positive_id(placement_id, "placement_id")
    body = json_body()
    if set(body) - {"placement_status"} or "placement_status" not in body:
        raise ValidationError("Provide placement_status only.")
    state = enum_value(body["placement_status"], "placement_status", PLACEMENT_STATUSES)
    result = execute(
        "UPDATE PLACEMENT p JOIN APPLICATION a ON a.application_id=p.application_id "
        "SET p.placement_status=%s WHERE p.placement_id=%s AND a.student_id=%s",
        (state, placement_id, student_id),
    )
    if not result["rowcount"]:
        return missing("Placement")
    return success({"placement_id": placement_id, "placement_status": state})


# Admin management ----------------------------------------------------------
@api.get("/admin/students")
def admin_students():
    rows = fetch_all("SELECT student_id, roll_no, full_name, email, department, graduation_year, cgpa FROM STUDENT ORDER BY student_id")
    return success(rows)


@api.get("/admin/companies")
def admin_companies():
    return success(fetch_all("SELECT company_id, company_name, website, industry, location, contact_email FROM COMPANY ORDER BY company_name, company_id"))


@api.get("/admin/opportunities")
def admin_opportunities():
    return success(fetch_all(
        "SELECT o.opportunity_id, o.company_id, c.company_name, o.created_by_admin_id, "
        "a.full_name AS created_by_admin_name, o.title, o.opportunity_type, o.description, o.location, "
        "o.stipend, o.salary, o.minimum_cgpa, "
        "DATE_FORMAT(o.open_date, '%Y-%m-%dT%H:%i:%s') AS open_date, "
        "DATE_FORMAT(o.deadline, '%Y-%m-%dT%H:%i:%s') AS deadline, o.status, o.created_at "
        "FROM OPPORTUNITY o JOIN COMPANY c ON c.company_id=o.company_id "
        "JOIN ADMIN a ON a.admin_id=o.created_by_admin_id "
        "ORDER BY o.created_at DESC, o.opportunity_id DESC"
    ))


@api.get("/admin/applications")
def admin_applications():
    clauses, values = [], []
    if request.args.get("status"):
        clauses.append("application_status=%s")
        values.append(enum_value(request.args["status"], "status", APPLICATION_STATUSES))
    if request.args.get("company_id"):
        clauses.append("company_id=%s")
        values.append(positive_id(request.args["company_id"], "company_id"))
    sql = "SELECT * FROM student_application_tracking"
    if clauses:
        sql += " WHERE " + " AND ".join(clauses)
    sql += " ORDER BY applied_at DESC, application_id DESC"
    return success(fetch_all(sql, tuple(values)))


@api.post("/admin/opportunities")
def create_opportunity():
    body = json_body()
    allowed = {"company_id", "created_by_admin_id", "title", "opportunity_type", "description", "location", "stipend", "salary", "minimum_cgpa", "open_date", "deadline", "status"}
    if set(body) - allowed:
        raise ValidationError("Request contains unsupported opportunity fields.")
    company_id = positive_id(body.get("company_id"), "company_id")
    admin_id = positive_id(body.get("created_by_admin_id"), "created_by_admin_id")
    title = required_text(body, "title", 150)
    opportunity_type = enum_value(body.get("opportunity_type"), "opportunity_type", OPPORTUNITY_TYPES)
    status = enum_value(body.get("status", "Draft"), "status", OPPORTUNITY_STATUSES)
    open_date = date_value(body.get("open_date"), "open_date", with_time=True)
    deadline = date_value(body.get("deadline"), "deadline", with_time=True)
    if open_date > deadline:
        raise ValidationError("open_date must be before or equal to deadline.")
    stipend = decimal_value(body.get("stipend"), "stipend", minimum=Decimal("0"), optional=True)
    salary = decimal_value(body.get("salary"), "salary", minimum=Decimal("0"), optional=True)
    cgpa = decimal_value(body.get("minimum_cgpa"), "minimum_cgpa", minimum=Decimal("0"), maximum=Decimal("10"), optional=True)
    if (opportunity_type == "Internship" and salary is not None) or (opportunity_type == "Placement" and stipend is not None):
        raise ValidationError("Compensation must match the opportunity type (internship: stipend; placement: salary).")
    result = execute(
        "INSERT INTO OPPORTUNITY (company_id, created_by_admin_id, title, opportunity_type, description, location, stipend, salary, minimum_cgpa, open_date, deadline, status) "
        "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
        (company_id, admin_id, title, opportunity_type, optional_text(body, "description", 65535),
         optional_text(body, "location", 120), stipend, salary, cgpa, open_date, deadline, status),
    )
    row = fetch_one("SELECT * FROM OPPORTUNITY WHERE opportunity_id=%s", (result["lastrowid"],))
    return success(row, 201)


@api.put("/admin/opportunities/<int:opportunity_id>")
def update_opportunity(opportunity_id):
    opportunity_id = positive_id(opportunity_id, "opportunity_id")
    current = fetch_one("SELECT * FROM OPPORTUNITY WHERE opportunity_id=%s", (opportunity_id,))
    if current is None:
        return missing("Opportunity")
    body = json_body()
    allowed = {"company_id", "created_by_admin_id", "title", "opportunity_type", "description", "location", "stipend", "salary", "minimum_cgpa", "open_date", "deadline", "status"}
    if not body or set(body) - allowed:
        raise ValidationError("Provide one or more supported opportunity fields only.")
    values, assignments = [], []
    for key, value in body.items():
        if key in ("company_id", "created_by_admin_id"):
            value = positive_id(value, key)
        elif key == "title":
            value = required_text({key: value}, key, 150)
        elif key == "opportunity_type":
            value = enum_value(value, key, OPPORTUNITY_TYPES)
        elif key == "status":
            value = enum_value(value, key, OPPORTUNITY_STATUSES)
        elif key == "description":
            value = optional_text({key: value}, key, 65535)
        elif key == "location":
            value = optional_text({key: value}, key, 120)
        elif key in ("stipend", "salary"):
            value = decimal_value(value, key, minimum=Decimal("0"), optional=True)
        elif key == "minimum_cgpa":
            value = decimal_value(value, key, minimum=Decimal("0"), maximum=Decimal("10"), optional=True)
        elif key in ("open_date", "deadline"):
            value = date_value(value, key, with_time=True)
        assignments.append(f"{key}=%s")
        values.append(value)
    future = {**current, **body}
    for key in ("open_date", "deadline"):
        if key in future and isinstance(future[key], str):
            future[key] = date_value(future[key], key, with_time=True)
    if future["open_date"] > future["deadline"]:
        raise ValidationError("open_date must be before or equal to deadline.")
    if (future["opportunity_type"] == "Internship" and future["salary"] is not None) or (future["opportunity_type"] == "Placement" and future["stipend"] is not None):
        raise ValidationError("Compensation must match the opportunity type (internship: stipend; placement: salary).")
    values.append(opportunity_id)
    execute(f"UPDATE OPPORTUNITY SET {', '.join(assignments)} WHERE opportunity_id=%s", tuple(values))
    return success(fetch_one("SELECT * FROM OPPORTUNITY WHERE opportunity_id=%s", (opportunity_id,)))


@api.patch("/admin/applications/<int:application_id>")
def admin_update_application(application_id):
    application_id = positive_id(application_id, "application_id")
    body = json_body()
    if set(body) - {"status", "remarks"} or not body:
        raise ValidationError("Provide status and/or remarks only.")
    assignments, values = [], []
    if "status" in body:
        assignments.append("status=%s")
        values.append(enum_value(body["status"], "status", APPLICATION_STATUSES))
    if "remarks" in body:
        assignments.append("remarks=%s")
        values.append(optional_text(body, "remarks", 500))
    values.append(application_id)
    result = execute(f"UPDATE APPLICATION SET {', '.join(assignments)} WHERE application_id=%s", tuple(values))
    if not result["rowcount"] and fetch_one("SELECT application_id FROM APPLICATION WHERE application_id=%s", (application_id,)) is None:
        return missing("Application")
    row = fetch_one("SELECT * FROM APPLICATION WHERE application_id=%s", (application_id,))
    return success(row)


@api.post("/admin/applications/<int:application_id>/interviews")
def schedule_interview(application_id):
    application_id = positive_id(application_id, "application_id")
    body = json_body()
    round_number = positive_id(body.get("round_number"), "round_number")
    if round_number > 65535:
        raise ValidationError("round_number is too large.")
    scheduled_at = date_value(body.get("scheduled_at"), "scheduled_at", with_time=True)
    mode = enum_value(body.get("mode"), "mode", INTERVIEW_MODES)
    result = execute("INSERT INTO INTERVIEW (application_id, round_number, scheduled_at, mode) VALUES (%s,%s,%s,%s)",
                     (application_id, round_number, scheduled_at, mode))
    return success(fetch_one(
        "SELECT interview_id, application_id, round_number, "
        "DATE_FORMAT(scheduled_at, '%Y-%m-%dT%H:%i:%S') AS scheduled_at, mode, result, feedback "
        "FROM INTERVIEW WHERE interview_id=%s", (result["lastrowid"],)), 201)


@api.patch("/admin/interviews/<int:interview_id>")
def update_interview(interview_id):
    interview_id = positive_id(interview_id, "interview_id")
    body = json_body()
    allowed = {"scheduled_at", "mode", "result", "feedback"}
    if not body or set(body) - allowed:
        raise ValidationError("Provide one or more supported interview fields only.")
    assignments, values = [], []
    for key, value in body.items():
        if key == "scheduled_at":
            value = date_value(value, key, with_time=True)
        elif key == "mode":
            value = enum_value(value, key, INTERVIEW_MODES)
        elif key == "result":
            value = None if value is None else enum_value(value, key, INTERVIEW_RESULTS)
        elif key == "feedback":
            value = optional_text({key: value}, key, 500)
        assignments.append(f"{key}=%s")
        values.append(value)
    values.append(interview_id)
    result = execute(f"UPDATE INTERVIEW SET {', '.join(assignments)} WHERE interview_id=%s", tuple(values))
    if not result["rowcount"] and fetch_one("SELECT interview_id FROM INTERVIEW WHERE interview_id=%s", (interview_id,)) is None:
        return missing("Interview")
    return success(fetch_one(
        "SELECT interview_id, application_id, round_number, "
        "DATE_FORMAT(scheduled_at, '%Y-%m-%dT%H:%i:%S') AS scheduled_at, mode, result, feedback "
        "FROM INTERVIEW WHERE interview_id=%s", (interview_id,)))


# Reporting -----------------------------------------------------------------
@api.get("/reports/placement-statistics")
def placement_statistics():
    return success(fetch_all("SELECT * FROM placement_statistics ORDER BY company_name, opportunity_type"))


@api.get("/reports/application-statistics")
def application_statistics():
    return success(fetch_all(
        "SELECT status, COUNT(*) AS application_count FROM APPLICATION GROUP BY status ORDER BY status"))


@api.get("/reports/applications-by-company")
def applications_by_company():
    return success(fetch_all(
        "SELECT c.company_id, c.company_name, COUNT(a.application_id) AS application_count "
        "FROM COMPANY c LEFT JOIN OPPORTUNITY o ON o.company_id=c.company_id "
        "LEFT JOIN APPLICATION a ON a.opportunity_id=o.opportunity_id "
        "GROUP BY c.company_id,c.company_name ORDER BY application_count DESC,c.company_name"))


@api.get("/reports/placements-by-department")
def placements_by_department():
    return success(fetch_all(
        "SELECT s.department, COUNT(p.placement_id) AS offer_count, "
        "SUM(p.placement_status='Joined') AS joined_count "
        "FROM STUDENT s LEFT JOIN APPLICATION a ON a.student_id=s.student_id "
        "LEFT JOIN PLACEMENT p ON p.application_id=a.application_id "
        "GROUP BY s.department ORDER BY s.department"))


@api.get("/reports/average-compensation")
def average_compensation():
    return success(fetch_all(
        "SELECT c.company_id,c.company_name,o.opportunity_type,COUNT(p.offered_compensation) AS disclosed_offers, "
        "AVG(p.offered_compensation) AS average_compensation "
        "FROM COMPANY c JOIN OPPORTUNITY o ON o.company_id=c.company_id "
        "JOIN APPLICATION a ON a.opportunity_id=o.opportunity_id JOIN PLACEMENT p ON p.application_id=a.application_id "
        "GROUP BY c.company_id,c.company_name,o.opportunity_type ORDER BY c.company_name,o.opportunity_type"))


@api.get("/reports/opportunity-application-counts")
def opportunity_application_counts():
    return success(fetch_all(
        "SELECT o.opportunity_id,o.title,o.opportunity_type,c.company_name,COUNT(a.application_id) AS application_count "
        "FROM OPPORTUNITY o JOIN COMPANY c ON c.company_id=o.company_id "
        "LEFT JOIN APPLICATION a ON a.opportunity_id=o.opportunity_id "
        "GROUP BY o.opportunity_id,o.title,o.opportunity_type,c.company_name ORDER BY application_count DESC,o.opportunity_id"))


@api.get("/reports/overview")
def report_overview():
    return success(fetch_one(
        "SELECT (SELECT COUNT(*) FROM OPPORTUNITY) AS opportunity_count, "
        "(SELECT COUNT(*) FROM APPLICATION) AS application_count, "
        "(SELECT COUNT(*) FROM PLACEMENT) AS offer_count, "
        "(SELECT COUNT(*) FROM PLACEMENT WHERE placement_status='Joined') AS joined_count"))
