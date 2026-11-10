from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import InvoiceViewSet, PaymentViewSet, ReminderViewSet, dashboard, sales_stats

router = DefaultRouter()
router.register("invoices", InvoiceViewSet)
router.register("payments", PaymentViewSet)
router.register("reminders", ReminderViewSet)

urlpatterns = [
    path("dashboard/", dashboard, name="dashboard"),
    path("stats/sales/", sales_stats, name="sales-stats"),
    path("", include(router.urls)),
]
