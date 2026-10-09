"""Original persistence and cleaning lifecycle; the processing engines do not know Django."""

import hashlib
from pathlib import Path

from django.core.files.base import ContentFile
from django.db import transaction
from django.utils.text import slugify
from rest_framework.exceptions import APIException, ValidationError

from ..epub_import.archive import MAX_UPLOAD, read_package
from ..epub_import.cleaning import clean_package
from ..epub_import.inspection import report
from ..import_errors import diagnostic as build_diagnostic
from ..models import ImportJob, Project


class ImportConflict(APIException):
    status_code = 409
    default_detail = "A importação mudou. Atualize a prévia antes de continuar."
    default_code = "import_conflict"


def upload_epub(project, uploaded):
    if project.is_inbox:
        raise ValidationError("Escolha um projeto para importar o EPUB.")
    if uploaded.size > MAX_UPLOAD:
        raise ValidationError("O EPUB deve ter até 50 MB.")
    content = uploaded.read(MAX_UPLOAD + 1)
    return register_epub(project, content, Path(uploaded.name).name[:255])


def register_epub(project, content, original_name, existing_name=None):
    """Use the same validation/identity for uploads and explicitly adopted files."""
    digest = hashlib.sha256(content).hexdigest()
    package = read_package(content)
    diagnostic = report(package)
    job, new_name = None, None
    try:
        with transaction.atomic():
            Project.objects.select_for_update().get(pk=project.pk)
            existing = ImportJob.objects.filter(project=project, sha256=digest).first()
            if existing:
                if existing_name and not existing.original_file.storage.exists(
                    existing.original_file.name
                ):
                    existing.original_file.name = existing_name
                    existing.save(update_fields=["original_file", "updated_at"])
                return existing, False
            job = ImportJob(
                project=project,
                original_name=original_name,
                sha256=digest,
                inspection=diagnostic,
            )
            if existing_name:
                job.original_file.name = existing_name
            else:
                job.original_file.save(job.original_name, ContentFile(content), save=False)
                new_name = job.original_file.name
            job.save()
            return job, True
    except Exception:
        if new_name:
            job.original_file.storage.delete(new_name)
        raise


def read_source(job, cleaned=False):
    field = job.clean_file if cleaned else job.original_file
    if not field.name:
        raise ValidationError("Limpe o EPUB antes de extrair seus textos.")
    try:
        with field.open("rb") as handle:
            content = handle.read(MAX_UPLOAD + 1)
    except FileNotFoundError as error:
        raise ValidationError("O arquivo da importação não foi encontrado.") from error
    expected = job.clean_sha256 if cleaned else job.sha256
    if hashlib.sha256(content).hexdigest() != expected:
        raise ValidationError("O arquivo mudou no armazenamento. Envie uma nova fonte.")
    return content


def clean_import(job, sections=None):
    with transaction.atomic():
        locked = ImportJob.objects.select_for_update().get(pk=job.pk)
        if locked.status == "processing":
            raise ImportConflict("Este EPUB já está sendo limpo. Aguarde a conclusão.")
        locked.status, locked.error, locked.error_diagnostic = "processing", "", {}
        locked.save(update_fields=["status", "error", "error_diagnostic", "updated_at"])
    saved, new_name = None, None
    try:
        content, diagnostic = clean_package(read_source(locked), sections)
        with transaction.atomic():
            saved = ImportJob.objects.select_for_update().get(pk=job.pk)
            old_name = saved.clean_file.name
            saved.clean_generation += 1
            basename = slugify(Path(saved.original_name).stem)[:180] or "livro"
            saved.clean_filename = f"{basename}_clean_v{saved.clean_generation}.epub"
            saved.clean_sha256 = hashlib.sha256(content).hexdigest()
            saved.clean_report = diagnostic
            saved.clean_file.save(saved.clean_filename, ContentFile(content), save=False)
            new_name = saved.clean_file.name
            saved.status, saved.error, saved.error_diagnostic = "done", "", {}
            saved.save()
            if old_name:
                storage = saved.clean_file.storage
                transaction.on_commit(lambda: storage.delete(old_name), robust=True)
        return saved
    except Exception as error:
        if new_name:
            saved.clean_file.storage.delete(new_name)
        error_report = build_diagnostic(error, "clean", "original", job)
        error.import_diagnostic = error_report
        ImportJob.objects.filter(pk=job.pk).update(
            status="error", error=error_report["message"], error_diagnostic=error_report
        )
        raise
