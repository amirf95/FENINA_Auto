from django.urls import path

from .views import car_brands_models

urlpatterns = [
    path("car-brands-models/", car_brands_models, name="car-brands-models"),
]
