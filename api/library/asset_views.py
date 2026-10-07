from django.http import FileResponse, Http404
from rest_framework import viewsets
from rest_framework.decorators import action

from .asset_serializers import AssetSerializer
from .models import Asset


class AssetViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AssetSerializer

    def get_queryset(self):
        return Asset.objects.filter(family__owner=self.request.user)

    @action(detail=True, methods=["get"])
    def file(self, request, pk=None):
        asset = self.get_object()
        try:
            image = asset.file.open("rb")
        except FileNotFoundError as error:
            raise Http404("Arquivo não encontrado.") from error
        response = FileResponse(image, content_type=asset.mime_type, filename=asset.original_name)
        response["Cache-Control"] = "private, no-store"
        response["X-Content-Type-Options"] = "nosniff"
        return response
