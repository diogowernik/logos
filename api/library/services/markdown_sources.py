"""Preview and apply one Markdown file per Text, preserving sources and edits."""

import json

from django.db import transaction
from django.db.models import Max
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from ..models import MarkdownImport, Project, Text
from .imports import ImportConflict
from .source_files import (
    MAX_BATCH,
    digest,
    list_files,
    markdown_content,
    markdown_title,
    read_file,
    source_order,
)
from .text_imports import confirmed_mode, project_state


def markdown_catalog(project):
    receipts = list(project.markdown_imports.all())
    existing = set(project.texts.values_list("id", flat=True))
    entries = list_files(project, "markdown")
    for entry in entries:
        matches = [item for r in receipts for item in r.files if item["name"] == entry["name"]]
        exact = [item for item in matches if item["sha256"] == entry["sha256"]]
        entry["status"] = (
            "imported"
            if any(item["text"] in existing for item in exact)
            else "text_missing"
            if exact
            else "changed"
            if matches
            else "new"
        )
    return entries


def prepare(project, names):
    if not names or len(names) != len(set(names)) or len(names) > 100:
        raise ValidationError("Selecione de 1 a 100 arquivos, sem repetições.")
    files, size = [], 0
    # Natural numbered filenames define batch order, independent of click order.
    for name in sorted(names, key=source_order):
        content = read_file(project, "markdown", name)
        size += len(content)
        if size > MAX_BATCH:
            raise ValidationError("A seleção deve ter até 16 MB.")
        files.append(
            {
                "name": name,
                "sha256": digest(content),
                "title": markdown_title(name),
                "markdown": markdown_content(content),
            }
        )
    fingerprint = digest(
        json.dumps(
            [{"name": f["name"], "sha256": f["sha256"]} for f in files],
            sort_keys=True,
            ensure_ascii=False,
        ).encode()
    )
    return files, fingerprint


def preview_markdowns(project, names):
    files, fingerprint = prepare(project, names)
    state, count, primary = project_state(project)
    return {
        "project": project.pk,
        "source": "markdown",
        "source_sha256": fingerprint,
        "project_state": state,
        "existing_text_count": count,
        "existing_primary_count": primary,
        "requires_confirmation": bool(count),
        "warnings": [],
        "sections": [
            {"href": f["name"], "title": f["title"], "position": i, "markdown": f["markdown"]}
            for i, f in enumerate(files)
        ],
    }


def import_markdowns(project, names, fingerprint, state_token, mode=None, confirmed=False):
    files, current_fingerprint = prepare(project, names)
    if fingerprint != current_fingerprint:
        raise ImportConflict("Os Markdown mudaram. Atualize a prévia antes de gerar textos.")
    with transaction.atomic():
        project = Project.objects.select_for_update().get(pk=project.pk)
        receipt = project.markdown_imports.filter(fingerprint=fingerprint).first()
        if receipt:
            ids = [f["text"] for f in receipt.files]
            if mode and receipt.mode != mode:
                raise ImportConflict(
                    "Este lote já foi importado com outra opção. Revise os textos."
                )
            if project.texts.filter(pk__in=ids).count() != len(set(ids)):
                raise ImportConflict(
                    "Textos deste lote foram removidos. Revise o projeto antes de repetir."
                )
            return receipt, False
        mode = confirmed_mode(project, state_token, mode, confirmed)
        existing_ids = set(project.texts.values_list("id", flat=True))
        known = {
            (f["name"], f["sha256"]): f["text"]
            for r in project.markdown_imports.order_by("id")
            for f in r.files
        }
        if mode == "replace":
            project.texts.all().delete()
        position = (project.texts.filter(parent=None).aggregate(p=Max("position"))["p"] or 0) + 1
        result = []
        for f in files:
            previous = known.get((f["name"], f["sha256"])) if mode == "append" else None
            if previous is not None and previous not in existing_ids:
                raise ImportConflict(
                    "Um texto importado foi removido. Revise o projeto antes de repetir."
                )
            if previous is None:
                text = Text.objects.create(
                    project=project, title=f["title"], markdown=f["markdown"], position=position
                )
                previous = text.pk
                position += 1
            result.append({"name": f["name"], "sha256": f["sha256"], "text": previous})
        project.updated_at = timezone.now()
        project.save(update_fields=["updated_at"])
        return MarkdownImport.objects.create(
            project=project, fingerprint=fingerprint, mode=mode, files=result
        ), True
