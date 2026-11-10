from datetime import datetime
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand

from catalog.models import Part
from catalog.services import build_inventory_workbook, send_daily_inventory_email


class Command(BaseCommand):
    help = "Generate a daily Excel file with the complete stock inventory and optionally email it."

    def add_arguments(self, parser):
        parser.add_argument("--send-email", action="store_true", help="Send the workbook by email if SMTP is configured.")
        parser.add_argument("--email", default="", help="Recipient email to send the report to.")

    def handle(self, *args, **options):
        export_dir = Path(settings.BASE_DIR) / "exports"
        export_dir.mkdir(exist_ok=True)

        workbook = build_inventory_workbook(Part.objects.all().order_by("name"))
        filename = f"inventaire_{datetime.now():%Y-%m-%d}.xlsx"
        filepath = export_dir / filename
        workbook.save(filepath)

        self.stdout.write(self.style.SUCCESS(f"Inventory export saved to {filepath}"))

        recipient = options.get("email") or getattr(settings, "DAILY_INVENTORY_EMAIL", "")
        if options.get("send_email") and recipient:
            sent = send_daily_inventory_email(recipient, subject=f"Fenina — inventaire du {datetime.now():%d/%m/%Y}")
            if sent is not None:
                self.stdout.write(self.style.SUCCESS(f"Report emailed to {recipient} (messages sent: {sent})"))
            else:
                self.stdout.write(self.style.WARNING("SMTP is not configured; the report was saved locally only."))
