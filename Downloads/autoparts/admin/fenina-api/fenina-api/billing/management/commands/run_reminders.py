"""
Daily reminder job. Run via cron / Task Scheduler:
    python manage.py run_reminders
Generates payment reminders for overdue invoices.
"""
from django.core.management.base import BaseCommand
from billing.services import build_reminders


class Command(BaseCommand):
    help = "Generate payment reminders for overdue invoices (run daily)."

    def handle(self, *args, **options):
        created = build_reminders()
        self.stdout.write(self.style.SUCCESS(
            f"Rappels générés : {created}"
        ))
