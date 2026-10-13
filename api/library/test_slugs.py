from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from .models import Collection, Project


class SlugTests(TestCase):
    def setUp(self):
        self.owner = get_user_model().objects.create_user(username="slug-owner")
        self.other = get_user_model().objects.create_user(username="slug-other")
        self.client = APIClient()
        self.client.force_authenticate(self.owner)

    def test_stable_unique_slugs_for_both_resources(self):
        for model in (Project, Collection):
            first = model.objects.create(owner=self.owner, title="O Jogador — edição")
            second = model.objects.create(owner=self.owner, title=first.title)
            foreign = model.objects.create(owner=self.other, title=first.title)
            self.assertEqual(first.slug, "o-jogador-edicao")
            self.assertEqual(second.slug, "o-jogador-edicao-2")
            self.assertEqual(foreign.slug, first.slug)
            first.title = "Novo nome"
            first.save(update_fields=["title"])
            first.refresh_from_db()
            self.assertEqual(first.slug, "o-jogador-edicao")
            numeric = model.objects.create(owner=self.owner, title="123")
            self.assertEqual(numeric.slug, "titulo-123")
            reserved = model.objects.create(owner=self.owner, title="Inbox")
            self.assertEqual(reserved.slug, "titulo-inbox")

    def test_numeric_and_slug_lookup_and_owner_isolation(self):
        for model, kind in ((Project, "projects"), (Collection, "collections")):
            obj = model.objects.create(owner=self.owner, title="A Cultura")
            for reference in (obj.pk, obj.slug):
                response = self.client.get(f"/api/library/{kind}/{reference}/")
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.data["id"], obj.pk)
                self.assertEqual(response.data["slug"], obj.slug)
            foreign = model.objects.create(owner=self.other, title="Privado")
            for reference in (foreign.pk, foreign.slug):
                self.assertEqual(
                    self.client.get(f"/api/library/{kind}/{reference}/").status_code, 404
                )
            response = self.client.patch(
                f"/api/library/{kind}/{obj.slug}/", {"title": "Renomeado", "slug": "outro"}
            )
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.data["slug"], obj.slug)
