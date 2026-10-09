from io import BytesIO
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch
from xml.etree import ElementTree as XML
from zipfile import ZipFile

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import transaction
from django.test import SimpleTestCase, TestCase, override_settings
from PIL import Image
from rest_framework.test import APIClient

from .compilation import Manuscript, Section
from .epub import ImageResource, generate_epub
from .models import ExportArtifact, Text
from .services import compile_group, create_group, create_project
from .services.assets import upload_cover
from .services.exports import delete_group_epub


def image_bytes(format="PNG"):
    output = BytesIO()
    Image.new("RGB", (12, 16), "red").save(output, format=format)
    return output.getvalue()


class EpubEngineTests(SimpleTestCase):
    def test_reference_labels_in_urls_and_html_are_not_rewritten(self):
        body = (
            '# First\n\n[Caption](https://example.com/[source] "[source]")\n\n'
            "[Link][source]\n\n[source]: https://example.com/[source]\n\n"
            '<span title="[source]">Visible</span>\n\n'
            "    [source]: https://example.com/code\n    [source]\n"
        )
        manuscript = Manuscript(
            "Unused",
            "",
            (
                Section(1, "Unused", body),
                Section(
                    2,
                    "Unused",
                    "# Second\n\n[Link][source]\n\n[source]: https://example.com/second",
                ),
            ),
        )
        compiled = manuscript.markdown()
        self.assertIn('[Caption](https://example.com/[source] "[source]")', compiled)
        self.assertIn('<span title="[source]">Visible</span>', compiled)
        self.assertIn("    [source]: https://example.com/code\n    [source]", compiled)
        content = generate_epub(manuscript, identifier="literal-urls")
        with ZipFile(BytesIO(content)) as archive:
            first = XML.fromstring(archive.read("EPUB/chapter_001.xhtml"))
            links = first.findall(".//{*}a")
            self.assertEqual(
                [link.get("href") for link in links],
                ["https://example.com/[source]", "https://example.com/[source]"],
            )
            self.assertEqual(links[0].get("title"), "[source]")

    def test_local_footnote_and_reference_definitions_survive_shared_compilation(self):
        sections = tuple(
            Section(
                index,
                "Unused",
                f"# Parte {index}\n\nLink [Fonte][source] e nota[^a].\n\n"
                f"[source]: https://example.com/{index}\n\n[^a]: Nota da parte {index}.",
            )
            for index in (1, 2)
        )
        manuscript = Manuscript("Unused", "", sections)
        content = generate_epub(manuscript, identifier="scopes")
        with ZipFile(BytesIO(content)) as archive:
            documents = [
                XML.fromstring(archive.read(f"EPUB/chapter_{index:03}.xhtml")) for index in (1, 2)
            ]
            for index, document in enumerate(documents, 1):
                links = document.findall(".//{*}a")
                self.assertIn(f"https://example.com/{index}", [link.get("href") for link in links])
                self.assertIn("Fonte", [link.text for link in links])
            self.assertIn("Nota da parte 1.", " ".join(documents[1].itertext()))
            self.assertIn("Nota da parte 2.", " ".join(documents[1].itertext()))
            note_links = [doc.find(".//{*}sup/{*}a").get("href") for doc in documents]
            self.assertNotEqual(*note_links)
            for target in note_links:
                filename, anchor = target.split("#")
                target_doc = XML.fromstring(archive.read(f"EPUB/{filename}"))
                self.assertIsNotNone(target_doc.find(f".//*[@id='{anchor}']"))
        # Compilation does not mutate the saved bodies.
        self.assertIn("[^a]", sections[0].markdown)
        self.assertIn("[^a]", sections[1].markdown)

    def test_reference_forms_preserve_visible_text_and_literal_code(self):
        literal = "```markdown\n[shared]: https://example.com/code\n[shared]\n```"
        first = (
            "# First\n\n[shared], [shared][], [Caption][shared], ![Image][shared]\n\n"
            "[shared](https://example.com/inline) `[^n] [shared]` \\[shared]\n\n"
            f"{literal}\n\n[shared]: https://example.com/first\n\n"
            "Footnote[^n].\n\n[^n]: Note with [shared]."
        )
        manuscript = Manuscript(
            "Unused",
            "",
            (
                Section(1, "Unused", first),
                Section(
                    2,
                    "Unused",
                    "# Second\n\n[shared] Note[^n].\n\n"
                    "[shared]: https://example.com/second\n\n[^n]: Second note.",
                ),
            ),
        )
        compiled = manuscript.markdown()
        self.assertIn(literal, compiled)
        self.assertIn("`[^n] [shared]`", compiled)
        self.assertIn(r"\[shared]", compiled)
        self.assertIn("[shared](https://example.com/inline)", compiled)
        content = generate_epub(manuscript, identifier="forms")
        with ZipFile(BytesIO(content)) as archive:
            first_doc = XML.fromstring(archive.read("EPUB/chapter_001.xhtml"))
            links = [(link.text, link.get("href")) for link in first_doc.findall(".//{*}a")]
            self.assertEqual(links.count(("shared", "https://example.com/first")), 2)
            self.assertIn(("Caption", "https://example.com/first"), links)
            self.assertIn(("shared", "https://example.com/inline"), links)
            self.assertEqual(first_doc.find(".//{*}img").get("src"), "https://example.com/first")
            notes_doc = XML.fromstring(archive.read("EPUB/chapter_002.xhtml"))
            self.assertIn(
                "https://example.com/first",
                [link.get("href") for link in notes_doc.findall(".//{*}a")],
            )

    def test_body_image_widths_follow_orientation_without_changing_cover(self):
        resources = []
        for identifier, dimensions in (
            ("portrait", (12, 16)),
            ("landscape", (16, 12)),
            ("square", (12, 12)),
        ):
            output = BytesIO()
            Image.new("RGB", dimensions).save(output, format="PNG")
            resources.append(ImageResource(identifier, output.getvalue(), "image/png"))
        body = "# Images\n\n" + "\n\n".join(
            f"![{image.identifier}](/api/library/assets/{image.identifier}/file)"
            for image in resources
        )
        content = generate_epub(
            Manuscript("Unused", "", (Section(1, "Unused", body),)),
            identifier="orientation",
            images=resources,
            cover=resources[0],
        )
        with ZipFile(BytesIO(content)) as archive:
            document = XML.fromstring(archive.read("EPUB/chapter_001.xhtml"))
            self.assertEqual(
                [image.get("class") for image in document.findall(".//{*}img")],
                ["image-portrait", "image-landscape", "image-portrait"],
            )
            css = archive.read("EPUB/styles/book.css").decode()
            self.assertIn("width: 180px", css)
            self.assertIn("width: 300px", css)
            self.assertIn("max-width: 100%", css)
            self.assertNotIn("image-portrait", archive.read("EPUB/cover.xhtml").decode())

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
        self.group = self.project.default_group
        self.endpoint = f"/api/library/groups/{self.group.pk}/epub/"

    def generate(self):
        response = self.client.post(self.endpoint)
        self.assertEqual(response.status_code, 200, response.data)
        return ExportArtifact.objects.get(group=self.group)

    def test_copy_reader_compilation_and_export_share_reference_scopes_without_editing_texts(self):
        texts = [
            Text.objects.create(
                group=self.group,
                position=index,
                markdown=f"# Parte {index}\n\n[Ref][source] Nota[^a].\n\n"
                f"[source]: https://example.com/{index}\n\n[^a]: Nota {index}.",
            )
            for index in (1, 2)
        ]
        original = [text.markdown for text in texts]
        shared = self.client.get(f"/api/library/groups/{self.group.pk}/markdown/").data["markdown"]
        self.assertEqual(shared, compile_group(self.group).markdown())
        artifact = self.generate()
        with ZipFile(BytesIO(artifact.file.read())) as archive:
            for index in (1, 2):
                html = archive.read(f"EPUB/chapter_{index:03}.xhtml").decode()
                self.assertIn(f"https://example.com/{index}", html)
            notes = archive.read("EPUB/chapter_002.xhtml").decode()
            self.assertIn("Nota 1.", notes)
            self.assertIn("Nota 2.", notes)
        artifact.file.close()
        for text, body in zip(texts, original):
            text.refresh_from_db()
            self.assertEqual(text.markdown, body)

    def test_orders_saved_texts_excludes_variations_and_downloads_privately(self):
        second = Text.objects.create(group=self.group, markdown="# Segundo\n\nDois.", position=1)
        Text.objects.create(group=self.group, markdown="# Primeiro\n\nUm.", position=0)
        Text.objects.create(group=self.group, parent=second, markdown="# VARIATION")
        upload_cover(
            self.project, SimpleUploadedFile("cover.png", image_bytes(), content_type="image/png")
        )
        artifact = self.generate()
        self.assertTrue(artifact.file.name.startswith(f"projects/{self.project.pk}/ebooks/"))
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
        self.assertIn("meu-livro-textos_v1.epub", response["Content-Disposition"])
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.post(self.endpoint).status_code, 404)
        self.assertEqual(self.client.get(self.endpoint + "file/").status_code, 404)
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(self.endpoint + "file/").status_code, 401)

    def test_regeneration_replaces_only_after_success_and_versions_start_without_epub(self):
        Text.objects.create(group=self.group, markdown="# Livro\n\nOriginal.")
        artifact = self.generate()
        self.assertEqual(artifact.filename, "meu-livro-textos_v1.epub")
        old_path = Path(artifact.file.path)
        old_bytes = old_path.read_bytes()
        with patch("library.services.exports.generate_epub", side_effect=RuntimeError("failed")):
            with self.assertRaises(RuntimeError):
                self.client.post(self.endpoint)
        artifact.refresh_from_db()
        self.assertEqual(artifact.generation, 1)
        self.assertEqual(Path(artifact.file.path).read_bytes(), old_bytes)
        with patch(
            "library.services.exports.ExportArtifact.save", side_effect=RuntimeError("db failed")
        ):
            with self.assertRaises(RuntimeError):
                self.client.post(self.endpoint)
        self.assertEqual(list(old_path.parent.glob("*.epub")), [old_path])
        Text.objects.filter(group=self.group).update(markdown="# Livro\n\nEditado.")
        with self.captureOnCommitCallbacks(execute=True):
            replacement = self.generate()
        self.assertEqual(replacement.generation, 2)
        self.assertEqual(replacement.filename, "meu-livro-textos_v2.epub")
        self.assertFalse(old_path.exists())
        self.assertNotEqual(Path(replacement.file.path).read_bytes(), old_bytes)
        self.assertFalse(ExportArtifact.objects.filter(group=create_group(self.project)).exists())
        with self.captureOnCommitCallbacks(execute=True):
            self.project.delete()
        self.assertFalse(Path(replacement.file.path).exists())

    def test_delete_is_private_preserves_source_and_restarts_generation_number(self):
        text = Text.objects.create(group=self.group, markdown="# Livro\n\nCorpo.")
        upload_cover(
            self.project, SimpleUploadedFile("cover.png", image_bytes(), content_type="image/png")
        )
        cover_path = Path(self.project.cover.file.path)
        artifact = self.generate()
        epub_path = Path(artifact.file.path)
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.delete(self.endpoint).status_code, 404)
        self.client.force_authenticate(None)
        self.assertEqual(self.client.delete(self.endpoint).status_code, 401)
        self.assertTrue(epub_path.exists())
        self.client.force_authenticate(self.user)
        with self.captureOnCommitCallbacks(execute=True):
            self.assertEqual(self.client.delete(self.endpoint).status_code, 204)
        self.assertFalse(epub_path.exists())
        self.assertTrue(cover_path.exists())
        self.assertTrue(Text.objects.filter(pk=text.pk).exists())
        self.assertFalse(ExportArtifact.objects.filter(group=self.group).exists())
        self.assertIsNone(
            self.client.get(f"/api/library/projects/{self.project.pk}/content/").data["epub"]
        )
        self.assertEqual(self.client.get(self.endpoint + "file/").status_code, 404)
        self.assertEqual(self.client.delete(self.endpoint).status_code, 204)
        self.assertEqual(self.generate().filename, "meu-livro-textos_v1.epub")

    def test_delete_does_not_remove_file_if_transaction_rolls_back(self):
        Text.objects.create(group=self.group, markdown="# Livro\n\nCorpo.")
        artifact = self.generate()
        path = Path(artifact.file.path)
        with self.captureOnCommitCallbacks(execute=True):
            with self.assertRaises(RuntimeError):
                with transaction.atomic():
                    delete_group_epub(self.group)
                    raise RuntimeError("rollback")
        self.assertTrue(path.exists())
        self.assertTrue(ExportArtifact.objects.filter(group=self.group).exists())

    def test_export_rejects_changed_snapshot_and_marks_previous_output_stale(self):
        from .epub.engine import generate_epub

        text = Text.objects.create(group=self.group, markdown="# Livro\n\nCorpo.")
        artifact = self.generate()
        original = Path(artifact.file.path).read_bytes()

        def concurrent_change(*args, **kwargs):
            Text.objects.filter(pk=text.pk).update(markdown="# Livro\n\nMudou.")
            return generate_epub(*args, **kwargs)

        with patch("library.services.exports.generate_epub", side_effect=concurrent_change):
            self.assertEqual(self.client.post(self.endpoint).status_code, 400)
        artifact.refresh_from_db()
        self.assertEqual(artifact.generation, 1)
        self.assertEqual(Path(artifact.file.path).read_bytes(), original)
        data = self.client.get(f"/api/library/projects/{self.project.pk}/content/").data
        self.assertFalse(data["epub"]["is_current"])

    def test_empty_project_returns_validation_error_without_creating_file(self):
        response = self.client.post(self.endpoint)
        self.assertEqual(response.status_code, 400)
        self.assertIn("Markdown", str(response.data))
        self.assertFalse(ExportArtifact.objects.exists())
