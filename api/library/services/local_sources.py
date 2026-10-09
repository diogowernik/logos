"""EPUB discovery and explicit adoption of a family's original files."""

from pathlib import PurePosixPath

from .imports import ImportConflict, register_epub
from .source_files import digest, list_files, read_file, storage_name


def epub_catalog(project):
    jobs = list(project.family.imports.all())
    by_path = {job.original_file.name: job for job in jobs}
    by_digest = {job.sha256: job for job in jobs}
    entries = list_files(project, "epub")
    seen = set()
    for item in entries:
        path = storage_name(project, "epub", item["name"])
        job = by_path.get(path) or by_digest.get(item["sha256"])
        item["job"] = str(job.pk) if job else None
        item["display_name"] = job.original_name if job else item["name"]
        item["status"] = (
            "unregistered"
            if not job
            or (
                path != job.original_file.name
                and not job.original_file.storage.exists(job.original_file.name)
            )
            else ("registered" if job.sha256 == item["sha256"] else "changed")
        )
        seen.add(path)
    for path, job in by_path.items():
        if path not in seen:
            entries.append(
                {
                    "name": PurePosixPath(path).name,
                    "display_name": job.original_name,
                    "size": 0,
                    "sha256": job.sha256,
                    "job": str(job.pk),
                    "status": "missing",
                }
            )
    return entries


def adopt_epub(project, name, expected_sha):
    content = read_file(project, "epub", name)
    if digest(content) != expected_sha:
        raise ImportConflict("O arquivo mudou. Atualize a lista antes de vinculá-lo.")
    path = storage_name(project, "epub", name)
    previous = project.family.imports.filter(original_file=path).first()
    if previous and previous.sha256 != expected_sha:
        raise ImportConflict(
            "Esta fonte cadastrada foi alterada. Envie-a com outro nome para preservar o original."
        )
    return register_epub(project, content, name, existing_name=path)
