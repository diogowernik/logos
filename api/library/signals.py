from django.db import transaction
from django.db.models.signals import post_delete
from django.dispatch import receiver

from .models import Asset, ExportArtifact, ImportJob


@receiver(post_delete, sender=Asset)
@receiver(post_delete, sender=ExportArtifact)
def delete_stored_file(sender, instance, **kwargs):
    if instance.file.name:
        storage, name = instance.file.storage, instance.file.name
        transaction.on_commit(lambda: storage.delete(name), robust=True)


@receiver(post_delete, sender=ImportJob)
def delete_import_files(sender, instance, **kwargs):
    for field in (instance.original_file, instance.clean_file):
        if field.name:
            storage, name = field.storage, field.name
            transaction.on_commit(lambda s=storage, n=name: s.delete(n), robust=True)
