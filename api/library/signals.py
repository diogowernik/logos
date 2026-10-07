from django.db import transaction
from django.db.models.signals import post_delete
from django.dispatch import receiver

from .models import Asset, ExportArtifact


@receiver(post_delete, sender=Asset)
@receiver(post_delete, sender=ExportArtifact)
def delete_stored_file(sender, instance, **kwargs):
    if instance.file.name:
        storage, name = instance.file.storage, instance.file.name
        transaction.on_commit(lambda: storage.delete(name), robust=True)
