from rest_framework import serializers

from .models import Asset


class ImageUploadSerializer(serializers.Serializer):
    image = serializers.ImageField(
        error_messages={
            "invalid_image": "Escolha uma imagem JPEG, PNG ou WebP válida.",
        }
    )

    def validate_image(self, image):
        if image.size > 10 * 1024 * 1024:
            raise serializers.ValidationError("A imagem deve ter até 10 MB.")
        if image.content_type not in ("image/jpeg", "image/png", "image/webp"):
            raise serializers.ValidationError("Use uma imagem JPEG, PNG ou WebP.")
        return image


class AssetSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = Asset
        fields = ["id", "original_name", "mime_type", "url", "created_at"]

    def get_url(self, obj):
        return f"/api/library/assets/{obj.id}/file"
