"""Resolve an explicit group or atomically create one for an import request."""

import hashlib
import json

from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework.exceptions import ValidationError

from ..models import GroupCreation, Project
from .groups import create_group
from .imports import ImportConflict


def target_group(project, group_id=None):
    if project.is_inbox:
        raise ValidationError("Escolha um livro para importar os textos.")
    return get_object_or_404(project.groups.all(), pk=group_id) if group_id else None


@transaction.atomic
def apply_to_target(project, data, identity, operation):
    Project.objects.select_for_update().get(pk=project.pk)
    group_id = data.get("group")
    group = target_group(project, group_id)
    if group:
        receipt, created = operation(group)
        return receipt, created, group
    key = data["operation_id"]
    fingerprint = hashlib.sha256(
        json.dumps(
            [identity, data["new_group_name"], data.get("mode", "append")],
            sort_keys=True,
            ensure_ascii=False,
        ).encode()
    ).hexdigest()
    previous = GroupCreation.objects.filter(project=project, key=key).first()
    if previous:
        if previous.fingerprint != fingerprint or not previous.group_id:
            raise ImportConflict(
                "Esta operação foi alterada ou seu grupo foi removido. Inicie outra importação."
            )
        receipt, _ = operation(previous.group)
        return receipt, False, previous.group
    group = create_group(project, data["new_group_name"])
    GroupCreation.objects.create(project=project, key=key, fingerprint=fingerprint, group=group)
    receipt, created = operation(group)
    return receipt, created, group
