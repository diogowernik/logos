from django.db import transaction
from rest_framework.exceptions import ValidationError

from ..models import Text, TextGroup
from .projects import next_position


def locked_text(text):
    """Call inside a transaction; serialize edits with confirmed EPUB replacement."""
    TextGroup.objects.select_for_update().get(pk=text.group_id)
    current = Text.objects.filter(pk=text.pk, group_id=text.group_id).first()
    if current is None:
        raise ValidationError("Este texto foi removido ou movido. Atualize o projeto.")
    return current


@transaction.atomic
def reorder_texts(group, ids):
    if not isinstance(ids, list) or any(type(item) is not int for item in ids):
        raise ValidationError("Envie a lista completa de IDs dos textos principais.")
    TextGroup.objects.select_for_update().get(pk=group.pk)
    texts = {text.pk: text for text in group.texts.filter(parent=None)}
    if len(ids) != len(set(ids)) or set(ids) != set(texts):
        raise ValidationError("A ordem deve conter todos os textos principais, uma única vez.")
    for position, pk in enumerate(ids):
        texts[pk].position = position
    Text.objects.bulk_update(texts.values(), ["position"])


@transaction.atomic
def move_text(text, group):
    list(
        TextGroup.objects.select_for_update()
        .filter(pk__in=[text.group_id, group.pk])
        .order_by("pk")
    )
    text = locked_text(text)
    if text.parent_id:
        text.parent = None
    text.group = group
    text.position = next_position(group.texts.filter(parent=None))
    text.save()
    text.variations.update(group=group)
    return text
