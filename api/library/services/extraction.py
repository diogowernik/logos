"""Preview and confirmed, idempotent application of an EPUB proposal to an existing Project."""

from pathlib import PurePosixPath
from urllib.parse import quote

from django.core.files.base import ContentFile
from django.db import transaction
from django.db.models import Max
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from ..epub_import.extraction import proposal, section_markdown
from ..models import Asset, ImportExtraction, ImportJob, Project, Text
from .import_sources import DEFAULT_SOURCE, source_content, source_digest, source_warnings
from .imports import ImportConflict
from .text_imports import confirmed_mode, project_state


def preview_extraction(job, project, source=DEFAULT_SOURCE):
    prepared = proposal(source_content(job, source))
    digest = source_digest(job, source)
    image_urls = {
        path: (
            f"/api/library/epub-imports/{job.pk}/resource?source={source}"
            f"&source_sha256={digest}&href={quote(path, safe='')}"
        )
        for path in prepared["images"]
    }
    state, count, primary = project_state(project)
    sections = [
        dict(href=s["href"], title=s["title"], position=i, markdown=section_markdown(s, image_urls))
        for i, s in enumerate(prepared["sections"])
    ]
    return {
        "project": project.pk,
        "source": source,
        "project_state": state,
        "existing_text_count": count,
        "existing_primary_count": primary,
        "requires_confirmation": bool(count),
        "source_sha256": digest,
        "sections": sections,
        "warnings": source_warnings(job, source) + prepared["warnings"],
    }


def extract_texts(
    job,
    project,
    *,
    source_sha256,
    project_state_token: str,
    mode=None,
    confirm_existing=False,
    source=DEFAULT_SOURCE,
):
    if project.family_id != job.family_id or project.family.is_inbox:
        raise ValidationError("Escolha um projeto da mesma família da fonte.")
    prepared = proposal(source_content(job, source))
    created_assets = []
    try:
        with transaction.atomic():
            locked = ImportJob.objects.select_for_update().get(pk=job.pk)
            project = Project.objects.select_for_update().get(pk=project.pk)
            if source_digest(locked, source) != source_sha256:
                raise ImportConflict("O EPUB foi alterado. Atualize a prévia da extração.")
            if source_digest(job, source) != source_digest(locked, source):
                raise ImportConflict("O EPUB mudou durante a preparação. Atualize a prévia.")
            receipt = ImportExtraction.objects.filter(
                job=locked, project=project, source_kind=source, source_sha256=source_sha256
            ).first()
            if receipt:
                if mode and receipt.mode != mode:
                    raise ImportConflict(
                        "Esta extração já foi concluída com outra opção. Atualize o projeto."
                    )
                if project.texts.filter(pk__in=receipt.text_ids).count() != len(receipt.text_ids):
                    raise ImportConflict(
                        "Textos da extração anterior foram removidos. Revise o projeto."
                    )
                return receipt, False
            mode = confirmed_mode(project, project_state_token, mode, confirm_existing)
            urls = {}

            def save_image(path, content, mime_type):
                asset = Asset(
                    family=project.family,
                    original_name=PurePosixPath(path).name[:255],
                    mime_type=mime_type,
                )
                asset.file.save(asset.original_name, ContentFile(content), save=False)
                created_assets.append(asset)
                asset.save()
                return asset

            for path, (content, mime_type) in prepared["images"].items():
                asset = save_image(path, content, mime_type)
                urls[path] = f"/api/library/assets/{asset.pk}/file"
            if prepared["cover"] and not project.cover_id:
                path, content, mime_type = prepared["cover"]
                if path in urls:
                    project.cover_id = next(
                        a.pk
                        for a in created_assets
                        if urls[path] == f"/api/library/assets/{a.pk}/file"
                    )
                else:
                    project.cover = save_image(path, content, mime_type)
            if mode == "replace":
                project.texts.all().delete()
            position = (
                project.texts.filter(parent=None).aggregate(p=Max("position"))["p"] or 0
            ) + 1
            texts = [
                Text(
                    project=project,
                    title=s["title"][:250],
                    markdown=section_markdown(s, urls),
                    position=position + i,
                )
                for i, s in enumerate(prepared["sections"])
            ]
            Text.objects.bulk_create(texts)
            project.updated_at = timezone.now()
            project.save(update_fields=["cover", "updated_at"])
            receipt = ImportExtraction.objects.create(
                job=locked,
                project=project,
                source_sha256=source_sha256,
                source_kind=source,
                mode=mode,
                text_ids=[t.pk for t in texts],
                sections=[
                    {"href": s["href"], "text": t.pk} for s, t in zip(prepared["sections"], texts)
                ],
            )
            return receipt, True
    except Exception:
        for asset in created_assets:
            asset.file.storage.delete(asset.file.name)
        raise
