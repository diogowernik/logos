import re
from io import BytesIO
from pathlib import Path
from tempfile import TemporaryDirectory
from types import SimpleNamespace
from unittest.mock import patch
from zipfile import ZipFile

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import SimpleTestCase, TestCase, override_settings
from ebooklib import epub
from PIL import Image
from rest_framework.test import APIClient

from .epub_import import EpubImportError
from .epub_import.archive import read_package
from .epub_import.cleaning import clean_package
from .epub_import.conversion import html_to_markdown
from .epub_import.extraction import proposal, section_markdown
from .epub_import.inspection import report
from .models import Asset, ImportExtraction, ImportJob, Text
from .serializers import TextSerializer
from .services import create_project, new_version
from .services.exports import export_project_epub


def fixture():
    book = epub.EpubBook()
    book.set_identifier("fixture")
    book.set_title("Fonte")
    book.set_language("pt-BR")
    output = BytesIO()
    Image.new("RGB", (12, 18), "blue").save(output, format="PNG")
    image = output.getvalue()
    book.set_cover("Images/cover.png", image)
    book.add_item(
        epub.EpubItem(
            uid="photo", file_name="Images/photo.png", media_type="image/png", content=image
        )
    )
    second = epub.EpubHtml(uid="second", title="Segundo", file_name="Text/01.xhtml")
    second.content = (
        '<h1 id="b">Segundo</h1><p>Fim <a href="99.xhtml#a">voltar</a></p>'
        '<p id="note">Nota preservada</p>'
    )
    first = epub.EpubHtml(uid="first", title="Primeiro", file_name="Text/99.xhtml")
    first.content = (
        '<h1 id="a">Primeiro</h1><p>Texto <em>importante</em> '
        '<a href="01.xhtml#b">seguir</a>.</p><p><span>Antes </span>depois</p>'
        '<p><img src="../Images/photo.png" alt="Foto"/></p>'
    )
    credits = epub.EpubHtml(uid="credits", title="Créditos", file_name="credits.xhtml")
    credits.content = "<h1>Créditos</h1><p>Copyright preservado para revisão.</p>"
    # Deliberately opposite to spine; legacy lexical sorting would get this wrong.
    book.add_item(second)
    book.add_item(first)
    book.add_item(credits)
    book.add_item(epub.EpubNcx())
    book.add_item(epub.EpubNav())
    book.toc = (first, second)
    book.spine = ["cover", "nav", credits, first, second]
    output = BytesIO()
    epub.write_epub(output, book)
    return output.getvalue(), image


def mutate(content, callback, remove=()):
    output = BytesIO()
    with ZipFile(BytesIO(content)) as source, ZipFile(output, "w") as target:
        for info in source.infolist():
            if info.filename not in remove:
                target.writestr(info, callback(info.filename, source.read(info.filename)))
    return output.getvalue()


