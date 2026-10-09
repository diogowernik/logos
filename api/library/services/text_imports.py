"""Shared confirmation contract for any source that creates project Texts."""

import hashlib
import json

from .imports import ImportConflict


def project_state(project):
    texts = list(
        project.texts.order_by("id").values("id", "parent_id", "title", "markdown", "position")
    )
    digest = hashlib.sha256(
        json.dumps(texts, ensure_ascii=False, sort_keys=True).encode()
    ).hexdigest()
    return digest, len(texts), sum(text["parent_id"] is None for text in texts)


def confirmed_mode(project, state_token, mode, confirmed):
    state, count, _ = project_state(project)
    if state != state_token:
        raise ImportConflict("Os textos do projeto mudaram. Atualize a prévia antes de continuar.")
    if count and (mode is None or not confirmed):
        raise ImportConflict(
            "Este projeto já tem textos. Confirme se deseja acrescentar ou substituir."
        )
    return mode or "append"
