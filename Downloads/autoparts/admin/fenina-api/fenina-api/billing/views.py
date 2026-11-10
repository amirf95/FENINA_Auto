from decimal import Decimal
from datetime import timedelta
from django.db.models import F, Q
from django.utils import timezone
from rest_framework import viewsets, filters, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from rest_framework.parsers import MultiPartParser, FormParser
from .models import Invoice, InvoiceLine, Payment, Reminder
from .serializers import InvoiceSerializer, ExistingInvoiceSerializer, PaymentSerializer, ReminderSerializer
from .services import build_reminders, revert_stock_for_invoice


def _request_user(request):
    user = getattr(request, "user", None)
    return user if user and user.is_authenticated else None


class InvoiceViewSet(viewsets.ModelViewSet):
    queryset = Invoice.objects.prefetch_related("lines", "payments", "client").all()
    serializer_class = InvoiceSerializer
    pagination_class = None
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = [
        "number", "client__name", "client__surname",
        "client__phone", "client__aka", "client__cin",
    ]
    ordering_fields = ["issue_date", "due_date", "number"]

    def get_queryset(self):
        qs = super().get_queryset()
        st = self.request.query_params.get("status")
        if st in {"paid", "partial", "unpaid"}:
            # status is a computed property, so filter in python
            ids = [i.id for i in qs if i.status == st]
            qs = qs.filter(id__in=ids)
        if self.request.query_params.get("overdue") == "true":
            ids = [i.id for i in qs if i.is_overdue]
            qs = qs.filter(id__in=ids)
        return qs

    @action(detail=True, methods=["post"])
    def add_payment(self, request, pk=None):
        """Record a payment against this invoice."""
        invoice = self.get_object()
        data = {**request.data, "invoice": invoice.id}
        ser = PaymentSerializer(data=data)
        ser.is_valid(raise_exception=True)
        ser.save()
        invoice.refresh_from_db()
        ctx = {"request": request}
        return Response(InvoiceSerializer(invoice, context=ctx).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["post"], parser_classes=[MultiPartParser, FormParser])
    def register_existing(self, request):
        """Register an existing (pre-issued) invoice with optional photo."""
        ser = ExistingInvoiceSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        invoice = ser.save()
        ctx = {"request": request}
        return Response(InvoiceSerializer(invoice, context=ctx).data, status=status.HTTP_201_CREATED)

    def perform_destroy(self, instance):
        # Deleting an invoice releases whatever stock its lines had taken.
        revert_stock_for_invoice(instance, user=_request_user(self.request))
        instance.delete()


class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.select_related("invoice").all()
    serializer_class = PaymentSerializer


class ReminderViewSet(viewsets.ModelViewSet):
    queryset = Reminder.objects.select_related("invoice", "invoice__client").all()
    serializer_class = ReminderSerializer

    @action(detail=False, methods=["post"])
    def refresh(self, request):
        """Regenerate reminders for all overdue invoices (manual trigger)."""
        created = build_reminders()
        return Response({"created": created}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def mark_sent(self, request, pk=None):
        reminder = self.get_object()
        reminder.sent = True
        reminder.sent_at = timezone.now()
        reminder.save()
        return Response(ReminderSerializer(reminder).data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard(request):
    """Daily revenue snapshot + outstanding + overdue counts for the dashboard."""
    from catalog.models import Part

    today = timezone.now().date()
    invoices = Invoice.objects.prefetch_related("lines", "payments").all()

    revenue_today = sum(
        (p.amount for p in Payment.objects.filter(paid_on=today)), Decimal("0")
    )
    invoiced_today = sum(
        (i.total for i in invoices if i.issue_date == today), Decimal("0")
    )
    outstanding = sum((i.amount_due for i in invoices), Decimal("0"))
    overdue = [i for i in invoices if i.is_overdue]
    overdue_total = sum((i.amount_due for i in overdue), Decimal("0"))

    # last 7 days revenue trend
    trend = []
    for d in range(6, -1, -1):
        day = today - timedelta(days=d)
        amount = sum(
            (p.amount for p in Payment.objects.filter(paid_on=day)), Decimal("0")
        )
        trend.append({"date": day.isoformat(), "amount": amount})

    # stock notices — parts out of stock or at/below their reorder threshold
    out_of_stock_count = Part.objects.filter(quantity__lte=0).count()
    low_stock_count = Part.objects.filter(
        quantity__gt=0, quantity__lte=F("reorder_level")
    ).count()
    parts_sold_today = sum(
        int(line.quantity)
        for line in InvoiceLine.objects.filter(invoice__issue_date=today, part__isnull=False)
    )

    return Response({
        "date": today.isoformat(),
        "revenue_today": revenue_today,
        "invoiced_today": invoiced_today,
        "invoices_today_count": sum(1 for i in invoices if i.issue_date == today),
        "outstanding": outstanding,
        "overdue_count": len(overdue),
        "overdue_total": overdue_total,
        "revenue_trend": trend,
        "parts_sold_today": parts_sold_today,
        "out_of_stock_count": out_of_stock_count,
        "low_stock_count": low_stock_count,
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def sales_stats(request):
    """Items sold per day (quantity + revenue) over the last N days, plus the
    best-selling parts in that window. Powers the Stock tab's statistics panel."""
    try:
        days = max(1, min(90, int(request.query_params.get("days", 14))))
    except ValueError:
        days = 14

    today = timezone.now().date()
    start = today - timedelta(days=days - 1)

    lines = (
        InvoiceLine.objects
        .filter(part__isnull=False, invoice__issue_date__gte=start, invoice__issue_date__lte=today)
        .select_related("invoice", "part")
    )

    by_day = {
        (start + timedelta(days=d)).isoformat(): {"quantity": 0, "revenue": Decimal("0"), "invoice_ids": set()}
        for d in range(days)
    }
    by_part = {}

    for line in lines:
        key = line.invoice.issue_date.isoformat()
        qty = line.quantity
        revenue = line.subtotal
        bucket = by_day.get(key)
        if bucket is not None:
            bucket["quantity"] += qty
            bucket["revenue"] += revenue
            bucket["invoice_ids"].add(line.invoice_id)

        p = by_part.setdefault(line.part_id, {
            "part_id": line.part_id, "sku": line.part.sku, "name": line.part.name,
            "quantity": 0, "revenue": Decimal("0"),
        })
        p["quantity"] += qty
        p["revenue"] += revenue

    daily = [
        {
            "date": day,
            "quantity_sold": int(v["quantity"]),
            "revenue": v["revenue"],
            "invoices_count": len(v["invoice_ids"]),
        }
        for day, v in sorted(by_day.items())
    ]
    top_parts = sorted(by_part.values(), key=lambda p: p["quantity"], reverse=True)[:8]
    for p in top_parts:
        p["quantity"] = int(p["quantity"])

    return Response({
        "start": start.isoformat(),
        "end": today.isoformat(),
        "days": daily,
        "top_parts": top_parts,
        "total_quantity": sum(d["quantity_sold"] for d in daily),
        "total_revenue": sum((d["revenue"] for d in daily), Decimal("0")),
    })
