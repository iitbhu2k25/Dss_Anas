from Basic.models import Basic_state, Basic_district, Basic_subdistrict, Basic_village, Population_2011
from Basic.serializers import StateSerializer, DistrictSerializer, SubDistrictSerializer, VillageSerializer
from django.http import Http404
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
import math
from .service import *
from django.db.models import Sum, Q
from .models import PopulationCohort
from django.http import JsonResponse
import os
import json
import geopandas as gpd
from django.conf import settings


class Locations_stateAPI(APIView):
    def get(self, request, format=None):
        states = Basic_state.objects.all()
        serial = StateSerializer(states, many=True)
        sorted_data = sorted(serial.data, key=lambda x: x['state_name'])
        return Response(sorted_data, status=status.HTTP_200_OK)
    
class Locations_districtAPI(APIView):
    def post(self, request, format=None):
        district = Basic_district.objects.all().filter(state_code=request.data['state_code'])
        serial = DistrictSerializer(district, many=True)
        sorted_data = sorted(serial.data, key=lambda x: x['district_name'])
        return Response(sorted_data, status=status.HTTP_200_OK)
    
class Locations_subdistrictAPI(APIView):
    def post(self, request, format=None):
        print(request.data['district_code'])
        subdistrict = Basic_subdistrict.objects.all().filter(district_code__in=request.data['district_code'])
        serial = SubDistrictSerializer(subdistrict, many=True)
        sorted_data = sorted(serial.data, key=lambda x: x['subdistrict_name'])
        return Response(sorted_data, status=status.HTTP_200_OK)

class Locations_villageAPI(APIView):
    def post(self, request, format=None):
        village = Basic_village.objects.all().filter(subdistrict_code__in=request.data['subdistrict_code'])
        serial = VillageSerializer(village, many=True)
        sorted_data = sorted(serial.data, key=lambda x: x['village_name'])
        return Response(sorted_data, status=status.HTTP_200_OK)

class Demographic(APIView):
    def post(self, request, format=None):
        
        base_year = 2011
        # Get data from request
        print('request_data is ',request.data)
        single_year = request.data['year']
        start_year = request.data['start_year']
        end_year = request.data['end_year']
        villages = request.data['villages_props']
        subdistrict = request.data['subdistrict_props']
        total_population = request.data['totalPopulation_props']
        demographic = request.data['demographic']

        print(f"demographic {demographic}")
        annual_birth_rate = demographic['birthRate']
        annual_death_rate = demographic['deathRate']
        annual_emigration_rate = demographic['emigrationRate']
        annual_immigration_rate = demographic['immigrationRate']

        annual_birth_rate = annual_birth_rate/10000
        annual_death_rate = annual_death_rate/10000
        annual_emigration_rate = annual_emigration_rate/10000
        annual_immigration_rate = annual_immigration_rate/10000
        

        # Correcting the subdistrict_id of the villages coming from frontend 
        # Fetch all villages from the database
        village_data = Basic_village.objects.values('village_code', 'subdistrict_code')
        # Create a mapping of village_code to subdistrict_code
        village_mapping = {v['village_code']: v['subdistrict_code'] for v in village_data}
        # Update the villages list with the correct subDistrictId
        for village in villages:
            village_code = village['id']
            if village_code in village_mapping:
                village['subDistrictId'] = village_mapping[village_code]

        main_output={}

        if single_year:
            main_output['demographic'] = Demographic_population_single_year(base_year,single_year,villages,subdistrict,annual_birth_rate,annual_death_rate,annual_emigration_rate,annual_immigration_rate)  
              
        elif start_year and end_year:
            main_output['demographic'] = Demographic_population_range(base_year, start_year, end_year, villages, subdistrict, annual_birth_rate, annual_death_rate, annual_emigration_rate, annual_immigration_rate) 
        print("output",main_output)
        return Response(main_output, status=status.HTTP_200_OK)    

