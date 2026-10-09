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
    cover = models.ForeignKey(
        "Asset", null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
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
    generation = models.PositiveIntegerField(default=1)
    sha256 = models.CharField(max_length=64)
    compiler_version = models.CharField(max_length=40)
    created_at = models.DateTimeField(auto_now=True)


def import_original_path(instance, filename):
    return f"projects/{instance.family_id}/originals/{instance.pk}.epub"


def import_clean_path(instance, filename):
    return (
        f"projects/{instance.family_id}/ebooks/imports/"
        f"{instance.pk}-v{instance.clean_generation}-{uuid.uuid4()}.epub"
    )


class ImportJob(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    family = models.ForeignKey(ProjectFamily, related_name="imports", on_delete=models.CASCADE)
    original_file = models.FileField(upload_to=import_original_path)
    original_name = models.CharField(max_length=255)
    sha256 = models.CharField(max_length=64)
    inspection = models.JSONField(default=dict)
    clean_file = models.FileField(upload_to=import_clean_path, blank=True)
    clean_filename = models.CharField(max_length=255, blank=True)
    clean_sha256 = models.CharField(max_length=64, blank=True)
    clean_generation = models.PositiveIntegerField(default=0)
    clean_report = models.JSONField(default=dict)
    status = models.CharField(max_length=20, default="ready")
    error = models.TextField(blank=True)
    error_diagnostic = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at", "id"]
        constraints = [
            models.UniqueConstraint(fields=["family", "sha256"], name="unique_import_source"),
        ]


class ImportExtraction(models.Model):
    job = models.ForeignKey(ImportJob, related_name="extractions", on_delete=models.CASCADE)
    project = models.ForeignKey(Project, related_name="imports_extracted", on_delete=models.CASCADE)
    source_sha256 = models.CharField(max_length=64)
    source_kind = models.CharField(max_length=10, default="cleaned")
    mode = models.CharField(max_length=10)
    text_ids = models.JSONField(default=list)
    sections = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["job", "project", "source_kind", "source_sha256"],
                name="unique_project_extraction",
            ),
        ]


class MarkdownImport(models.Model):
    project = models.ForeignKey(Project, related_name="markdown_imports", on_delete=models.CASCADE)
    fingerprint = models.CharField(max_length=64)
    mode = models.CharField(max_length=10)
    files = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["project", "fingerprint"], name="unique_markdown_import"
            ),
        ]
