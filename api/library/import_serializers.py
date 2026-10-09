from rest_framework import serializers

from .epub_import.archive import MAX_UPLOAD
from .models import ImportJob
from .services.import_sources import DEFAULT_SOURCE, SOURCE_CHOICES


class EpubUploadSerializer(serializers.Serializer):
    file = serializers.FileField()

    def validate_file(self, value):
        if value.size > MAX_UPLOAD:
            raise serializers.ValidationError("O EPUB deve ter até 50 MB.")
        if not value.name.lower().endswith(".epub"):
            raise serializers.ValidationError("Escolha um arquivo .epub.")
        return value


class CleanImportSerializer(serializers.Serializer):
    sections = serializers.ListField(
        child=serializers.CharField(max_length=1000),
        required=False,
        allow_empty=False,
        max_length=5000,
    )


class ImportSourceSerializer(serializers.Serializer):
    source = serializers.ChoiceField(choices=SOURCE_CHOICES, default=DEFAULT_SOURCE)


class ImportResourceSerializer(ImportSourceSerializer):
    source_sha256 = serializers.RegexField(r"^[a-f0-9]{64}$", required=False)


class ExtractImportSerializer(ImportSourceSerializer):
    project = serializers.IntegerField(min_value=1)
    source_sha256 = serializers.RegexField(r"^[a-f0-9]{64}$")
    project_state = serializers.RegexField(r"^[a-f0-9]{64}$")
    mode = serializers.ChoiceField(choices=["append", "replace"], required=False)
    confirm_existing = serializers.BooleanField(default=False)


class ImportJobSerializer(serializers.ModelSerializer):
    original_url = serializers.SerializerMethodField()
    clean_url = serializers.SerializerMethodField()
    extractions = serializers.SerializerMethodField()

    class Meta:
        model = ImportJob
        fields = [
            "id",
            "original_name",
            "sha256",
            "inspection",
            "original_url",
            "clean_filename",
            "clean_sha256",
            "clean_generation",
            "clean_report",
            "clean_url",
            "status",
            "error",
            "error_diagnostic",
            "extractions",
            "created_at",
            "updated_at",
        ]

    def get_original_url(self, obj):
        return f"/api/library/epub-imports/{obj.pk}/original"

    def get_clean_url(self, obj):
        return f"/api/library/epub-imports/{obj.pk}/clean-file" if obj.clean_file else None

    def get_extractions(self, obj):
        return list(
            obj.extractions.values(
                "project_id",
                "source_kind",
                "source_sha256",
                "mode",
                "text_ids",
                "sections",
                "created_at",
            )
        )
