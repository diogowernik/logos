from django.db import transaction
from rest_framework.exceptions import ValidationError

from ..compilation import Manuscript, Section
from ..models import Project, Text, TextGroup


@transaction.atomic
def create_group(project, name="Textos"):
    Project.objects.select_for_update().get(pk=project.pk)
    if project.is_inbox and project.groups.exists():
        raise ValidationError("Textos soltos não possuem grupos adicionais.")
    return TextGroup.objects.create(project=project, name=name.strip() or "Textos")


@transaction.atomic
def set_default_group(group):
    project = Project.objects.select_for_update().get(pk=group.project_id)
    project.default_group = group
    project.save(update_fields=["default_group", "updated_at"])


@transaction.atomic
def delete_group(group):
    project = Project.objects.select_for_update().get(pk=group.project_id)
    if project.is_inbox or project.groups.count() <= 1:
        raise ValidationError("Mantenha pelo menos um grupo no livro.")
    if project.default_group_id == group.pk:
        raise ValidationError("Escolha outro grupo padrão antes de excluir este.")
    group.delete()


@transaction.atomic
def duplicate_group(original, *, project=None, name=None, asset_mapping=None):
    project = project or original.project
    Project.objects.select_for_update().get(pk=project.pk)
    TextGroup.objects.select_for_update().get(pk=original.pk)
    mapping = asset_mapping or {}
    group = create_group(project, name or f"{original.name} — cópia")
    group.export_title = original.export_title
    group.export_subtitle = original.export_subtitle
    group.export_author = original.export_author
    group.cover_id = (
        mapping.get(str(original.cover_id), original.cover_id) if original.cover_id else None
    )
    group.save()
    parents = {}
    ordered = [*original.texts.filter(parent=None), *original.texts.exclude(parent=None)]
    for text in ordered:
        markdown = text.markdown
        for old, new in mapping.items():
            markdown = markdown.replace(f"/assets/{old}/file", f"/assets/{new}/file")
        parents[text.pk] = Text.objects.create(
            group=group,
            parent=parents.get(text.parent_id),
            title=text.title,
            markdown=markdown,
            position=text.position,
            origin={**text.origin, "copied_from": text.pk},
        )
    return group


def compile_group(group):
    return Manuscript(
        group.title,
        group.subtitle,
        tuple(
            Section(text.id, text.title, text.markdown)
            for text in group.texts.filter(parent=None).order_by("position", "id")
        ),
    )
