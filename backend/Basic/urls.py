from django.urls import path
from .views import CohortView, Locations_stateAPI,Locations_districtAPI,Locations_subdistrictAPI,Locations_villageAPI,Time_series,Demographic,SewageCalculation,WaterSupplyCalculationAPI,DomesticWaterDemandCalculationAPIView,FloatingWaterDemandCalculationAPIView,InstitutionalWaterDemandCalculationAPIView,FirefightingWaterDemandCalculationAPIView
urlpatterns = [
    path("",Locations_stateAPI.as_view(),name="states"),
    path("district/",Locations_districtAPI.as_view(),name="districts"),
    path("subdistrict/",Locations_subdistrictAPI.as_view(),name="subdistricts"),
    path("village/",Locations_villageAPI.as_view(),name="villages"),
    path("time_series/arthemitic/",Time_series.as_view(),name="time_series"),
    path("time_series/demographic/",Demographic.as_view(),name="demographic"),
    path("sewage_calculation/",SewageCalculation.as_view(), name="sewage_calculation"),
    path("sewage_calculation/total_population/",SewageCalculation.as_view(), name="total_population"),
    path("water_supply/", WaterSupplyCalculationAPI.as_view(), name="water_supply"),
    path('domestic_water_demand/', DomesticWaterDemandCalculationAPIView.as_view(), name='domestic_water_demand'),
    path('floating_water_demand/', FloatingWaterDemandCalculationAPIView.as_view(), name='floating_water_demand'),
    path('institutional_water_demand/', InstitutionalWaterDemandCalculationAPIView.as_view(), name='institutional_water_demand'),
    path('firefighting_water_demand/', FirefightingWaterDemandCalculationAPIView.as_view(), name='firefighting_water_demand'),
    path('cohort/', CohortView.as_view(), name='cohort'),
]