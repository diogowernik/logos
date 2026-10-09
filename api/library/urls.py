from rest_framework.routers import DefaultRouter

from .asset_views import AssetViewSet
from .import_views import ImportJobViewSet
from .views import CollectionViewSet, ProjectViewSet, TextGroupViewSet, TextViewSet

router = DefaultRouter()
router.register("collections", CollectionViewSet, basename="collection")
router.register("projects", ProjectViewSet, basename="project")
router.register("groups", TextGroupViewSet, basename="group")
router.register("texts", TextViewSet, basename="text")
router.register("assets", AssetViewSet, basename="asset")
router.register("epub-imports", ImportJobViewSet, basename="epub-import")
urlpatterns = router.urls
