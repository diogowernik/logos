"""Shared confirmation contract for any source that creates group Texts."""

import hashlib
import json

from .imports import ImportConflict


def group_state(group):
    texts = (
        list(group.texts.order_by("id").values("id", "parent_id", "title", "markdown", "position"))
        if group
        else []
    )
    digest = hashlib.sha256(
        json.dumps(texts, ensure_ascii=False, sort_keys=True).encode()
    ).hexdigest()
    return digest, len(texts), sum(text["parent_id"] is None for text in texts)


def confirmed_mode(group, state_token, mode, confirmed):
    state, count, _ = group_state(group)
    if state != state_token:
        raise ImportConflict("Os textos do grupo mudaram. Atualize a prévia antes de continuar.")
    if count and (mode is None or not confirmed):
        raise ImportConflict(
            "Este grupo já tem textos. Confirme se deseja acrescentar ou substituir."
        )
    return mode or "append"
