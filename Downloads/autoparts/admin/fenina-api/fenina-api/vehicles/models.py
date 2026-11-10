from django.db import models


class CarBrandModel(models.Model):
    """One (brand, model) pair — e.g. ("Peugeot", "208").

    Seeded from the VehiclesDB open dataset (cars only, its other 5 vehicle
    kinds — motorcycle/moped/van/truck/bus — are excluded):
    https://github.com/vehiclesdb/vehiclesdb

    Licensed CC-BY 4.0: any public display of this data must credit
    "Vehicle data by VehiclesDB" linking to https://vehiclesdb.com.
    """

    brand = models.CharField(max_length=100, db_index=True)
    model = models.CharField(max_length=150)

    class Meta:
        db_table = "car_brands_and_models"
        ordering = ["brand", "model"]
        constraints = [
            models.UniqueConstraint(fields=["brand", "model"], name="unique_car_brand_model")
        ]

    def __str__(self):
        return f"{self.brand} {self.model}"
