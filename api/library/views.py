from django.db import transaction
from django.db.models import F, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from .models import Collection, Project, ProjectFamily, Text
from .serializers import CollectionSerializer, ProjectSerializer, TextSerializer, TextListSerializer
from .services import (
    compile_project,
    create_project,
    move_text,
    new_version,
    reorder_texts,
    restore_version,
)


class CollectionViewSet(viewsets.ModelViewSet):
    serializer_class = CollectionSerializer

    def get_queryset(self):
        return Collection.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class ProjectViewSet(viewsets.ModelViewSet):
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
        return Response(
            {
                "project": self.get_serializer(project).data,
                "texts": TextSerializer(project.texts.all(), many=True).data,
                "versions": self.get_serializer(
                    project.family.versions.order_by("-id"), many=True
                ).data,
            }
        )

    @action(detail=True, methods=["get"])
    def markdown(self, request, pk=None):
        return Response({"markdown": compile_project(self.get_object()).markdown()})

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
        original = self.get_object()
        with transaction.atomic():
            project = create_project(
                request.user, f"{original.title} — cópia", original.family.collection
            )
            project.subtitle, project.author = original.subtitle, original.author
            project.save()
            parents = {}
            for text in original.texts.filter(parent=None):
                parents[text.pk] = Text.objects.create(
                    project=project,
                    title=text.title,
                    markdown=text.markdown,
                    position=text.position,
                )
            for text in original.texts.exclude(parent=None):
                Text.objects.create(
                    project=project,
                    parent=parents[text.parent_id],
                    title=text.title,
                    markdown=text.markdown,
                    position=text.position,
                )
        return Response(self.get_serializer(project).data, status=201)

    @action(detail=True, methods=["post"])
    def reorder(self, request, pk=None):
        reorder_texts(self.get_object(), request.data.get("ids"))
        return Response({"ok": True})


class TextViewSet(viewsets.ModelViewSet):
    serializer_class = TextSerializer

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
                queryset = queryset.filter(Q(title__icontains=search) | Q(markdown__icontains=search))
            queryset = queryset.order_by("-last_used_at", "-id").defer("markdown")
        return queryset

    @action(detail=False, methods=["get"])
    def recent(self, request):
        return Response(self.get_serializer(self.get_queryset()[:12], many=True).data)

    @action(detail=True, methods=["post"])
    def open(self, request, pk=None):
        text = self.get_object()
        text.last_used_at = timezone.now()
        text.save(update_fields=["last_used_at"])
        return Response(self.get_serializer(text).data)

    @action(detail=True, methods=["post"])
    def duplicate(self, request, pk=None):
        text = self.get_object()
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
        move_text(text, project)
        return Response(self.get_serializer(text).data)
