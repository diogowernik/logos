"""Preview and confirmed, idempotent application of an EPUB proposal to an existing TextGroup."""

from pathlib import PurePosixPath
from urllib.parse import quote

from django.db import transaction
from django.db.models import Max
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from ..epub_import.extraction import proposal, section_markdown
from ..models import ImportExtraction, ImportJob, Project, Text, TextGroup
from .import_sources import DEFAULT_SOURCE, source_content, source_digest, source_warnings
from .imports import ImportConflict
from .text_imports import confirmed_mode, group_state


def preview_extraction(job, group, source=DEFAULT_SOURCE):
    prepared = proposal(source_content(job, source))
    digest = source_digest(job, source)
    image_urls = {
        path: (
            f"/api/library/epub-imports/{job.pk}/resource?source={source}"
            f"&source_sha256={digest}&href={quote(path, safe='')}"
        )
        for path in prepared["images"]
    }
    state, count, primary = group_state(group)
    sections = [
        dict(href=s["href"], title=s["title"], position=i, markdown=section_markdown(s, image_urls))
        for i, s in enumerate(prepared["sections"])
    ]
    return {
        "group": group.pk if group else None,
        "source": source,
        "group_state": state,
        "existing_text_count": count,
        "existing_primary_count": primary,
        "requires_confirmation": bool(count),
        "source_sha256": digest,
        "sections": sections,
        "warnings": source_warnings(job, source) + prepared["warnings"],
    }


def extract_texts(
    job,
    group,
    *,
    source_sha256,
    group_state_token: str,
    mode=None,
    confirm_existing=False,
    source=DEFAULT_SOURCE,
):
    if group.project_id != job.project_id or group.project.is_inbox:
        raise ValidationError("Escolha um grupo do mesmo livro da fonte.")
    prepared = proposal(source_content(job, source))
    created_assets = []
    try:
        with transaction.atomic():
            Project.objects.select_for_update().get(pk=group.project_id)
            locked = ImportJob.objects.select_for_update().get(pk=job.pk)
            group = TextGroup.objects.select_for_update().get(pk=group.pk)
            if source_digest(locked, source) != source_sha256:
                raise ImportConflict("O EPUB foi alterado. Atualize a prévia da extração.")
            if source_digest(job, source) != source_digest(locked, source):
                raise ImportConflict("O EPUB mudou durante a preparação. Atualize a prévia.")
            receipt = ImportExtraction.objects.filter(
                job=locked, group=group, source_kind=source, source_sha256=source_sha256
            ).first()
            if receipt:
                if mode and receipt.mode != mode:
                    raise ImportConflict(
                        "Esta extração já foi concluída com outra opção. Atualize o projeto."
                    )
                if group.texts.filter(pk__in=receipt.text_ids).count() != len(receipt.text_ids):
                    raise ImportConflict(
                        "Textos da extração anterior foram removidos. Revise o projeto."
                    )
                return receipt, False
            mode = confirmed_mode(group, group_state_token, mode, confirm_existing)
            urls = {}

            from .assets import store_image

            for path, (content, mime_type) in prepared["images"].items():
                asset, created = store_image(
                    group.project,
                    PurePosixPath(path).name[:255],
                    content,
                    mime_type,
                    origin={
                        "job": str(job.pk),
                        "source": source,
                        "sha256": source_sha256,
                        "href": path,
                    },
                )
                if created:
                    created_assets.append(asset)
                urls[path] = f"/api/library/assets/{asset.pk}/file"
            if prepared["cover"] and not group.project.cover_id:
                path, content, mime_type = prepared["cover"]
                asset, created = store_image(
                    group.project,
                    PurePosixPath(path).name[:255],
                    content,
                    mime_type,
                    origin={
                        "job": str(job.pk),
                        "source": source,
                        "sha256": source_sha256,
                        "href": path,
                    },
                )
                if created:
                    created_assets.append(asset)
                group.project.cover = asset
                group.project.save(update_fields=["cover", "updated_at"])
            if mode == "replace":
                group.texts.all().delete()
            position = (group.texts.filter(parent=None).aggregate(p=Max("position"))["p"] or 0) + 1
            texts = [
                Text(
                    group=group,
                    title=s["title"][:250],
                    markdown=section_markdown(s, urls),
                    origin={
                        "kind": "epub",
                        "job": str(job.pk),
                        "source": source,
                        "sha256": source_sha256,
                        "href": s["href"],
                    },
                    position=position + i,
                )
                for i, s in enumerate(prepared["sections"])
            ]
            Text.objects.bulk_create(texts)
            group.updated_at = timezone.now()
            group.save(update_fields=["updated_at"])
            receipt = ImportExtraction.objects.create(
                job=locked,
                group=group,
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