class ImportEngineTests(SimpleTestCase):
    def test_spine_order_cover_classification_and_conservative_selection(self):
        original, _ = fixture()
        inspection = report(read_package(original))
        selected = [s["title"] for s in inspection["sections"] if s["selected"]]
        self.assertEqual(selected, ["Créditos", "Primeiro", "Segundo"])
        self.assertEqual(sum(s["kind"] == "cover" for s in inspection["sections"]), 1)
        clean, diagnostic = clean_package(original)
        self.assertEqual(
            [s["title"] for s in report(read_package(clean))["sections"] if s["selected"]], selected
        )
        self.assertEqual(len(diagnostic["removed"]), 2)
        prepared = proposal(clean)
        self.assertEqual([s["title"] for s in prepared["sections"]], selected)
        urls = {path: "/api/library/assets/example/file" for path in prepared["images"]}
        markdown = section_markdown(prepared["sections"][1], urls)
        self.assertIn("Antes depois", markdown)
        self.assertIn("*importante*", markdown)
        self.assertIn("/api/library/assets/example/file", markdown)
        self.assertRegex(markdown, r"\[seguir\]\(<#epub-[a-f0-9]+>\)")

    def test_missing_fonts_are_reported_but_missing_content_is_rejected(self):
        original, _ = fixture()

        def add_font(path, content):
            if path.endswith(".opf"):
                content = content.replace(
                    b"</manifest>",
                    b'<item id="font" href="font.ttf" media-type="font/ttf"/></manifest>',
                )
            return content

        repaired = mutate(original, add_font)
        self.assertEqual(report(read_package(repaired))["warnings"][0]["code"], "missing_font")
        clean, _ = clean_package(repaired)
        self.assertTrue(proposal(clean)["sections"])
        damaged = mutate(original, lambda path, content: content, remove=["EPUB/Text/99.xhtml"])
        with self.assertRaisesRegex(EpubImportError, "obrigatório ausente"):
            read_package(damaged)

    def test_zip_limits_paths_and_xml_entities_are_rejected(self):
        original, _ = fixture()
        with patch("library.epub_import.archive.MAX_EXPANDED", 1):
            with self.assertRaisesRegex(EpubImportError, "limites"):
                read_package(original)
        output = BytesIO()
        with ZipFile(BytesIO(original)) as src, ZipFile(output, "w") as dst:
            for info in src.infolist():
                dst.writestr(info, src.read(info.filename))
            dst.writestr("../outside", b"bad")
        with self.assertRaisesRegex(EpubImportError, "caminho"):
            read_package(output.getvalue())

        def entities(path, content):
            if path.endswith(".opf"):
                return b'<!DOCTYPE package [<!ENTITY x "bad">]>' + content
            return content

        with self.assertRaisesRegex(EpubImportError, "entidades"):
            read_package(mutate(original, entities))

    def test_explicit_section_selection_preserves_spine_not_request_order(self):
        original, _ = fixture()
        selected = [
            s["href"]
            for s in report(read_package(original))["sections"]
            if s["title"] in ("Primeiro", "Segundo")
        ]
        clean, diagnostic = clean_package(original, list(reversed(selected)))
        self.assertEqual(diagnostic["kept"], selected)
        self.assertEqual([s["title"] for s in proposal(clean)["sections"]], ["Primeiro", "Segundo"])
        for bad in ([], ["not-present"], selected * 2):
            with self.assertRaises(EpubImportError):
                clean_package(original, bad)

    def test_utf16_entity_declarations_are_rejected(self):
        original, _ = fixture()

        def encoded_entities(path, content):
            if path.endswith(".opf"):
                xml = '<!DOCTYPE package [<!ENTITY x "bad">]><package>&x;</package>'
                return xml.encode("utf-16")
            return content

        with self.assertRaisesRegex(EpubImportError, "entidades"):
            read_package(mutate(original, encoded_entities))

    def test_invalid_package_and_document_addresses_have_actionable_errors(self):
        original, _ = fixture()

        def external_package(path, content):
            if path == "META-INF/container.xml":
                return content.replace(
                    b'full-path="EPUB/content.opf"', b'full-path="https://host/book"'
                )
            return content

        with self.assertRaisesRegex(EpubImportError, "pacote externo"):
            read_package(mutate(original, external_package))

        def invalid_link(path, content):
            if path.endswith("99.xhtml"):
                return content.replace(b"01.xhtml#b", b"http://[broken")
            return content

        with self.assertRaisesRegex(EpubImportError, "endereço inválido"):
            report(read_package(mutate(original, invalid_link)))

    def test_markdown_preserves_tables_nested_lists_code_and_line_breaks(self):
        markdown = html_to_markdown(
            "<p>Uma<br/>linha</p><blockquote><p>Citação</p></blockquote>"
            "<ul><li>Um<ul><li>Dois</li></ul></li></ul>"
            "<pre>literal *x*\nlinha</pre>"
            "<table><tr><th>A</th><th>B</th></tr>"
            "<tr><td>1</td><td>2</td></tr></table>"
        )
        self.assertIn("Uma  \nlinha", markdown)
        self.assertIn("> Citação", markdown)
        self.assertIn("  - Dois", markdown)
        self.assertIn("```\nliteral *x*\nlinha", markdown)
        self.assertIn("| A | B |\n| --- | --- |", markdown)


