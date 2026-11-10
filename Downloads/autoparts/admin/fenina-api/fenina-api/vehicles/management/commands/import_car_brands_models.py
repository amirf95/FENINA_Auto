import requests
from django.core.management.base import BaseCommand
from django.db import transaction

from vehicles.models import CarBrandModel

# Only the "car" kind — vehiclesdb also ships motorcycle/moped/van/truck/bus
# catalogs at the same paths (catalog/<kind>/...), which are deliberately not
# imported here.
MAKES_URL = "https://raw.githubusercontent.com/vehiclesdb/vehiclesdb/main/catalog/car/makes.json"
MODELS_URL = "https://raw.githubusercontent.com/vehiclesdb/vehiclesdb/main/catalog/car/models.json"


class Command(BaseCommand):
    help = (
        "Import car brands & models from the VehiclesDB open dataset "
        "(https://github.com/vehiclesdb/vehiclesdb, CC-BY 4.0, cars only) "
        "into the car_brands_and_models table."
    )

    def handle(self, *args, **options):
        self.stdout.write("Fetching makes...")
        makes = requests.get(MAKES_URL, timeout=30).json()
        make_names = {make["id"]: make["name"] for make in makes}

        self.stdout.write("Fetching models...")
        models_data = requests.get(MODELS_URL, timeout=30).json()

        rows = []
        skipped = 0
        for entry in models_data:
            brand = make_names.get(entry["make_id"])
            if not brand:
                skipped += 1
                continue
            rows.append(CarBrandModel(brand=brand, model=entry["name"]))

        with transaction.atomic():
            CarBrandModel.objects.all().delete()
            CarBrandModel.objects.bulk_create(rows, ignore_conflicts=True)

        self.stdout.write(self.style.SUCCESS(
            f"Imported {len(rows)} car brand/model rows from {len(make_names)} brands "
            f"({skipped} models skipped for an unknown make_id)."
        ))
        self.stdout.write(self.style.WARNING(
            "Reminder: this dataset is CC-BY 4.0 — any public use requires visible "
            'credit: "Vehicle data by VehiclesDB" linking to https://vehiclesdb.com.'
        ))
