"""Project actions inherit the owner's queryset; no public filesystem URLs."""

from django.http import HttpResponse
from django.utils.http import content_disposition_header
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from .import_errors import import_operation
from .import_serializers import ImportJobSerializer
from .services.import_targets import apply_to_target, target_group
from .services.local_sources import adopt_epub, epub_catalog
from .services.markdown_sources import import_markdowns, markdown_catalog, preview_markdowns
from .services.source_files import read_file, upload_markdowns
from .source_serializers import (
    LocalEpubSerializer,
    MarkdownImportSerializer,
    MarkdownSelectionSerializer,
)


class ProjectSourcesMixin:
    @action(detail=True, methods=["get"], url_path="local-epubs")
    def local_epubs(self, request, pk=None):
        with import_operation("discover", "original"):
            entries = epub_catalog(self.get_object())
        return Response(entries)

    @action(detail=True, methods=["post"], url_path="link-epub")
    def link_epub(self, request, pk=None):
        project = self.get_object()
        serializer = LocalEpubSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        with import_operation("adopt", "original"):
            job, created = adopt_epub(
                project, serializer.validated_data["name"], serializer.validated_data["sha256"]
            )
        return Response(ImportJobSerializer(job).data, status=201 if created else 200)

    @action(
        detail=True,
        methods=["get", "post"],
        url_path="markdown-files",
        parser_classes=[MultiPartParser, FormParser, JSONParser],
    )
    def markdown_files(self, request, pk=None):
        project = self.get_object()
        with import_operation(
            "markdown_upload" if request.method == "POST" else "discover", "markdown"
        ):
            if request.method == "POST":
                upload_markdowns(project, request.FILES.getlist("files"))
            entries = markdown_catalog(
                project, target_group(project, request.query_params.get("group"))
            )
        return Response(entries, status=201 if request.method == "POST" else 200)

    @action(detail=True, methods=["get"], url_path="markdown-file")
    def markdown_file(self, request, pk=None):
        name = request.query_params.get("name", "")
        with import_operation("resource", "markdown"):
            content = read_file(self.get_object(), "markdown", name)
        response = HttpResponse(content, content_type="text/plain; charset=utf-8")
        response["Content-Disposition"] = content_disposition_header(True, name)
        response["Cache-Control"] = "private, no-store"
        response["X-Content-Type-Options"] = "nosniff"
        return response

    @action(detail=True, methods=["post"], url_path="markdown-preview")
    def markdown_preview(self, request, pk=None):
        project = self.get_object()
        serializer = MarkdownSelectionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        with import_operation("preview", "markdown"):
            group = target_group(project, request.data.get("group"))
            result = preview_markdowns(project, serializer.validated_data["files"], group)
        return Response(result)

    @action(detail=True, methods=["post"], url_path="markdown-import")
    def markdown_import(self, request, pk=None):
        project = self.get_object()
        serializer = MarkdownImportSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        with import_operation("extract", "markdown"):
            receipt, created, group = apply_to_target(
                project,
                data,
                ["markdown", data["files"], data["source_sha256"]],
                lambda target: import_markdowns(
                    target,
                    data["files"],
                    data["source_sha256"],
                    data["group_state"],
                    data.get("mode"),
                    data["confirm_existing"],
                ),
            )
        return Response(
            {
                "project": project.pk,
                "group": group.pk,
                "source": "markdown",
                "mode": receipt.mode,
                "text_ids": [f["text"] for f in receipt.files],
                "reused": not created,
            },
            status=201 if created else 200,
        )
