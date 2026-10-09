"""Copyable import diagnostics; full unexpected errors remain in server logs."""

import logging
import traceback
import uuid
from contextlib import contextmanager
from pathlib import Path

from django.http import Http404
from rest_framework.exceptions import APIException

from .epub_import import EpubImportError

logger = logging.getLogger(__name__)
API_ROOT = Path(__file__).resolve().parent.parent
LABELS = {
    "upload": "Envio do EPUB",
    "discover": "Consulta das fontes",
    "adopt": "Vinculação do EPUB",
    "markdown_upload": "Envio dos Markdown",
    "clean": "Limpeza do EPUB",
    "preview": "Prévia da extração",
    "extract": "Extração dos textos",
    "resource": "Leitura da imagem",
}


def readable_detail(detail):
    if isinstance(detail, dict):
        return "; ".join(f"{key}: {readable_detail(value)}" for key, value in detail.items())
    if isinstance(detail, (list, tuple)):
        return "; ".join(readable_detail(value) for value in detail)
    return str(detail)


def diagnostic(error, operation, source, job=None):
    known = isinstance(error, (EpubImportError, APIException))
    message = (
        readable_detail(getattr(error, "detail", str(error)))
        if known
        else "Não foi possível concluir a operação. Copie o relatório para investigar a falha."
    )
    code = (
        "invalid_epub"
        if isinstance(error, EpubImportError)
        else getattr(error, "default_code", "unexpected_error")
    )
    frames, causes, current = [], [], error
    while current is not None and len(causes) < 4:
        causes.append(type(current).__name__)
        for frame in traceback.extract_tb(current.__traceback__):
            try:
                path = Path(frame.filename).resolve().relative_to(API_ROOT)
            except ValueError:
                continue
            location = f"{path.as_posix()}:{frame.lineno} ({frame.name})"
            if location not in frames:
                frames.append(location)
        current = current.__cause__
    report = {
        "id": str(uuid.uuid4()),
        "operation": operation,
        "source": source,
        "job": str(job.pk) if job is not None else None,
        "code": code,
        "message": message,
        "exception_types": causes,
        "locations": frames[-8:],
    }
    label = LABELS[operation]
    if source == "markdown":
        label = {
            "extract": "Geração de textos dos Markdown",
            "preview": "Prévia dos Markdown",
            "resource": "Leitura do Markdown",
        }.get(operation, label)
    report["copy_text"] = "\n".join(
        [
            f"Logos — {label} falhou",
            f"Relatório: {report['id']}",
            f"Fonte: {source}",
            f"Importação: {report['job'] or 'ainda não criada'}",
            f"Código: {code}",
            f"Mensagem: {message}",
            f"Tipos: {' <- '.join(causes)}",
            "Localização:",
            *frames[-8:],
        ]
    )
    if not known:
        logger.error("EPUB failure %s (%s)", report["id"], operation, exc_info=error)
    return report


class ImportOperationError(APIException):
    def __init__(self, report, status):
        self.status_code = status
        self.detail = {"detail": report["message"], "diagnostic": report}


@contextmanager
def import_operation(operation, source, job=None):
    try:
        yield
    except Http404:
        raise
    except Exception as error:
        report = getattr(error, "import_diagnostic", None)
        if report is None:
            report = diagnostic(error, operation, source, job)
        status = 400 if isinstance(error, EpubImportError) else getattr(error, "status_code", 500)
        raise ImportOperationError(report, status) from error
