from django.contrib import admin
from django.http import JsonResponse
from django.urls import path, include, re_path
from django.conf import settings
from django.views.static import serve

from .chatbot import chatbot


def api_root(request):
    return JsonResponse({
        "status": "ok",
        "message": "Fenina API is running",
        "routes": [
            "/api/auth/",
            "/api/",
            "/api/vehicles/",
            "/api/chatbot/",
            "/healthz/",
        ],
    })


urlpatterns = [
    path("", api_root, name="api-root"),
    path("healthz/", api_root, name="healthz"),
    path("django-admin/", admin.site.urls),
    path("api/auth/", include("accounts.urls")),
    path("api/", include("catalog.urls")),
    path("api/", include("billing.urls")),
    path("api/vehicles/", include("vehicles.urls")),
    path("api/chatbot/", chatbot, name="chatbot"),
    re_path(r"^media/(?P<path>.*)$", serve, {"document_root": settings.MEDIA_ROOT}),
]