class Time_series(APIView):
    def post(self, request, format=None):
        base_year = 2011
        # Get data from request
        print('request_data is ',request.data)
        single_year = request.data['year']
        start_year = request.data['start_year']
        end_year = request.data['end_year']
        villages = request.data['villages_props']
        subdistrict = request.data['subdistrict_props']
        total_population = request.data['totalPopulation_props']
        

        # Correcting the subdistrict_id of the villages coming from frontend 
        # Fetch all villages from the database
        village_data = Basic_village.objects.values('village_code', 'subdistrict_code')
        # Create a mapping of village_code to subdistrict_code
        village_mapping = {v['village_code']: v['subdistrict_code'] for v in village_data}
        # Update the villages list with the correct subDistrictId
        for village in villages:
            village_code = village['id']
            if village_code in village_mapping:
                village['subDistrictId'] = village_mapping[village_code]




        main_output={}
        if single_year:
            main_output['Arithmetic']=Arithmetic_population_single_year(base_year,single_year,villages,subdistrict)
            main_output['Geometric']=Geometric_population_single_year(base_year,single_year,villages,subdistrict)
            main_output['Incremental']=Incremental_population_single_year(base_year,single_year,villages,subdistrict)
            main_output['Exponential']=Exponential_population_single_year(base_year,single_year,villages,subdistrict)

        elif start_year and end_year:
            main_output['Arithmetic']=Arithmetic_population_range(base_year,start_year,end_year,villages,subdistrict)  
            main_output['Geometric']=Geometric_population_range(base_year,start_year,end_year,villages,subdistrict)
            main_output['Incremental']=Incremental_population_range(base_year,start_year,end_year,villages,subdistrict)
            main_output['Exponential']=Exponential_population_range(base_year,start_year,end_year,villages,subdistrict)
        else:
            pass
        print("output",main_output)
        return Response(main_output, status=status.HTTP_200_OK)

class SewageCalculation(APIView):
    """
    Calculate sewage generation using either the water supply approach
    or the domestic sewage approach.
    """
    def post(self, request, format=None):
        method = request.data.get('method')
        if method == 'water_supply':
            try:
                total_supply = float(request.data.get('total_supply'))
            except (TypeError, ValueError):
                return Response({"error": "Invalid total supply"}, status=status.HTTP_400_BAD_REQUEST)
            if total_supply <= 0:
                return Response({"error": "Total supply must be greater than zero"}, status=status.HTTP_400_BAD_REQUEST)
            sewage_demand = total_supply * 0.84  # example formula
            return Response({"sewage_demand": sewage_demand}, status=status.HTTP_200_OK)
        elif method == 'domestic_sewage':
            load_method = request.data.get('load_method')
            if load_method == 'manual':
                try:
                    domestic_supply = float(request.data.get('domestic_supply'))
                except (TypeError, ValueError):
                    return Response({"error": "Invalid domestic supply"}, status=status.HTTP_400_BAD_REQUEST)
                if domestic_supply <= 0:
                    return Response({"error": "Domestic supply must be greater than zero"}, status=status.HTTP_400_BAD_REQUEST)
                sewage_demand = domestic_supply * 0.84  # example formula
                return Response({"sewage_demand": sewage_demand}, status=status.HTTP_200_OK)
            elif load_method == 'modeled':
                computed_population = request.data.get('computed_population')
                try:
                    unmetered = float(request.data.get('unmetered_supply', 0))
                except (TypeError, ValueError):
                    unmetered = 0
                if not computed_population:
                    return Response({"error": "Computed population data not provided."}, status=status.HTTP_400_BAD_REQUEST)
                result = {}
                for year, pop in computed_population.items():
                    try:
                        pop_val = float(pop)
                    except (TypeError, ValueError):
                        continue
                    multiplier = (135 + unmetered) / 1000000
                    sewage_gen = pop_val * multiplier * 0.80  # example formula
                    result[year] = sewage_gen
                return Response({"sewage_result": result}, status=status.HTTP_200_OK)
            else:
                return Response({"error": "Invalid domestic load method"}, status=status.HTTP_400_BAD_REQUEST)
        else:
            return Response({"error": "Invalid sewage method"}, status=status.HTTP_400_BAD_REQUEST)
        
