from django.db import transaction
from django.db.models import F, Q
from django.http import FileResponse, Http404
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from .asset_serializers import AssetSerializer, ImageUploadSerializer
from .epub import EpubGenerationError
from .export_serializers import ExportArtifactSerializer
from .import_errors import import_operation
from .import_serializers import EpubUploadSerializer, ImportJobSerializer
from .models import Collection, ExportArtifact, Project, ProjectFamily, Text
from .serializers import CollectionSerializer, ProjectSerializer, TextListSerializer, TextSerializer
from .services import (
    compile_project,
    create_project,
    duplicate_project,
    move_text,
    new_version,
    reorder_texts,
    restore_version,
)
from .services.assets import upload_cover
from .services.exports import delete_project_epub, export_project_epub
from .services.imports import upload_epub
from .services.texts import locked_text
from .source_views import ProjectSourcesMixin


class CollectionViewSet(viewsets.ModelViewSet):
    serializer_class = CollectionSerializer

    def get_queryset(self):
        return Collection.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class ProjectViewSet(ProjectSourcesMixin, viewsets.ModelViewSet):
    serializer_class = ProjectSerializer

    def get_queryset(self):
        queryset = Project.objects.filter(family__owner=self.request.user).select_related("family")
        if self.action == "list":
            queryset = queryset.filter(pk=F("family__principal_id"), family__is_inbox=False)
            search = self.request.query_params.get("search", "").strip()
            if search:
                queryset = queryset.filter(
                    Q(title__icontains=search)
                    | Q(texts__markdown__icontains=search)
                    | Q(texts__title__icontains=search)
                ).distinct()
        return queryset.order_by("family__position", "id")

    def perform_destroy(self, instance):
        if instance.family.is_inbox:
            raise ValidationError("A Caixa de entrada não pode ser excluída.")
        if instance.family.principal_id == instance.pk:
            instance.family.delete()
        else:
            instance.delete()

    @action(detail=False, methods=["post"])
    def inbox(self, request):
        with transaction.atomic():
            family = ProjectFamily.objects.filter(owner=request.user, is_inbox=True).first()
            project = (
                family.principal
                if family
                else create_project(request.user, "Caixa de entrada", is_inbox=True)
            )
        return Response(self.get_serializer(project).data)

    @action(detail=True, methods=["get"])
    def content(self, request, pk=None):
        project = self.get_object()
        artifact = ExportArtifact.objects.filter(project=project).first()
        return Response(
            {
                "project": self.get_serializer(project).data,
                "texts": TextSerializer(project.texts.all(), many=True).data,
                "versions": self.get_serializer(
                    project.family.versions.order_by("-id"), many=True
                ).data,
                "assets": AssetSerializer(project.family.assets.all(), many=True).data,
                "epub": ExportArtifactSerializer(artifact).data if artifact else None,
                "imports": ImportJobSerializer(
                    project.family.imports.prefetch_related("extractions"), many=True
                ).data,
            }
        )

    @action(detail=True, methods=["get"])
    def markdown(self, request, pk=None):
        return Response({"markdown": compile_project(self.get_object()).markdown()})

    @action(detail=True, methods=["get", "post"], parser_classes=[MultiPartParser, FormParser])
    def imports(self, request, pk=None):
        project = self.get_object()
        if request.method == "GET":
            return Response(
                ImportJobSerializer(
                    project.family.imports.prefetch_related("extractions"), many=True
                ).data
            )
        serializer = EpubUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        with import_operation("upload", "original"):
            job, created = upload_epub(project, serializer.validated_data["file"])
        return Response(ImportJobSerializer(job).data, status=201 if created else 200)

    @action(detail=True, methods=["post", "delete"])
    def epub(self, request, pk=None):
        project = self.get_object()
        if request.method == "DELETE":
            delete_project_epub(project)
            return Response(status=204)
        try:
            artifact = export_project_epub(project)
        except EpubGenerationError as error:
            raise ValidationError(str(error)) from error
        return Response(ExportArtifactSerializer(artifact).data)

    @action(detail=True, methods=["get"], url_path="epub/file")
    def epub_file(self, request, pk=None):
        artifact = get_object_or_404(ExportArtifact, project=self.get_object())
        try:
            file = artifact.file.open("rb")
        except FileNotFoundError as error:
            raise Http404("EPUB não encontrado. Gere o arquivo novamente.") from error
        response = FileResponse(
            file,
            content_type="application/epub+zip",
            as_attachment=True,
            filename=artifact.filename,
        )
        response["Cache-Control"] = "private, no-store"
        response["X-Content-Type-Options"] = "nosniff"
        return response

    @action(
        detail=True,
        methods=["post", "delete"],
        parser_classes=[MultiPartParser, FormParser, JSONParser],
    )
    def cover(self, request, pk=None):
        project = self.get_object()
        if project.family.is_inbox:
            raise ValidationError("Escolha um projeto para definir a capa.")
        if request.method == "DELETE":
            project.cover = None
            project.save(update_fields=["cover", "updated_at"])
        else:
            serializer = ImageUploadSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            upload_cover(project, serializer.validated_data["image"])
        return Response(self.get_serializer(project).data)

    @action(detail=True, methods=["post"], url_path="new-version")
    def new_version(self, request, pk=None):
        return Response(self.get_serializer(new_version(self.get_object())).data, status=201)

    @action(detail=True, methods=["post"])
    def restore(self, request, pk=None):
        project = self.get_object()
        restore_version(project)
        project.refresh_from_db()
        return Response(self.get_serializer(project).data)

    @action(detail=True, methods=["post"])
    def duplicate(self, request, pk=None):
        project = duplicate_project(self.get_object(), request.user)
        return Response(self.get_serializer(project).data, status=201)

    @action(detail=True, methods=["post"])
    def reorder(self, request, pk=None):
        reorder_texts(self.get_object(), request.data.get("ids"))
        return Response({"ok": True})


