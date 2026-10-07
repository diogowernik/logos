from rest_framework import serializers

from .models import Collection, Project, Text
from .compilation import Section
from .services import create_project, next_position


class CollectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Collection
        fields = ["id", "title", "description", "position"]


class TextSerializer(serializers.ModelSerializer):
    compiled_markdown = serializers.SerializerMethodField()

    class Meta:
        model = Text
        fields = ["id", "project", "parent", "title", "markdown", "position", "last_used_at", "compiled_markdown"]
        read_only_fields = ["position", "last_used_at"]

    def get_compiled_markdown(self, obj):
        return Section(obj.pk, obj.title, obj.markdown).content()

    def validate(self, data):
        project = data.get("project", self.instance.project if self.instance else None)
        parent = data.get("parent", self.instance.parent if self.instance else None)
        owner = self.context["request"].user
        if project.family.owner_id != owner.pk:
            raise serializers.ValidationError("Project inválido.")
        if self.instance and "project" in data and project.pk != self.instance.project_id:
            raise serializers.ValidationError("Use a ação de mover para trocar de Project.")
        if parent and (
            parent.parent_id
            or parent.project_id != project.pk
            or (
                self.instance
                and (parent.pk == self.instance.pk or self.instance.variations.exists())
            )
        ):
            raise serializers.ValidationError(
                "Uma variação deve pertencer a um texto principal do mesmo Project."
            )
        return data

    def create(self, validated_data):
        project = validated_data["project"]
        return Text.objects.create(**validated_data, position=next_position(project.texts.all()))

    def update(self, instance, validated_data):
        if instance.parent_id and "parent" in validated_data and validated_data["parent"] is None:
            validated_data["position"] = next_position(instance.project.texts.filter(parent=None))
        return super().update(instance, validated_data)


class TextListSerializer(serializers.ModelSerializer):
    project_title = serializers.CharField(source="project.title", read_only=True)
    is_loose = serializers.BooleanField(source="project.family.is_inbox", read_only=True)

    class Meta:
        model = Text
        fields = ["id", "project", "parent", "title", "position", "last_used_at", "project_title", "is_loose"]


class ProjectSerializer(serializers.ModelSerializer):
    collection = serializers.PrimaryKeyRelatedField(
        queryset=Collection.objects.all(), allow_null=True, required=False
    )
    family_id = serializers.IntegerField(read_only=True)
    is_principal = serializers.SerializerMethodField()
    is_inbox = serializers.BooleanField(source="family.is_inbox", read_only=True)
    text_count = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            "id",
            "family_id",
            "title",
            "subtitle",
            "author",
            "collection",
            "is_principal",
            "is_inbox",
            "text_count",
            "updated_at",
        ]
        extra_kwargs = {"title": {"required": False, "allow_blank": True}}

    def get_is_principal(self, obj):
        return obj.family.principal_id == obj.pk

    def get_text_count(self, obj):
        return obj.texts.filter(parent=None).count()

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["collection"] = instance.family.collection_id
        return data

    def validate_collection(self, collection):
        if collection and collection.owner_id != self.context["request"].user.pk:
            raise serializers.ValidationError("Collection inválida.")
        return collection

    def create(self, validated_data):
        collection = validated_data.pop("collection", None)
        project = create_project(
            self.context["request"].user, validated_data.pop("title", "Sem título"), collection
        )
        for key, value in validated_data.items():
            setattr(project, key, value)
        project.save()
        return project

    def update(self, instance, validated_data):
        if "collection" in validated_data:
            if instance.family.is_inbox:
                raise serializers.ValidationError(
                    "A Caixa de entrada não pertence a uma Collection."
                )
            instance.family.collection = validated_data.pop("collection")
            instance.family.save(update_fields=["collection"])
        if "title" in validated_data:
            validated_data["title"] = validated_data["title"] or "Sem título"
        return super().update(instance, validated_data)
