from django.db import transaction
from rest_framework.exceptions import ValidationError

from ..models import Project, Text
from .projects import next_position


def locked_text(text):
    """Call inside a transaction; serialize edits with confirmed EPUB replacement."""
    Project.objects.select_for_update().get(pk=text.project_id)
    current = Text.objects.filter(pk=text.pk, project_id=text.project_id).first()
    if current is None:
        raise ValidationError("Este texto foi removido ou movido. Atualize o projeto.")
    return current


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
    list(
        Project.objects.select_for_update()
        .filter(pk__in=[text.project_id, project.pk])
        .order_by("pk")
    )
    text = locked_text(text)
    if text.parent_id:
        text.parent = None
    text.project = project
    text.position = next_position(project.texts.filter(parent=None))
    text.save()
    text.variations.update(project=project)
    return text
