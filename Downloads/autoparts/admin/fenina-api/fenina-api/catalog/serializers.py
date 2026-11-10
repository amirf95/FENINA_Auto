from rest_framework import serializers
from .models import Client, ClientAuditLog, Part, StockMovement


class ClientSerializer(serializers.ModelSerializer):
    kind_label = serializers.CharField(source="get_kind_display", read_only=True)
    balance = serializers.DecimalField(max_digits=12, decimal_places=3, read_only=True)

    class Meta:
        model = Client
        fields = ["id", "name", "surname", "kind", "kind_label", "phone",
                  "cin", "car", "aka", "email", "address", "credit_limit",
                  "balance", "notes", "created_at"]


class ClientAuditLogSerializer(serializers.ModelSerializer):
    timestamp = serializers.DateTimeField(source="created_at", read_only=True)
    fields = serializers.JSONField(source="changed_fields", read_only=True)

    class Meta:
        model = ClientAuditLog
        fields = ["id", "client", "client_name", "action", "status",
                  "fields", "timestamp", "created_at"]


class PartSerializer(serializers.ModelSerializer):
    low_stock = serializers.BooleanField(read_only=True)
    out_of_stock = serializers.BooleanField(read_only=True)

    class Meta:
        model = Part
        fields = ["id", "sku", "name", "oem", "barcode", "qr_code", "brand", "car_brand", "car_model",
                  "category", "subcategory", "variant", "specs", "price", "priceht", "quantity",
                  "reorder_level", "location", "low_stock", "out_of_stock", "created_at"]


class StockMovementSerializer(serializers.ModelSerializer):
    part_name = serializers.CharField(source="part.name", read_only=True)
    part_sku = serializers.CharField(source="part.sku", read_only=True)
    reason_label = serializers.CharField(source="get_reason_display", read_only=True)
    created_by_name = serializers.CharField(source="created_by.get_full_name", read_only=True, default="")

    class Meta:
        model = StockMovement
        fields = ["id", "part", "part_name", "part_sku", "quantity_delta",
                  "reason", "reason_label", "invoice_number", "note",
                  "created_by_name", "created_at"]
        read_only_fields = ["created_at"]
