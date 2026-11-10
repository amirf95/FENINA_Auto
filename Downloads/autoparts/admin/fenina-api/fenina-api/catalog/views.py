from datetime import date

from django.conf import settings
from django.db.models import F
from django.http import HttpResponse
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .barcode import lookup_external
from .models import Client, ClientAuditLog, Part, StockMovement
from .serializers import (
    ClientAuditLogSerializer, ClientSerializer, PartSerializer,
    StockMovementSerializer,
)
from .services import adjust_stock, generate_inventory_excel_bytes, send_daily_inventory_email


def _request_user(request):
    user = getattr(request, "user", None)
    return user if user and user.is_authenticated else None


CLIENT_AUDIT_FIELDS = [
    "name", "surname", "kind", "phone", "cin", "car", "aka",
    "email", "credit_limit", "notes",
]


def _client_snapshot(client):
    return {
        field: "" if getattr(client, field, "") is None else str(getattr(client, field, ""))
        for field in CLIENT_AUDIT_FIELDS
    }


def _field_changes(before, after):
    return [
        {"field": field, "oldValue": before.get(field, ""), "newValue": after.get(field, "")}
        for field in CLIENT_AUDIT_FIELDS
        if before.get(field, "") != after.get(field, "")
    ]


def _request_user(request):
    user = getattr(request, "user", None)
    return user if user and user.is_authenticated else None


