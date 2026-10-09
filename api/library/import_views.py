"""Private import endpoints; parsing and domain operations stay outside the HTTP layer."""

from django.http import FileResponse, Http404, HttpResponse
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .epub_import.archive import read_package
from .epub_import.extraction import raster_image
from .epub_import.conversion import section_reading
from .import_errors import import_operation
from .import_serializers import (
    CleanImportSerializer,
    ExtractImportSerializer,
    ImportJobSerializer,
    ImportResourceSerializer,
    ImportSourceSerializer,
)
from .models import ImportJob
from .services.extraction import extract_texts, preview_extraction
from .services.import_sources import source_content, source_digest
from .services.import_targets import apply_to_target, target_group
from .services.imports import ImportConflict, clean_import


class ImportJobViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ImportJobSerializer

    def get_queryset(self):
        return ImportJob.objects.filter(project__owner=self.request.user).prefetch_related(
            "extractions"
        )

    @action(detail=True, methods=["get"])
    def section(self, request, pk=None):
        job = self.get_object()
        with import_operation("preview", "original", job):
            package = read_package(source_content(job, "original"))
            data = section_reading(package, request.query_params.get("href"),
                f"/api/library/epub-imports/{job.pk}/resource?source=original&source_sha256={job.sha256}&href=")
            if data is None:
                raise Http404("Seção não encontrada.")
        return Response(data)

    @action(detail=True, methods=["post"])
    def clean(self, request, pk=None):
        job = self.get_object()
        with import_operation("clean", "original", job):
            serializer = CleanImportSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            updated = clean_import(job, serializer.validated_data.get("sections"))
        return Response(self.get_serializer(updated).data)

    @action(detail=True, methods=["get"])
    def preview(self, request, pk=None):
        job = self.get_object()
        group = target_group(job.project, request.query_params.get("group"))
        serializer = ImportSourceSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        source = serializer.validated_data["source"]
        with import_operation("preview", source, job):
            data = preview_extraction(job, group, source)
        return Response(data)

    @action(detail=True, methods=["post"])
    def extract(self, request, pk=None):
        job = self.get_object()
        serializer = ExtractImportSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        with import_operation("extract", data["source"], job):
            receipt, created, group = apply_to_target(
                job.project,
                data,
                [str(job.pk), data["source"], data["source_sha256"]],
                lambda target: extract_texts(
                    job,
                    target,
                    source_sha256=data["source_sha256"],
                    group_state_token=data["group_state"],
                    mode=data.get("mode"),
                    confirm_existing=data["confirm_existing"],
                    source=data["source"],
                ),
            )
        return Response(
            {
                "project": job.project_id,
                "group": group.pk,
                "source": receipt.source_kind,
                "mode": receipt.mode,
                "text_ids": receipt.text_ids,
                "sections": receipt.sections,
                "reused": not created,
            },
            status=201 if created else 200,
        )

    @action(detail=True, methods=["get"])
    def original(self, request, pk=None):
        job = self.get_object()
        return self.download(job.original_file, job.original_name)

    @action(detail=True, methods=["get"], url_path="clean-file")
    def clean_file(self, request, pk=None):
        job = self.get_object()
        return self.download(job.clean_file, job.clean_filename)

    def download(self, field, filename):
        if not field.name:
            raise Http404("Arquivo ainda não disponível.")
        try:
            handle = field.open("rb")
        except FileNotFoundError as error:
            raise Http404("Arquivo não encontrado.") from error
        response = FileResponse(
            handle, content_type="application/epub+zip", as_attachment=True, filename=filename
        )
        response["Cache-Control"] = "private, no-store"
        response["X-Content-Type-Options"] = "nosniff"
        return response

    @action(detail=True, methods=["get"])
    def resource(self, request, pk=None):
        job = self.get_object()
        serializer = ImportResourceSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        source = serializer.validated_data["source"]
        with import_operation("resource", source, job):
            expected = serializer.validated_data.get("source_sha256")
            if expected and expected != source_digest(job, source):
                raise ImportConflict("O EPUB mudou. Atualize a prévia para consultar a imagem.")
            package = read_package(source_content(job, source))
            resource = package.resources.get(request.query_params.get("href"))
            if resource is None or not resource.mime_type.startswith("image/"):
                raise Http404("Imagem não encontrada.")
            content, mime_type = raster_image(resource)
        response = HttpResponse(content, content_type=mime_type)
        response["Cache-Control"] = "private, no-store"
        response["X-Content-Type-Options"] = "nosniff"
        return response
