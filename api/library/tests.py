from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from .models import Project, ProjectFamily, Text
from .services import compile_project, create_project, new_version


class LibraryTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username="writer")
        self.other = get_user_model().objects.create_user(username="other")
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_simple_write_edit_and_compile_without_editorial_metadata(self):
        response = self.client.post("/api/library/projects/", {}, format="json")
        self.assertEqual(response.status_code, 201)
        project = Project.objects.get(pk=response.data["id"])
        text = self.client.post(
            "/api/library/texts/",
            {"project": project.pk, "title": "Ideia", "markdown": "## Ideia\n\nTexto livre."},
            format="json",
        )
        self.assertEqual(text.status_code, 201)
        edit = self.client.patch(
            f"/api/library/texts/{text.data['id']}/",
            {"markdown": "## Ideia\n\nEditado."},
            format="json",
        )
        self.assertEqual(edit.status_code, 200)
        compiled = self.client.get(f"/api/library/projects/{project.pk}/markdown/").data["markdown"]
        self.assertEqual(compiled.count("## Ideia"), 1)
        self.assertIn("Editado.", compiled)

    def test_content_and_relations_are_private(self):
        foreign = create_project(self.other, "Private")
        text = Text.objects.create(project=foreign, markdown="private")
        self.assertEqual(
            self.client.get(f"/api/library/projects/{foreign.pk}/content/").status_code, 404
        )
        self.assertEqual(self.client.get(f"/api/library/texts/{text.pk}/").status_code, 404)
        self.assertEqual(
            self.client.post(
                "/api/library/texts/", {"project": foreign.pk, "markdown": "wrong"}, format="json"
            ).status_code,
            400,
        )
        self.assertEqual(len(self.client.get("/api/library/projects/").data), 0)

    def test_new_main_is_empty_and_can_be_restored(self):
        project = create_project(self.user, "Original")
        Text.objects.create(project=project, markdown="Keep this")
        replacement = new_version(project)
        self.assertEqual(replacement.texts.count(), 0)
        self.assertEqual(project.texts.get().markdown, "Keep this")
        self.assertEqual(
            ProjectFamily.objects.get(pk=project.family_id).principal_id, replacement.pk
        )
        self.assertEqual(len(self.client.get("/api/library/projects/").data), 1)
        response = self.client.post(f"/api/library/projects/{project.pk}/restore/")
        self.assertTrue(response.data["is_principal"])
        self.client.delete(f"/api/library/projects/{replacement.pk}/")
        self.assertTrue(Project.objects.filter(pk=project.pk).exists())

    def test_failed_new_version_keeps_previous_main(self):
        project = create_project(self.user, "Original")
        with patch("library.services.ProjectFamily.save", side_effect=RuntimeError("failed")):
            with self.assertRaises(RuntimeError):
                new_version(project)
        self.assertEqual(Project.objects.count(), 1)
        self.assertEqual(ProjectFamily.objects.get(pk=project.family_id).principal_id, project.pk)

    def test_variations_are_excluded_and_only_one_level_is_allowed(self):
        project = create_project(self.user)
        text = Text.objects.create(project=project, markdown="MAIN")
        variant = self.client.post(f"/api/library/texts/{text.pk}/duplicate/").data
        self.client.patch(
            f"/api/library/texts/{variant['id']}/", {"markdown": "VARIANT"}, format="json"
        )
        self.assertNotIn("VARIANT", compile_project(project).markdown())
        nested = self.client.post(
            "/api/library/texts/", {"project": project.pk, "parent": variant["id"]}, format="json"
        )
        self.assertEqual(nested.status_code, 400)
        promote = self.client.patch(
            f"/api/library/texts/{variant['id']}/", {"parent": None}, format="json"
        )
        self.assertEqual(promote.status_code, 200)
        self.assertIn("VARIANT", compile_project(project).markdown())

    def test_reorder_requires_complete_list_and_move_carries_variations(self):
        project = create_project(self.user)
        target = create_project(self.user, "Destination")
        a = Text.objects.create(project=project, markdown="A", position=0)
        b = Text.objects.create(project=project, markdown="B", position=1)
        variant = Text.objects.create(project=project, parent=a, markdown="variation")
        endpoint = f"/api/library/projects/{project.pk}/reorder/"
        self.assertEqual(
            self.client.post(endpoint, {"ids": [b.pk]}, format="json").status_code, 400
        )
        self.assertEqual(
            self.client.post(endpoint, {"ids": [b.pk, a.pk]}, format="json").status_code, 200
        )
        self.assertLess(
            compile_project(project).markdown().index("B"),
            compile_project(project).markdown().index("A"),
        )
        self.assertEqual(
            self.client.post(
                f"/api/library/texts/{a.pk}/move/", {"project": target.pk}, format="json"
            ).status_code,
            200,
        )
        variant.refresh_from_db()
        self.assertEqual(variant.project_id, target.pk)

    def test_inbox_is_stable_and_collection_deletion_keeps_projects(self):
        first = self.client.post("/api/library/projects/inbox/").data
        second = self.client.post("/api/library/projects/inbox/").data
        self.assertEqual(first["id"], second["id"])
        collection = self.client.post("/api/library/collections/", {"title": "Folder"}).data
        project = self.client.post(
            "/api/library/projects/",
            {"title": "Book", "collection": collection["id"]},
            format="json",
        ).data
        self.client.delete(f"/api/library/collections/{collection['id']}/")
        self.assertTrue(Project.objects.filter(pk=project["id"]).exists())

    def test_recents_search_and_loose_texts_remain_private_and_movable(self):
        loose_project = Project.objects.get(pk=self.client.post("/api/library/projects/inbox/").data["id"])
        loose = Text.objects.create(project=loose_project, title="Ideia solta", markdown="agulha")
        project = create_project(self.user, "Livro")
        chapter = Text.objects.create(project=project, title="Capítulo", markdown="agulha")
        Text.objects.create(project=project, parent=chapter, title="Variação")
        Text.objects.create(project=create_project(self.other), title="Privado", markdown="agulha")
        self.client.post(f"/api/library/texts/{loose.pk}/open/")
        recent = self.client.get("/api/library/texts/recent/").data
        self.assertEqual([item["id"] for item in recent], [loose.pk, chapter.pk])
        self.assertTrue(recent[0]["is_loose"])
        self.assertNotIn("markdown", recent[0])
        self.assertEqual(len(self.client.get("/api/library/texts/?search=agulha").data), 2)
        self.assertEqual(len(self.client.get("/api/library/texts/?loose=1").data), 1)
        self.client.post(f"/api/library/texts/{loose.pk}/move/", {"project": project.pk}, format="json")
        self.assertEqual(self.client.get("/api/library/texts/?loose=1").data, [])
        self.assertFalse(self.client.get("/api/library/texts/recent/").data[0]["is_loose"])
        self.assertIn("agulha", compile_project(project).markdown())

    def test_reader_uses_compilation_and_recents_exclude_secondary_versions(self):
        project = create_project(self.user, "Livro")
        text = Text.objects.create(project=project, title="Capítulo", markdown="## Capítulo\n\nConteúdo.")
        compiled_text = self.client.get(f"/api/library/texts/{text.pk}/").data["compiled_markdown"]
        self.assertEqual(compiled_text.count("## Capítulo"), 1)
        self.assertIn(compiled_text, compile_project(project).markdown())
        new_version(project)
        self.assertEqual(self.client.get("/api/library/texts/recent/").data, [])
