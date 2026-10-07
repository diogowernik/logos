import uuid

from django.conf import settings
from django.db import models
from django.db.models import Q


class Collection(models.Model):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    title = models.CharField(max_length=250)
    description = models.TextField(blank=True)
    position = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["position", "id"]


class ProjectFamily(models.Model):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    collection = models.ForeignKey(Collection, null=True, blank=True, on_delete=models.SET_NULL)
    position = models.PositiveIntegerField(default=0)
    is_inbox = models.BooleanField(default=False)
    principal = models.OneToOneField(
        "Project", null=True, blank=True, on_delete=models.SET_NULL, related_name="principal_of"
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["owner"], condition=Q(is_inbox=True), name="one_inbox_per_user"
            )
        ]


class Project(models.Model):
    family = models.ForeignKey(ProjectFamily, related_name="versions", on_delete=models.CASCADE)
    title = models.CharField(max_length=250, default="Sem título")
    subtitle = models.CharField(max_length=500, blank=True)
    author = models.CharField(max_length=250, blank=True)
    cover = models.ForeignKey("Asset", null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class Text(models.Model):
    project = models.ForeignKey(Project, related_name="texts", on_delete=models.CASCADE)
    parent = models.ForeignKey(
        "self", null=True, blank=True, related_name="variations", on_delete=models.CASCADE
    )
    title = models.CharField(max_length=250, blank=True)
    markdown = models.TextField(blank=True)
    position = models.PositiveIntegerField(default=0)
    last_used_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["position", "id"]


def asset_upload_path(instance, filename):
    extension = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}[instance.mime_type]
    return f"projects/{instance.family_id}/images/{instance.id}.{extension}"


class Asset(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    family = models.ForeignKey(ProjectFamily, related_name="assets", on_delete=models.CASCADE)
    file = models.FileField(upload_to=asset_upload_path)
    original_name = models.CharField(max_length=255)
    mime_type = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "id"]


def export_upload_path(instance, filename):
    return f"projects/{instance.project.family_id}/ebooks/{instance.project_id}-{uuid.uuid4()}.epub"


class ExportArtifact(models.Model):
    project = models.OneToOneField(Project, related_name="epub_artifact", on_delete=models.CASCADE)
    file = models.FileField(upload_to=export_upload_path)
    filename = models.CharField(max_length=255)
    sha256 = models.CharField(max_length=64)
    compiler_version = models.CharField(max_length=40)
    created_at = models.DateTimeField(auto_now=True)
