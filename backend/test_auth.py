"""Authentication and authorization regression tests using mocked MySQL rows."""

import unittest
from datetime import timedelta
from unittest.mock import patch

import mysql.connector
from backend.app import create_app
from backend.auth import bcrypt


class AuthenticationTests(unittest.TestCase):
    SECRET = "unit-test-only-secret-key-at-least-32-bytes"
    PASSWORD = "a-long-test-password-123"

    def make_app(self, **extra):
        config = {
            "TESTING": True,
            "SECRET_KEY": self.SECRET,
            "SESSION_COOKIE_SECURE": False,
            "PERMANENT_SESSION_LIFETIME": timedelta(hours=8),
        }
        config.update(extra)
        return create_app(config)

    def setUp(self):
        self.app = self.make_app()
        self.client = self.app.test_client()
        self.csrf = self.client.get("/api/auth/session").get_json()["data"]["csrf_token"]

    def csrf_headers(self):
        return {"X-CSRF-Token": self.csrf}

    def password_hash(self):
        with self.app.app_context():
            return bcrypt.generate_password_hash(self.PASSWORD).decode("utf-8")

    def student_row(self, user_id=11):
        return {"user_id": user_id, "display_name": f"Student {user_id}", "password_hash": self.password_hash()}

    def admin_row(self, user_id=7):
        return {"user_id": user_id, "display_name": "Placement Admin", "password_hash": self.password_hash()}

    def login_student(self, user_id=11):
        with patch("backend.auth.fetch_one", return_value=self.student_row(user_id)):
            response = self.client.post("/api/auth/student/login", json={
                "identifier": "student@example.test", "password": self.PASSWORD,
            }, headers=self.csrf_headers())
        self.assertEqual(response.status_code, 200)
        self.csrf = response.get_json()["data"]["csrf_token"]
        return response

    def login_admin(self):
        with patch("backend.auth.fetch_one", return_value=self.admin_row()):
            response = self.client.post("/api/auth/admin/login", json={
                "identifier": "admin@example.test", "password": self.PASSWORD,
            }, headers=self.csrf_headers())
        self.assertEqual(response.status_code, 200)
        self.csrf = response.get_json()["data"]["csrf_token"]
        return response

    def test_successful_student_login_sets_signed_cookie_and_session(self):
        response = self.login_student()
        data = response.get_json()["data"]
        self.assertEqual((data["role"], data["user_id"]), ("student", 11))
        self.assertNotIn("password_hash", data)
        cookie = response.headers["Set-Cookie"]
        self.assertIn("HttpOnly", cookie)
        self.assertIn("SameSite=Lax", cookie)
        self.assertTrue(self.client.get("/api/auth/session").get_json()["data"]["authenticated"])

    def test_invalid_password_does_not_create_authenticated_session(self):
        with patch("backend.auth.fetch_one", return_value=self.student_row()):
            response = self.client.post("/api/auth/student/login", json={
                "identifier": "student@example.test", "password": "incorrect-password",
            }, headers=self.csrf_headers())
        self.assertEqual(response.status_code, 401)

    def test_student_login_query_excludes_unapproved_accounts(self):
        with patch("backend.auth.fetch_one", return_value=None) as lookup:
            response = self.client.post("/api/auth/student/login", json={
                "identifier": "student@example.test", "password": self.PASSWORD,
            }, headers=self.csrf_headers())
        self.assertEqual(response.status_code, 401)
        self.assertIn("s.is_active=TRUE", lookup.call_args.args[0])
        self.assertEqual(response.get_json()["error"]["code"], "invalid_credentials")
        self.assertFalse(self.client.get("/api/auth/session").get_json()["data"]["authenticated"])

    def test_failed_login_clears_previous_authenticated_session(self):
        self.login_admin()
        with patch("backend.auth.fetch_one", return_value=None):
            response = self.client.post("/api/auth/student/login", json={
                "identifier": "missing@example.test", "password": self.PASSWORD,
            }, headers=self.csrf_headers())
        self.assertEqual(response.status_code, 401)
        self.assertFalse(self.client.get("/api/auth/session").get_json()["data"]["authenticated"])

    def test_login_requires_csrf_token(self):
        response = self.client.post("/api/auth/student/login", json={"identifier": "x", "password": "x"})
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.get_json()["error"]["code"], "csrf_failed")

    def test_logout_clears_session_and_protected_access(self):
        self.login_student()
        response = self.client.post("/api/auth/logout", json={}, headers=self.csrf_headers())
        self.assertEqual(response.status_code, 200)
        self.assertFalse(self.client.get("/api/auth/session").get_json()["data"]["authenticated"])
        protected = self.client.get("/api/students/11")
        self.assertEqual(protected.status_code, 401)
        self.assertEqual(protected.get_json()["error"]["code"], "unauthenticated")

    def test_expired_signed_session_is_unauthenticated(self):
        app = self.make_app()
        client = app.test_client()
        csrf = client.get("/api/auth/session").get_json()["data"]["csrf_token"]
        with app.app_context():
            password_hash = bcrypt.generate_password_hash(self.PASSWORD).decode("utf-8")
        with patch("backend.auth.fetch_one", return_value={
            "user_id": 11, "display_name": "Student 11", "password_hash": password_hash,
        }):
            logged_in = client.post("/api/auth/student/login", json={
                "identifier": "student@example.test", "password": self.PASSWORD,
            }, headers={"X-CSRF-Token": csrf})
        self.assertEqual(logged_in.status_code, 200)
        app.config["PERMANENT_SESSION_LIFETIME"] = timedelta(seconds=-1)
        response = client.get("/api/students/11")
        self.assertEqual(response.status_code, 401)

    def test_student_cannot_access_another_students_record(self):
        self.login_student(user_id=11)
        response = self.client.get("/api/students/12")
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.get_json()["error"]["code"], "forbidden")

    def test_student_can_access_own_record(self):
        self.login_student(user_id=11)
        with patch("backend.routes.fetch_one", return_value={"student_id": 11, "full_name": "Student 11"}):
            response = self.client.get("/api/students/11")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["data"]["student_id"], 11)

    def test_student_cannot_use_admin_routes(self):
        self.login_student()
        response = self.client.get("/api/admin/companies")
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.get_json()["error"]["code"], "forbidden")

    def test_admin_can_use_admin_routes(self):
        response = self.login_admin()
        self.assertEqual(response.get_json()["data"]["role"], "admin")
        with patch("backend.routes.fetch_all", return_value=[{"company_id": 1, "company_name": "Example"}]):
            result = self.client.get("/api/admin/companies")
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.get_json()["data"][0]["company_id"], 1)
        with patch("backend.routes.fetch_all", return_value=[]):
            interviews = self.client.get("/api/admin/applications/5/interviews")
        self.assertEqual(interviews.status_code, 200)

    def test_opportunity_creator_is_taken_from_authenticated_admin_session(self):
        self.login_admin()
        saved = {"opportunity_id": 22, "created_by_admin_id": 7}
        payload = {
            "company_id": 3, "title": "Backend Intern", "opportunity_type": "Internship",
            "open_date": "2030-01-01T09:00:00", "deadline": "2030-02-01T17:00:00",
            "status": "Draft", "stipend": 1000,
        }
        with patch("backend.routes.execute", return_value={"lastrowid": 22}) as execute, \
             patch("backend.routes.fetch_one", return_value=saved):
            response = self.client.post("/api/admin/opportunities", json=payload,
                                        headers=self.csrf_headers())
        self.assertEqual(response.status_code, 201)
        self.assertEqual(execute.call_args.args[1][1], 7)

    def test_admin_cannot_use_student_profile_routes(self):
        self.login_admin()
        response = self.client.get("/api/students/11")
        self.assertEqual(response.status_code, 403)

    def test_application_transition_under_review_to_shortlisted_is_allowed(self):
        self.login_admin()
        with patch("backend.routes.fetch_one", side_effect=[{"status": "Under Review"}, {"application_id": 31, "status": "Shortlisted"}]), \
             patch("backend.routes.execute", return_value={"rowcount": 1}) as execute:
            response = self.client.patch("/api/admin/applications/31", json={"status": "Shortlisted"}, headers=self.csrf_headers())
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["data"]["status"], "Shortlisted")
        self.assertIn("status=%s", execute.call_args.args[0])

    def test_terminal_application_cannot_be_reopened(self):
        self.login_admin()
        with patch("backend.routes.fetch_one", return_value={"status": "Selected"}), \
             patch("backend.routes.execute") as execute:
            response = self.client.patch("/api/admin/applications/31", json={"status": "Applied"}, headers=self.csrf_headers())
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.get_json()["error"]["code"], "invalid_state_transition")
        execute.assert_not_called()

    def test_student_can_withdraw_nonterminal_application(self):
        self.login_student()
        with patch("backend.routes.fetch_one", return_value={"status": "Under Review"}), \
             patch("backend.routes.execute", return_value={"rowcount": 1}) as execute:
            response = self.client.patch("/api/students/11/applications/31", json={}, headers=self.csrf_headers())
        self.assertEqual(response.status_code, 200)
        self.assertIn("AND status=%s", execute.call_args.args[0])

    def test_student_cannot_withdraw_selected_application(self):
        self.login_student()
        with patch("backend.routes.fetch_one", return_value={"status": "Selected"}), \
             patch("backend.routes.execute") as execute:
            response = self.client.patch("/api/students/11/applications/31", json={}, headers=self.csrf_headers())
        self.assertEqual(response.status_code, 409)
        execute.assert_not_called()

    def test_pending_offer_can_be_accepted(self):
        self.login_student()
        with patch("backend.routes.fetch_one", return_value={"placement_status": "Offer Pending"}), \
             patch("backend.routes.execute", return_value={"rowcount": 1}) as execute:
            response = self.client.patch("/api/students/11/placements/9", json={"placement_status": "Accepted"}, headers=self.csrf_headers())
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["data"]["placement_status"], "Accepted")
        self.assertIn("p.placement_status=%s", execute.call_args.args[0])

    def test_pending_offer_cannot_skip_to_joined(self):
        self.login_student()
        with patch("backend.routes.fetch_one", return_value={"placement_status": "Offer Pending"}), \
             patch("backend.routes.execute") as execute:
            response = self.client.patch("/api/students/11/placements/9", json={"placement_status": "Joined"}, headers=self.csrf_headers())
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.get_json()["error"]["code"], "invalid_state_transition")
        execute.assert_not_called()

    def test_company_create_and_update_use_validated_parameterized_values(self):
        self.login_admin()
        company = {"company_id": 5, "company_name": "Example Ltd", "website": "https://example.test",
                   "industry": "Technology", "location": "Pune", "contact_email": "jobs@example.test"}
        with patch("backend.routes.execute", return_value={"lastrowid": 5}) as execute, \
             patch("backend.routes.fetch_one", return_value=company):
            created = self.client.post("/api/admin/companies", json={key: value for key, value in company.items() if key != "company_id"}, headers=self.csrf_headers())
        self.assertEqual(created.status_code, 201)
        self.assertIn("%s", execute.call_args.args[0])
        self.assertIn("Example Ltd", execute.call_args.args[1])
        with patch("backend.routes.execute", return_value={"rowcount": 1}) as execute, \
             patch("backend.routes.fetch_one", return_value=company):
            updated = self.client.put("/api/admin/companies/5", json={"location": "Mumbai"}, headers=self.csrf_headers())
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(execute.call_args.args[1], ("Mumbai", 5))

    def test_company_rejects_non_http_website(self):
        self.login_admin()
        with patch("backend.routes.execute") as execute:
            response = self.client.post("/api/admin/companies", json={"company_name": "Example", "website": "javascript:alert(1)"}, headers=self.csrf_headers())
        self.assertEqual(response.status_code, 400)
        execute.assert_not_called()

    def test_student_registration_creates_student_and_password_hash_atomically(self):
        self.assertNotIn("role", self.client.get("/api/auth/session").get_json()["data"])
        class Cursor:
            lastrowid = 42
            def __init__(self): self.calls = []
            def execute(self, sql, params): self.calls.append((sql, params))
            def close(self): pass
        class Connection:
            def __init__(self): self.cursor_instance = Cursor(); self.committed = False; self.rolled_back = False
            def cursor(self): return self.cursor_instance
            def commit(self): self.committed = True
            def rollback(self): self.rolled_back = True
            def close(self): pass
        connection = Connection()
        payload = {"roll_no": "CG-100", "full_name": "New Student", "email": "new@example.test",
                   "department": "CSE", "graduation_year": 2027, "password": self.PASSWORD}
        with patch("backend.auth.connect_db", return_value=connection), patch("backend.auth.hash_password", return_value="bcrypt-hash"):
            response = self.client.post("/api/auth/register", json=payload, headers=self.csrf_headers())
        self.assertEqual(response.status_code, 202)
        self.assertTrue(connection.committed)
        self.assertFalse(connection.rolled_back)
        self.assertIn("STUDENT_CREDENTIALS", connection.cursor_instance.calls[1][0])
        self.assertEqual(connection.cursor_instance.calls[1][1], (42, "bcrypt-hash"))
        self.assertIn("is_active)", connection.cursor_instance.calls[0][0])
        self.assertIn("FALSE", connection.cursor_instance.calls[0][0])
        self.assertNotIn(self.PASSWORD, str(connection.cursor_instance.calls))
        self.assertTrue(response.get_json()["data"]["approval_required"])
        self.assertNotIn("role", self.client.get("/api/auth/session").get_json()["data"])

    def test_duplicate_student_registration_returns_conflict_and_rolls_back(self):
        self.assertEqual(self.client.get("/api/auth/session").status_code, 200)
        class Cursor:
            lastrowid = 42
            def execute(self, sql, params): raise mysql.connector.IntegrityError(msg="duplicate", errno=1062)
            def close(self): pass
        class Connection:
            committed = False
            rolled_back = False
            def cursor(self): return Cursor()
            def commit(self): self.committed = True
            def rollback(self): self.rolled_back = True
            def close(self): pass
        connection = Connection()
        payload = {"roll_no": "CG-100", "full_name": "New Student", "email": "new@example.test",
                   "department": "CSE", "graduation_year": 2027, "password": self.PASSWORD}
        with patch("backend.auth.connect_db", return_value=connection), patch("backend.auth.hash_password", return_value="bcrypt-hash"):
            response = self.client.post("/api/auth/register", json=payload, headers=self.csrf_headers())
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.get_json()["error"]["code"], "duplicate_student")
        self.assertTrue(connection.rolled_back)

    def test_admin_can_activate_student_registration(self):
        self.login_admin()
        with patch("backend.routes.execute", return_value={"rowcount": 1}) as execute:
            response = self.client.post("/api/admin/students/42/activate", json={}, headers=self.csrf_headers())
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["data"], {"student_id": 42, "is_active": True})
        self.assertIn("is_active=TRUE", execute.call_args.args[0])

    def test_student_cannot_activate_student_account(self):
        self.login_student()
        with patch("backend.routes.execute") as execute:
            response = self.client.post("/api/admin/students/42/activate", json={}, headers=self.csrf_headers())
        self.assertEqual(response.status_code, 403)
        execute.assert_not_called()

    def test_production_cookie_secure_setting_is_applied(self):
        app = self.make_app(SESSION_COOKIE_SECURE=True)
        self.assertTrue(app.config["SESSION_COOKIE_SECURE"])
        self.assertTrue(app.config["SESSION_COOKIE_HTTPONLY"])
        self.assertEqual(app.config["SESSION_COOKIE_SAMESITE"], "Lax")


if __name__ == "__main__":
    unittest.main()
