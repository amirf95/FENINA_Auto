from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def split_legacy_client_names(apps, schema_editor):
    Client = apps.get_model("catalog", "Client")
    for client in Client.objects.filter(surname=""):
        full_name = (client.name or "").strip()
        if " " not in full_name:
            continue
        name, surname = full_name.split(" ", 1)
        client.name = name.strip()
        client.surname = surname.strip()
        client.save(update_fields=["name", "surname"])


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("catalog", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="client",
            name="aka",
            field=models.CharField(blank=True, max_length=180, verbose_name="AKA"),
        ),
        migrations.AddField(
            model_name="client",
            name="car",
            field=models.CharField(blank=True, max_length=180, verbose_name="voiture"),
        ),
        migrations.AddField(
            model_name="client",
            name="cin",
            field=models.CharField(blank=True, max_length=60, verbose_name="CIN"),
        ),
        migrations.AddField(
            model_name="client",
            name="surname",
            field=models.CharField(blank=True, max_length=180, verbose_name="prénom"),
        ),
        migrations.RunPython(split_legacy_client_names, migrations.RunPython.noop),
        migrations.CreateModel(
            name="ClientAuditLog",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("client_name", models.CharField(blank=True, max_length=360)),
                ("action", models.CharField(choices=[("CREATION", "Création"), ("MODIFICATION", "Modification")], max_length=20)),
                ("status", models.CharField(choices=[("SUCCESS", "Succès"), ("FAILED", "Échec")], max_length=20)),
                ("changed_fields", models.JSONField(blank=True, default=list)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("client", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="audit_logs", to="catalog.client")),
                ("user", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
    ]
