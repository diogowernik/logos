from rest_framework import serializers


class LocalEpubSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    sha256 = serializers.RegexField(r"^[a-f0-9]{64}$")


class MarkdownSelectionSerializer(serializers.Serializer):
    files = serializers.ListField(
        child=serializers.CharField(max_length=255), allow_empty=False, max_length=100
    )


class MarkdownImportSerializer(MarkdownSelectionSerializer):
    source_sha256 = serializers.RegexField(r"^[a-f0-9]{64}$")
    project_state = serializers.RegexField(r"^[a-f0-9]{64}$")
    mode = serializers.ChoiceField(choices=["append", "replace"], required=False)
    confirm_existing = serializers.BooleanField(default=False)
