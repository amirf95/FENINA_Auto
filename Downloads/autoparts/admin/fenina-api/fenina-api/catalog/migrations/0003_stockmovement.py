from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("catalog", "0002_client_extra_fields_audit"),
    ]

    operations = [
        migrations.CreateModel(
            name="StockMovement",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("quantity_delta", models.IntegerField(help_text="Positif = entrée en stock, négatif = sortie.", verbose_name="variation")),
                ("reason", models.CharField(choices=[("sale", "Vente"), ("return", "Retour / annulation"), ("restock", "Réapprovisionnement"), ("adjustment", "Correction manuelle")], max_length=20)),
                ("invoice_number", models.CharField(blank=True, max_length=20)),
                ("note", models.CharField(blank=True, max_length=200)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("created_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
                ("part", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="movements", to="catalog.part")),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
    ]
