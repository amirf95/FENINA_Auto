from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import CarBrandModel


@api_view(["GET"])
@permission_classes([AllowAny])
def car_brands_models(request):
    """Public endpoint for the storefront's vehicle finder: every car brand
    mapped to its list of models, e.g. {"Peugeot": ["208", "301", ...]}.

    Relies on CarBrandModel's default ordering (brand, then model) so a
    single pass over the query groups everything correctly with no extra
    sorting — dict insertion order is preserved in the JSON response.
    """
    grouped: dict[str, list[str]] = {}
    for brand, model in CarBrandModel.objects.values_list("brand", "model"):
        grouped.setdefault(brand, []).append(model)
    return Response(grouped)
