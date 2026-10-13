import uuid

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import models, transaction
from django.db.models import Q
from django.utils.text import slugify


class SluggedResource(models.Model):
    slug = models.SlugField(max_length=250, editable=False)

    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        if self.slug:
            return super().save(*args, **kwargs)
        with transaction.atomic():
            # Serialize allocations for the same owner, including concurrent creates.
            get_user_model().objects.select_for_update().get(pk=self.owner_id)
            base = slugify(self.title)[:240] or "sem-titulo"
            if base.isdecimal() or base == "inbox":
                base = f"titulo-{base}"[:240]
            candidate, suffix = base, 2
            while type(self).objects.filter(owner_id=self.owner_id, slug=candidate).exists():
                candidate = f"{base}-{suffix}"
                suffix += 1
            self.slug = candidate
            if kwargs.get("update_fields") is not None:
                kwargs["update_fields"] = set(kwargs["update_fields"]) | {"slug"}
            return super().save(*args, **kwargs)


class Collection(SluggedResource):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    title = models.CharField(max_length=250)
    description = models.TextField(blank=True)
    position = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["position", "id"]
        constraints = [
            models.UniqueConstraint(fields=["owner", "slug"], name="collection_owner_slug")
        ]


class Project(SluggedResource):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    collection = models.ForeignKey(Collection, null=True, blank=True, on_delete=models.SET_NULL)
    title = models.CharField(max_length=250, default="Sem título")
    subtitle = models.CharField(max_length=500, blank=True)
    author = models.CharField(max_length=250, blank=True)
    position = models.PositiveIntegerField(default=0)
    is_inbox = models.BooleanField(default=False)
    default_group = models.OneToOneField(
        "TextGroup", null=True, blank=True, on_delete=models.SET_NULL, related_name="default_of"
    )
    cover = models.ForeignKey(
        "Asset", null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["position", "id"]
        constraints = [
            models.UniqueConstraint(fields=["owner", "slug"], name="project_owner_slug"),
            models.UniqueConstraint(
                fields=["owner"], condition=Q(is_inbox=True), name="one_inbox_per_user"
            ),
        ]


class TextGroup(models.Model):
    project = models.ForeignKey(Project, related_name="groups", on_delete=models.CASCADE)
    name = models.CharField(max_length=250, default="Textos")
    export_title = models.CharField(max_length=250, blank=True)
    export_subtitle = models.CharField(max_length=500, blank=True)
    export_author = models.CharField(max_length=250, blank=True)
    cover = models.ForeignKey(
        "Asset", null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["created_at", "id"]

    @property
    def title(self):
        return self.project.title

    @property
    def subtitle(self):
        return self.project.subtitle

    @property
    def author(self):
        return self.project.author

    @property
    def effective_cover(self):
        return self.project.cover


class Text(models.Model):
    group = models.ForeignKey(TextGroup, related_name="texts", on_delete=models.CASCADE)
    parent = models.ForeignKey(
        "self", null=True, blank=True, related_name="variations", on_delete=models.CASCADE
    )
    title = models.CharField(max_length=250, blank=True)
    markdown = models.TextField(blank=True)
    position = models.PositiveIntegerField(default=0)
    origin = models.JSONField(default=dict, blank=True)
    last_used_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["position", "id"]


def asset_upload_path(instance, filename):
    extension = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}[instance.mime_type]
    return f"projects/{instance.project_id}/images/{instance.id}.{extension}"


class Asset(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(Project, related_name="assets", on_delete=models.CASCADE)
    file = models.FileField(upload_to=asset_upload_path)
    original_name = models.CharField(max_length=255)
    mime_type = models.CharField(max_length=100)
    sha256 = models.CharField(max_length=64)
    origins = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "id"]
        constraints = [
            models.UniqueConstraint(fields=["project", "sha256"], name="unique_project_asset")
        ]


def export_upload_path(instance, filename):
    return f"projects/{instance.group.project_id}/ebooks/{instance.group_id}-{uuid.uuid4()}.epub"


class ExportArtifact(models.Model):
    group = models.OneToOneField(TextGroup, related_name="epub_artifact", on_delete=models.CASCADE)
    file = models.FileField(upload_to=export_upload_path)
    filename = models.CharField(max_length=255)
    generation = models.PositiveIntegerField(default=1)
    sha256 = models.CharField(max_length=64)
    source_sha256 = models.CharField(max_length=64)
    compiler_version = models.CharField(max_length=40)
    created_at = models.DateTimeField(auto_now=True)


def import_original_path(instance, filename):
    return f"projects/{instance.project_id}/originals/{instance.pk}.epub"


def import_clean_path(instance, filename):
    return (
        f"projects/{instance.project_id}/ebooks/imports/"
        f"{instance.pk}-v{instance.clean_generation}-{uuid.uuid4()}.epub"
    )


class ImportJob(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(Project, related_name="imports", on_delete=models.CASCADE)
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
            models.UniqueConstraint(fields=["project", "sha256"], name="unique_import_source")
        ]


class ImportExtraction(models.Model):
    job = models.ForeignKey(ImportJob, related_name="extractions", on_delete=models.CASCADE)
    group = models.ForeignKey(TextGroup, related_name="imports_extracted", on_delete=models.CASCADE)
    source_sha256 = models.CharField(max_length=64)
    source_kind = models.CharField(max_length=10, default="cleaned")
    mode = models.CharField(max_length=10)
    text_ids = models.JSONField(default=list)
    sections = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["job", "group", "source_kind", "source_sha256"],
                name="unique_group_extraction",
            )
        ]


class MarkdownImport(models.Model):
    group = models.ForeignKey(TextGroup, related_name="markdown_imports", on_delete=models.CASCADE)
    fingerprint = models.CharField(max_length=64)
    mode = models.CharField(max_length=10)
    files = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["group", "fingerprint"], name="unique_markdown_import")
        ]


class GroupCreation(models.Model):
    """A request key protects creation retries without making sources single-use."""

    project = models.ForeignKey(Project, related_name="group_creations", on_delete=models.CASCADE)
    key = models.UUIDField()
    fingerprint = models.CharField(max_length=64)
    group = models.ForeignKey(TextGroup, null=True, on_delete=models.SET_NULL)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["project", "key"], name="unique_group_creation")
        ]
