from io import BytesIO
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch
from xml.etree import ElementTree as XML
from zipfile import ZipFile

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import SimpleTestCase, TestCase, override_settings
from PIL import Image
from rest_framework.test import APIClient

from .compilation import Manuscript, Section
from .epub import ImageResource, generate_epub
from .models import ExportArtifact, Text
from .services import create_project, new_version
from .services.assets import upload_cover


def image_bytes(format="PNG"):
    output = BytesIO()
    Image.new("RGB", (12, 16), "red").save(output, format=format)
    return output.getvalue()


class EpubEngineTests(SimpleTestCase):
    def test_markdown_headings_drive_chapters_and_toc_without_registered_titles(self):
        manuscript = Manuscript(
            "Registered project",
            "Registered subtitle",
            (
                Section(
                    1,
                    "Registered text",
                    "# Livro\n\nTexto[^a].\n\n## Parte\n\nMais.\n\n"
                    "# Outro\n\nFim.\n\n[^a]: Nota de rodapé.",
                ),
            ),
        )
        content = generate_epub(manuscript, identifier="test")
        with ZipFile(BytesIO(content)) as archive:
            chapters = sorted(name for name in archive.namelist() if "/chapter_" in name)
            self.assertEqual(len(chapters), 2)
            first, second = [archive.read(name).decode() for name in chapters]
            self.assertIn("Livro", first)
            self.assertIn("Outro", second)
            self.assertIn("chapter_002.xhtml#fn:a", first)
            self.assertIn("Nota de rodapé", second)
            all_content = "\n".join(
                archive.read(name).decode()
                for name in archive.namelist()
                if name.endswith((".xhtml", ".opf", ".ncx"))
            )
            self.assertNotIn("Registered", all_content)
            navigation = XML.fromstring(archive.read("EPUB/nav.xhtml"))
            self.assertIn("Parte", " ".join(navigation.itertext()))
            self.assertTrue(navigation.findall(".//{*}ol/{*}li/{*}ol/{*}li"))

    def test_preserves_plain_text_code_tables_and_pagebreaks(self):
        markdown = (
            "Texto inicial.\n\n```\n# Não é capítulo\n[[pagebreak]]\n```\n\n"
            "# Capítulo\n\n[[pagebreak]]\n\n| A | B |\n| --- | --- |\n| 1 | 2 |"
        )
        content = generate_epub(
            Manuscript("Unused", "", (Section(1, "Unused", markdown),)), identifier="plain"
        )
        with ZipFile(BytesIO(content)) as archive:
            chapters = sorted(name for name in archive.namelist() if "/chapter_" in name)
            self.assertEqual(len(chapters), 2)
            first, second = [archive.read(name).decode() for name in chapters]
            self.assertIn("Texto inicial", first)
            self.assertIn("# Não é capítulo", first)
            self.assertIn("[[pagebreak]]", first)
            self.assertIn('class="page-break"', second)
            self.assertIn("<table>", second)

    def test_embeds_png_cover_and_converts_webp_body_image(self):
        cover = ImageResource("cover", image_bytes(), "image/png")
        image = ImageResource("body", image_bytes("WEBP"), "image/webp")
        manuscript = Manuscript(
            "Unused",
            "",
            (Section(1, "Unused", "# Livro\n\n![Figura](/api/library/assets/body/file)"),),
        )
        content = generate_epub(manuscript, identifier="images", cover=cover, images=(image,))
        with ZipFile(BytesIO(content)) as archive:
            self.assertEqual(archive.read("EPUB/cover.png"), cover.content)
            with Image.open(BytesIO(archive.read("EPUB/images/body.png"))) as embedded:
                self.assertEqual(embedded.format, "PNG")
            self.assertIn(b"images/body.png", archive.read("EPUB/chapter_001.xhtml"))
            package = XML.fromstring(archive.read("EPUB/content.opf"))
            self.assertEqual(package.find("./{*}spine/{*}itemref").attrib["idref"], "cover")


class EpubExportTests(TestCase):
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
        self.endpoint = f"/api/library/projects/{self.project.pk}/epub/"

    def generate(self):
        response = self.client.post(self.endpoint)
        self.assertEqual(response.status_code, 200, response.data)
        return ExportArtifact.objects.get(project=self.project)

    def test_orders_saved_texts_excludes_variations_and_downloads_privately(self):
        second = Text.objects.create(
            project=self.project, markdown="# Segundo\n\nDois.", position=1
        )
        Text.objects.create(project=self.project, markdown="# Primeiro\n\nUm.", position=0)
        Text.objects.create(project=self.project, parent=second, markdown="# VARIATION")
        upload_cover(
            self.project, SimpleUploadedFile("cover.png", image_bytes(), content_type="image/png")
        )
        artifact = self.generate()
        self.assertTrue(artifact.file.name.startswith(f"projects/{self.project.family_id}/ebooks/"))
        with ZipFile(BytesIO(artifact.file.read())) as archive:
            self.assertIn(b"Primeiro", archive.read("EPUB/chapter_001.xhtml"))
            self.assertIn(b"Segundo", archive.read("EPUB/chapter_002.xhtml"))
            self.assertNotIn(b"VARIATION", archive.read("EPUB/nav.xhtml"))
        artifact.file.close()
        response = self.client.get(self.endpoint + "file/")
        downloaded = b"".join(response.streaming_content)
        response.close()
        self.assertEqual(downloaded, Path(artifact.file.path).read_bytes())
        self.assertIn("attachment", response["Content-Disposition"])
        self.assertIn("meu-livro.epub", response["Content-Disposition"])
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.post(self.endpoint).status_code, 404)
        self.assertEqual(self.client.get(self.endpoint + "file/").status_code, 404)
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(self.endpoint + "file/").status_code, 401)

    def test_regeneration_replaces_only_after_success_and_versions_start_without_epub(self):
        Text.objects.create(project=self.project, markdown="# Livro\n\nOriginal.")
        artifact = self.generate()
        old_path = Path(artifact.file.path)
        old_bytes = old_path.read_bytes()
        with patch("library.services.exports.generate_epub", side_effect=RuntimeError("failed")):
            with self.assertRaises(RuntimeError):
                self.client.post(self.endpoint)
        artifact.refresh_from_db()
        self.assertEqual(Path(artifact.file.path).read_bytes(), old_bytes)
        with patch(
            "library.services.exports.ExportArtifact.save", side_effect=RuntimeError("db failed")
        ):
            with self.assertRaises(RuntimeError):
                self.client.post(self.endpoint)
        self.assertEqual(list(old_path.parent.glob("*.epub")), [old_path])
        Text.objects.filter(project=self.project).update(markdown="# Livro\n\nEditado.")
        with self.captureOnCommitCallbacks(execute=True):
            replacement = self.generate()
        self.assertFalse(old_path.exists())
        self.assertNotEqual(Path(replacement.file.path).read_bytes(), old_bytes)
        self.assertFalse(ExportArtifact.objects.filter(project=new_version(self.project)).exists())
        with self.captureOnCommitCallbacks(execute=True):
            self.project.delete()
        self.assertFalse(Path(replacement.file.path).exists())

    def test_empty_project_returns_validation_error_without_creating_file(self):
        response = self.client.post(self.endpoint)
        self.assertEqual(response.status_code, 400)
        self.assertIn("Markdown", str(response.data))
        self.assertFalse(ExportArtifact.objects.exists())
