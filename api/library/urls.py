from rest_framework.routers import DefaultRouter

from .views import CollectionViewSet, ProjectViewSet, TextViewSet
from .asset_views import AssetViewSet

router = DefaultRouter()
router.register("collections", CollectionViewSet, basename="collection")
router.register("projects", ProjectViewSet, basename="project")
router.register("texts", TextViewSet, basename="text")
router.register("assets", AssetViewSet, basename="asset")
urlpatterns = router.urls
