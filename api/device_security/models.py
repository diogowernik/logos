import uuid

from django.conf import settings
from django.db import models


class DeviceCredential(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    credential_id = models.CharField(max_length=1400, unique=True)
    public_key = models.BinaryField()
    sign_count = models.PositiveBigIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)


class DeviceChallenge(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    credential = models.ForeignKey(DeviceCredential, null=True, on_delete=models.CASCADE)
    session_digest = models.CharField(max_length=64)
    purpose = models.CharField(max_length=20)
    challenge = models.BinaryField()
    origin = models.CharField(max_length=255)
    rp_id = models.CharField(max_length=255)
    expires_at = models.DateTimeField(db_index=True)
    used_at = models.DateTimeField(null=True)