class TextViewSet(viewsets.ModelViewSet):
    serializer_class = TextSerializer

    @transaction.atomic
    def perform_destroy(self, instance):
        locked_text(instance).delete()

    def get_serializer_class(self):
        return TextListSerializer if self.action in ("list", "recent") else TextSerializer

    def get_queryset(self):
        queryset = Text.objects.filter(project__family__owner=self.request.user).select_related(
            "project__family", "parent"
        )
        if self.action in ("list", "recent"):
            queryset = queryset.filter(parent=None, project_id=F("project__family__principal_id"))
            if self.request.query_params.get("loose") == "1":
                queryset = queryset.filter(project__family__is_inbox=True)
            search = self.request.query_params.get("search", "").strip()
            if search:
                queryset = queryset.filter(
                    Q(title__icontains=search) | Q(markdown__icontains=search)
                )
            queryset = queryset.order_by("-last_used_at", "-id").defer("markdown")
        return queryset

    @action(detail=False, methods=["get"])
    def recent(self, request):
        return Response(self.get_serializer(self.get_queryset()[:12], many=True).data)

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def open(self, request, pk=None):
        text = locked_text(self.get_object())
        text.last_used_at = timezone.now()
        text.save(update_fields=["last_used_at"])
        return Response(self.get_serializer(text).data)

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def duplicate(self, request, pk=None):
        text = locked_text(self.get_object())
        copy = Text.objects.create(
            project=text.project,
            parent=text.parent or text,
            title=text.title,
            markdown=text.markdown,
            position=text.position,
        )
        return Response(self.get_serializer(copy).data, status=201)

    @action(detail=True, methods=["post"])
    def move(self, request, pk=None):
        project = get_object_or_404(
            Project, pk=request.data.get("project"), family__owner=request.user
        )
        text = self.get_object()
        text = move_text(text, project)
        return Response(self.get_serializer(text).data)
