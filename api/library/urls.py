from rest_framework.routers import DefaultRouter

from .views import CollectionViewSet, ProjectViewSet, TextViewSet

router = DefaultRouter()
router.register("collections", CollectionViewSet, basename="collection")
router.register("projects", ProjectViewSet, basename="project")
router.register("texts", TextViewSet, basename="text")
urlpatterns = router.urls
