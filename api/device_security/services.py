"""Session-bound WebAuthn ceremonies for optional app screen unlocking."""

import hashlib
import json
from datetime import timedelta
from urllib.parse import urlparse
from uuid import UUID

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from webauthn import (
    generate_authentication_options,
    generate_registration_options,
    options_to_json,
    verify_authentication_response,
    verify_registration_response,
)
from webauthn.helpers import base64url_to_bytes, bytes_to_base64url
from webauthn.helpers.structs import (
    AuthenticatorAttachment,
    AuthenticatorSelectionCriteria,
    AuthenticatorTransport,
    PublicKeyCredentialDescriptor,
    ResidentKeyRequirement,
    UserVerificationRequirement,
)

from .models import DeviceChallenge, DeviceCredential


def session_digest(token):
    return hashlib.sha256(str(token).encode()).hexdigest()


def begin(*, user, token, purpose, origin, credential_id=None):
    if origin not in settings.WEBAUTHN_ALLOWED_ORIGINS:
        raise ValidationError("Origem não permitida para desbloqueio.")
    parsed = urlparse(origin)
    if not parsed.hostname or (parsed.scheme != "https" and parsed.hostname != "localhost"):
        raise ValidationError("O desbloqueio exige HTTPS ou localhost.")
    rp_id = parsed.hostname
    credential = None
    if purpose == "register":
        options = generate_registration_options(
            rp_id=rp_id,
            rp_name="books",
            user_name=user.get_username(),
            # A separate random user handle per enrollment avoids replacing
            # another browser's passkey for this same account.
            authenticator_selection=AuthenticatorSelectionCriteria(
                authenticator_attachment=AuthenticatorAttachment.PLATFORM,
                resident_key=ResidentKeyRequirement.PREFERRED,
                user_verification=UserVerificationRequirement.REQUIRED,
            ),
        )
    elif purpose in {"unlock", "disable"}:
        credential = DeviceCredential.objects.filter(user=user, credential_id=credential_id).first()
        if credential is None:
            raise ValidationError("Dispositivo não encontrado. Use sua senha.")
        options = generate_authentication_options(
            rp_id=rp_id,
            allow_credentials=[
                PublicKeyCredentialDescriptor(
                    id=base64url_to_bytes(credential.credential_id),
                    transports=[AuthenticatorTransport.INTERNAL],
                )
            ],
            user_verification=UserVerificationRequirement.REQUIRED,
        )
    else:
        raise ValidationError("Operação inválida.")
    now = timezone.now()
    DeviceChallenge.objects.filter(expires_at__lt=now).delete()
    row = DeviceChallenge.objects.create(
        user=user,
        credential=credential,
        session_digest=session_digest(token),
        purpose=purpose,
        challenge=options.challenge,
        origin=origin,
        rp_id=rp_id,
        expires_at=now + timedelta(minutes=2),
    )
    return {"challenge_id": str(row.pk), "options": json.loads(options_to_json(options))}


def finish(*, user, token, purpose, challenge_id, response):
    try:
        challenge_id = UUID(str(challenge_id))
    except ValueError as exc:
        raise ValidationError("Solicite um novo desbloqueio.") from exc
    now = timezone.now()
    rows = DeviceChallenge.objects.filter(
        pk=challenge_id,
        user=user,
        session_digest=session_digest(token),
        purpose=purpose,
        used_at__isnull=True,
        expires_at__gt=now,
    )
    row = rows.first()
    # Consume before verification: failed assertions also require a new challenge.
    if row is None or rows.update(used_at=now) != 1:
        raise ValidationError("Confirmação expirada. Tente novamente.")
    if not isinstance(response, dict) or len(json.dumps(response)) > 65000:
        raise ValidationError("Confirmação inválida.")
    try:
        if purpose == "register":
            verified = verify_registration_response(
                credential=response,
                expected_challenge=bytes(row.challenge),
                expected_rp_id=row.rp_id,
                expected_origin=row.origin,
                require_user_verification=True,
            )
            credential = DeviceCredential.objects.create(
                user=user,
                credential_id=bytes_to_base64url(verified.credential_id),
                public_key=verified.credential_public_key,
                sign_count=verified.sign_count,
            )
        else:
            with transaction.atomic():
                credential = DeviceCredential.objects.select_for_update().get(
                    pk=row.credential_id, user=user
                )
                verified = verify_authentication_response(
                    credential=response,
                    expected_challenge=bytes(row.challenge),
                    expected_rp_id=row.rp_id,
                    expected_origin=row.origin,
                    credential_public_key=bytes(credential.public_key),
                    credential_current_sign_count=credential.sign_count,
                    require_user_verification=True,
                )
                if verified.credential_id != base64url_to_bytes(credential.credential_id):
                    raise ValueError("Credencial incorreta.")
                credential.sign_count = verified.new_sign_count
                credential.save(update_fields=["sign_count"])
                if purpose == "disable":
                    credential.delete()
                    return {"enabled": False}
        return {"enabled": True, "credential_id": credential.credential_id}
    except Exception as exc:
        raise ValidationError(
            "Não foi possível confirmar. Tente novamente ou use sua senha."
        ) from exc
