from io import BytesIO
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from PIL import Image
from rest_framework.test import APIClient

from .models import Asset, Project
from .services import create_group, create_project
from .services.projects import duplicate_project


class ProjectCoverTests(TestCase):
    def test_failed_book_duplication_removes_copied_files_and_keeps_source(self):
        asset, content = self.upload()
        before = set(Path(asset.file.storage.location).rglob("*.png"))
        with patch("library.services.groups.duplicate_group", side_effect=RuntimeError("failed")):
            with self.assertRaises(RuntimeError):
                duplicate_project(self.project, self.user)
        self.assertEqual(Project.objects.count(), 1)
        self.assertEqual(set(Path(asset.file.storage.location).rglob("*.png")), before)
        self.assertEqual(Path(asset.file.path).read_bytes(), content)

    def setUp(self):
        directory = TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        settings = override_settings(MEDIA_ROOT=directory.name)
        settings.enable()
        self.addCleanup(settings.disable)
        self.user = get_user_model().objects.create_user(username="writer")
        self.other = get_user_model().objects.create_user(username="other")
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        self.project = create_project(self.user, "Meu livro")
        self.group = self.project.default_group

    def upload(self, project=None, color="red"):
        content = BytesIO()
        Image.new("RGB", (12, 16), color).save(content, format="PNG")
        image = SimpleUploadedFile("capa.png", content.getvalue(), content_type="image/png")
        response = self.client.post(
            f"/api/library/projects/{(project or self.project).pk}/cover/",
            {"image": image},
            format="multipart",
        )
        self.assertEqual(response.status_code, 200, response.data)
        return Asset.objects.get(pk=response.data["cover"]), content.getvalue()

    def test_upload_and_private_download_preserve_image(self):
        asset, content = self.upload()
        self.assertEqual(asset.file.name, f"projects/{self.project.pk}/images/{asset.pk}.png")
        self.assertEqual(Path(asset.file.path).read_bytes(), content)
        endpoint = f"/api/library/assets/{asset.pk}/file/"
        response = self.client.get(endpoint)
        self.assertEqual(b"".join(response.streaming_content), content)
        response.close()
        self.assertEqual(response["Content-Type"], "image/png")
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.get(endpoint).status_code, 404)
        self.assertEqual(
            self.client.get(f"/api/library/projects/{self.project.pk}/content/").status_code, 404
        )
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(endpoint).status_code, 401)

    def test_replacement_keeps_files_and_rejects_invalid_or_foreign_cover(self):
        first, _ = self.upload()
        second, _ = self.upload(color="blue")
        endpoint = f"/api/library/projects/{self.project.pk}/"
        response = self.client.patch(endpoint, {"cover": str(first.pk)}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(Path(second.file.path).exists())
        invalid = SimpleUploadedFile("bad.png", b"not an image", content_type="image/png")
        self.assertEqual(
            self.client.post(
                endpoint + "cover/", {"image": invalid}, format="multipart"
            ).status_code,
            400,
        )
        self.project.refresh_from_db()
        self.assertEqual(self.project.cover_id, first.pk)
        self.assertEqual(self.project.assets.count(), 2)
        foreign = create_project(self.other)
        self.assertEqual(
            self.client.patch(
                f"/api/library/projects/{foreign.pk}/", {"cover": str(first.pk)}, format="json"
            ).status_code,
            404,
        )
        same_owner = create_project(self.user)
        self.assertEqual(
            self.client.patch(
                f"/api/library/projects/{same_owner.pk}/", {"cover": str(first.pk)}, format="json"
            ).status_code,
            400,
        )
        self.client.patch(endpoint, {"cover": None}, format="json")
        self.assertTrue(Path(first.file.path).exists())

    def test_versions_share_assets_and_copies_survive_original_deletion(self):
        asset, content = self.upload()
        self.project.refresh_from_db()
        version = create_group(self.project)
        self.assertEqual(version.effective_cover.pk, asset.pk)
        self.assertEqual(version.texts.count(), 0)
        self.assertEqual(version.project.assets.count(), 1)
        response = self.client.post(f"/api/library/projects/{self.project.pk}/duplicate/")
        self.assertEqual(response.status_code, 201)
        copied = Project.objects.get(pk=response.data["id"])
        self.assertNotEqual(copied.pk, self.project.pk)
        self.assertNotEqual(copied.cover_id, asset.pk)
        self.assertEqual(Path(copied.cover.file.path).read_bytes(), content)
        with self.captureOnCommitCallbacks(execute=True):
            self.assertEqual(
                self.client.delete(f"/api/library/projects/{self.project.pk}/").status_code, 204
            )
        self.assertFalse(Path(asset.file.path).exists())
        self.assertEqual(Path(copied.cover.file.path).read_bytes(), content)
