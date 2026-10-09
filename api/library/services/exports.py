"""Compile saved Markdown, generate an EPUB and atomically publish its file."""

import hashlib
import json

from django.core.files.base import ContentFile
from django.db import transaction
from django.utils.text import slugify

from ..epub import EpubGenerationError, ImageResource, generate_epub
from ..epub.engine import COMPILER_VERSION
from ..models import ExportArtifact, Project, TextGroup
from .groups import compile_group


def _image_resource(asset):
    try:
        with asset.file.open("rb") as image:
            return ImageResource(str(asset.pk), image.read(), asset.mime_type)
    except FileNotFoundError as error:
        raise EpubGenerationError("Uma imagem do projeto não foi encontrada.") from error


def export_group_epub(group):
    if group.project.is_inbox:
        raise EpubGenerationError("Adicione o texto a um projeto antes de gerar o EPUB.")
    # Freeze the compilation inputs under the same locks used by edits/imports.
    # The expensive pure generator runs after releasing these locks.
    with transaction.atomic():
        Project.objects.select_for_update().get(pk=group.project_id)
        group = TextGroup.objects.select_for_update().select_related("project").get(pk=group.pk)
        snapshot = export_state(group)
        manuscript = compile_group(group)
        markdown = manuscript.markdown()
        images = tuple(
            _image_resource(asset)
            for asset in group.project.assets.all()
            if str(asset.pk) in markdown
        )
        cover = _image_resource(group.effective_cover) if group.effective_cover else None
    content = generate_epub(
        manuscript,
        identifier=f"logos-group-{group.pk}",
        author=group.author,
        cover=cover,
        images=images,
    )
    basename = slugify(f"{group.title}-{group.name}")[:200] or "livro"
    # Prepare completely before changing the last successful export.
    artifact = None
    new_name = None
    try:
        with transaction.atomic():
            Project.objects.select_for_update().get(pk=group.project_id)
            current = (
                TextGroup.objects.select_for_update().select_related("project").get(pk=group.pk)
            )
            if export_state(current) != snapshot:
                raise EpubGenerationError("O grupo mudou durante a geração. Gere novamente.")
            artifact = ExportArtifact.objects.filter(group=group).first()
            old_name = artifact.file.name if artifact else None
            generation = artifact.generation + 1 if artifact else 1
            artifact = artifact or ExportArtifact(group=group)
            filename = f"{basename}_v{generation}.epub"
            artifact.filename = filename
            artifact.generation = generation
            artifact.sha256 = hashlib.sha256(content).hexdigest()
            artifact.source_sha256 = snapshot
            artifact.compiler_version = COMPILER_VERSION
            artifact.file.save(filename, ContentFile(content), save=False)
            new_name = artifact.file.name
            artifact.save()
            if old_name:
                storage = artifact.file.storage
                transaction.on_commit(lambda: storage.delete(old_name), robust=True)
    except Exception:
        if new_name:
            artifact.file.storage.delete(new_name)
        raise
    return artifact


@transaction.atomic
def delete_group_epub(group):
    TextGroup.objects.select_for_update().get(pk=group.pk)
    # The post_delete signal removes the stored file only after commit.
    ExportArtifact.objects.filter(group=group).delete()


def export_state(group):
    cover = group.effective_cover
    markdown = compile_group(group).markdown()
    assets = [
        (str(a.pk), a.sha256)
        for a in group.project.assets.order_by("id")
        if str(a.pk) in markdown or (cover and a.pk == cover.pk)
    ]
    payload = {
        "name": group.name,
        "title": group.title,
        "subtitle": group.subtitle,
        "author": group.author,
        "cover": str(cover.pk) if cover else None,
        "texts": list(
            group.texts.filter(parent=None)
            .order_by("position", "id")
            .values("id", "title", "markdown", "position")
        ),
        "assets": assets,
    }
    return hashlib.sha256(
        json.dumps(payload, sort_keys=True, ensure_ascii=False).encode()
    ).hexdigest()
