from rest_framework import serializers
from .models import Invoice, InvoiceLine, Payment, Reminder
from .services import apply_stock_for_invoice, revert_stock_for_invoice


def _request_user(context):
    request = context.get("request")
    user = getattr(request, "user", None)
    return user if user and user.is_authenticated else None


class InvoiceLineSerializer(serializers.ModelSerializer):
    subtotal = serializers.DecimalField(max_digits=14, decimal_places=3, read_only=True)

    class Meta:
        model = InvoiceLine
        fields = ["id", "part", "description", "quantity", "unit_price", "subtotal"]


class PaymentSerializer(serializers.ModelSerializer):
    method_label = serializers.CharField(source="get_method_display", read_only=True)

    class Meta:
        model = Payment
        fields = ["id", "invoice", "amount", "method", "method_label", "paid_on", "note"]


class InvoiceSerializer(serializers.ModelSerializer):
    lines = InvoiceLineSerializer(many=True)
    payments = PaymentSerializer(many=True, read_only=True)
    client_name = serializers.CharField(source="client.full_name", read_only=True)
    client_phone = serializers.CharField(source="client.phone", read_only=True)
    total = serializers.DecimalField(max_digits=14, decimal_places=3, read_only=True)
    amount_paid = serializers.DecimalField(max_digits=14, decimal_places=3, read_only=True)
    amount_due = serializers.DecimalField(max_digits=14, decimal_places=3, read_only=True)
    status = serializers.CharField(read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)
    days_overdue = serializers.IntegerField(read_only=True)

    class Meta:
        model = Invoice
        fields = ["id", "number", "client", "client_name", "client_phone",
                  "issue_date", "due_date", "notes", "lines", "payments",
                  "total", "amount_paid", "amount_due", "status",
                  "is_overdue", "days_overdue", "created_at",
                  "is_existing", "manual_total", "manual_paid", "photo"]
        read_only_fields = []

    def validate_number(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Le numéro de facture est requis.")
        qs = Invoice.objects.filter(number=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("Ce numéro de facture existe déjà.")
        return value

    def create(self, validated_data):
        lines = validated_data.pop("lines", [])
        invoice = Invoice.objects.create(**validated_data)
        for line in lines:
            InvoiceLine.objects.create(invoice=invoice, **line)
        # New invoice with parts on it → those parts just sold, take them off the shelf.
        apply_stock_for_invoice(invoice, user=_request_user(self.context))
        return invoice

    def update(self, instance, validated_data):
        lines = validated_data.pop("lines", None)
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.save()
        if lines is not None:
            user = _request_user(self.context)
            # Put back whatever the old lines had taken out, then re-deduct
            # for the new lines — keeps stock correct across repeated edits.
            revert_stock_for_invoice(instance, user=user)
            instance.lines.all().delete()
            for line in lines:
                InvoiceLine.objects.create(invoice=instance, **line)
            apply_stock_for_invoice(instance, user=user)
        return instance


class ExistingInvoiceSerializer(serializers.ModelSerializer):
    """Used by register_existing action — accepts multipart/form-data."""
    from catalog.models import Client as _Client
    client = serializers.PrimaryKeyRelatedField(queryset=_Client.objects.all())
    client_name = serializers.CharField(source="client.full_name", read_only=True)
    # due_date is optional — defaults to issue_date + 30 days in create()
    due_date = serializers.DateField(required=False, allow_null=True)
    total = serializers.DecimalField(max_digits=14, decimal_places=3, read_only=True)
    amount_paid = serializers.DecimalField(max_digits=14, decimal_places=3, read_only=True)
    amount_due = serializers.DecimalField(max_digits=14, decimal_places=3, read_only=True)
    status = serializers.CharField(read_only=True)

    class Meta:
        model = Invoice
        fields = [
            "id", "number", "client", "client_name",
            "manual_total", "manual_paid", "photo", "notes",
            "issue_date", "due_date",
            "total", "amount_paid", "amount_due", "status",
            "is_existing", "created_at",
        ]
        read_only_fields = ["is_existing", "created_at"]

    def validate_number(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Le numéro de facture est requis.")
        qs = Invoice.objects.filter(number=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("Ce numéro de facture existe déjà.")
        return value

    def create(self, validated_data):
        from django.utils import timezone
        import datetime
        validated_data["is_existing"] = True
        if not validated_data.get("issue_date"):
            validated_data["issue_date"] = timezone.localdate()
        if not validated_data.get("due_date"):
            validated_data["due_date"] = (
                validated_data["issue_date"] + datetime.timedelta(days=30)
            )
        return Invoice.objects.create(**validated_data)


class ReminderSerializer(serializers.ModelSerializer):
    invoice_number = serializers.CharField(source="invoice.number", read_only=True)
    client_name = serializers.CharField(source="invoice.client.full_name", read_only=True)
    client_phone = serializers.CharField(source="invoice.client.phone", read_only=True)
    amount_due = serializers.DecimalField(source="invoice.amount_due", max_digits=14, decimal_places=3, read_only=True)
    channel_label = serializers.CharField(source="get_channel_display", read_only=True)

    class Meta:
        model = Reminder
        fields = ["id", "invoice", "invoice_number", "client_name", "client_phone",
                  "amount_due", "days_overdue", "channel", "channel_label",
                  "sent", "sent_at", "message", "created_at"]
