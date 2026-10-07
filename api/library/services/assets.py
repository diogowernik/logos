"""Project files: upload, cover selection, copying and storage lifecycle."""

from django.core.files import File
from django.db import transaction

from ..models import Asset


def upload_cover(project, image):
    asset = Asset(family=project.family, original_name=image.name, mime_type=image.content_type)
    try:
        with transaction.atomic():
            asset.file.save(image.name, image, save=False)
            asset.save()
            project.cover = asset
            project.save(update_fields=["cover", "updated_at"])
    except Exception:
        if asset.file.name:
            asset.file.delete(save=False)
        raise
    return project


def copy_assets(source, target):
    copied = []
    try:
        for asset in source.family.assets.all():
            copy = Asset(
                family=target.family,
                original_name=asset.original_name,
                mime_type=asset.mime_type,
            )
            with asset.file.open("rb") as original:
                copy.file.save(asset.original_name, File(original), save=False)
            copied.append(copy)
            copy.save()
            if source.cover_id == asset.id:
                target.cover = copy
        target.save(update_fields=["cover"])
    except Exception:
        for asset in copied:
            asset.file.delete(save=False)
        raise