class ClientViewSet(viewsets.ModelViewSet):
    queryset = Client.objects.all()
    serializer_class = ClientSerializer
    pagination_class = None
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "surname", "phone", "cin", "car", "aka", "email"]
    ordering_fields = ["name", "created_at"]

    def _write_audit(self, action, status_value, *, client=None, client_name="", fields=None):
        ClientAuditLog.objects.create(
            client=client,
            client_name=client.full_name if client else client_name,
            action=action,
            status=status_value,
            changed_fields=fields or [],
            user=_request_user(self.request),
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
            self.perform_create(serializer)
        except Exception:
            self._write_audit(
                ClientAuditLog.Action.CREATION,
                ClientAuditLog.Status.FAILED,
                client_name=request.data.get("name", ""),
            )
            raise

        client = serializer.instance
        after = _client_snapshot(client)
        self._write_audit(
            ClientAuditLog.Action.CREATION,
            ClientAuditLog.Status.SUCCESS,
            client=client,
            fields=[
                {"field": field, "oldValue": "", "newValue": value}
                for field, value in after.items()
                if value
            ],
        )
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        before = _client_snapshot(instance)
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        try:
            serializer.is_valid(raise_exception=True)
            self.perform_update(serializer)
        except Exception:
            self._write_audit(
                ClientAuditLog.Action.MODIFICATION,
                ClientAuditLog.Status.FAILED,
                client=instance,
                fields=[],
            )
            raise

        client = serializer.instance
        changes = _field_changes(before, _client_snapshot(client))
        self._write_audit(
            ClientAuditLog.Action.MODIFICATION,
            ClientAuditLog.Status.SUCCESS,
            client=client,
            fields=changes,
        )
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def history(self, request, pk=None):
        client = self.get_object()
        serializer = ClientAuditLogSerializer(client.audit_logs.all(), many=True)
        return Response(serializer.data)


class PartViewSet(viewsets.ModelViewSet):
    queryset = Part.objects.all()
    serializer_class = PartSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "sku", "oem", "barcode", "qr_code", "brand", "category", "subcategory"]
    ordering_fields = ["name", "quantity", "price"]

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.query_params.get("low_stock") == "true":
            qs = qs.filter(quantity__lte=F("reorder_level"))
        if self.request.query_params.get("out_of_stock") == "true":
            qs = qs.filter(quantity__lte=0)
        return qs

    @action(detail=False, methods=["get"], url_path="manufacturers")
    def manufacturers(self, request):
        """Return all existing manufacturers so the admin form can populate a dropdown."""
        manufacturers = list(
            Part.objects.exclude(brand="").order_by("brand").values_list("brand", flat=True).distinct()
        )
        return Response({"manufacturers": manufacturers})

    @action(detail=False, methods=["get"], url_path="lookup-sku")
    def lookup_sku(self, request):
        """Return existing parts sharing the same SKU, so staff can choose the correct manufacturer/brand."""
        sku = request.query_params.get("sku", "").strip()
        if not sku:
            return Response({"detail": "sku est requis."}, status=status.HTTP_400_BAD_REQUEST)

        matches = Part.objects.filter(sku=sku).order_by("brand", "name")
        return Response({
            "matches": [{
                "id": part.id,
                "sku": part.sku,
                "name": part.name,
                "brand": part.brand,
                "location": part.location,
                "quantity": part.quantity,
            } for part in matches]
        })

    @action(detail=False, methods=["get"], url_path="lookup-barcode")
    def lookup_barcode(self, request):
        """Autofill helper for the add-part form: exact match against our own
        stock first (e.g. restocking a known part), then a best-effort
        external product lookup for barcodes we've never seen."""
        barcode = request.query_params.get("barcode", "").strip()
        if not barcode:
            return Response({"detail": "barcode est requis."}, status=status.HTTP_400_BAD_REQUEST)

        existing = Part.objects.filter(barcode=barcode).first()
        if existing:
            return Response({
                "matched": True,
                "source": "internal",
                "part": PartSerializer(existing).data,
            })

        suggestion = lookup_external(barcode)
        if suggestion:
            return Response({"matched": True, "source": "external", "suggested": suggestion})

        return Response({"matched": False})

    @action(detail=False, methods=["get"], url_path="lookup-qrcode")
    def lookup_qrcode(self, request):
        """Same idea as lookup-barcode, but QR-code content is arbitrary
        (often a URL or internal serial), not a UPC product code — so this
        only checks our own stock, there's no external product database to
        fall back to."""
        qr_code = request.query_params.get("qr_code", "").strip()
        if not qr_code:
            return Response({"detail": "qr_code est requis."}, status=status.HTTP_400_BAD_REQUEST)

        existing = Part.objects.filter(qr_code=qr_code).first()
        if existing:
            return Response({
                "matched": True,
                "source": "internal",
                "part": PartSerializer(existing).data,
            })

        return Response({"matched": False})

    @action(detail=False, methods=["get"])
    def alerts(self, request):
        """Parts that are out of stock or at/below their reorder threshold —
        powers the low-stock notices in the admin dashboard."""
        out_of_stock = Part.objects.filter(quantity__lte=0).order_by("name")
        low_stock = Part.objects.filter(
            quantity__gt=0, quantity__lte=F("reorder_level")
        ).order_by("quantity")
        return Response({
            "out_of_stock_count": out_of_stock.count(),
            "low_stock_count": low_stock.count(),
            "out_of_stock": PartSerializer(out_of_stock, many=True).data,
            "low_stock": PartSerializer(low_stock, many=True).data,
        })

    @action(detail=False, methods=["get"], url_path="export-xlsx")
    def export_xlsx(self, request):
        """Download the full inventory as an Excel workbook."""
        parts = Part.objects.order_by("name")
        content = generate_inventory_excel_bytes(parts)
        filename = f"inventaire_{date.today():%Y-%m-%d}.xlsx"
        response = HttpResponse(
            content,
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response

    @action(detail=False, methods=["post"], url_path="send-daily-report")
    def send_daily_report(self, request):
        """Send the full stock workbook by email to the configured recipient."""
        recipient = (request.data.get("email") or getattr(settings, "DAILY_INVENTORY_EMAIL", "") or "").strip()
        if not recipient:
            return Response({"detail": "Aucune adresse email de destinataire n'est configurée."}, status=status.HTTP_400_BAD_REQUEST)

        sent = send_daily_inventory_email(
            recipient,
            subject=f"Fenina — inventaire du {date.today():%d/%m/%Y}",
        )

        if sent is None:
            return Response({
                "detail": "Le fichier a été généré localement, mais le SMTP n'est pas configuré pour l'envoi automatique.",
                "sent": False,
                "recipient": recipient,
            })

        return Response({
            "detail": "Le rapport journalier a bien été envoyé.",
            "sent": True,
            "recipient": recipient,
            "messages_sent": sent,
        })

    @action(detail=True, methods=["post"])
    def adjust_stock(self, request, pk=None):
        """Manual stock-in/out (restock or correction) — logs a StockMovement
        and updates the part's quantity in one atomic step."""
        part = self.get_object()
        try:
            delta = int(request.data.get("delta"))
        except (TypeError, ValueError):
            return Response({"detail": "delta doit être un entier."}, status=status.HTTP_400_BAD_REQUEST)
        if delta == 0:
            return Response({"detail": "delta ne peut pas être 0."}, status=status.HTTP_400_BAD_REQUEST)

        reason = request.data.get("reason", StockMovement.Reason.RESTOCK)
        if reason not in (StockMovement.Reason.RESTOCK, StockMovement.Reason.ADJUSTMENT):
            return Response(
                {"detail": "reason doit être 'restock' ou 'adjustment'."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        note = request.data.get("note", "")

        adjust_stock(part, delta, reason, note=note, user=_request_user(request))
        part.refresh_from_db()
        return Response(PartSerializer(part).data)


class StockMovementViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only audit trail of stock changes — sales, returns, restocks,
    manual corrections."""
    queryset = StockMovement.objects.select_related("part", "created_by").all()
    serializer_class = StockMovementSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["part__name", "part__sku", "invoice_number"]
    ordering_fields = ["created_at"]

    def get_queryset(self):
        qs = super().get_queryset()
        part_id = self.request.query_params.get("part")
        if part_id:
            qs = qs.filter(part_id=part_id)
        reason = self.request.query_params.get("reason")
        if reason:
            qs = qs.filter(reason=reason)
        return qs
