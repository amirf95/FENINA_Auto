"""Business logic for generating payment reminders and keeping stock in sync
with invoices."""
from django.utils import timezone
from catalog.services import adjust_stock
from .models import Invoice, Reminder


def apply_stock_for_invoice(invoice, user=None):
    """Decrement stock + log a SALE movement for every line linked to a part.
    Call this once, right after an invoice's lines have been (re)created."""
    from catalog.models import StockMovement

    for line in invoice.lines.select_related("part").all():
        if line.part_id and line.quantity:
            adjust_stock(
                line.part, -int(line.quantity), StockMovement.Reason.SALE,
                invoice_number=invoice.number, note=f"Vente {invoice.number}",
                user=user,
            )


def revert_stock_for_invoice(invoice, user=None):
    """Restore stock + log a RETURN movement for every line linked to a part.
    Call this BEFORE lines are deleted or replaced (invoice edit/delete)."""
    from catalog.models import StockMovement

    for line in invoice.lines.select_related("part").all():
        if line.part_id and line.quantity:
            adjust_stock(
                line.part, int(line.quantity), StockMovement.Reason.RETURN,
                invoice_number=invoice.number, note=f"Annulation {invoice.number}",
                user=user,
            )


# Reminder cadence: generate a reminder at these overdue-day milestones.
REMINDER_MILESTONES = [1, 7, 14, 30]


def build_reminders():
    """
    Scan all overdue invoices and create a Reminder for any that has hit a
    milestone and doesn't already have a reminder for that milestone.
    Returns the number of reminders created. Safe to run repeatedly (idempotent).
    """
    created = 0
    today = timezone.now().date()

    for invoice in Invoice.objects.prefetch_related("lines", "payments", "client"):
        if not invoice.is_overdue:
            continue
        days = invoice.days_overdue

        # find the highest milestone this invoice has reached
        reached = [m for m in REMINDER_MILESTONES if days >= m]
        if not reached:
            continue
        milestone = max(reached)

        # skip if we already made a reminder at this milestone
        already = invoice.reminders.filter(days_overdue=milestone).exists()
        if already:
            continue

        client = invoice.client
        msg = (
            f"Bonjour {client.full_name}, votre facture {invoice.number} "
            f"d'un montant de {invoice.amount_due} DT est en retard de "
            f"{days} jour(s). Merci de régulariser. — Fenina Auto Parts"
        )
        Reminder.objects.create(
            invoice=invoice,
            days_overdue=milestone,
            message=msg,
        )
        created += 1

    return created
