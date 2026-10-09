"""Owner-scoped local source folders. Never accept a client-supplied directory."""

import hashlib
import os
import re
import stat
from contextlib import contextmanager
from pathlib import Path

from django.core.files.storage import default_storage
from rest_framework.exceptions import ValidationError

from .imports import ImportConflict

FOLDERS = {"epub": ("originals",), "markdown": ("sources", "markdown")}
LIMITS = {"epub": 50 * 1024 * 1024, "markdown": 2 * 1024 * 1024}
MAX_FILES = 100
MAX_BATCH = 16 * 1024 * 1024


def filename(value, kind):
    extension = ".epub" if kind == "epub" else ".md"
    if (
        not isinstance(value, str)
        or not value
        or len(value) > 255
        or value in (".", "..")
        or any(c in value for c in ("/", "\\", "\x00"))
        or any(ord(c) < 32 for c in value)
        or not value.lower().endswith(extension)
    ):
        raise ValidationError(f"Informe apenas o nome de um arquivo {extension}.")
    return value


def source_order(name):
    return tuple(
        (1, int(part)) if part.isdigit() else (0, part.casefold())
        for part in re.split(r"(\d+)", name)
    ), name


def storage_name(project, kind, name):
    return "/".join(("projects", str(project.pk), *FOLDERS[kind], name))


@contextmanager
def directory(project, kind, create=False):
    if project.is_inbox:
        raise ValidationError("Escolha um projeto para gerenciar fontes.")
    try:
        root = default_storage.path("")
    except NotImplementedError as error:
        raise ValidationError(
            "As fontes manuais exigem armazenamento local nesta versão."
        ) from error
    if create:
        Path(root).mkdir(parents=True, exist_ok=True)
    fd = os.open(root, os.O_RDONLY | os.O_DIRECTORY)
    try:
        for part in ("projects", str(project.pk), *FOLDERS[kind]):
            if create:
                try:
                    os.mkdir(part, dir_fd=fd)
                except FileExistsError:
                    pass
            next_fd = os.open(part, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW, dir_fd=fd)
            os.close(fd)
            fd = next_fd
        yield fd
    finally:
        os.close(fd)


def read_at(fd, name, kind):
    handle = os.open(name, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK, dir_fd=fd)
    with os.fdopen(handle, "rb") as stream:
        info = os.fstat(stream.fileno())
        if not stat.S_ISREG(info.st_mode) or info.st_nlink != 1:
            raise ValidationError("Use um arquivo regular, sem links, na pasta do projeto.")
        if info.st_size > LIMITS[kind]:
            raise ValidationError("O arquivo ultrapassa o limite permitido.")
        content = stream.read(LIMITS[kind] + 1)
        if len(content) > LIMITS[kind]:
            raise ValidationError("O arquivo ultrapassa o limite permitido.")
        return content


def read_file(project, kind, name):
    filename(name, kind)
    try:
        with directory(project, kind) as fd:
            return read_at(fd, name, kind)
    except FileNotFoundError as error:
        raise ValidationError("Arquivo não encontrado. Atualize a lista da pasta.") from error
    except OSError as error:
        raise ValidationError("Não foi possível acessar o arquivo regular desta pasta.") from error


def digest(content):
    return hashlib.sha256(content).hexdigest()


def delete_markdown(project, name, expected_sha256):
    from django.db import transaction
    from ..models import Project

    filename(name, "markdown")
    if not isinstance(expected_sha256, str) or not re.fullmatch(r"[a-f0-9]{64}", expected_sha256):
        raise ValidationError("Informe a identificação do arquivo que será excluído.")
    try:
        with transaction.atomic():
            Project.objects.select_for_update().get(pk=project.pk)
            with directory(project, "markdown") as fd:
                content = read_at(fd, name, "markdown")
                if digest(content) != expected_sha256:
                    raise ImportConflict("O Markdown mudou. Atualize a pasta antes de excluir.")
                os.unlink(name, dir_fd=fd)
    except FileNotFoundError as error:
        raise ValidationError("Arquivo não encontrado. Atualize a lista da pasta.") from error
    except OSError as error:
        raise ValidationError("Não foi possível excluir o arquivo regular desta pasta.") from error


def list_files(project, kind):
    entries = []
    try:
        with directory(project, kind) as fd:
            names = sorted(
                (
                    n
                    for n in os.listdir(fd)
                    if n.lower().endswith(".epub" if kind == "epub" else ".md")
                ),
                key=source_order,
            )
            if len(names) > MAX_FILES:
                raise ValidationError("A pasta aceita até 100 fontes nesta versão.")
            for name in names:
                try:
                    filename(name, kind)
                    content = read_at(fd, name, kind)
                    entries.append({"name": name, "size": len(content), "sha256": digest(content)})
                except (OSError, ValidationError):
                    # Links, directories and invalid entries are never served or imported.
                    continue
    except FileNotFoundError:
        pass
    except OSError as error:
        raise ValidationError("Não foi possível acessar a pasta de fontes.") from error
    return entries


def markdown_content(content):
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError as error:
        raise ValidationError("O Markdown deve usar codificação UTF-8.") from error
    if "\x00" in text or not text.strip():
        raise ValidationError("Envie um Markdown com conteúdo de texto.")
    return text


def markdown_title(name):
    return re.sub(r"[_-]+", " ", Path(name).stem).strip()[:250] or "Sem título"


def upload_markdowns(project, files):
    from django.db import transaction

    from ..models import Project

    if not files or len(files) > MAX_FILES:
        raise ValidationError("Envie de 1 a 100 arquivos Markdown.")
    prepared = {}
    for uploaded in files:
        name = filename(uploaded.name, "markdown")
        content = uploaded.read(LIMITS["markdown"] + 1)
        if len(content) > LIMITS["markdown"]:
            raise ValidationError("Cada Markdown deve ter até 2 MB.")
        markdown_content(content)
        if name in prepared and prepared[name] != content:
            raise ImportConflict("O lote tem arquivos diferentes com o mesmo nome.")
        prepared[name] = content
    if sum(map(len, prepared.values())) > MAX_BATCH:
        raise ValidationError("O lote deve ter até 16 MB.")
    created = []
    with transaction.atomic():
        Project.objects.select_for_update().get(pk=project.pk)
        with directory(project, "markdown", create=True) as fd:
            existing_names = {n for n in os.listdir(fd) if n.lower().endswith(".md")}
            if len(existing_names | prepared.keys()) > MAX_FILES:
                raise ValidationError("A pasta aceita até 100 arquivos Markdown.")
            # Validate every collision before writing any member of the batch.
            for name, content in prepared.items():
                try:
                    previous = read_at(fd, name, "markdown")
                except FileNotFoundError:
                    continue
                except OSError as error:
                    raise ValidationError(
                        "Não é possível substituir links ou diretórios."
                    ) from error
                if previous != content:
                    raise ImportConflict(
                        f"Já existe um arquivo diferente chamado {name}. Renomeie antes de enviar."
                    )
            try:
                for name, content in prepared.items():
                    if name in existing_names:
                        continue
                    output = os.open(
                        name, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600, dir_fd=fd
                    )
                    created.append(name)
                    with os.fdopen(output, "wb") as stream:
                        stream.write(content)
            except Exception:
                for name in created:
                    os.unlink(name, dir_fd=fd)
                raise
    return list_files(project, "markdown")
