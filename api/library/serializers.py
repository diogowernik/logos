from django.db import transaction
from rest_framework import serializers

from .compilation import Section
from .models import Collection, Project, Text, TextGroup
from .services import create_project, next_position
from .services.groups import create_group
from .services.texts import locked_text


class CollectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Collection
        fields = ["id", "slug", "title", "description", "position"]
        read_only_fields = ["slug"]


class TextSerializer(serializers.ModelSerializer):
    project = serializers.IntegerField(source="group.project_id", read_only=True)
    compiled_markdown = serializers.SerializerMethodField()

    class Meta:
        model = Text
        fields = [
            "id",
            "project",
            "group",
            "parent",
            "title",
            "markdown",
            "position",
            "origin",
            "last_used_at",
            "compiled_markdown",
        ]
        read_only_fields = ["position", "origin", "last_used_at"]

    def get_compiled_markdown(self, obj):
        return Section(obj.pk, obj.title, obj.markdown).content()

    def validate(self, data):
        group = data.get("group", self.instance.group if self.instance else None)
        parent = data.get("parent", self.instance.parent if self.instance else None)
        if not group or group.project.owner_id != self.context["request"].user.pk:
            raise serializers.ValidationError("Grupo inválido.")
        if self.instance and group.pk != self.instance.group_id:
            raise serializers.ValidationError("Use a ação de mover para trocar de grupo.")
        if parent and (
            parent.parent_id
            or parent.group_id != group.pk
            or (
                self.instance
                and (parent.pk == self.instance.pk or self.instance.variations.exists())
            )
        ):
            raise serializers.ValidationError(
                "Uma variação deve pertencer a um texto principal do mesmo grupo."
            )
        return data

    @transaction.atomic
    def create(self, validated_data):
        group = validated_data["group"]
        TextGroup.objects.select_for_update().get(pk=group.pk)
        self.validate(validated_data)
        return Text.objects.create(**validated_data, position=next_position(group.texts.all()))

    @transaction.atomic
    def update(self, instance, validated_data):
        instance = locked_text(instance)
        self.instance = instance
        self.validate(validated_data)
        if instance.parent_id and validated_data.get("parent", instance.parent) is None:
            validated_data["position"] = next_position(instance.group.texts.filter(parent=None))
        return super().update(instance, validated_data)


class TextListSerializer(serializers.ModelSerializer):
    project = serializers.IntegerField(source="group.project_id", read_only=True)
    project_title = serializers.CharField(source="group.project.title", read_only=True)
    group_name = serializers.CharField(source="group.name", read_only=True)
    is_loose = serializers.BooleanField(source="group.project.is_inbox", read_only=True)

    class Meta:
        model = Text
        fields = [
            "id",
            "project",
            "group",
            "parent",
            "title",
            "position",
            "last_used_at",
            "project_title",
            "group_name",
            "is_loose",
        ]


class ProjectSerializer(serializers.ModelSerializer):
    slug = serializers.CharField(read_only=True)
    cover_url = serializers.SerializerMethodField()
    text_count = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            "slug",
            "id",
            "title",
            "subtitle",
            "author",
            "collection",
            "position",
            "is_inbox",
            "default_group",
            "text_count",
            "updated_at",
            "cover",
            "cover_url",
        ]
        read_only_fields = ["position", "is_inbox", "default_group", "updated_at"]
        extra_kwargs = {"title": {"required": False, "allow_blank": True}}

    def get_text_count(self, obj):
        return obj.default_group.texts.filter(parent=None).count() if obj.default_group_id else 0

    def get_cover_url(self, obj):
        return f"/api/library/assets/{obj.cover_id}/file" if obj.cover_id else None

    def validate_cover(self, asset):
        if asset and (not self.instance or asset.project_id != self.instance.pk):
            raise serializers.ValidationError("Escolha uma imagem deste livro.")
        return asset

    def validate_collection(self, collection):
        if collection and collection.owner_id != self.context["request"].user.pk:
            raise serializers.ValidationError("Collection inválida.")
        if self.instance and self.instance.is_inbox and collection:
            raise serializers.ValidationError("Textos soltos não pertencem a uma Collection.")
        return collection

    def create(self, validated_data):
        project = create_project(
            self.context["request"].user,
            validated_data.pop("title", "Sem título"),
            validated_data.pop("collection", None),
        )
        for key, value in validated_data.items():
            setattr(project, key, value)
        project.save()
        return project

    @transaction.atomic
    def update(self, instance, validated_data):
        instance = Project.objects.select_for_update().get(pk=instance.pk)
        if "title" in validated_data:
            validated_data["title"] = validated_data["title"] or "Sem título"
        return super().update(instance, validated_data)


class TextGroupSerializer(serializers.ModelSerializer):
    is_default = serializers.SerializerMethodField()
    text_count = serializers.SerializerMethodField()

    class Meta:
        model = TextGroup
        fields = [
            "id",
            "project",
            "name",
            "export_title",
            "export_subtitle",
            "export_author",
            "cover",
            "is_default",
            "text_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def get_is_default(self, obj):
        return obj.project.default_group_id == obj.pk

    def get_text_count(self, obj):
        return obj.texts.filter(parent=None).count()

    def validate(self, data):
        project = data.get("project", self.instance.project if self.instance else None)
        if not project or project.owner_id != self.context["request"].user.pk:
            raise serializers.ValidationError("Livro inválido.")
        if self.instance and project.pk != self.instance.project_id:
            raise serializers.ValidationError("Um grupo não pode mudar de livro.")
        if data.get("cover") and data["cover"].project_id != project.pk:
            raise serializers.ValidationError("Escolha uma imagem deste livro.")
        return data

    @transaction.atomic
    def create(self, validated_data):
        group = create_group(validated_data.pop("project"), validated_data.pop("name", "Textos"))
        for key, value in validated_data.items():
            setattr(group, key, value)
        group.save()
        return group

    @transaction.atomic
    def update(self, instance, validated_data):
        Project.objects.select_for_update().get(pk=instance.project_id)
        instance = TextGroup.objects.select_for_update().get(pk=instance.pk)
        return super().update(instance, validated_data)
