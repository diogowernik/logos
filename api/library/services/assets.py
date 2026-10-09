"""Book assets are shared and deduplicated within the private book."""

import hashlib

from django.core.files.base import ContentFile
from django.db import transaction

from ..models import Asset, Project


def store_image(project, name, content, mime_type, origin=None):
    # Callers wrap the complete operation in a transaction and compensate storage.
    Project.objects.select_for_update().get(pk=project.pk)
    checksum = hashlib.sha256(content).hexdigest()
    asset = Asset.objects.filter(project=project, sha256=checksum).first()
    if asset:
        if origin and origin not in asset.origins:
            asset.origins = [*asset.origins, origin]
            asset.save(update_fields=["origins"])
        return asset, False
    asset = Asset(
        project=project,
        original_name=name[:255],
        mime_type=mime_type,
        sha256=checksum,
        origins=[origin] if origin else [],
    )
    try:
        asset.file.save(name, ContentFile(content), save=False)
        asset.save()
    except Exception:
        if asset.file.name:
            asset.file.storage.delete(asset.file.name)
        raise
    return asset, True


def upload_cover(project, image):
    created = False
    asset = None
    try:
        with transaction.atomic():
            asset, created = store_image(
                project, image.name, image.read(), image.content_type, {"kind": "upload"}
            )
            project.cover = asset
            project.save(update_fields=["cover", "updated_at"])
    except Exception:
        if created:
            asset.file.storage.delete(asset.file.name)
        raise
    return project


def copy_assets(source, target):
    copied, mapping = [], {}
    try:
        for asset in source.assets.all():
            with asset.file.open("rb") as original:
                copy, created = store_image(
                    target,
                    asset.original_name,
                    original.read(),
                    asset.mime_type,
                    {"kind": "copy", "asset": str(asset.pk)},
                )
            if created:
                copied.append(copy)
            mapping[str(asset.pk)] = copy.pk
        target.cover_id = mapping.get(str(source.cover_id))
        target.save(update_fields=["cover"])
    except Exception:
        for asset in copied:
            asset.file.storage.delete(asset.file.name)
        raise
    return mapping
