from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("billing", "0002_alter_invoice_issue_date_alter_payment_paid_on"),
    ]

    operations = [
        migrations.AddField(
            model_name="invoice",
            name="is_existing",
            field=models.BooleanField(default=False, verbose_name="facture existante"),
        ),
        migrations.AddField(
            model_name="invoice",
            name="manual_total",
            field=models.DecimalField(
                blank=True,
                decimal_places=3,
                max_digits=12,
                null=True,
                verbose_name="montant total",
            ),
        ),
        migrations.AddField(
            model_name="invoice",
            name="manual_paid",
            field=models.DecimalField(
                blank=True,
                decimal_places=3,
                max_digits=12,
                null=True,
                verbose_name="montant payé",
            ),
        ),
        migrations.AddField(
            model_name="invoice",
            name="photo",
            field=models.FileField(
                blank=True,
                null=True,
                upload_to="invoices/",
                verbose_name="photo",
            ),
        ),
    ]