class ImportApiTests(TestCase):
    def setUp(self):
        directory = TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        self.media = Path(directory.name)
        settings = override_settings(MEDIA_ROOT=directory.name)
        settings.enable()
        self.addCleanup(settings.disable)
        self.user = get_user_model().objects.create_user(username="importer")
        self.other = get_user_model().objects.create_user(username="other-importer")
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        self.project = create_project(self.user, "Destino")
        self.original, self.image = fixture()

    def upload(self, project=None, content=None):
        return self.client.post(
            f"/api/library/projects/{(project or self.project).pk}/imports/",
            {
                "file": SimpleUploadedFile(
                    "source.epub", content or self.original, content_type="application/epub+zip"
                )
            },
            format="multipart",
        )

    def prepared(self):
        upload = self.upload()
        self.assertEqual(upload.status_code, 201, upload.data)
        job = ImportJob.objects.get(pk=upload.data["id"])
        clean = self.client.post(f"/api/library/epub-imports/{job.pk}/clean/", {}, format="json")
        self.assertEqual(clean.status_code, 200, clean.data)
        job.refresh_from_db()
        return job

    def preview(self, job, project=None, source=None):
        query = {"project": (project or self.project).pk}
        if source:
            query["source"] = source
        response = self.client.get(
            f"/api/library/epub-imports/{job.pk}/preview/",
            query,
        )
        self.assertEqual(response.status_code, 200, response.data)
        return response.data

    def extract(self, job, preview, **extra):
        data = {
            key: preview[key] for key in ("project", "source", "source_sha256", "project_state")
        }
        data.update(extra)
        return self.client.post(f"/api/library/epub-imports/{job.pk}/extract/", data, format="json")

    def test_upload_deduplicates_original_and_exposes_private_downloads(self):
        job = self.prepared()
        self.assertEqual(self.upload().status_code, 200)
        self.assertEqual(ImportJob.objects.count(), 1)
        self.assertEqual(Path(job.original_file.path).read_bytes(), self.original)
        for suffix in ("original", "clean-file"):
            response = self.client.get(f"/api/library/epub-imports/{job.pk}/{suffix}/")
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response["Cache-Control"], "private, no-store")
            self.assertTrue(b"".join(response.streaming_content))
            response.close()
        self.assertEqual(self.project.texts.count(), 0)
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.get(f"/api/library/epub-imports/{job.pk}/").status_code, 404)
        self.assertEqual(self.upload().status_code, 404)
        self.assertEqual(
            self.client.get(f"/api/library/epub-imports/{job.pk}/original/").status_code, 404
        )
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(f"/api/library/epub-imports/{job.pk}/").status_code, 401)

    def test_preview_and_confirmed_extraction_preserve_images_links_and_current_project(self):
        job = self.prepared()
        preview = self.preview(job)
        self.assertFalse(preview["requires_confirmation"])
        self.assertEqual(self.project.texts.count(), 0)
        response = self.extract(job, preview)
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(
            [t.title for t in self.project.texts.all()], ["Créditos", "Primeiro", "Segundo"]
        )
        self.project.refresh_from_db()
        self.assertIsNotNone(self.project.cover)
        self.assertEqual(self.project.family.assets.count(), 2)
        markdown = self.project.texts.get(title="Primeiro").markdown
        self.assertIn("/api/library/assets/", markdown)
        self.assertNotIn("epub-resource:", markdown)
        artifact = export_project_epub(self.project)
        with ZipFile(artifact.file.path) as archive:
            self.assertTrue(any("images/" in p for p in archive.namelist()))
            all_html = b"".join(archive.read(p) for p in archive.namelist() if p.endswith(".xhtml"))
            self.assertIn(b"epub-", all_html)
        replay = self.extract(job, preview)
        self.assertEqual(replay.status_code, 200, replay.data)
        self.assertTrue(replay.data["reused"])
        self.assertEqual(replay.data["text_ids"], response.data["text_ids"])
        self.assertEqual(self.project.texts.count(), 3)
        self.assertEqual(ImportExtraction.objects.count(), 1)
        self.assertEqual(self.project.family.assets.count(), 2)

    def test_existing_texts_require_choice_confirmation_and_fresh_preview(self):
        existing = Text.objects.create(
            project=self.project, title="Meu texto", markdown="Original", position=8
        )
        variation = Text.objects.create(
            project=self.project, parent=existing, title="Variação", markdown="Outra"
        )
        job = self.prepared()
        preview = self.preview(job)
        self.assertEqual(preview["existing_text_count"], 2)
        self.assertEqual(self.extract(job, preview).status_code, 409)
        self.assertEqual(self.extract(job, preview, mode="append").status_code, 409)
        existing.markdown = "Alterado depois da prévia"
        existing.save()
        self.assertEqual(
            self.extract(job, preview, mode="replace", confirm_existing=True).status_code, 409
        )
        fresh = self.preview(job)
        response = self.extract(job, fresh, mode="append", confirm_existing=True)
        self.assertEqual(response.status_code, 201, response.data)
        self.assertTrue(Text.objects.filter(pk=variation.pk).exists())
        self.assertEqual(self.project.texts.get(title="Créditos").position, 9)
        existing.refresh_from_db()
        self.assertEqual(existing.markdown, "Alterado depois da prévia")

    def test_replacement_requires_confirmation_and_removes_variations_atomically(self):
        existing = Text.objects.create(project=self.project, title="Antigo", markdown="Texto")
        variation = Text.objects.create(project=self.project, parent=existing, title="Variação")
        job = self.prepared()
        preview = self.preview(job)
        response = self.extract(job, preview, mode="replace", confirm_existing=True)
        self.assertEqual(response.status_code, 201, response.data)
        self.assertFalse(Text.objects.filter(pk__in=[existing.pk, variation.pk]).exists())
        self.assertEqual(self.project.texts.count(), 3)
        self.assertTrue(Path(job.original_file.path).exists())

    def test_stale_editor_cannot_recreate_a_text_replaced_by_import(self):
        old = Text.objects.create(project=self.project, title="Antigo", markdown="Texto")
        stale = Text.objects.get(pk=old.pk)
        serializer = TextSerializer(stale, context={"request": SimpleNamespace(user=self.user)})
        job = self.prepared()
        response = self.extract(job, self.preview(job), mode="replace", confirm_existing=True)
        self.assertEqual(response.status_code, 201, response.data)
        from rest_framework.exceptions import ValidationError

        with self.assertRaises(ValidationError):
            serializer.update(stale, {"markdown": "Salvamento atrasado"})
        self.assertFalse(Text.objects.filter(pk=old.pk).exists())

    def test_changed_clean_copy_can_be_reviewed_and_extracted_again_with_confirmation(self):
        job = self.prepared()
        self.assertEqual(self.extract(job, self.preview(job)).status_code, 201)
        first = next(s["href"] for s in job.inspection["sections"] if s["title"] == "Primeiro")
        response = self.client.post(
            f"/api/library/epub-imports/{job.pk}/clean/", {"sections": [first]}, format="json"
        )
        self.assertEqual(response.status_code, 200, response.data)
        job.refresh_from_db()
        preview = self.preview(job)
        self.assertTrue(preview["requires_confirmation"])
        self.assertEqual(self.extract(job, preview).status_code, 409)
        response = self.extract(job, preview, mode="replace", confirm_existing=True)
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(self.project.texts.count(), 1)
        self.assertEqual(ImportExtraction.objects.count(), 2)

    def test_clean_database_failure_removes_new_file_and_keeps_last_good_copy(self):
        job = self.prepared()
        before_files = {p for p in self.media.rglob("*") if p.is_file()}
        original_save = ImportJob.save

        def fail_completed(instance, *args, **kwargs):
            if instance.status == "done":
                raise RuntimeError("storage publication failed")
            return original_save(instance, *args, **kwargs)

        with (
            patch.object(ImportJob, "save", fail_completed),
            self.assertLogs("library.import_errors", level="ERROR"),
        ):
            response = self.client.post(
                f"/api/library/epub-imports/{job.pk}/clean/", {}, format="json"
            )
        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.data["diagnostic"]["code"], "unexpected_error")
        job.refresh_from_db()
        self.assertEqual(job.status, "error")
        self.assertEqual(job.clean_generation, 1)
        self.assertEqual({p for p in self.media.rglob("*") if p.is_file()}, before_files)

    def test_failure_rolls_back_text_replacement_and_cleans_new_image_files(self):
        old = Text.objects.create(project=self.project, title="Preservado", markdown="Texto")
        job = self.prepared()
        preview = self.preview(job)
        before = set(self.media.rglob("*"))
        with (
            patch(
                "library.services.extraction.Text.objects.bulk_create",
                side_effect=RuntimeError("private database detail secret-token"),
            ),
            self.assertLogs("library.import_errors", level="ERROR") as logs,
        ):
            response = self.extract(job, preview, mode="replace", confirm_existing=True)
        self.assertEqual(response.status_code, 500)
        diagnostic = response.data["diagnostic"]
        self.assertEqual(diagnostic["operation"], "extract")
        self.assertIn("RuntimeError", diagnostic["exception_types"])
        self.assertTrue(any("services/extraction.py" in line for line in diagnostic["locations"]))
        self.assertIn(diagnostic["id"], logs.output[0])
        self.assertNotIn("secret-token", str(response.data))
        self.assertNotIn(str(self.media), str(response.data))
        self.assertTrue(Text.objects.filter(pk=old.pk).exists())
        self.assertEqual(Asset.objects.count(), 0)
        self.assertEqual(ImportExtraction.objects.count(), 0)
        after_files = {p for p in self.media.rglob("*") if p.is_file()}
        self.assertEqual(after_files, {p for p in before if p.is_file()})

    def test_failed_clean_preserves_last_success_and_retries_numbering(self):
        job = self.prepared()
        first_name, first_bytes = job.clean_file.name, Path(job.clean_file.path).read_bytes()
        with patch(
            "library.services.imports.clean_package", side_effect=EpubImportError("Falha conhecida")
        ):
            response = self.client.post(
                f"/api/library/epub-imports/{job.pk}/clean/", {}, format="json"
            )
        self.assertEqual(response.status_code, 400)
        job.refresh_from_db()
        self.assertEqual(job.status, "error")
        self.assertEqual(job.clean_generation, 1)
        diagnostic = response.data["diagnostic"]
        self.assertEqual(diagnostic["operation"], "clean")
        self.assertEqual(diagnostic["source"], "original")
        self.assertIn("Falha conhecida", diagnostic["copy_text"])
        self.assertEqual(job.error_diagnostic, diagnostic)
        self.assertEqual(Path(job.clean_file.path).read_bytes(), first_bytes)
        self.assertEqual(Path(job.original_file.path).read_bytes(), self.original)
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(
                f"/api/library/epub-imports/{job.pk}/clean/", {}, format="json"
            )
        self.assertEqual(response.status_code, 200, response.data)
        job.refresh_from_db()
        self.assertEqual(job.clean_generation, 2)
        self.assertEqual(job.error_diagnostic, {})
        self.assertFalse((self.media / first_name).exists())

    def test_original_can_be_previewed_and_extracted_without_cleaning(self):
        job = ImportJob.objects.get(pk=self.upload().data["id"])
        preview = self.preview(job, source="original")
        self.assertEqual(preview["source"], "original")
        self.assertEqual(preview["source_sha256"], job.sha256)
        url = re.search(r"!\[Foto\]\(<([^>]+)>\)", preview["sections"][1]["markdown"]).group(1)
        self.assertIn("source=original", url)
        image = self.client.get(url, follow=True)
        self.assertEqual(image.status_code, 200)
        self.assertEqual(image.content, self.image)
        result = self.extract(job, preview)
        self.assertEqual(result.status_code, 201, result.data)
        self.assertEqual(result.data["source"], "original")
        self.assertEqual(self.project.texts.count(), 3)
        receipt = ImportExtraction.objects.get()
        self.assertEqual(receipt.source_kind, "original")
        self.assertEqual(receipt.source_sha256, job.sha256)
        self.assertEqual(self.project.family.assets.count(), 2)
        job.refresh_from_db()
        self.assertFalse(job.clean_file)
        self.assertEqual(job.clean_generation, 0)
        replay = self.extract(job, preview)
        self.assertEqual(replay.status_code, 200)
        self.assertTrue(replay.data["reused"])
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.get(url, follow=True).status_code, 404)

    def test_source_switch_requires_matching_digest_and_existing_text_confirmation(self):
        job = self.prepared()
        original = self.preview(job, source="original")
        wrong = self.extract(job, original, source="cleaned")
        self.assertEqual(wrong.status_code, 409)
        self.assertEqual(self.extract(job, original).status_code, 201)
        cleaned = self.preview(job, source="cleaned")
        self.assertTrue(cleaned["requires_confirmation"])
        self.assertEqual(self.extract(job, cleaned).status_code, 409)
        result = self.extract(job, cleaned, mode="append", confirm_existing=True)
        self.assertEqual(result.status_code, 201, result.data)
        self.assertEqual(self.project.texts.count(), 6)
        self.assertEqual(
            set(ImportExtraction.objects.values_list("source_kind", flat=True)),
            {"original", "cleaned"},
        )
        replay = self.extract(job, original)
        self.assertEqual(replay.status_code, 200)
        self.assertEqual(self.project.texts.count(), 6)

    def test_original_extraction_is_independent_of_failed_cleaning_and_invalid_sources(self):
        job = ImportJob.objects.get(pk=self.upload().data["id"])
        with patch("library.services.imports.clean_package", side_effect=EpubImportError("Falhou")):
            response = self.client.post(
                f"/api/library/epub-imports/{job.pk}/clean/", {}, format="json"
            )
        self.assertEqual(response.status_code, 400)
        job.refresh_from_db()
        preview = self.preview(job, source="original")
        self.assertEqual(self.extract(job, preview).status_code, 201)
        invalid = self.client.get(
            f"/api/library/epub-imports/{job.pk}/preview/",
            {"project": self.project.pk, "source": "other"},
        )
        self.assertEqual(invalid.status_code, 400)
        missing_clean = self.client.get(
            f"/api/library/epub-imports/{job.pk}/preview/",
            {"project": self.project.pk, "source": "cleaned"},
        )
        self.assertEqual(missing_clean.status_code, 400)
        self.assertEqual(missing_clean.data["diagnostic"]["source"], "cleaned")
        self.assertIn("Limpe o EPUB", missing_clean.data["diagnostic"]["copy_text"])

    def test_old_clean_preview_images_are_rejected_but_original_preview_remains_valid(self):
        job = self.prepared()
        original = self.preview(job, source="original")
        cleaned = self.preview(job, source="cleaned")
        urls = [
            re.search(r"!\[Foto\]\(<([^>]+)>\)", p["sections"][1]["markdown"]).group(1)
            for p in (original, cleaned)
        ]
        first = next(s["href"] for s in job.inspection["sections"] if s["title"] == "Primeiro")
        response = self.client.post(
            f"/api/library/epub-imports/{job.pk}/clean/", {"sections": [first]}, format="json"
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.client.get(urls[0], follow=True).status_code, 200)
        self.assertEqual(self.client.get(urls[1], follow=True).status_code, 409)
        self.assertEqual(self.extract(job, cleaned).status_code, 409)
        self.assertEqual(self.extract(job, original).status_code, 201)

    def test_invalid_upload_returns_copyable_report_without_creating_job(self):
        response = self.upload(content=b"not an epub")
        self.assertEqual(response.status_code, 400)
        diagnostic = response.data["diagnostic"]
        self.assertEqual(diagnostic["operation"], "upload")
        self.assertEqual(diagnostic["code"], "invalid_epub")
        self.assertIn("BadZipFile", diagnostic["exception_types"])
        self.assertIn("archive.py", diagnostic["copy_text"])
        self.assertIsNone(diagnostic["job"])
        self.assertEqual(ImportJob.objects.count(), 0)

    def test_versions_share_sources_but_unrelated_and_foreign_targets_are_rejected(self):
        job = self.prepared()
        version = new_version(self.project)
        self.assertEqual(
            len(self.client.get(f"/api/library/projects/{version.pk}/imports/").data), 1
        )
        preview = self.preview(job, version)
        self.assertEqual(self.extract(job, preview).status_code, 201)
        unrelated = create_project(self.user)
        foreign = create_project(self.other)
        for target in (unrelated, foreign):
            response = self.client.get(
                f"/api/library/epub-imports/{job.pk}/preview/", {"project": target.pk}
            )
            self.assertEqual(response.status_code, 404)
        self.assertEqual(self.project.texts.count(), 0)

    def test_invalid_upload_and_clean_without_selected_content_leave_no_files(self):
        self.assertEqual(self.upload(content=b"bad zip").status_code, 400)
        self.assertEqual(ImportJob.objects.count(), 0)
        self.assertEqual([p for p in self.media.rglob("*") if p.is_file()], [])
        response = self.upload(create_project(self.user, is_inbox=True))
        self.assertEqual(response.status_code, 400)

    def test_preview_resource_and_family_deletion_use_private_storage_lifecycle(self):
        job = self.prepared()
        preview = self.preview(job)

        url = re.search(r"!\[Foto\]\(<([^>]+)>\)", preview["sections"][1]["markdown"]).group(1)
        response = self.client.get(url, follow=True)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, self.image)
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.get(url, follow=True).status_code, 404)
        self.client.force_authenticate(self.user)
        original, clean = Path(job.original_file.path), Path(job.clean_file.path)
        with self.captureOnCommitCallbacks(execute=True):
            self.assertEqual(
                self.client.delete(f"/api/library/projects/{self.project.pk}/").status_code, 204
            )
        self.assertFalse(original.exists())
        self.assertFalse(clean.exists())
