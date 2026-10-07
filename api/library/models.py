from django.conf import settings
from django.db import models
from django.db.models import Q


class Collection(models.Model):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    title = models.CharField(max_length=250)
    description = models.TextField(blank=True)
    position = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["position", "id"]


class ProjectFamily(models.Model):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    collection = models.ForeignKey(Collection, null=True, blank=True, on_delete=models.SET_NULL)
    position = models.PositiveIntegerField(default=0)
    is_inbox = models.BooleanField(default=False)
    principal = models.OneToOneField(
        "Project", null=True, blank=True, on_delete=models.SET_NULL, related_name="principal_of"
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["owner"], condition=Q(is_inbox=True), name="one_inbox_per_user"
            )
        ]


class Project(models.Model):
    family = models.ForeignKey(ProjectFamily, related_name="versions", on_delete=models.CASCADE)
    title = models.CharField(max_length=250, default="Sem título")
    subtitle = models.CharField(max_length=500, blank=True)
    author = models.CharField(max_length=250, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class Text(models.Model):
    project = models.ForeignKey(Project, related_name="texts", on_delete=models.CASCADE)
    parent = models.ForeignKey(
        "self", null=True, blank=True, related_name="variations", on_delete=models.CASCADE
    )
    title = models.CharField(max_length=250, blank=True)
    markdown = models.TextField(blank=True)
    position = models.PositiveIntegerField(default=0)
    last_used_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["position", "id"]
