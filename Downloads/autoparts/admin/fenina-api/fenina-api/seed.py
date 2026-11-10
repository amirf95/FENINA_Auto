"""
Optional: populate the database with sample data for testing.
Run after migrating:  python seed.py
Creates a staff login (amir@fenina.tn / fenina2026) plus sample clients,
parts, and invoices in various paid/overdue states.
"""
import os, django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "fenina_api.settings")
django.setup()

from datetime import timedelta
from decimal import Decimal
from django.utils import timezone
from accounts.models import StaffUser
from catalog.models import Client, Part
from billing.models import Invoice, InvoiceLine, Payment
from billing.services import build_reminders

if StaffUser.objects.filter(email="amir@fenina.tn").exists():
    print("Seed data already present. Skipping.")
    raise SystemExit

today = timezone.localdate()

StaffUser.objects.create_user(
    username="amir", email="amir@fenina.tn", password="fenina2026",
    role="owner", first_name="Amir", last_name="Fenina",
)

g1 = Client.objects.create(name="Garage", surname="Slim", kind="garage", phone="98 123 456", credit_limit=Decimal("5000"))
g2 = Client.objects.create(name="Garage", surname="El Amen", kind="garage", phone="97 444 222", credit_limit=Decimal("3000"))
i1 = Client.objects.create(name="Mohamed", surname="Trabelsi", kind="individual", phone="21 555 789")

Part.objects.create(sku="BOS-PLQ-01", name="Plaquettes Bosch", brand="Bosch", category="Freinage", price=Decimal("95"), quantity=20)
Part.objects.create(sku="NOUR-70", name="Batterie Nour 70Ah", brand="Nour", category="Batterie", price=Decimal("320"), quantity=3, reorder_level=5)

def mk(client, issue, due, lines, paid=0):
    inv = Invoice.objects.create(client=client, issue_date=issue, due_date=due)
    for desc, qty, price in lines:
        InvoiceLine.objects.create(invoice=inv, description=desc, quantity=Decimal(qty), unit_price=Decimal(price))
    if paid:
        Payment.objects.create(invoice=inv, amount=Decimal(paid), paid_on=issue)
    return inv

mk(g1, today, today, [("Plaquettes Bosch", "4", "95"), ("Disque Valeo", "2", "430.25")], paid="1240.50")
mk(i1, today - timedelta(days=1), today + timedelta(days=14), [("Batterie Nour 70Ah", "1", "320")])
mk(g2, today - timedelta(days=8), today - timedelta(days=3), [("Roulement SKF", "6", "110"), ("Embrayage LUK", "1", "220")], paid="400")
mk(g1, today - timedelta(days=12), today - timedelta(days=9), [("Kit distribution", "1", "1560")])

created = build_reminders()
print(f"Seed complete. Login: amir@fenina.tn / fenina2026  | reminders generated: {created}")
