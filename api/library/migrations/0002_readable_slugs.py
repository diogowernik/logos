from django.db import migrations, models
from django.utils.text import slugify


def fill_slugs(apps, schema_editor):
    for name in ("Collection", "Project"):
        model = apps.get_model("library", name)
        used = {}
        for obj in model.objects.using(schema_editor.connection.alias).order_by("id").iterator():
            taken = used.setdefault(obj.owner_id, set())
            base = slugify(obj.title)[:240] or "sem-titulo"
            if base.isdecimal() or base == "inbox":
                base = f"titulo-{base}"[:240]
            candidate, suffix = base, 2
            while candidate in taken:
                candidate = f"{base}-{suffix}"
                suffix += 1
            taken.add(candidate)
            model.objects.using(schema_editor.connection.alias).filter(pk=obj.pk).update(
                slug=candidate
            )


class Migration(migrations.Migration):
    dependencies = [("library", "0001_initial")]
    operations = [
        migrations.AddField(
            model_name=name,
            name="slug",
            field=models.SlugField(max_length=250, editable=False, default=""),
            preserve_default=False,
        )
        for name in ("collection", "project")
    ] + [
        migrations.RunPython(fill_slugs, migrations.RunPython.noop),
        migrations.AddConstraint(
            model_name="collection",
            constraint=models.UniqueConstraint(
                fields=("owner", "slug"), name="collection_owner_slug"
            ),
        ),
        migrations.AddConstraint(
            model_name="project",
            constraint=models.UniqueConstraint(fields=("owner", "slug"), name="project_owner_slug"),
        ),
    ]
