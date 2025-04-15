from django.urls import path
from .views import WellGeoJSONAPIView

urlpatterns = [
    # Class-based view for well GeoJSON
    path('get-well-geojson/', WellGeoJSONAPIView.as_view(), name='get-well-geojson'),

    # Uncomment and keep any original endpoints you still need
    # path('get-well-points/', views.get_well_points, name='get-well-points'),
]
