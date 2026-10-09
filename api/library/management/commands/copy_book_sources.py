"""Explicit operator-assisted association after recreating the development database."""

import os
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from rest_framework.exceptions import ValidationError

from library.models import Project
from library.services.source_files import (
    FOLDERS,
    MAX_BATCH,
    MAX_FILES,
    directory,
    filename,
    markdown_content,
    read_at,
)


class Command(BaseCommand):
    help = "Copy a preserved book's EPUB/Markdown sources into an explicitly chosen book."

    def add_arguments(self, parser):
        parser.add_argument("project", type=int)
        parser.add_argument("--from-folder", required=True)
        parser.add_argument("--dry-run", action="store_true")

    def handle(self, *args, **options):
        try:
            project = Project.objects.get(pk=options["project"], is_inbox=False)
        except Project.DoesNotExist as error:
            raise CommandError("Livro não encontrado.") from error
        source = Path(options["from_folder"]).absolute()
        prepared, created = [], []
        try:
            # Open each directory without following links, including the supplied root.
            for kind, parts in FOLDERS.items():
                fd = os.open(source, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
                try:
                    try:
                        for part in parts:
                            next_fd = os.open(
                                part, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW, dir_fd=fd
                            )
                            os.close(fd)
                            fd = next_fd
                    except FileNotFoundError:
                        continue
                    extension = ".md" if kind == "markdown" else ".epub"
                    names = [n for n in os.listdir(fd) if n.lower().endswith(extension)]
                    if len(names) > MAX_FILES:
                        raise CommandError("A pasta ultrapassa o limite de fontes.")
                    for name in names:
                        filename(name, kind)
                        content = read_at(fd, name, kind)
                        if kind == "markdown":
                            markdown_content(content)
                        prepared.append((kind, name, content))
                finally:
                    os.close(fd)
            if sum(len(c) for k, _, c in prepared if k == "markdown") > MAX_BATCH:
                raise CommandError("O lote Markdown ultrapassa 16 MB.")
            # Check every collision before copying any file. Never overwrite sources.
            for kind, name, content in prepared:
                try:
                    with directory(project, kind, create=not options["dry_run"]) as fd:
                        try:
                            previous = read_at(fd, name, kind)
                        except FileNotFoundError:
                            continue
                        if previous != content:
                            raise CommandError(f"Já existe uma fonte diferente: {name}.")
                except FileNotFoundError:
                    continue
            if not options["dry_run"]:
                for kind, name, content in prepared:
                    with directory(project, kind) as fd:
                        try:
                            output = os.open(
                                name,
                                os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW,
                                0o600,
                                dir_fd=fd,
                            )
                        except FileExistsError:
                            continue
                        created.append((kind, name))
                        with os.fdopen(output, "wb") as stream:
                            stream.write(content)
        except (OSError, ValidationError, CommandError) as error:
            for kind, name in created:
                with directory(project, kind) as fd:
                    os.unlink(name, dir_fd=fd)
            raise CommandError(str(error)) from error
        self.stdout.write(
            f"{project.pk} · {project.title}: {len(prepared)} fontes verificadas; "
            f"{len(created)} copiadas. Originais preservados."
        )
