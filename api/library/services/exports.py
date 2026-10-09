"""Compile saved Markdown, generate an EPUB and atomically publish its file."""

import hashlib

from django.core.files.base import ContentFile
from django.db import transaction
from django.utils.text import slugify

from ..epub import EpubGenerationError, ImageResource, generate_epub
from ..epub.engine import COMPILER_VERSION
from ..models import ExportArtifact, Project
from .projects import compile_project


def _image_resource(asset):
    try:
        with asset.file.open("rb") as image:
            return ImageResource(str(asset.pk), image.read(), asset.mime_type)
    except FileNotFoundError as error:
        raise EpubGenerationError("Uma imagem do projeto não foi encontrada.") from error


def export_project_epub(project):
    if project.family.is_inbox:
        raise EpubGenerationError("Adicione o texto a um projeto antes de gerar o EPUB.")
    manuscript = compile_project(project)
    markdown = manuscript.markdown()
    images = tuple(
        _image_resource(asset) for asset in project.family.assets.all() if str(asset.pk) in markdown
    )
    cover = _image_resource(project.cover) if project.cover_id else None
    content = generate_epub(
        manuscript,
        identifier=f"logos-project-{project.pk}",
        author=project.author,
        cover=cover,
        images=images,
    )
    basename = slugify(project.title)[:200] or "livro"
    # Prepare completely before changing the last successful export.
    artifact = None
    new_name = None
    try:
        with transaction.atomic():
            Project.objects.select_for_update().get(pk=project.pk)
            artifact = ExportArtifact.objects.filter(project=project).first()
            old_name = artifact.file.name if artifact else None
            generation = artifact.generation + 1 if artifact else 1
            artifact = artifact or ExportArtifact(project=project)
            filename = f"{basename}_v{generation}.epub"
            artifact.filename = filename
            artifact.generation = generation
            artifact.sha256 = hashlib.sha256(content).hexdigest()
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
def delete_project_epub(project):
    Project.objects.select_for_update().get(pk=project.pk)
    # The post_delete signal removes the stored file only after commit.
    ExportArtifact.objects.filter(project=project).delete()
