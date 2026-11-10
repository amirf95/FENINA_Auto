from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.views.static import serve

from .chatbot import chatbot

urlpatterns = [
    path("django-admin/", admin.site.urls),
    path("api/auth/", include("accounts.urls")),
    path("api/", include("catalog.urls")),
    path("api/", include("billing.urls")),
    path("api/vehicles/", include("vehicles.urls")),
    path("api/chatbot/", chatbot, name="chatbot"),
    re_path(r"^media/(?P<path>.*)$", serve, {"document_root": settings.MEDIA_ROOT}),
]
