from rest_framework import serializers

from .models import ExportArtifact


class ExportArtifactSerializer(serializers.ModelSerializer):
    is_current = serializers.SerializerMethodField()
    source_sha256 = serializers.CharField(read_only=True)
    url = serializers.SerializerMethodField()

    class Meta:
        model = ExportArtifact
        fields = [
            "filename",
            "generation",
            "url",
            "created_at",
            "sha256",
            "compiler_version",
            "source_sha256",
            "is_current",
        ]

    def get_url(self, obj):
        return f"/api/library/groups/{obj.group_id}/epub/file"

    def get_is_current(self, obj):
        from .services.exports import export_state

        return obj.source_sha256 == export_state(obj.group)
