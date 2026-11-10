from django.contrib import admin

from .models import CarBrandModel


@admin.register(CarBrandModel)
class CarBrandModelAdmin(admin.ModelAdmin):
    list_display = ("brand", "model")
    list_filter = ("brand",)
    search_fields = ("brand", "model")
