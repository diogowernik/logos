from io import StringIO
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from .models import ImportJob, MarkdownImport, Text
from .services import create_group, create_project
from .test_imports import fixture


class SourceTests(TestCase):
    def test_delete_markdown_preserves_generated_texts_and_receipt(self):
        source = self.md / "01.md"
        source.write_text("# Revisado\nConteúdo preservado")
        preview = self.preview([source.name])
        self.assertEqual(self.apply(preview).status_code, 201)
        entry = self.get("markdown-files").data[0]
        response = self.client.delete(self.base + "markdown-file/", QUERY_STRING=f"name=01.md&sha256={entry['sha256']}")
        self.assertEqual(response.status_code, 204, response.data)
        self.assertFalse(source.exists())
        self.assertEqual(self.group.texts.get().markdown, "# Revisado\nConteúdo preservado")
        self.assertEqual(MarkdownImport.objects.filter(group=self.group).count(), 1)
        self.assertEqual(self.get("markdown-files").data, [])

    def test_delete_markdown_rejects_other_owner_changed_files_and_links(self):
        source = self.md / "01.md"
        source.write_text("# Original")
        entry = self.get("markdown-files").data[0]
        query = f"name=01.md&sha256={entry['sha256']}"
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.delete(self.base + "markdown-file/", QUERY_STRING=query).status_code, 404)
        self.client.force_authenticate(self.owner)
        source.write_text("# Corrigido")
        self.assertEqual(self.client.delete(self.base + "markdown-file/", QUERY_STRING=query).status_code, 409)
        self.assertTrue(source.exists())
        self.assertEqual(self.client.delete(self.base + "markdown-file/", QUERY_STRING=f"name=../01.md&sha256={entry['sha256']}").status_code, 400)
        link = self.md / "link.md"
        link.symlink_to(source)
        self.assertEqual(self.client.delete(self.base + "markdown-file/", QUERY_STRING=f"name=link.md&sha256={entry['sha256']}").status_code, 400)
        self.assertTrue(link.is_symlink())
        self.assertEqual(source.read_text(), "# Corrigido")

    def test_explicit_source_copy_preserves_archive_and_rejects_conflicting_files(self):
        archive = Path(self.tmp.name) / "archive/old-book"
        (archive / "sources/markdown").mkdir(parents=True)
        (archive / "originals").mkdir()
        md = archive / "sources/markdown/01.md"
        md.write_text("# Revisado")
        original, _ = fixture()
        (archive / "originals/original.epub").write_bytes(original)
        call_command(
            "copy_book_sources", self.project.pk, from_folder=str(archive), stdout=StringIO()
        )
        self.assertEqual((self.md / "01.md").read_text(), "# Revisado")
        self.assertEqual((self.originals / "original.epub").read_bytes(), original)
        self.assertTrue(md.exists())
        self.assertFalse(ImportJob.objects.exists())  # Link EPUB explicitly in the app.
        md.write_text("# Outra fonte")
        with self.assertRaises(CommandError):
            call_command("copy_book_sources", self.project.pk, from_folder=str(archive))
        self.assertEqual((self.md / "01.md").read_text(), "# Revisado")

    def setUp(self):
        self.tmp = TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        settings = override_settings(MEDIA_ROOT=self.tmp.name)
        settings.enable()
        self.addCleanup(settings.disable)
        self.owner = get_user_model().objects.create_user(username="source-owner")
        self.other = get_user_model().objects.create_user(username="source-other")
        self.project = create_project(self.owner, "Livro")
        self.group = self.project.default_group
        self.client = APIClient()
        self.client.force_authenticate(self.owner)
        self.originals = Path(self.tmp.name) / f"projects/{self.project.pk}/originals"
        self.md = Path(self.tmp.name) / f"projects/{self.project.pk}/sources/markdown"
        self.originals.mkdir(parents=True)
        self.md.mkdir(parents=True)
        self.base = f"/api/library/projects/{self.project.pk}/"

    def get(self, action, query=None):
        return self.client.get(self.base + action + "/", {"group": self.group.pk, **(query or {})})

    def post(self, action, data):
        return self.client.post(self.base + action + "/", data, format="json")

    def preview(self, names):
        result = self.post("markdown-preview", {"files": names, "group": self.group.pk})
        self.assertEqual(result.status_code, 200, result.data)
        return result.data

    def apply(self, preview, **extra):
        return self.post(
            "markdown-import",
            {
                "files": [s["href"] for s in preview["sections"]],
                "source_sha256": preview["source_sha256"],
                "group_state": preview["group_state"],
                "group": self.group.pk,
                **extra,
            },
        )

    def test_markdown_can_create_an_independent_group_and_retry(self):
        import uuid

        Text.objects.create(group=self.group, markdown="Final")
        (self.md / "01.md").write_text("# Revisado")
        preview = self.post("markdown-preview", {"files": ["01.md"]}).data
        payload = {k: preview[k] for k in ("source_sha256", "group_state")}
        payload.update(files=["01.md"], new_group_name="Revisado", operation_id=str(uuid.uuid4()))
        first = self.post("markdown-import", payload)
        self.assertEqual(first.status_code, 201, first.data)
        self.assertEqual(self.post("markdown-import", payload).status_code, 200)
        self.assertEqual(self.project.groups.count(), 2)
        self.assertEqual(self.group.texts.get().markdown, "Final")
        self.assertEqual(
            self.project.groups.get(pk=first.data["group"]).texts.get().markdown, "# Revisado"
        )
        payload["new_group_name"] = "Outra"
        self.assertEqual(self.post("markdown-import", payload).status_code, 409)

    def test_epub_discovery_adoption_reuses_file_and_uploader(self):
        content, _ = fixture()
        source = self.originals / "original.epub"
        source.write_bytes(content)
        listed = self.get("local-epubs").data[0]
        self.assertEqual(listed["status"], "unregistered")
        self.assertEqual(ImportJob.objects.count(), 0)
        adopted = self.post("link-epub", {"name": listed["name"], "sha256": listed["sha256"]})
        self.assertEqual(adopted.status_code, 201, adopted.data)
        job = ImportJob.objects.get()
        self.assertEqual(job.original_file.path, str(source))
        self.assertEqual(source.read_bytes(), content)
        self.assertEqual(self.get("local-epubs").data[0]["status"], "registered")
        upload = self.client.post(
            self.base + "imports/",
            {"file": SimpleUploadedFile("again.epub", content)},
            format="multipart",
        )
        self.assertEqual(upload.status_code, 200)
        self.assertEqual(str(job.pk), upload.data["id"])
        self.assertEqual(list(self.originals.iterdir()), [source])
        self.assertEqual(Text.objects.count(), 0)

    def test_epub_changed_missing_and_stale_registration(self):
        content, _ = fixture()
        source = self.originals / "original.epub"
        source.write_bytes(content)
        listed = self.get("local-epubs").data[0]
        source.write_bytes(content + b"changed")
        self.assertEqual(
            self.post(
                "link-epub", {"name": listed["name"], "sha256": listed["sha256"]}
            ).status_code,
            409,
        )
        source.write_bytes(content)
        self.post("link-epub", {"name": listed["name"], "sha256": listed["sha256"]})
        source.write_bytes(content + b"changed")
        self.assertEqual(self.get("local-epubs").data[0]["status"], "changed")
        source.unlink()
        self.assertEqual(self.get("local-epubs").data[0]["status"], "missing")

    def test_invalid_epub_does_not_register(self):
        (self.originals / "invalid.epub").write_bytes(b"wrong")
        listed = self.get("local-epubs").data[0]
        result = self.post("link-epub", {"name": listed["name"], "sha256": listed["sha256"]})
        self.assertEqual(result.status_code, 400)
        self.assertIn("diagnostic", result.data)
        self.assertEqual(ImportJob.objects.count(), 0)

    def test_private_routes_deny_other_owner_and_anonymous(self):
        self.client.force_authenticate(self.other)
        for endpoint in ("local-epubs", "markdown-files", "markdown-file"):
            self.assertEqual(self.get(endpoint, {"name": "a.md"}).status_code, 404)
        for endpoint, data in (
            ("link-epub", {}),
            ("markdown-preview", {}),
            ("markdown-import", {}),
        ):
            self.assertEqual(self.post(endpoint, data).status_code, 404)
        self.client.force_authenticate(None)
        self.assertEqual(self.get("markdown-files").status_code, 401)

    def test_paths_symlinks_and_hardlinks_are_not_accessible(self):
        outside = Path(self.tmp.name) / "secret.md"
        outside.write_text("private")
        (self.md / "link.md").symlink_to(outside)
        import os

        os.link(outside, self.md / "hard.md")
        (self.md / "directory.md").mkdir()
        self.assertEqual(self.get("markdown-files").data, [])
        for name in ("../secret.md", "link.md", "hard.md", "directory.md", "a\\b.md", "a.html"):
            self.assertEqual(self.get("markdown-file", {"name": name}).status_code, 400)
        (self.md / "link.md").unlink()
        (self.md / "hard.md").unlink()
        (self.md / "directory.md").rmdir()
        self.md.rmdir()
        self.md.symlink_to(outside.parent, target_is_directory=True)
        self.assertEqual(self.get("markdown-files").status_code, 400)

    def test_markdown_multi_upload_preserves_bytes_and_reuses_identical(self):
        files = [
            SimpleUploadedFile("02-ato.md", b"# Segundo\n\ntexto"),
            SimpleUploadedFile("01-ato.md", b"# Primeiro"),
        ]
        result = self.client.post(
            self.base + "markdown-files/", {"files": files}, format="multipart"
        )
        self.assertEqual(result.status_code, 201, result.data)
        self.assertEqual([f["name"] for f in result.data], ["01-ato.md", "02-ato.md"])
        repeat = self.client.post(
            self.base + "markdown-files/",
            {"files": [SimpleUploadedFile("01-ato.md", b"# Primeiro")]},
            format="multipart",
        )
        self.assertEqual(repeat.status_code, 201)
        self.assertEqual(Text.objects.count(), 0)
        download = self.get("markdown-file", {"name": "01-ato.md"})
        self.assertEqual(download.content, b"# Primeiro")
        self.assertEqual(download["X-Content-Type-Options"], "nosniff")
        self.assertIn("attachment", download["Content-Disposition"])

    def test_upload_collision_prevents_entire_batch_and_invalid_encoding(self):
        (self.md / "old.md").write_text("old")
        response = self.client.post(
            self.base + "markdown-files/",
            {
                "files": [
                    SimpleUploadedFile("new.md", b"new"),
                    SimpleUploadedFile("old.md", b"replacement"),
                ]
            },
            format="multipart",
        )
        self.assertEqual(response.status_code, 409)
        self.assertFalse((self.md / "new.md").exists())
        for data in (b"\xff", b"\0bad", b"   "):
            invalid = self.client.post(
                self.base + "markdown-files/",
                {"files": [SimpleUploadedFile("bad.md", data)]},
                format="multipart",
            )
            self.assertEqual(invalid.status_code, 400)
        self.assertEqual((self.md / "old.md").read_text(), "old")

    def test_preview_import_order_content_and_duplicate_protection(self):
        (self.md / "02-ato.md").write_text("## Parte\n\nSegunda", encoding="utf-8")
        (self.md / "01-ato.md").write_text("# Primeiro\n\n**Conteúdo**", encoding="utf-8")
        preview = self.preview(["02-ato.md", "01-ato.md"])
        self.assertEqual([s["href"] for s in preview["sections"]], ["01-ato.md", "02-ato.md"])
        first = self.apply(preview)
        self.assertEqual(first.status_code, 201, first.data)
        self.assertEqual(
            list(self.group.texts.values_list("markdown", flat=True)),
            ["# Primeiro\n\n**Conteúdo**", "## Parte\n\nSegunda"],
        )
        text = self.group.texts.first()
        text.markdown = "Revisado"
        text.save()
        repeat = self.apply(preview)
        self.assertEqual(repeat.status_code, 200)
        text.refresh_from_db()
        self.assertEqual(text.markdown, "Revisado")
        self.assertEqual(self.group.texts.count(), 2)
        # Overlapping batch includes the earlier receipt without duplicating its Text.
        partial = self.preview(["01-ato.md"])
        result = self.apply(partial, mode="append", confirm_existing=True)
        self.assertEqual(result.status_code, 201)
        self.assertEqual(self.group.texts.count(), 2)
        self.assertEqual(self.get("markdown-files").data[0]["status"], "imported")

    def test_existing_texts_require_choice_confirmation_and_replace_variations(self):
        parent = Text.objects.create(group=self.group, title="Original", markdown="keep")
        Text.objects.create(group=self.group, parent=parent, markdown="variation")
        (self.md / "a.md").write_text("# New")
        preview = self.preview(["a.md"])
        self.assertEqual(preview["existing_text_count"], 2)
        self.assertEqual(self.apply(preview).status_code, 409)
        self.assertEqual(self.apply(preview, mode="replace").status_code, 409)
        applied = self.apply(preview, mode="replace", confirm_existing=True)
        self.assertEqual(applied.status_code, 201)
        self.assertEqual(self.group.texts.count(), 1)
        self.assertEqual((self.md / "a.md").read_text(), "# New")

    def test_file_and_project_changes_invalidate_preview(self):
        path = self.md / "a.md"
        path.write_text("# Old")
        preview = self.preview(["a.md"])
        path.write_text("# Changed")
        self.assertEqual(self.apply(preview).status_code, 409)
        preview = self.preview(["a.md"])
        Text.objects.create(group=self.group, markdown="new draft")
        self.assertEqual(self.apply(preview, mode="append", confirm_existing=True).status_code, 409)
        self.assertEqual(MarkdownImport.objects.count(), 0)

    def test_deleted_imported_text_is_reported_without_recreation(self):
        (self.md / "a.md").write_text("# A")
        preview = self.preview(["a.md"])
        self.apply(preview)
        self.group.texts.all().delete()
        self.assertEqual(self.get("markdown-files").data[0]["status"], "text_missing")
        self.assertEqual(self.apply(preview).status_code, 409)
        self.assertEqual(self.group.texts.count(), 0)

    def test_versions_share_sources_but_have_independent_receipts(self):
        (self.md / "a.md").write_text("# A")
        preview = self.preview(["a.md"])
        self.apply(preview)
        version = create_group(self.project)
        self.group = version
        self.assertEqual(self.get("markdown-files").data[0]["status"], "new")
        result = self.apply(self.preview(["a.md"]))
        self.assertEqual(result.status_code, 201)
        self.assertEqual(self.project.default_group.texts.count(), 1)
        self.assertEqual(version.texts.count(), 1)

    def test_database_failure_rolls_back_replacement(self):
        old = Text.objects.create(group=self.group, markdown="preserve")
        (self.md / "a.md").write_text("# A")
        preview = self.preview(["a.md"])
        with patch(
            "library.services.markdown_sources.MarkdownImport.objects.create",
            side_effect=RuntimeError("fail"),
        ):
            response = self.apply(preview, mode="replace", confirm_existing=True)
        self.assertEqual(response.status_code, 500)
        self.assertTrue(Text.objects.filter(pk=old.pk).exists())
        self.assertEqual(MarkdownImport.objects.count(), 0)

    def test_missing_registered_epub_can_be_reconnected_by_checksum_after_rename(self):
        content, _ = fixture()
        source = self.originals / "source.epub"
        source.write_bytes(content)
        listed = self.get("local-epubs").data[0]
        created = self.post("link-epub", {"name": listed["name"], "sha256": listed["sha256"]})
        renamed = self.originals / "renamed.epub"
        source.rename(renamed)
        found = next(f for f in self.get("local-epubs").data if f["name"] == "renamed.epub")
        self.assertEqual(found["status"], "unregistered")
        linked = self.post("link-epub", {"name": found["name"], "sha256": found["sha256"]})
        self.assertEqual(linked.status_code, 200)
        self.assertEqual(linked.data["id"], created.data["id"])
        self.assertEqual(ImportJob.objects.get().original_file.path, str(renamed))
        self.assertEqual(len(self.get("local-epubs").data), 1)

    def test_batch_uses_natural_filename_order_and_title_without_chapter_splitting(self):
        for name in ("10-ato.md", "2-ato.md", "1-ato.md"):
            (self.md / name).write_text("# One\n\n# Two")
        preview = self.preview(["10-ato.md", "1-ato.md", "2-ato.md"])
        self.assertEqual(
            [s["href"] for s in preview["sections"]], ["1-ato.md", "2-ato.md", "10-ato.md"]
        )
        self.assertEqual(self.apply(preview).status_code, 201)
        self.assertEqual(self.group.texts.count(), 3)
        self.assertEqual(
            list(self.group.texts.values_list("title", flat=True)), ["1 ato", "2 ato", "10 ato"]
        )

    def test_first_markdown_upload_creates_missing_storage_directories(self):
        with override_settings(MEDIA_ROOT=str(Path(self.tmp.name) / "fresh-storage")):
            response = self.client.post(
                self.base + "markdown-files/",
                {"files": [SimpleUploadedFile("a.md", b"# A")]},
                format="multipart",
            )
            self.assertEqual(response.status_code, 201, response.data)
            self.assertEqual(response.data[0]["name"], "a.md")
