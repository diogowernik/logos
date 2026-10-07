from rest_framework import serializers

from .models import ExportArtifact


class ExportArtifactSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = ExportArtifact
        fields = ["filename", "url", "created_at", "sha256", "compiler_version"]

    def get_url(self, obj):
        return f"/api/library/projects/{obj.project_id}/epub/file"
