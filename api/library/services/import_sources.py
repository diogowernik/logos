"""Explicit source selection shared by preview, persistence and private resources."""

from rest_framework.exceptions import ValidationError

from .imports import read_source

SOURCE_CHOICES = ("original", "cleaned")
DEFAULT_SOURCE = "cleaned"


def source_digest(job, source):
    if source not in SOURCE_CHOICES:
        raise ValidationError("Escolha o EPUB original ou a cópia limpa.")
    return job.sha256 if source == "original" else job.clean_sha256


def source_content(job, source):
    source_digest(job, source)
    return read_source(job, cleaned=source == "cleaned")


def source_warnings(job, source):
    diagnostic = job.inspection if source == "original" else job.clean_report
    return diagnostic.get("warnings", [])
