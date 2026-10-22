from django.urls import path

from .views import DeviceSecurityView

urlpatterns = [path("<str:action>/", DeviceSecurityView.as_view())]
