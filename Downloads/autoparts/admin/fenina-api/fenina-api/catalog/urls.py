from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ClientViewSet, PartViewSet, StockMovementViewSet

router = DefaultRouter()
router.register("clients", ClientViewSet)
router.register("parts", PartViewSet)
router.register("stock-movements", StockMovementViewSet)

urlpatterns = [path("", include(router.urls))]
