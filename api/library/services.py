from django.db import transaction
from django.db.models import Max
from rest_framework.exceptions import ValidationError

from .compilation import Manuscript, Section
from .models import Project, ProjectFamily, Text


def next_position(queryset):
    return (queryset.aggregate(value=Max("position"))["value"] or 0) + 1


@transaction.atomic
def create_project(owner, title="Sem título", collection=None, is_inbox=False):
    family = ProjectFamily.objects.create(
        owner=owner,
        collection=collection,
        is_inbox=is_inbox,
        position=next_position(ProjectFamily.objects.filter(owner=owner, collection=collection)),
    )
    project = Project.objects.create(family=family, title=title or "Sem título")
    family.principal = project
    family.save(update_fields=["principal"])
    return project


@transaction.atomic
def new_version(project):
    family = ProjectFamily.objects.select_for_update().get(pk=project.family_id)
    if family.is_inbox:
        raise ValidationError("A Caixa de entrada não possui versões.")
    replacement = Project.objects.create(
        family=family, title=project.title, subtitle=project.subtitle, author=project.author
    )
    family.principal = replacement
    family.save(update_fields=["principal"])
    return replacement


@transaction.atomic
def restore_version(project):
    family = ProjectFamily.objects.select_for_update().get(pk=project.family_id)
    family.principal = project
    family.save(update_fields=["principal"])


def compile_project(project):
    return Manuscript(
        project.title,
        project.subtitle,
        tuple(
            Section(text.id, text.title, text.markdown)
            for text in project.texts.filter(parent=None).order_by("position", "id")
        ),
    )


@transaction.atomic
def reorder_texts(project, ids):
    if not isinstance(ids, list) or any(type(item) is not int for item in ids):
        raise ValidationError("Envie a lista completa de IDs dos textos principais.")
    Project.objects.select_for_update().get(pk=project.pk)
    texts = {text.pk: text for text in project.texts.filter(parent=None)}
    if len(ids) != len(set(ids)) or set(ids) != set(texts):
        raise ValidationError("A ordem deve conter todos os textos principais, uma única vez.")
    for position, pk in enumerate(ids):
        texts[pk].position = position
    Text.objects.bulk_update(texts.values(), ["position"])


@transaction.atomic
def move_text(text, project):
    if text.parent_id:
        text.parent = None
    text.project = project
    text.position = next_position(project.texts.filter(parent=None))
    text.save()
    text.variations.update(project=project)
