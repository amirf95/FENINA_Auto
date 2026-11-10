from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import StaffUser

@admin.register(StaffUser)
class StaffUserAdmin(UserAdmin):
    list_display = ("email", "username", "role", "is_staff")
    fieldsets = UserAdmin.fieldsets + (("Fenina", {"fields": ("role", "phone")}),)
