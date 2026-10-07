from django.db import transaction
from rest_framework.exceptions import ValidationError

from ..models import Project, Text
from .projects import next_position


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
