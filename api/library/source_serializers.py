from rest_framework import serializers

from .target_serializers import ImportTargetSerializer


class LocalEpubSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    sha256 = serializers.RegexField(r"^[a-f0-9]{64}$")


class MarkdownSelectionSerializer(serializers.Serializer):
    files = serializers.ListField(
        child=serializers.CharField(max_length=255), allow_empty=False, max_length=100
    )


class MarkdownImportSerializer(MarkdownSelectionSerializer, ImportTargetSerializer):
    source_sha256 = serializers.RegexField(r"^[a-f0-9]{64}$")
