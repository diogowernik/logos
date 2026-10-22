from django.contrib import admin
from django.urls import include, path

from .views import HealthCheckView

urlpatterns = [
    path("api/device-security/", include("device_security.urls")),
    path("api/library/", include("library.urls")),
    path("admin/", admin.site.urls),
    path("auth/", include("djoser.urls")),
    path("auth/", include("djoser.urls.authtoken")),
    path("api/health/", HealthCheckView.as_view(), name="health-check"),
]