class WaterSupplyCalculationAPI(APIView):
    def post(self, request, format=None):
        data = request.data
        try:
            surface_water = float(data.get("surface_water", 0))
            direct_groundwater = data.get("direct_groundwater")
            if direct_groundwater not in [None, ""]:
                direct_groundwater = float(direct_groundwater)
            else:
                direct_groundwater = 0 # set to 0 if not provided  and before it is None

            num_tubewells = data.get("num_tubewells")
            num_tubewells = float(num_tubewells) if num_tubewells not in [None, ""] else 0

            discharge_rate = data.get("discharge_rate")
            discharge_rate = float(discharge_rate) if discharge_rate not in [None, ""] else 0

            operating_hours = data.get("operating_hours")
            operating_hours = float(operating_hours) if operating_hours not in [None, ""] else 0

            direct_alternate = data.get("direct_alternate")
            if direct_alternate not in [None, ""]:
                direct_alternate = float(direct_alternate)
            else:
                direct_alternate = 0 # set to 0 if not provided and before it is None

            rooftop_tank = data.get("rooftop_tank")
            rooftop_tank = float(rooftop_tank) if rooftop_tank not in [None, ""] else 0

            aquifer_recharge = data.get("aquifer_recharge")
            aquifer_recharge = float(aquifer_recharge) if aquifer_recharge not in [None, ""] else 0

            surface_runoff = data.get("surface_runoff")
            surface_runoff = float(surface_runoff) if surface_runoff not in [None, ""] else 0

            reuse_water = data.get("reuse_water")
            reuse_water = float(reuse_water) if reuse_water not in [None, ""] else 0

            if direct_groundwater > 0 and (num_tubewells > 0 or discharge_rate > 0 or operating_hours > 0):     # changes made here  before 'is not None' 
                return Response(
                    {"error": "Provide either direct groundwater supply or tube well inputs, not both."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if direct_alternate > 0 and (rooftop_tank > 0 or aquifer_recharge > 0 or surface_runoff > 0 or reuse_water > 0):    # changes made here  before 'is not None' 
                return Response(
                    {"error": "Provide either direct alternate supply or alternate component inputs, not both."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if direct_groundwater > 0:  # changes made here before 'is not None' 
                groundwater_supply = direct_groundwater
            else:
                groundwater_supply = num_tubewells * discharge_rate * operating_hours

            if direct_alternate > 0: # changes made here before 'is not None' 
                alternate_supply = direct_alternate
            else:
                alternate_supply = rooftop_tank + aquifer_recharge + surface_runoff + reuse_water

            total_supply = surface_water + groundwater_supply + alternate_supply
        
            return Response({"total_supply": total_supply}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
 
class DomesticWaterDemandCalculationAPIView(APIView):
    """
    API endpoint that calculates domestic water demand.
    It expects a JSON payload with:
      - forecast_data: A dictionary where keys are years (as strings) and values are forecasted populations.
      - per_capita_consumption: A number (L/person/day) entered by the user.
    The formula used is:
      domestic_demand = forecasted_population * ((135 + per_capita_consumption) / 1,000,000)
    """
    def post(self, request, format=None):
        forecast_data = request.data.get("forecast_data")
        per_capita_consumption = request.data.get("per_capita_consumption")
        
        if forecast_data is None or per_capita_consumption is None:
            return Response(
                {"error": "Both 'forecast_data' and 'per_capita_consumption' must be provided."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            per_capita = float(per_capita_consumption)
        except (ValueError, TypeError):
            return Response(
                {"error": "Invalid per_capita_consumption value."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Calculate the effective per capita consumption
        effective_consumption = 135 + per_capita
        
        result = {}
        for year, population in forecast_data.items():
            try:
                pop = float(population)
            except (ValueError, TypeError):
                continue
            result[year] = pop * (effective_consumption / 1000000)
        
        return Response(result, status=status.HTTP_200_OK)
    
class FloatingWaterDemandCalculationAPIView(APIView):
    """
    API endpoint to calculate floating water demand.
    
    Expected JSON payload:
    {
      "floating_population": <number>,          # Base floating population for 2011
      "facility_type": <string>,                  # One of "provided", "notprovided", "onlypublic"
      "domestic_forecast": {                      # Domestic forecast population for multiple years
          "2011": <number>,
          "2025": <number>,
          "2026": <number>,
          ...
      }
    }
    
    Calculation:
      1. Determine facility multiplier:
          - "provided": 45
          - "notprovided": 25
          - "onlypublic": 15
      2. For each year, compute:
          growth_ratio = domestic_forecast[year] / domestic_forecast["2011"]
          projected_floating_population = floating_population * growth_ratio
          demand = projected_floating_population * (facility_multiplier / 1000000)
    """
    def post(self, request, format=None):
        data = request.data
        floating_population = data.get("floating_population")
        facility_type = data.get("facility_type")
        domestic_forecast = data.get("domestic_forecast")
        
        if floating_population is None or facility_type is None or domestic_forecast is None:
            return Response(
                {"error": "floating_population, facility_type, and domestic_forecast are required."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            floating_population = float(floating_population)
        except (TypeError, ValueError):
            return Response({"error": "Invalid floating_population value."}, status=status.HTTP_400_BAD_REQUEST)
        
        if "2011" not in domestic_forecast:
            return Response({"error": "domestic_forecast must include a value for 2011."}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            base_population = float(domestic_forecast["2011"])
        except (TypeError, ValueError):
            return Response({"error": "Invalid domestic_forecast value for 2011."}, status=status.HTTP_400_BAD_REQUEST)
        
        # Determine facility multiplier
        if facility_type == "provided":
            facility_multiplier = 45
        elif facility_type == "notprovided":
            facility_multiplier = 25
        elif facility_type == "onlypublic":
            facility_multiplier = 15
        else:
            return Response(
                {"error": "Invalid facility_type. Must be 'provided', 'notprovided', or 'onlypublic'."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        result = {}
        # For each year in the domestic forecast, calculate the projected floating demand.
        for year, dom_value in domestic_forecast.items():
            try:
                dom_value = float(dom_value)
            except (TypeError, ValueError):
                continue
            # Calculate growth ratio relative to 2011
            growth_ratio = dom_value / base_population if base_population != 0 else 1
            projected_floating_population = floating_population * growth_ratio
            demand = projected_floating_population * (facility_multiplier / 1000000)
            result[year] = demand
        
        return Response(result, status=status.HTTP_200_OK)

class InstitutionalWaterDemandCalculationAPIView(APIView):
    """
    API endpoint to calculate institutional water demand.
    
    Expected JSON payload:
    {
      "institutional_fields": {
         "hospitals100Units": "value",
         "beds100": "value",
         "hospitalsLess100": "value",
         "bedsLess100": "value",
         "hotels": "value",
         "bedsHotels": "value",
         "hostels": "value",
         "residentsHostels": "value",
         "nursesHome": "value",
         "residentsNursesHome": "value",
         "boardingSchools": "value",
         "studentsBoardingSchools": "value",
         "restaurants": "value",
         "seatsRestaurants": "value",
         "airportsSeaports": "value",
         "populationLoadAirports": "value",
         "junctionStations": "value",
         "populationLoadJunction": "value",
         "terminalStations": "value",
         "populationLoadTerminal": "value",
         "intermediateBathing": "value",
         "populationLoadBathing": "value",
         "intermediateNoBathing": "value",
         "populationLoadNoBathing": "value",
         "daySchools": "value",
         "studentsDaySchools": "value",
         "offices": "value",
         "employeesOffices": "value",
         "factorieswashrooms": "value",
         "employeesFactories": "value",
         "factoriesnoWashrooms": "value",
         "employeesFactoriesNoWashrooms": "value",
         "cinemas": "value",
         "populationLoadCinemas": "value"
      },
      "domestic_forecast": {
         "2011": <number>,
         "2025": <number>,
         "2026": <number>,
         ...
      }
    }
    
    Calculation:
      base_demand = (
        (hospitals100Units * beds100 * 450) +
        (hospitalsLess100 * bedsLess100 * 350) +
        (hotels * bedsHotels * 180) +
        (hostels * residentsHostels * 135) +
        (nursesHome * residentsNursesHome * 135) +
        (boardingSchools * studentsBoardingSchools * 135) +
        (restaurants * seatsRestaurants * 70) +
        (airportsSeaports * populationLoadAirports * 70) +
        (junctionStations * populationLoadJunction * 70) +
        (terminalStations * populationLoadTerminal * 45) +
        (intermediateBathing * populationLoadBathing * 45) +
        (intermediateNoBathing * populationLoadNoBathing * 25) +
        (daySchools * studentsDaySchools * 45) +
        (offices * employeesOffices * 45) +
        (factorieswashrooms * employeesFactories * 45) +
        (factoriesnoWashrooms * employeesFactoriesNoWashrooms * 30) +
        (cinemas * populationLoadCinemas * 15)
      ) / 1000000
      
      For each year:
        growth_ratio = domestic_forecast[year] / domestic_forecast["2011"]
        institutional_demand[year] = base_demand * growth_ratio
    """
    def post(self, request, format=None):
        data = request.data
        inst_fields = data.get("institutional_fields")
        domestic_forecast = data.get("domestic_forecast")
        
        if inst_fields is None or domestic_forecast is None:
            return Response(
                {"error": "institutional_fields and domestic_forecast are required."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if "2011" not in domestic_forecast:
            return Response(
                {"error": "domestic_forecast must include a value for 2011."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            base_domestic = float(domestic_forecast["2011"])
        except (TypeError, ValueError):
            return Response({"error": "Invalid domestic_forecast value for 2011."}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            term1 = float(inst_fields.get("hospitals100Units", 0)) * float(inst_fields.get("beds100", 0)) * 450
            term2 = float(inst_fields.get("hospitalsLess100", 0)) * float(inst_fields.get("bedsLess100", 0)) * 350
            term3 = float(inst_fields.get("hotels", 0)) * float(inst_fields.get("bedsHotels", 0)) * 180
            term4 = float(inst_fields.get("hostels", 0)) * float(inst_fields.get("residentsHostels", 0)) * 135
            term5 = float(inst_fields.get("nursesHome", 0)) * float(inst_fields.get("residentsNursesHome", 0)) * 135
            term6 = float(inst_fields.get("boardingSchools", 0)) * float(inst_fields.get("studentsBoardingSchools", 0)) * 135
            term7 = float(inst_fields.get("restaurants", 0)) * float(inst_fields.get("seatsRestaurants", 0)) * 70
            term8 = float(inst_fields.get("airportsSeaports", 0)) * float(inst_fields.get("populationLoadAirports", 0)) * 70
            term9 = float(inst_fields.get("junctionStations", 0)) * float(inst_fields.get("populationLoadJunction", 0)) * 70
            term10 = float(inst_fields.get("terminalStations", 0)) * float(inst_fields.get("populationLoadTerminal", 0)) * 45
            term11 = float(inst_fields.get("intermediateBathing", 0)) * float(inst_fields.get("populationLoadBathing", 0)) * 45
            term12 = float(inst_fields.get("intermediateNoBathing", 0)) * float(inst_fields.get("populationLoadNoBathing", 0)) * 25
            term13 = float(inst_fields.get("daySchools", 0)) * float(inst_fields.get("studentsDaySchools", 0)) * 45
            term14 = float(inst_fields.get("offices", 0)) * float(inst_fields.get("employeesOffices", 0)) * 45
            term15 = float(inst_fields.get("factorieswashrooms", 0)) * float(inst_fields.get("employeesFactories", 0)) * 45
            term16 = float(inst_fields.get("factoriesnoWashrooms", 0)) * float(inst_fields.get("employeesFactoriesNoWashrooms", 0)) * 30
            term17 = float(inst_fields.get("cinemas", 0)) * float(inst_fields.get("populationLoadCinemas", 0)) * 15

            base_demand = (
                term1 + term2 + term3 + term4 + term5 + term6 + term7 +
                term8 + term9 + term10 + term11 + term12 + term13 +
                term14 + term15 + term16 + term17
            ) / 1000000.0
        except Exception as e:
            return Response({"error": "Error parsing institutional field values: " + str(e)},
                            status=status.HTTP_400_BAD_REQUEST)
        
        result = {}
        for year, value in domestic_forecast.items():
            try:
                year_value = float(value)
            except (TypeError, ValueError):
                continue
            growth_ratio = year_value / base_domestic if base_domestic != 0 else 1
            result[year] = base_demand * growth_ratio
        
        return Response(result, status=status.HTTP_200_OK)

class FirefightingWaterDemandCalculationAPIView(APIView):
    """
    API endpoint to calculate firefighting water demand for each selected method.
    
    Expected JSON payload:
    {
      "firefighting_methods": {
         "kuchling": true/false,
         "freeman": true/false,
         "buston": true/false,
         "american_insurance": true/false,
         "ministry_urban": true/false
      },
      "domestic_forecast": {
         "2011": <number>,
         "2025": <number>,
         "2026": <number>,
         ...
      }
    }
    
    For each checked method, the demand is calculated as follows:
    
    - kuchling:  
      demand = (4.582 / 100) * sqrt(popVal / 1000)
    
    - freeman:  
      demand = (1.635 / 100) * ((popVal / 5000) + 10)
    
    - buston:  
      demand = (8.155 / 100) * sqrt(popVal / 1000)
    
    - american_insurance:  
      demand = (6.677 / 100) * sqrt(popVal / 1000) * (1 - 0.01 * sqrt(popVal / 1000))
    
    - ministry_urban:  
      demand = sqrt(popVal) / 1000
    
    where popVal is the forecasted population for that year.
    """
    def post(self, request, format=None):
        data = request.data
        methods = data.get("firefighting_methods")
        domestic_forecast = data.get("domestic_forecast")
        
        if methods is None or domestic_forecast is None:
            return Response(
                {"error": "firefighting_methods and domestic_forecast are required."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if "2011" not in domestic_forecast:
            return Response(
                {"error": "domestic_forecast must include a value for 2011."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # We don't use a growth ratio here; each year's forecasted population (popVal) is used directly.
        result = {}
        for method, selected in methods.items():
            if selected:
                method_result = {}
                for year, value in domestic_forecast.items():
                    try:
                        popVal = float(value)
                    except (TypeError, ValueError):
                        continue
                    if method == "kuchling":
                        demand = (4.582 / 100) * math.sqrt(popVal / 1000)
                    elif method == "freeman":
                        demand = (1.635 / 100) * ((popVal / 5000) + 10)
                    elif method == "buston":
                        demand = (8.155 / 100) * math.sqrt(popVal / 1000)
                    elif method == "american_insurance":
                        demand = (6.677 / 100) * math.sqrt(popVal / 1000) * (1 - 0.01 * math.sqrt(popVal / 1000))
                    elif method == "ministry_urban":
                        demand = math.sqrt(popVal) / 1000
                    else:
                        demand = 0.0
                    method_result[year] = demand
                result[method] = method_result
        
        return Response(result, status=status.HTTP_200_OK)


#for cohort 

class CohortView(APIView):
    def post(self, request, format=None):
        """
        Handles requests for population cohort data filtered by location and year
        Accepts flexible location parameters - can filter by any combination of state, district, subdistrict, village
        Requires either single_year or both start_year and end_year
        """
        # Get data from request
        print('request_data is cohort by anas ', request.data)
        
        # Extract parameters from request
        single_year = request.data.get('year')
        start_year = request.data.get('start_year')
        end_year = request.data.get('end_year')
        villages = request.data.get('villages_props', [])
        subdistrict = request.data.get('subdistrict_props', {})
        district = request.data.get('district_props', {})
        state = request.data.get('state_props', {})
        
        # Check if required year parameters are provided
        if not (single_year or (start_year and end_year)):
            error_msg = "Either 'year' or both 'start_year' and 'end_year' must be provided"
            print(error_msg)
            return Response({"error": error_msg}, status=status.HTTP_400_BAD_REQUEST)
        
        # Debug the input parameters
        print(f"Filtering parameters: single_year={single_year}, start_year={start_year}, end_year={end_year}")
        print(f"Location filters: villages={villages}, subdistrict={subdistrict}, district={district}, state={state}")
        
        # Build location filter - apply available filters
        location_filter = Q()
        
        # Apply state filter if provided
        if state and state.get('id'):
            state_id = int(state['id'])
            print(f"Adding state filter: {state_id}")
            location_filter &= Q(state_code=state_id)
        
        # Apply district filter if provided
        if district and district.get('id'):
            district_id = int(district['id'])
            print(f"Adding district filter: {district_id}")
            location_filter &= Q(district_code=district_id)
        
        # Apply subdistrict filter if provided
        if subdistrict and subdistrict.get('id'):
            subdistrict_id = int(subdistrict['id'])
            print(f"Adding subdistrict filter: {subdistrict_id}")
            location_filter &= Q(subdistrict_code=subdistrict_id)
        
        # Apply villages filter if provided
        if villages and len(villages) > 0:
            village_ids = [int(village['id']) for village in villages if village.get('id')]
            if village_ids:
                print(f"Adding villages filter: {village_ids}")
                location_filter &= Q(village_code__in=village_ids)
        
        # Ensure at least one location filter is applied
        if location_filter == Q():
            error_msg = "At least one location parameter (state, district, subdistrict, or village) is required"
            print(error_msg)
            return Response({"error": error_msg}, status=status.HTTP_400_BAD_REQUEST)
        
        # Initialize result
        main_output = {}
        
        if single_year:
            # Handle single year query
            try:
                year_value = int(single_year)
                print(f"Querying for year: {year_value}")
                
                # Add year filter
                query_filter = location_filter & Q(year=year_value)
                
                # Get cohort data for the specified year and location
                cohort_data = PopulationCohort.objects.filter(query_filter)
                count = cohort_data.count()
                print(f"Found {count} records for year {year_value}")
                
                if count > 0:
                    # Process the data
                    result = self.organize_cohort_data(cohort_data)
                    
                    main_output['cohort'] = {
                        'year': year_value,
                        'data': result
                    }
                else:
                    main_output['cohort'] = {
                        'year': year_value,
                        'data': {}
                    }
            except ValueError:
                error_msg = f"Invalid year format: {single_year}"
                print(error_msg)
                return Response({"error": error_msg}, status=status.HTTP_400_BAD_REQUEST)
                
        elif start_year and end_year:
            # Handle year range query
            try:
                start = int(start_year)
                end = int(end_year)
                
                if start > end:
                    error_msg = f"start_year ({start}) cannot be greater than end_year ({end})"
                    print(error_msg)
                    return Response({"error": error_msg}, status=status.HTTP_400_BAD_REQUEST)
                    
                print(f"Querying for years from {start} to {end}")
                
                years_data = []
                
                for year in range(start, end + 1):
                    # Add year filter
                    query_filter = location_filter & Q(year=year)
                    
                    # Get cohort data for the current year and location
                    cohort_data = PopulationCohort.objects.filter(query_filter)
                    count = cohort_data.count()
                    print(f"Found {count} records for year {year}")
                    
                    if count > 0:  # Only add years with data
                        # Process the data
                        result = self.organize_cohort_data(cohort_data)
                        
                        years_data.append({
                            'year': year,
                            'data': result
                        })
                
                main_output['cohort'] = years_data
            except ValueError:
                error_msg = f"Invalid year format: start_year={start_year}, end_year={end_year}"
                print(error_msg)
                return Response({"error": error_msg}, status=status.HTTP_400_BAD_REQUEST)
        
        print("Final output:", main_output)   
        return Response(main_output, status=status.HTTP_200_OK)
    
    def organize_cohort_data(self, queryset):
        """
        Organizes cohort data by age group and gender
        Input: queryset of PopulationCohort objects
        Output: Structured data by age group and gender
        """
        # Initialize the result dictionary
        result = {}
        
        # Track totals
        total_male = 0
        total_female = 0
        total_overall = 0
        
        # Process each record
        for record in queryset:
            age_group = record.age_group
            gender = record.gender.lower()  # Normalize gender to lowercase
            population = record.population
            
            # Initialize age group data if not present
            if age_group not in result:
                result[age_group] = {'male': 0, 'female': 0, 'total': 0}
            
            # Update gender-specific count
            if gender == 'male':
                result[age_group]['male'] += population
                total_male += population
            elif gender == 'female':
                result[age_group]['female'] += population
                total_female += population
            
            # Update total for this age group
            result[age_group]['total'] = result[age_group]['male'] + result[age_group]['female']
            total_overall += population
        
        # Add a "total" category with sums across all age groups
        if result:
            result['total'] = {
                'male': total_male,
                'female': total_female,
                'total': total_overall
            }
        
        print(f"Organized data: {result}")
        return result
#end cohort logic here 




class StateShapefileAPI(APIView):
    """
    API endpoint to retrieve GeoJSON data for a specific state based on state code.
    
    Expected JSON payload:
    {
        "state_code": <number>  # The code of the state to retrieve GeoJSON for
    }
    
    Returns GeoJSON data for the requested state that can be used to add as a 
    layer to mapping applications.
    """
    def post(self, request, format=None):
        state_code = request.data.get('state_code')
        
        if state_code is None:
            return Response(
                {"error": "state_code is required."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            state_code = int(state_code)
        except (TypeError, ValueError):
            return Response(
                {"error": "Invalid state_code value. Must be a number."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Path to the state shapefile
        shapefile_path = os.path.join(settings.MEDIA_ROOT, 'basic_shape', 'B_state')
        
        if not os.path.exists(shapefile_path):
            return Response(
                {"error": f"Shapefile directory not found at {shapefile_path}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        try:
            # Read the shapefile using geopandas
            gdf = gpd.read_file(os.path.join(shapefile_path, 'B_state.shp'))
            
            # Filter for the requested state code
            state_data = gdf[gdf['state_code'] == state_code]
            
            if state_data.empty:
                return Response(
                    {"error": f"No data found for state_code {state_code}"},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Convert to GeoJSON format
            geojson_data = json.loads(state_data.to_json())
            
            return Response(geojson_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {"error": f"Error processing shapefile: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )