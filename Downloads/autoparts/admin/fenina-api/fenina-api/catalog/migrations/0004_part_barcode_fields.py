from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("catalog", "0003_stockmovement"),
    ]

    operations = [
        migrations.RenameField(
            model_name="part",
            old_name="cost",
            new_name="priceht",
        ),
        migrations.AlterField(
            model_name="part",
            name="priceht",
            field=models.DecimalField(
                decimal_places=3,
                default=0,
                max_digits=12,
                verbose_name="prix d'achat (HT)",
            ),
        ),
        migrations.AddField(
            model_name="part",
            name="oem",
            field=models.CharField(
                blank=True, max_length=100, verbose_name="référence OEM"
            ),
        ),
        migrations.AddField(
            model_name="part",
            name="barcode",
            field=models.CharField(
                blank=True, db_index=True, max_length=64, null=True, unique=True
            ),
        ),
        migrations.AddField(
            model_name="part",
            name="specs",
            field=models.JSONField(
                blank=True, default=dict, verbose_name="caractéristiques"
            ),
        ),
        migrations.AddField(
            model_name="part",
            name="location",
            field=models.CharField(
                blank=True, max_length=100, verbose_name="emplacement"
            ),
        ),
    ]
