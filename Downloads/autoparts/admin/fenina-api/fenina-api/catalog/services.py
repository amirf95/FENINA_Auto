"""Stock-adjustment helper shared by the catalog app (manual restock /
correction) and the billing app (automatic sale / return logging)."""
from io import BytesIO
from datetime import datetime

from django.conf import settings
from django.core.mail import EmailMessage
from django.db.models import F
from openpyxl import Workbook
from openpyxl.styles import Font


def adjust_stock(part, delta, reason, *, invoice_number="", note="", user=None):
    """Atomically move `part`'s quantity by `delta` and append a StockMovement.
    delta > 0 = stock coming in (restock, return), delta < 0 = stock going
    out (sale). Movements are never edited or deleted — always append."""
    from .models import Part, StockMovement

    if delta == 0:
        return None
    Part.objects.filter(pk=part.pk).update(quantity=F("quantity") + delta)
    part.refresh_from_db(fields=["quantity"])
    return StockMovement.objects.create(
        part=part,
        quantity_delta=delta,
        reason=reason,
        invoice_number=invoice_number,
        note=note,
        created_by=user,
    )


def build_inventory_workbook(parts=None):
    """Return an Excel workbook containing the complete inventory snapshot."""
    from .models import Part

    workbook = Workbook()
    worksheet = workbook.active
    worksheet.title = "Stock"

    headers = [
        "SKU",
        "Désignation",
        "OEM",
        "Code-barres",
        "Code QR",
        "Marque",
        "Catégorie",
        "Sous-catégorie",
        "Prix vente",
        "Prix achat HT",
        "Quantité",
        "Seuil alerte",
        "Emplacement",
        "Statut",
        "Date création",
    ]
    worksheet.append(headers)

    for cell in worksheet[1]:
        cell.font = Font(bold=True)

    inventory = parts or Part.objects.all().order_by("name")
    for part in inventory:
        worksheet.append([
            part.sku,
            part.name,
            part.oem,
            part.barcode or "",
            part.qr_code or "",
            part.brand,
            part.category,
            part.subcategory,
            float(part.price) if part.price is not None else 0,
            float(part.priceht) if part.priceht is not None else 0,
            part.quantity,
            part.reorder_level,
            part.location,
            "Rupture" if part.out_of_stock else "Faible" if part.low_stock else "OK",
            part.created_at.strftime("%Y-%m-%d %H:%M:%S") if part.created_at else "",
        ])

    worksheet.freeze_panes = "A2"
    for column in worksheet.columns:
        max_length = 0
        column_letter = column[0].column_letter
        for cell in column:
            if cell.value is not None:
                max_length = max(max_length, len(str(cell.value)))
        worksheet.column_dimensions[column_letter].width = min(max_length + 2, 32)

    return workbook


def generate_inventory_excel_bytes(parts=None):
    """Generate the raw XLSX payload for inventory export."""
    workbook = build_inventory_workbook(parts=parts)
    buffer = BytesIO()
    workbook.save(buffer)
    buffer.seek(0)
    return buffer.getvalue()


def send_daily_inventory_email(recipient_email, *, parts=None, subject=None):
    """Create a daily inventory Excel attachment and email it if SMTP is configured."""
    if not recipient_email:
        return None

    workbook = build_inventory_workbook(parts=parts)
    buffer = BytesIO()
    workbook.save(buffer)
    buffer.seek(0)

    filename = f"inventory_{datetime.now().strftime('%Y-%m-%d')}.xlsx"
    email = EmailMessage(
        subject or f"Fenina — inventaire du {datetime.now().strftime('%d/%m/%Y')}",
        body="Bonjour,\n\nVoici l'inventaire complet de la journée.\n\nCordialement,\nFenina Admin",
        from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "no-reply@fenina.local"),
        to=[recipient_email],
    )
    email.attach(filename, buffer.getvalue(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    should_send = bool(getattr(settings, "EMAIL_HOST", "")) or "locmem" in str(getattr(settings, "EMAIL_BACKEND", ""))
    return email.send() if should_send else None
