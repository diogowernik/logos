from django.db import transaction
from django.db.models import Q
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
from .models import Collection, ExportArtifact, Project, Text, TextGroup
from .serializers import (
    CollectionSerializer,
    ProjectSerializer,
    TextGroupSerializer,
    TextListSerializer,
    TextSerializer,
)
from .services import create_project, delete_project, duplicate_project, move_text, reorder_texts
from .services.assets import upload_cover
from .services.exports import delete_group_epub, export_group_epub
from .services.groups import compile_group, delete_group, duplicate_group, set_default_group
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
        queryset = Project.objects.filter(owner=self.request.user).select_related("default_group")
        if self.action == "list":
            queryset = queryset.filter(is_inbox=False)
            search = self.request.query_params.get("search", "").strip()
            if search:
                queryset = queryset.filter(
                    Q(title__icontains=search)
                    | Q(groups__texts__markdown__icontains=search)
                    | Q(groups__texts__title__icontains=search)
                ).distinct()
        return queryset

    def perform_destroy(self, instance):
        delete_project(instance)

    @action(detail=False, methods=["post"])
    def inbox(self, request):
        with transaction.atomic():
            project = Project.objects.filter(owner=request.user, is_inbox=True).first()
            if not project:
                project = create_project(request.user, "Caixa de entrada", is_inbox=True)
        return Response(self.get_serializer(project).data)

    @action(detail=True, methods=["get"])
    def content(self, request, pk=None):
        project = self.get_object()
        requested = request.query_params.get("group")
        group = get_object_or_404(project.groups.all(), pk=requested or project.default_group_id)
        artifact = ExportArtifact.objects.filter(group=group).first()
        return Response(
            {
                "project": self.get_serializer(project).data,
                "group": TextGroupSerializer(group).data,
                "groups": TextGroupSerializer(project.groups.all(), many=True).data,
                "texts": TextSerializer(group.texts.all(), many=True).data,
                "assets": AssetSerializer(project.assets.all(), many=True).data,
                "epub": ExportArtifactSerializer(artifact).data if artifact else None,
                "imports": ImportJobSerializer(
                    project.imports.prefetch_related("extractions"), many=True
                ).data,
            }
        )

    @action(detail=True, methods=["get", "post"], parser_classes=[MultiPartParser, FormParser])
    def imports(self, request, pk=None):
        project = self.get_object()
        if request.method == "GET":
            return Response(
                ImportJobSerializer(project.imports.prefetch_related("extractions"), many=True).data
            )
        serializer = EpubUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        with import_operation("upload", "original"):
            job, created = upload_epub(project, serializer.validated_data["file"])
        return Response(ImportJobSerializer(job).data, status=201 if created else 200)

    @action(
        detail=True,
        methods=["post", "delete"],
        parser_classes=[MultiPartParser, FormParser, JSONParser],
    )
    def cover(self, request, pk=None):
        project = self.get_object()
        if project.is_inbox:
            raise ValidationError("Escolha um livro para definir a capa.")
        if request.method == "DELETE":
            project.cover = None
            project.save(update_fields=["cover", "updated_at"])
        else:
            serializer = ImageUploadSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            upload_cover(project, serializer.validated_data["image"])
        return Response(self.get_serializer(project).data)

    @action(detail=True, methods=["post"])
    def duplicate(self, request, pk=None):
        return Response(
            self.get_serializer(duplicate_project(self.get_object(), request.user)).data, status=201
        )


class TextGroupViewSet(viewsets.ModelViewSet):
    serializer_class = TextGroupSerializer

    def get_queryset(self):
        queryset = TextGroup.objects.filter(project__owner=self.request.user).select_related(
            "project"
        )
        if self.request.query_params.get("project"):
            queryset = queryset.filter(project_id=self.request.query_params["project"])
        return queryset

    def perform_destroy(self, instance):
        delete_group(instance)

    @action(detail=True, methods=["post"])
    def default(self, request, pk=None):
        group = self.get_object()
        set_default_group(group)
        group.project.refresh_from_db()
        return Response(self.get_serializer(group).data)

    @action(detail=True, methods=["post"])
    def duplicate(self, request, pk=None):
        name = request.data.get("name")
        if name is not None and (not isinstance(name, str) or len(name) > 250):
            raise ValidationError("Nome de grupo inválido.")
        return Response(
            self.get_serializer(duplicate_group(self.get_object(), name=name)).data, status=201
        )

    @action(detail=True, methods=["post"])
    def reorder(self, request, pk=None):
        reorder_texts(self.get_object(), request.data.get("ids"))
        return Response({"ok": True})

    @action(detail=True, methods=["get"])
    def markdown(self, request, pk=None):
        return Response({"markdown": compile_group(self.get_object()).markdown()})

    @action(detail=True, methods=["post", "delete"])
    def epub(self, request, pk=None):
        group = self.get_object()
        if request.method == "DELETE":
            delete_group_epub(group)
            return Response(status=204)
        try:
            artifact = export_group_epub(group)
        except EpubGenerationError as error:
            raise ValidationError(str(error)) from error
        return Response(ExportArtifactSerializer(artifact).data)

    @action(detail=True, methods=["get"], url_path="epub/file")
    def epub_file(self, request, pk=None):
        artifact = get_object_or_404(ExportArtifact, group=self.get_object())
        try:
            file = artifact.file.open("rb")
        except FileNotFoundError as error:
            raise Http404("EPUB não encontrado. Gere novamente.") from error
        response = FileResponse(
            file,
            content_type="application/epub+zip",
            as_attachment=True,
            filename=artifact.filename,
        )
        response["Cache-Control"] = "private, no-store"
        response["X-Content-Type-Options"] = "nosniff"
        return response


class TextViewSet(viewsets.ModelViewSet):
    serializer_class = TextSerializer

    @transaction.atomic
    def perform_destroy(self, instance):
        locked_text(instance).delete()

    def get_serializer_class(self):
        return TextListSerializer if self.action in ("list", "recent") else TextSerializer

    def get_queryset(self):
        queryset = Text.objects.filter(group__project__owner=self.request.user).select_related(
            "group__project", "parent"
        )
        if self.action in ("list", "recent"):
            queryset = queryset.filter(parent=None)
            if self.request.query_params.get("loose") == "1":
                queryset = queryset.filter(group__project__is_inbox=True)
            if self.request.query_params.get("group"):
                queryset = queryset.filter(group_id=self.request.query_params["group"])
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
            group=text.group,
            parent=text.parent or text,
            title=text.title,
            markdown=text.markdown,
            position=text.position,
            origin=text.origin,
        )
        return Response(self.get_serializer(copy).data, status=201)

    @action(detail=True, methods=["post"])
    def move(self, request, pk=None):
        if request.data.get("group"):
            group = get_object_or_404(
                TextGroup, pk=request.data["group"], project__owner=request.user
            )
        else:
            project = get_object_or_404(Project, pk=request.data.get("project"), owner=request.user)
            group = project.default_group
        return Response(self.get_serializer(move_text(self.get_object(), group)).data)
