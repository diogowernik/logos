from django.db import transaction
from django.db.models import Max
from rest_framework.exceptions import ValidationError

from ..models import Project


def next_position(queryset):
    return (queryset.aggregate(value=Max("position"))["value"] or 0) + 1


@transaction.atomic
def create_project(owner, title="Sem título", collection=None, is_inbox=False):
    from .groups import create_group

    project = Project.objects.create(
        owner=owner,
        title=title or "Sem título",
        collection=collection,
        is_inbox=is_inbox,
        position=next_position(Project.objects.filter(owner=owner, collection=collection)),
    )
    project.default_group = create_group(project)
    project.save(update_fields=["default_group"])
    return project


def duplicate_project(original, owner):
    from .assets import copy_assets
    from .groups import duplicate_group

    copied_files = []
    try:
        with transaction.atomic():
            project = create_project(owner, f"{original.title} — cópia", original.collection)
            project.subtitle, project.author = original.subtitle, original.author
            project.save(update_fields=["subtitle", "author"])
            mapping = copy_assets(original, project)
            copied_files = [(a.file.storage, a.file.name) for a in project.assets.all()]
            placeholder = project.default_group
            for group in original.groups.all():
                copied = duplicate_group(
                    group, project=project, asset_mapping=mapping, name=group.name
                )
                if group.pk == original.default_group_id:
                    project.default_group = copied
            project.save(update_fields=["default_group"])
            placeholder.delete()
            return project
    except Exception:
        for storage, filename in copied_files:
            storage.delete(filename)
        raise


@transaction.atomic
def delete_project(project):
    project = Project.objects.select_for_update().get(pk=project.pk)
    if project.is_inbox:
        raise ValidationError("A Caixa de entrada não pode ser excluída.")
    project.delete()
