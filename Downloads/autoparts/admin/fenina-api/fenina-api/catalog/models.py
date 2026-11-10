from django.conf import settings
from django.db import models


class Client(models.Model):
    """A customer — a garage or an individual. Garages can buy on credit."""

    class Kind(models.TextChoices):
        GARAGE = "garage", "Garage"
        INDIVIDUAL = "individual", "Particulier"

    name = models.CharField("nom", max_length=180)
    surname = models.CharField("prénom", max_length=180, blank=True)
    kind = models.CharField(max_length=20, choices=Kind.choices, default=Kind.INDIVIDUAL)
    phone = models.CharField("téléphone", max_length=30, blank=True)
    cin = models.CharField("CIN", max_length=60, blank=True)
    car = models.CharField("voiture", max_length=180, blank=True)
    aka = models.CharField("AKA", max_length=180, blank=True)
    email = models.EmailField(blank=True)
    address = models.CharField("adresse", max_length=255, blank=True)
    credit_limit = models.DecimalField("plafond de crédit", max_digits=12, decimal_places=3, default=0)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name

    @property
    def balance(self):
        """Total still owed across all this client's invoices."""
        from billing.models import Invoice
        total = sum(inv.amount_due for inv in self.invoices.all())
        return total

    @property
    def full_name(self):
        return " ".join(part for part in [self.name, self.surname] if part).strip()


class ClientAuditLog(models.Model):
    class Action(models.TextChoices):
        CREATION = "CREATION", "Création"
        MODIFICATION = "MODIFICATION", "Modification"

    class Status(models.TextChoices):
        SUCCESS = "SUCCESS", "Succès"
        FAILED = "FAILED", "Échec"

    client = models.ForeignKey(
        Client,
        related_name="audit_logs",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    client_name = models.CharField(max_length=360, blank=True)
    action = models.CharField(max_length=20, choices=Action.choices)
    status = models.CharField(max_length=20, choices=Status.choices)
    changed_fields = models.JSONField(default=list, blank=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.action} {self.client_name or self.client_id} {self.status}"


class Part(models.Model):
    """A stock item — an auto part."""
    sku = models.CharField("référence", max_length=60, db_index=True)
    name = models.CharField("désignation", max_length=200)
    oem = models.CharField("référence OEM", max_length=100, blank=True)
    barcode = models.CharField(
        max_length=64, blank=True, null=True, unique=True, db_index=True
    )
    qr_code = models.CharField(
        "code QR", max_length=255, blank=True, null=True, unique=True, db_index=True
    )
    brand = models.CharField("fabricant", max_length=80, blank=True)
    car_brand = models.CharField("marque de voiture", max_length=80, blank=True, default="")
    car_model = models.CharField("modèle de voiture", max_length=100, blank=True, default="")
    category = models.CharField("catégorie", max_length=80, blank=True)
    subcategory = models.CharField("sous-catégorie", max_length=80, blank=True, default="")
    variant = models.CharField("variation / taille", max_length=80, blank=True, default="")
    specs = models.JSONField("caractéristiques", default=dict, blank=True)
    price = models.DecimalField("prix de vente", max_digits=12, decimal_places=3, default=0)
    priceht = models.DecimalField("prix d'achat (HT)", max_digits=12, decimal_places=3, default=0)
    quantity = models.IntegerField("quantité en stock", default=0)
    reorder_level = models.IntegerField("seuil d'alerte", default=5)
    location = models.CharField("emplacement", max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(fields=["sku", "brand", "variant"], name="unique_sku_brand_variant_per_manufacturer")
        ]

    def save(self, *args, **kwargs):
        if self.sku:
            self.sku = self.sku.strip().upper()
        if self.brand:
            self.brand = self.brand.strip().upper()
        if self.car_brand:
            self.car_brand = self.car_brand.strip().upper()
        if self.car_model:
            self.car_model = self.car_model.strip().upper()
        if self.category:
            self.category = self.category.strip().upper()
        if self.subcategory:
            self.subcategory = self.subcategory.strip().upper()
        if self.variant:
            self.variant = self.variant.strip().upper()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.sku})"

    @property
    def low_stock(self):
        return self.quantity <= self.reorder_level

    @property
    def out_of_stock(self):
        return self.quantity <= 0


class StockMovement(models.Model):
    """
    Append-only audit trail of every stock change for a part — sales
    (auto-logged when an invoice is created/edited/deleted), restocks,
    and manual corrections. Never edited or deleted, only appended to,
    mirroring the invoice-immutability approach used for billing.
    """

    class Reason(models.TextChoices):
        SALE = "sale", "Vente"
        RETURN = "return", "Retour / annulation"
        RESTOCK = "restock", "Réapprovisionnement"
        ADJUSTMENT = "adjustment", "Correction manuelle"

    part = models.ForeignKey(Part, on_delete=models.CASCADE, related_name="movements")
    quantity_delta = models.IntegerField(
        "variation", help_text="Positif = entrée en stock, négatif = sortie."
    )
    reason = models.CharField(max_length=20, choices=Reason.choices)
    invoice_number = models.CharField(max_length=20, blank=True)
    note = models.CharField(max_length=200, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        sign = "+" if self.quantity_delta >= 0 else ""
        return f"{self.part.sku} {sign}{self.quantity_delta} ({self.get_reason_display()})"
