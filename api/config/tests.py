import os
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.exceptions import ImproperlyConfigured
from django.test import SimpleTestCase, TestCase
from rest_framework.authtoken.models import Token

from .environment import DEVELOPMENT_KEY, runtime_settings


class AuthenticationTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username="example", password="test-password"
        )

    def test_login_me_logout_and_revoked_token(self):
        login = self.client.post("/auth/token/login/", {
            "username": "example", "password": "test-password"
        }, content_type="application/json")
        self.assertEqual(login.status_code, 200)
        token = login.json()["auth_token"]
        authorization = {"HTTP_AUTHORIZATION": f"Token {token}"}
        me = self.client.get("/auth/users/me/", **authorization)
        self.assertEqual(me.json()["id"], self.user.id)
        logout = self.client.post("/auth/token/logout/", **authorization)
        self.assertEqual(logout.status_code, 204)
        self.assertFalse(Token.objects.filter(key=token).exists())
        self.assertEqual(self.client.get("/auth/users/me/", **authorization).status_code, 401)

    def test_anonymous_and_invalid_credentials_are_rejected(self):
        self.assertEqual(self.client.get("/auth/users/me/").status_code, 401)
        self.assertEqual(self.client.post("/auth/token/login/", {
            "username": "example", "password": "wrong"
        }).status_code, 400)

    def test_other_user_token_only_returns_its_own_identity(self):
        other = get_user_model().objects.create_user(username="other", password="test-password")
        token = Token.objects.create(user=other)
        me = self.client.get("/auth/users/me/", HTTP_AUTHORIZATION=f"Token {token.key}")
        self.assertEqual(me.json()["id"], other.id)

    def test_public_registration_is_disabled(self):
        self.assertEqual(self.client.post("/auth/users/", {
            "username": "new-user", "password": "test-password"
        }).status_code, 401)


class HealthTests(TestCase):
    def test_public_response_does_not_reveal_configuration(self):
        response = self.client.get("/api/health/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok", "service": "logos-api"})

    @patch("config.views.connection.ensure_connection", side_effect=RuntimeError("private detail"))
    def test_database_failure_returns_generic_unavailable(self, _connection):
        response = self.client.get("/api/health/")
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json(), {"status": "unavailable"})


class EnvironmentTests(SimpleTestCase):
    def test_explicit_development_defaults(self):
        with patch.dict(os.environ, {"DJANGO_ENV": "development"}, clear=True):
            debug, key, hosts = runtime_settings()
        self.assertTrue(debug)
        self.assertEqual(key, DEVELOPMENT_KEY)
        self.assertIn("localhost", hosts)

    def test_missing_environment_fails_closed(self):
        with patch.dict(os.environ, {}, clear=True), self.assertRaises(ImproperlyConfigured):
            runtime_settings()

    def test_valid_production_configuration(self):
        environment = {
            "DJANGO_ENV": "production",
            "DJANGO_SECRET_KEY": "a-strong-example-key-for-testing-only-" * 2,
            "DJANGO_ALLOWED_HOSTS": "app.example.com",
        }
        with patch.dict(os.environ, environment, clear=True):
            debug, _, hosts = runtime_settings()
        self.assertFalse(debug)
        self.assertEqual(hosts, ["app.example.com"])

    def test_production_rejects_debug_weak_key_and_wildcard_host(self):
        base = {
            "DJANGO_ENV": "production",
            "DJANGO_SECRET_KEY": "a-strong-example-key-for-testing-only-" * 2,
            "DJANGO_ALLOWED_HOSTS": "app.example.com",
        }
        for invalid in [
            {"DJANGO_DEBUG": "true"},
            {"DJANGO_SECRET_KEY": DEVELOPMENT_KEY},
            {"DJANGO_SECRET_KEY": "x" * 60},
            {"DJANGO_ALLOWED_HOSTS": "*"},
            {"DJANGO_ALLOWED_HOSTS": ""},
        ]:
            with self.subTest(invalid=invalid), patch.dict(os.environ, base | invalid, clear=True):
                with self.assertRaises(ImproperlyConfigured):
                    runtime_settings()
