import hashlib
import json
import os
from datetime import timedelta

import cbor2
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import ec
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient
from webauthn.helpers import base64url_to_bytes, bytes_to_base64url

from .models import DeviceChallenge, DeviceCredential


@override_settings(WEBAUTHN_ALLOWED_ORIGINS=["http://localhost:3026"])
class DeviceSecurityTests(TestCase):
    def setUp(self):
        cache.clear()
        self.user = get_user_model().objects.create_user(
            username="faceid", password="test-password"
        )
        self.token = Token.objects.create(user=self.user)
        self.client = APIClient()
        self.client.force_authenticate(self.user, token=self.token)
        self.private = ec.generate_private_key(ec.SECP256R1())
        self.credential_id = os.urandom(24)
        self.origin = "http://localhost:3026"

    def post(self, action, **body):
        return self.client.post(f"/api/device-security/{action}/", body, format="json")

    def begin(self, purpose, **kwargs):
        result = self.post(f"{purpose}-options", origin=self.origin, **kwargs)
        self.assertEqual(result.status_code, 200, result.data)
        return result.data

    def client_data(self, options, kind, origin=None):
        return json.dumps(
            {
                "type": f"webauthn.{kind}",
                "challenge": options["options"]["challenge"],
                "origin": origin or self.origin,
                "crossOrigin": False,
            }
        ).encode()

    def register(self, *, uv=True, origin=None):
        options = self.begin("register")
        numbers = self.private.public_key().public_numbers()
        public_key = cbor2.dumps(
            {
                1: 2,
                3: -7,
                -1: 1,
                -2: numbers.x.to_bytes(32, "big"),
                -3: numbers.y.to_bytes(32, "big"),
            }
        )
        data = (
            hashlib.sha256(b"localhost").digest()
            + bytes([0x45 if uv else 0x41])
            + (1).to_bytes(4, "big")
            + bytes(16)
            + len(self.credential_id).to_bytes(2, "big")
            + self.credential_id
            + public_key
        )
        response = {
            "id": bytes_to_base64url(self.credential_id),
            "rawId": bytes_to_base64url(self.credential_id),
            "type": "public-key",
            "clientExtensionResults": {},
            "response": {
                "clientDataJSON": bytes_to_base64url(self.client_data(options, "create", origin)),
                "attestationObject": bytes_to_base64url(
                    cbor2.dumps(
                        {
                            "fmt": "none",
                            "attStmt": {},
                            "authData": data,
                        }
                    )
                ),
            },
        }
        result = self.post(
            "register-verify", challenge_id=options["challenge_id"], response=response
        )
        return result, options, response

    def assertion(self, options, *, uv=True, origin=None, counter=2):
        client_data = self.client_data(options, "get", origin)
        auth_data = (
            hashlib.sha256(b"localhost").digest()
            + bytes([5 if uv else 1])
            + counter.to_bytes(4, "big")
        )
        signature = self.private.sign(
            auth_data + hashlib.sha256(client_data).digest(), ec.ECDSA(hashes.SHA256())
        )
        return {
            "id": bytes_to_base64url(self.credential_id),
            "rawId": bytes_to_base64url(self.credential_id),
            "type": "public-key",
            "clientExtensionResults": {},
            "response": {
                "clientDataJSON": bytes_to_base64url(client_data),
                "authenticatorData": bytes_to_base64url(auth_data),
                "signature": bytes_to_base64url(signature),
                "userHandle": None,
            },
        }

    def test_real_registration_unlock_and_replay_rejection(self):
        result, _, _ = self.register()
        self.assertEqual(result.status_code, 200, result.data)
        credential = DeviceCredential.objects.get()
        self.assertEqual(base64url_to_bytes(credential.credential_id), self.credential_id)
        options = self.begin("unlock", credential_id=credential.credential_id)
        body = {"challenge_id": options["challenge_id"], "response": self.assertion(options)}
        result = self.post("unlock-verify", **body)
        self.assertEqual(result.status_code, 200, result.data)
        credential.refresh_from_db()
        self.assertEqual(credential.sign_count, 2)
        self.assertEqual(self.post("unlock-verify", **body).status_code, 400)

    def test_missing_verification_or_wrong_origin_cannot_register(self):
        result, _, _ = self.register(uv=False)
        self.assertEqual(result.status_code, 400)
        result, _, _ = self.register(origin="https://attacker.test")
        self.assertEqual(result.status_code, 400)
        self.assertFalse(DeviceCredential.objects.exists())
        self.assertEqual(
            self.post("register-options", origin="https://attacker.test").status_code, 400
        )

    def test_assertions_require_valid_signature_user_verification_and_origin(self):
        self.register()
        credential = DeviceCredential.objects.get()
        for kwargs in [{"uv": False}, {"origin": "https://attacker.test"}, {}]:
            options = self.begin("unlock", credential_id=credential.credential_id)
            response = self.assertion(options, **kwargs)
            if not kwargs:
                response["response"]["signature"] = bytes_to_base64url(b"invalid")
            result = self.post(
                "unlock-verify", challenge_id=options["challenge_id"], response=response
            )
            self.assertEqual(result.status_code, 400)
        credential.refresh_from_db()
        self.assertEqual(credential.sign_count, 1)

    def test_challenge_is_bound_to_account_session_purpose_and_expiration(self):
        _, options, response = self.register()
        # Reusing a consumed registration is forbidden even for the same account.
        self.assertEqual(
            self.post(
                "register-verify", challenge_id=options["challenge_id"], response=response
            ).status_code,
            400,
        )
        options = self.begin("unlock", credential_id=DeviceCredential.objects.get().credential_id)
        response = self.assertion(options)
        body = {"challenge_id": options["challenge_id"], "response": response}
        self.assertEqual(self.post("disable-verify", **body).status_code, 400)
        self.client.force_authenticate(self.user, token="another-session")
        self.assertEqual(self.post("unlock-verify", **body).status_code, 400)
        other = get_user_model().objects.create_user(username="other-faceid")
        self.client.force_authenticate(other, token="another-session")
        self.assertEqual(self.post("unlock-verify", **body).status_code, 400)
        self.client.force_authenticate(self.user, token=self.token)
        DeviceChallenge.objects.filter(pk=options["challenge_id"]).update(
            expires_at=timezone.now() - timedelta(seconds=1)
        )
        self.assertEqual(self.post("unlock-verify", **body).status_code, 400)

    def test_disable_requires_verification_and_password_fallback_is_available(self):
        self.register()
        credential = DeviceCredential.objects.get()
        self.assertEqual(
            self.post(
                "password-unlock",
                password="wrong",
                disable=True,
                credential_id=credential.credential_id,
            ).status_code,
            400,
        )
        self.assertTrue(DeviceCredential.objects.exists())
        self.assertEqual(self.post("password-unlock", password="test-password").status_code, 200)
        self.assertTrue(DeviceCredential.objects.exists())
        result = self.post(
            "password-unlock",
            password="test-password",
            disable=True,
            credential_id=credential.credential_id,
        )
        self.assertEqual(result.data["enabled"], False)
        self.assertFalse(DeviceCredential.objects.exists())

    def test_biometric_disable_and_password_rate_limit(self):
        self.register()
        options = self.begin("disable", credential_id=DeviceCredential.objects.get().credential_id)
        result = self.post(
            "disable-verify", challenge_id=options["challenge_id"], response=self.assertion(options)
        )
        self.assertEqual(result.status_code, 200, result.data)
        self.assertFalse(DeviceCredential.objects.exists())
        for _ in range(5):
            self.assertEqual(self.post("password-unlock", password="wrong").status_code, 400)
        self.assertEqual(self.post("password-unlock", password="wrong").status_code, 429)
