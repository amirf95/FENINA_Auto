from django.contrib.auth.models import AbstractUser
from django.db import models


class StaffUser(AbstractUser):
    """Staff account for the admin dashboard. Email is the login identifier."""

    class Role(models.TextChoices):
        OWNER = "owner", "Gérant"
        MANAGER = "manager", "Responsable"
        EMPLOYEE = "employee", "Employé"

    email = models.EmailField("adresse email", unique=True)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.EMPLOYEE)
    phone = models.CharField("téléphone", max_length=30, blank=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]

    def __str__(self):
        return f"{self.get_full_name() or self.username} ({self.get_role_display()})"
