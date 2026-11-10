from django.contrib import admin
from .models import Client, ClientAuditLog, Part, StockMovement

@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ("name", "surname", "kind", "phone", "cin", "car", "aka", "credit_limit")
    search_fields = ("name", "surname", "phone", "cin", "car", "aka")

@admin.register(ClientAuditLog)
class ClientAuditLogAdmin(admin.ModelAdmin):
    list_display = ("client_name", "action", "status", "created_at", "user")
    list_filter = ("action", "status", "created_at")
    search_fields = ("client_name",)
    readonly_fields = ("client", "client_name", "action", "status", "changed_fields", "user", "created_at")

@admin.register(Part)
class PartAdmin(admin.ModelAdmin):
    list_display = ("name", "sku", "brand", "quantity", "price", "low_stock")
    search_fields = ("name", "sku", "brand")

@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    list_display = ("part", "quantity_delta", "reason", "invoice_number", "created_at", "created_by")
    list_filter = ("reason", "created_at")
    search_fields = ("part__name", "part__sku", "invoice_number")
    readonly_fields = ("part", "quantity_delta", "reason", "invoice_number", "note", "created_by", "created_at")
