from django.core import mail
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from accounts.models import StaffUser
from catalog.models import Part
from catalog.services import build_inventory_workbook


class InventoryExcelExportTests(TestCase):
    def test_inventory_workbook_contains_expected_columns(self):
        Part.objects.create(
            sku="SKU-1001",
            name="Filtre à huile",
            barcode="1234567890",
            quantity=25,
            reorder_level=5,
            price=42.5,
            priceht=28.0,
            location="Rayon A1",
        )

        workbook = build_inventory_workbook()
        worksheet = workbook.active

        self.assertEqual(worksheet["A1"].value, "SKU")
        self.assertEqual(worksheet["B1"].value, "Désignation")
        self.assertEqual(worksheet["K1"].value, "Quantité")
        self.assertEqual(worksheet["A2"].value, "SKU-1001")
        self.assertEqual(worksheet["B2"].value, "Filtre à huile")
        self.assertEqual(worksheet["K2"].value, 25)
        self.assertEqual(worksheet["L2"].value, 5)

    @override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend", DAILY_INVENTORY_EMAIL="owner@example.com")
    def test_send_daily_report_sends_email(self):
        Part.objects.create(
            sku="SKU-2001",
            name="Filtre à air",
            brand="Valeo",
            quantity=7,
            reorder_level=2,
        )

        user = StaffUser.objects.create_user(
            email="owner@example.com",
            username="owner",
            password="secret123",
            role=StaffUser.Role.OWNER,
            first_name="Owner",
            last_name="Test",
        )

        client = APIClient()
        client.force_authenticate(user=user)

        response = client.post("/api/parts/send-daily-report/", {"email": "owner@example.com"}, format="json")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("inventaire", mail.outbox[0].subject.lower())

    def test_same_sku_can_exist_for_different_brands_and_variants(self):
        part = Part.objects.create(
            sku="SKU-777",
            name="Filtre à air",
            brand="Bosch",
            car_brand="VW",
            car_model="POLO 5",
            category="brake",
            variant="SMALL",
            quantity=4,
            reorder_level=2,
        )

        Part.objects.create(
            sku="SKU-777",
            name="Filtre à air",
            brand="Bosch",
            car_brand="VW",
            car_model="POLO 5",
            category="brake",
            variant="LARGE",
            quantity=6,
            reorder_level=2,
        )

        Part.objects.create(
            sku="SKU-777",
            name="Filtre à air",
            brand="Valeo",
            car_brand="VW",
            car_model="POLO 5",
            category="filter",
            variant="",
            quantity=5,
            reorder_level=2,
        )

        self.assertEqual(Part.objects.filter(sku="SKU-777").count(), 3)

        part.sku = "sku-888"
        part.brand = "bosch"
        part.car_brand = "vw"
        part.car_model = "polo 5"
        part.category = "brake"
        part.variant = "small"
        part.save()
        part.refresh_from_db()

        self.assertEqual(part.sku, "SKU-888")
        self.assertEqual(part.brand, "BOSCH")
        self.assertEqual(part.car_brand, "VW")
        self.assertEqual(part.car_model, "POLO 5")
        self.assertEqual(part.category, "BRAKE")
        self.assertEqual(part.variant, "SMALL")
        self.assertTrue(Part.objects.filter(sku="SKU-888", brand="BOSCH", variant="SMALL").exists())
