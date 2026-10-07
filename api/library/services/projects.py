from django.db import transaction
from django.db.models import Max
from rest_framework.exceptions import ValidationError

from ..compilation import Manuscript, Section
from ..models import Project, ProjectFamily, Text
from .assets import copy_assets


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
        family=family,
        title=project.title,
        subtitle=project.subtitle,
        author=project.author,
        cover_id=project.cover_id,
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
def duplicate_project(original, owner):
    project = create_project(owner, f"{original.title} — cópia", original.family.collection)
    project.subtitle, project.author = original.subtitle, original.author
    project.save(update_fields=["subtitle", "author"])
    parents = {}
    for text in original.texts.filter(parent=None):
        parents[text.pk] = Text.objects.create(
            project=project,
            title=text.title,
            markdown=text.markdown,
            position=text.position,
        )
    for text in original.texts.exclude(parent=None):
        Text.objects.create(
            project=project,
            parent=parents[text.parent_id],
            title=text.title,
            markdown=text.markdown,
            position=text.position,
        )
    copy_assets(original, project)
    return project
