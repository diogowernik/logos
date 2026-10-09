from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from .models import Project, Text, TextGroup
from .services import compile_group, create_group, create_project, duplicate_group


class DomainTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username="owner", password="secret")
        self.other = get_user_model().objects.create_user(username="other", password="secret")
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        self.project = create_project(self.user, "Livro")
        self.group = self.project.default_group

    def test_empty_group_does_not_change_default_or_existing_texts(self):
        text = Text.objects.create(group=self.group, markdown="Final")
        extra = create_group(self.project, "Extraído")
        self.project.refresh_from_db()
        self.assertEqual(self.project.default_group_id, self.group.pk)
        self.assertEqual(extra.texts.count(), 0)
        self.assertEqual(text.markdown, "Final")
        self.assertEqual(len(self.client.get("/api/library/projects/").data), 1)

    def test_duplicate_group_is_independent_and_preserves_variations(self):
        main = Text.objects.create(group=self.group, title="A", markdown="# A", position=3)
        Text.objects.create(group=self.group, parent=main, markdown="Variation")
        extra = duplicate_group(self.group)
        copied = extra.texts.get(parent=None)
        copied.markdown = "Revisado"
        copied.save()
        main.refresh_from_db()
        self.assertEqual(main.markdown, "# A")
        self.assertEqual(copied.position, 3)
        self.assertEqual(copied.variations.count(), 1)
        self.assertNotIn("Variation", compile_group(extra).markdown())

    def test_group_delete_and_default_are_separate_from_book_delete(self):
        extra = create_group(self.project, "Outra")
        endpoint = f"/api/library/groups/{self.group.pk}/"
        self.assertEqual(self.client.delete(endpoint).status_code, 400)
        self.assertEqual(
            self.client.post(f"/api/library/groups/{extra.pk}/default/").status_code, 200
        )
        self.assertEqual(self.client.delete(endpoint).status_code, 204)
        self.assertTrue(Project.objects.filter(pk=self.project.pk).exists())
        self.assertEqual(self.client.delete(f"/api/library/groups/{extra.pk}/").status_code, 400)

    def test_compilation_uses_selected_group_order_and_only_body(self):
        a = Text.objects.create(group=self.group, title="Cadastro", markdown="# Um", position=1)
        Text.objects.create(group=self.group, markdown="# Dois", position=0)
        Text.objects.create(group=self.group, parent=a, markdown="Variação")
        extra = create_group(self.project, "Outra")
        Text.objects.create(group=extra, markdown="Final")
        self.assertEqual(compile_group(self.group).markdown(), "# Dois\n\n# Um\n")
        self.assertEqual(compile_group(extra).markdown(), "Final\n")

    def test_owner_isolation_across_group_and_text_endpoints(self):
        foreign = create_project(self.other)
        text = Text.objects.create(group=foreign.default_group, markdown="private")
        for endpoint in [
            f"projects/{foreign.pk}/content",
            f"groups/{foreign.default_group_id}",
            f"texts/{text.pk}",
        ]:
            self.assertEqual(self.client.get(f"/api/library/{endpoint}/").status_code, 404)
        self.assertEqual(
            self.client.post(
                "/api/library/texts/", {"group": foreign.default_group_id}, format="json"
            ).status_code,
            400,
        )
        self.assertEqual(
            self.client.post(
                "/api/library/groups/", {"project": foreign.pk}, format="json"
            ).status_code,
            400,
        )

    def test_texts_create_save_variations_promote_and_search(self):
        response = self.client.post(
            "/api/library/texts/", {"group": self.group.pk, "markdown": "agulha"}, format="json"
        )
        self.assertEqual(response.status_code, 201)
        text_id = response.data["id"]
        variation = self.client.post(f"/api/library/texts/{text_id}/duplicate/").data
        self.assertEqual(
            self.client.post(
                "/api/library/texts/",
                {"group": self.group.pk, "parent": variation["id"]},
                format="json",
            ).status_code,
            400,
        )
        self.assertEqual(
            self.client.patch(
                f"/api/library/texts/{variation['id']}/", {"parent": None}, format="json"
            ).status_code,
            200,
        )
        self.assertEqual(len(self.client.get("/api/library/texts/?search=agulha").data), 2)
        self.assertEqual(
            self.client.get(f"/api/library/texts/{text_id}/").data["project"], self.project.pk
        )

    def test_reorder_is_local_and_move_carries_variations(self):
        a = Text.objects.create(group=self.group, markdown="A")
        b = Text.objects.create(group=self.group, markdown="B", position=1)
        variant = Text.objects.create(group=self.group, parent=a, markdown="V")
        extra = create_group(self.project, "Outra")
        endpoint = f"/api/library/groups/{self.group.pk}/reorder/"
        self.assertEqual(
            self.client.post(endpoint, {"ids": [b.pk]}, format="json").status_code, 400
        )
        self.assertEqual(
            self.client.post(endpoint, {"ids": [b.pk, a.pk]}, format="json").status_code, 200
        )
        self.assertEqual(
            self.client.post(
                f"/api/library/texts/{a.pk}/move/", {"group": extra.pk}, format="json"
            ).status_code,
            200,
        )
        variant.refresh_from_db()
        self.assertEqual(variant.group_id, extra.pk)

    def test_inbox_remains_stable_and_loose_texts_can_move_to_book(self):
        first = self.client.post("/api/library/projects/inbox/").data
        second = self.client.post("/api/library/projects/inbox/").data
        self.assertEqual(first["id"], second["id"])
        loose = Text.objects.create(group_id=first["default_group"], markdown="Ideia")
        self.assertEqual(len(self.client.get("/api/library/texts/?loose=1").data), 1)
        self.assertEqual(
            self.client.post(
                f"/api/library/texts/{loose.pk}/move/", {"project": self.project.pk}, format="json"
            ).status_code,
            200,
        )
        self.assertEqual(len(self.client.get("/api/library/texts/?loose=1").data), 0)

    def test_failed_duplicate_leaves_existing_groups_intact(self):
        Text.objects.create(group=self.group, markdown="Keep")
        with patch(
            "library.services.groups.Text.objects.create", side_effect=RuntimeError("failed")
        ):
            with self.assertRaises(RuntimeError):
                duplicate_group(self.group)
        self.assertEqual(TextGroup.objects.filter(project=self.project).count(), 1)
        self.assertEqual(self.group.texts.get().markdown, "Keep")
