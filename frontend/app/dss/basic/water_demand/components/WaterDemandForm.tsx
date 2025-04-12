// components/WaterDemandForm.tsx
'use client';

import React, { useState } from 'react';

interface InstitutionalFields {
    hospitals100Units: string;
    beds100: string;
    hospitalsLess100: string;
    bedsLess100: string;
    hotels: string;
    bedsHotels: string;
    hostels: string;
    residentsHostels: string;
    nursesHome: string;
    residentsNursesHome: string;
    boardingSchools: string;
    studentsBoardingSchools: string;
    restaurants: string;
    seatsRestaurants: string;
    airportsSeaports: string;
    populationLoadAirports: string;
    junctionStations: string;
    populationLoadJunction: string;
    terminalStations: string;
    populationLoadTerminal: string;
    intermediateBathing: string;
    populationLoadBathing: string;
    intermediateNoBathing: string;
    populationLoadNoBathing: string;
    daySchools: string;
    studentsDaySchools: string;
    offices: string;
    employeesOffices: string;
    factorieswashrooms: string;
    employeesFactories: string;
    factoriesnoWashrooms: string;
    employeesFactoriesNoWashrooms: string;
    cinemas: string;
    seatsCinemas: string;
  // Add more fields as needed...
}

interface FirefightingMethods {
  kuchling: boolean;
  freeman: boolean;
  buston: boolean;
  american_insurance: boolean;
  ministry_urban: boolean;
}

const WaterDemandForm: React.FC = () => {
  // State for overall checkboxes
  const [domesticChecked, setDomesticChecked] = useState(false);
  const [floatingChecked, setFloatingChecked] = useState(false);
  const [institutionalChecked, setInstitutionalChecked] = useState(false);
  const [firefightingChecked, setFirefightingChecked] = useState(false);

  // Domestic per capita consumption (default 135)
  const [perCapitaConsumption, setPerCapitaConsumption] = useState(135);

  // Floating fields
  const [floatingPopulation2011, setFloatingPopulation2011] = useState<number | null>(null);
  const [facilityType, setFacilityType] = useState('provided');

  // New state for institutional input mode (manual or total)
  const [institutionalInputMode, setInstitutionalInputMode] = useState<'manual' | 'total'>('manual');
  const [totalInstitutionalDemand, setTotalInstitutionalDemand] = useState<string>("0");

  // Institutional fields (sample fields; add more as needed)
  const [institutionalFields, setInstitutionalFields] = useState<InstitutionalFields>({
    hospitals100Units: "0",
    beds100: "0",
    hospitalsLess100: "0",
    bedsLess100: "0",
    hotels: "0",
    bedsHotels: "0",
    hostels: "0",
    residentsHostels: "0",
    nursesHome: "0",
    residentsNursesHome: "0",
    boardingSchools: "0",
    studentsBoardingSchools: "0",
    restaurants: "0",
    seatsRestaurants: "0",
    airportsSeaports: "0",
    populationLoadAirports: "0",
    junctionStations: "0",
    populationLoadJunction: "0",
    terminalStations: "0",
    populationLoadTerminal: "0",
    intermediateBathing: "0",
    populationLoadBathing: "0",
    intermediateNoBathing: "0",
    populationLoadNoBathing: "0",
    daySchools: "0",
    studentsDaySchools: "0",
    offices: "0",
    employeesOffices: "0",
    factorieswashrooms: "0",
    employeesFactories: "0",
    factoriesnoWashrooms: "0",
    employeesFactoriesNoWashrooms: "0",
    cinemas: "0",
    seatsCinemas: "0",
    // Add more fields as needed...
  });

  // Firefighting methods selection
  const [firefightingMethods, setFirefightingMethods] = useState<FirefightingMethods>({
    kuchling: false,
    freeman: false,
    buston: false,
    american_insurance: false,
    ministry_urban: false,
  });

  // New state to store domestic water demand results
  const [domesticDemand, setDomesticDemand] = useState<{ [year: string]: number } | null>(null);
  const [floatingDemand, setFloatingDemand] = useState<{ [year: string]: number } | null>(null);
  const [institutionalDemand, setInstitutionalDemand] = useState<{ [year: string]: number } | null>(null);
  const [firefightingDemand, setFirefightingDemand] = useState<{ [method: string]: { [year: string]: number } } | null>(null);
  const [selectedFirefightingMethod, setSelectedFirefightingMethod] = useState<string>("");

  const forecastData = (window as any).selectedPopulationForecast;


  // Handlers for checkboxes and inputs
  const handleDomesticChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDomesticChecked(e.target.checked);
  };

  const handlePerCapitaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPerCapitaConsumption(Number(e.target.value));
  };

  const handleFloatingPopulationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFloatingPopulation2011(Number(e.target.value));
  };

  // Handler for institutional input mode
  const handleInstitutionalInputModeChange = (mode: 'manual' | 'total') => {
    setInstitutionalInputMode(mode);
  };

  // Handler for total institutional demand value
  const handleTotalInstitutionalDemandChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTotalInstitutionalDemand(e.target.value);
  };

  const handleInstitutionalFieldChange = (field: keyof InstitutionalFields, value: string) => {
    setInstitutionalFields({
      ...institutionalFields,
      [field]: value,
    });
  };

  const handleFirefightingMethodChange = (method: keyof FirefightingMethods, checked: boolean) => {
    setFirefightingMethods({
      ...firefightingMethods,
      [method]: checked,
    });
  };

  // This function calculates only the firefighting water demand when the "Calculate Firefighting Water Demand" button is clicked
  const handleCalculateFirefighting = async () => {
    if (!forecastData) {
      console.error("Forecast data not available.");
      return;
    }
    try {
      const response = await fetch('http://localhost:9000/api/basic/firefighting_water_demand/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firefighting_methods: firefightingMethods,
          domestic_forecast: forecastData,
        }),
      });
      if (!response.ok) {
        throw new Error(`Firefighting HTTP error! Status: ${response.status}`);
      }
      const result = await response.json();
      console.log("Firefighting Water Demand (from backend):", result);
      setFirefightingDemand(result);
    } catch (error) {
      console.error("Error calculating firefighting water demand:", error);
    }
  };
// Store the total demand for each year in the window object
  const totalDemand = {};
  Object.keys(forecastData || {}).sort().forEach(year => {
    const domesticVal = domesticChecked && domesticDemand?.[year] ? domesticDemand[year] : 0;
    const floatingVal = floatingChecked && floatingDemand?.[year] ? floatingDemand[year] : 0;
    const institutionalVal = institutionalChecked && institutionalDemand?.[year] ? institutionalDemand[year] : 0;
    const firefightingVal =
      firefightingChecked && selectedFirefightingMethod && firefightingDemand?.[selectedFirefightingMethod]?.[year]
        ? firefightingDemand[selectedFirefightingMethod][year]
        : 0;
    totalDemand[year] = domesticVal + floatingVal + institutionalVal + firefightingVal;
  });
  (window as any).totalWaterDemand = totalDemand;

  // Example calculation handler – replace with your own calculation logic
  const handleCalculate = async () => {
    // Retrieve global forecast data and selected population method
    const selectedPopulationMethod = (window as any).selectedPopulationMethod;
    const forecastData = (window as any).selectedPopulationForecast;
    console.log("Selected Population Method:", selectedPopulationMethod);
    console.log("Forecast Data:", forecastData);
  
    if (!forecastData) {
      console.error("Forecast data not available.");
      return;
    }
  
    try {
      // --- Domestic Water Demand Calculation ---
      if (domesticChecked) {
        const domesticResponse = await fetch('http://localhost:9000/api/basic/domestic_water_demand/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            forecast_data: forecastData,
            per_capita_consumption: perCapitaConsumption, // effective = 135 + user input
          }),
        });
  
        if (!domesticResponse.ok) {
          throw new Error(`Domestic HTTP error! Status: ${domesticResponse.status}`);
        }
        const domesticDemandResult = await domesticResponse.json();
        console.log("Domestic Water Demand (from backend):", domesticDemandResult);
        setDomesticDemand(domesticDemandResult);
      }
  
      // --- Floating Water Demand Calculation ---
      if (floatingChecked) {
        if (floatingPopulation2011 === null) {
          console.error("Floating population not provided.");
        } else {
          // The backend uses facility_type to determine the multiplier:
          // "provided" => 45, "notprovided" => 25, "onlypublic" => 15.
          const floatingResponse = await fetch('http://localhost:9000/api/basic/floating_water_demand/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              floating_population: floatingPopulation2011,
              facility_type: facilityType,
              domestic_forecast: forecastData, // used to compute growth ratio for subsequent years
            }),
          });
          if (!floatingResponse.ok) {
            throw new Error(`Floating HTTP error! Status: ${floatingResponse.status}`);
          }
          const floatingDemandResult = await floatingResponse.json();
          console.log("Floating Water Demand (from backend):", floatingDemandResult);
          setFloatingDemand(floatingDemandResult);
        }
      }
      
      // --- Institutional Water Demand Calculation ---
      if (institutionalChecked) {
        if (institutionalInputMode === 'manual') {
          // Use existing API for detailed institutional fields
          const institutionalResponse = await fetch('http://localhost:9000/api/basic/institutional_water_demand/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              institutional_fields: institutionalFields,
              domestic_forecast: forecastData,
            }),
          });
      
          if (!institutionalResponse.ok) {
            throw new Error(`Institutional HTTP error! Status: ${institutionalResponse.status}`);
          }
          const institutionalResult = await institutionalResponse.json();
          console.log("Institutional Water Demand (from backend):", institutionalResult);
          setInstitutionalDemand(institutionalResult);
        } else {
          // For 'total' mode, create a demand object based on the single value provided
          // We'll assume the total provided is for the base year (first year in forecast)
          const baseYear = Object.keys(forecastData).sort()[0];
          const totalDemand = parseFloat(totalInstitutionalDemand);
          
          if (isNaN(totalDemand)) {
            console.error("Invalid total institutional demand value");
            return;
          }
          
          // Create a demand object with the same growth pattern as the population
          const result: { [year: string]: number } = {};
          
          // Assuming we want to grow the institutional demand proportionally with population
          Object.keys(forecastData).forEach(year => {
            const populationRatio = forecastData[year] / forecastData[baseYear];
            result[year] = totalDemand * populationRatio;
          });
          
          console.log("Total Institutional Water Demand (calculated):", result);
          setInstitutionalDemand(result);
        }
      }
      
    } catch (error) {
      console.error("Error calculating water demand:", error);
    }
  };
  
  

  return (
    <div className="p-4 border rounded bg-white">
      <h3 className="text-xl font-semibold mb-3">Water Demand Calculation</h3>
      
      {/* Demand Component Checkboxes */}
      <div className="mb-4 space-x-4">
        <label>
          <input type="checkbox" checked={domesticChecked} onChange={handleDomesticChange} /> Domestic
        </label>
        <label>
          <input type="checkbox" checked={floatingChecked} onChange={(e) => setFloatingChecked(e.target.checked)} /> Floating
        </label>
        <label>
          <input type="checkbox" checked={institutionalChecked} onChange={(e) => setInstitutionalChecked(e.target.checked)} /> Institutional
        </label>
        <label>
          <input type="checkbox" checked={firefightingChecked} onChange={(e) => setFirefightingChecked(e.target.checked)} /> Firefighting
        </label>
      </div>
      
      {/* Domestic Fields */}
      {domesticChecked && (
        <div className="mb-4 p-3 border rounded bg-blue-50">
          <h6 className="font-bold text-blue-700">Domestic Fields</h6>
          <label className="block mt-2 font-bold ">
            Per Capita Consumption (LPCD):
            <input 
              type="number" 
              value={perCapitaConsumption}
              onChange={handlePerCapitaChange}
              className="border rounded ml-2 w-24 bg-white"
            />
          </label>
        </div>
      )}

      {/* Floating Fields */}
      {floatingChecked && (
        <div className="mb-4 p-3 border rounded bg-blue-50">
          <h6 className="font-bold text-blue-700">Floating Fields</h6>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium">
                Floating Population (2011):
                <input 
                  type="number" 
                  value={floatingPopulation2011 ?? ''}
                  onChange={handleFloatingPopulationChange}
                  className="mt-1 block w-full sm:w-1/2 md:w-64/70 bg-white border rounded px-2 py-1"
                  placeholder='Enter number'
                />
              </label>
            </div>
          </div>

          <div className="mt-2">
            <label className="block text-sm font-medium">Facility Type:</label>
            <select 
              value={facilityType}
              onChange={(e) => setFacilityType(e.target.value)}
              className="border rounded w-xs px-2 py-1 mt-1"
            >
              <option value="provided">Bathing facilities provided</option>
              <option value="notprovided">Bathing facilities not provided</option>
              <option value="onlypublic">Floating population using only public facilities</option>
            </select>
          </div>
        </div>
      )}

      {/* Institutional Fields */}
      {institutionalChecked && (
        <div className="mb-4 p-3 border rounded bg-blue-50">
          <h6 className="font-bold text-blue-700 mb-3">Institutional Fields</h6>
          
          {/* New: Radio buttons for institutional input mode */}
          <div className="flex space-x-4 mb-4">
            <label className="inline-flex items-center">
              <input
                type="radio"
                className="form-radio"
                name="institutionalInputMode"
                checked={institutionalInputMode === 'manual'}
                onChange={() => handleInstitutionalInputModeChange('manual')}
              />
              <span className="ml-2">Enter Individual Fields</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                className="form-radio"
                name="institutionalInputMode"
                checked={institutionalInputMode === 'total'}
                onChange={() => handleInstitutionalInputModeChange('total')}
              />
              <span className="ml-2">Enter Total Institutional Demand</span>
            </label>
          </div>
          
          {/* Total Institutional Demand Input */}
          {institutionalInputMode === 'total' && (
            <div className="mb-4">
              <label htmlFor="total_institutional_demand" className="block text-sm font-medium">
                Total Institutional Water Demand (MLD):
              </label>
              <input
                type="number"
                id="total_institutional_demand"
                value={totalInstitutionalDemand}
                onChange={handleTotalInstitutionalDemandChange}
                className="mt-1 block w-full sm:w-1/2 md:w-64/70 bg-white border rounded px-2 py-1"
                placeholder="Enter total demand"
              />
              <p className="text-sm text-gray-500 mt-1">
                This value will be used as the base year demand and projected for future years based on population growth.
              </p>
            </div>
          )}
          
          {/* Individual Institutional Fields */}
          {institutionalInputMode === 'manual' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="hospitals_100_units" className="block text-sm font-medium">
                  Hospitals with ≥ 100 Beds (Units):
                </label>
                <input
                  type="number"
                  id="hospitals_100_units"
                  value={institutionalFields.hospitals100Units}
                  onChange={(e) => handleInstitutionalFieldChange('hospitals100Units', e.target.value)}
                  className="mt-1 block w-full sm:w-1/2 md:w-64/70 bg-white border rounded px-2 py-1"
                  placeholder="Enter number"
                />
              </div>
              <div>
                <label htmlFor="beds_100" className="block text-sm font-medium">
                  Beds in Hospitals with ≥ 100 Beds:
                </label>
                <input
                  type="number"
                  id="beds_100"
                  value={institutionalFields.beds100}
                  onChange={(e) => handleInstitutionalFieldChange('beds100', e.target.value)}
                  className="mt-1 block w-full sm:w-1/2 md:w-64/70 bg-white border rounded px-2 py-1"
                  placeholder="Enter number"
                />
              </div>
              <div>
                <label htmlFor="hospitals_less_100" className="block text-sm font-medium">
                  Hospitals with &lt; 100 Beds (Units):
                </label>
                <input
                  type="number"
                  id="hospitals_less_100"
                  value={institutionalFields.hospitalsLess100}
                  onChange={(e) => handleInstitutionalFieldChange('hospitalsLess100', e.target.value)}
                  className="mt-1 block w-full sm:w-1/2 md:w-64/70 bg-white border rounded px-2 py-1"
                  placeholder="Enter number"
                />
              </div>
              <div>
                <label htmlFor="beds_less_100" className="block text-sm font-medium">
                  Beds in Hospitals with &lt; 100 Beds:
                </label>
                <input
                  type="number"
                  id="beds_less_100"
                  value={institutionalFields.bedsLess100}
                  onChange={(e) => handleInstitutionalFieldChange('bedsLess100', e.target.value)}
                  className="mt-1 block w-full sm:w-1/2 md:w-64/70 bg-white border rounded px-2 py-1"
                  placeholder="Enter number"
                />
              </div>
              <div>
                <label htmlFor="hotels" className="block text-sm font-medium">
                  Hotels (Units):
                </label>
                <input
                  type="number"
                  id="hotels"
                  value={institutionalFields.hotels}
                  onChange={(e) => handleInstitutionalFieldChange('hotels', e.target.value)}
                  className="mt-1 block w-full sm:w-1/2 md:w-64/70 bg-white border rounded px-2 py-1"
                  placeholder="Enter number"
                />
              </div>
              <div>
                <label htmlFor="beds_hotels" className="block text-sm font-medium">
                  Beds in Hotels:
                </label>
                <input
                  type="number"
                  id="beds_hotels"
                  value={institutionalFields.bedsHotels}
                  onChange={(e) => handleInstitutionalFieldChange('bedsHotels', e.target.value)}
                  className="mt-1 block w-full sm:w-1/2 md:w-64/70 bg-white border rounded px-2 py-1"
                  placeholder="Enter number"
                />
              </div>
              <div>
                <label htmlFor="hostels" className="block text-sm font-medium">
                  Hostels (Units):
                </label>
                <input
                  type="number"
                  id="hostels"
                  value={institutionalFields.hostels}
                  onChange={(e) => handleInstitutionalFieldChange('hostels', e.target.value)}
                  className="mt-1 block w-full sm:w-1/2 md:w-64/70 bg-white border rounded px-2 py-1"
                  placeholder="Enter number"
                />
              </div>
              <div>
                <label htmlFor="residents_hostels" className="block text-sm font-medium">
                  Residents in Hostels:
                </label>
                <input
                  type="number"
                  id="residents_hostels"
                  value={institutionalFields.residentsHostels}
                  onChange={(e) => handleInstitutionalFieldChange('residentsHostels', e.target.value)}
                  className="mt-1 block w-full sm:w-1/2 md:w-64/70 bg-white border rounded px-2 py-1"
                  placeholder="Enter number"
                />
              </div>
              <div>
                <label htmlFor="nurses_home" className="block text-sm font-medium">
                  Nurses Home (Units):
                </label>
                <input
                  type="number"
                  id="nurses_home"
                  value={institutionalFields.nursesHome}
                  onChange={(e) => handleInstitutionalFieldChange('nursesHome', e.target.value)}
                  className="mt-1 block w-full sm:w-1/2 md:w-64/70 bg-white border rounded px-2 py-1"
                  placeholder="Enter number"
                />
              </div>
              <div>
                <label htmlFor="residents_nurses_home" className="block text-sm font-medium">
                  Residents in Nurses Home:
                </label>
                <input
                  type="number"
                  id="residents_nurses_home"
                  value={institutionalFields.residentsNursesHome}
                  onChange={(e) => handleInstitutionalFieldChange('residentsNursesHome', e.target.value)}
                  className="mt-1 block w-full sm:w-1/2 md:w-64/70 bg-white border rounded px-2 py-1"
                  placeholder="Enter number"
                />
              </div>
              <div>
                <label htmlFor="boarding_schools" className="block text-sm font-medium">
                  Boarding Schools (Units):
                </label>
                <input
                  type="number"
                  id="boarding_schools"
                  value={institutionalFields.boardingSchools}
                  onChange={(e) => handleInstitutionalFieldChange('boardingSchools', e.target.value)}
                  className="mt-1 block w-full sm:w-1/2 md:w-64/70 bg-white border rounded px-2 py-1"
                  placeholder="Enter number"
                />
              </div>
              <div>
                <label htmlFor="students_boarding_schools" className="block text-sm font-medium">
                  Students in Boarding Schools:
                </label>
                <input
                  type="number"
                  id="students_boarding_schools"
                  value={institutionalFields.studentsBoardingSchools}
                  onChange={(e) => handleInstitutionalFieldChange('studentsBoardingSchools', e.target.value)}
                  className="mt-1 block w-full sm:w-1/2 md:w-64/70 bg-white border rounded px-2 py-1"
                  placeholder="Enter number"
                />
              </div>
              <div>
                <label htmlFor="restaurants" className="block text-sm font-medium">
                  Restaurants (Units):
                </label>
                <input
                  type="number"
                  id="restaurants"
                  value={institutionalFields.restaurants}
                  onChange={(e) => handleInstitutionalFieldChange('restaurants', e.target.value)}
                  className="mt-1 block w-full sm:w-1/2 md:w-64/70 bg-white border rounded px-2 py-1"
                  placeholder="Enter number"
                />
              </div>
              <div>
                <label htmlFor="seats_restaurants" className="block text-sm font-medium">
                  Seats in Restaurants:
                </label>
                <input
                  type="number"
                  id="seats_restaurants"
                  value={institutionalFields.seatsRestaurants}
                  onChange={(e) => handleInstitutionalFieldChange('seatsRestaurants', e.target.value)}
                  className="mt-1 block w-full sm:w-1/2 md:w-64/70 bg-white border rounded px-2 py-1"
                  placeholder="Enter number"
                />
              </div>
              <div>
                <label htmlFor="airports_seaports" className="block text-sm font-medium">
                  Airports/Seaports (Units):
                </label>
                <input
                  type="number"
                  id="airports_seaports"
                  value={institutionalFields.airportsSeaports}
                  onChange={(e) => handleInstitutionalFieldChange('airportsSeaports', e.target.value)}
                  className="mt-1 block w-full sm:w-1/2 md:w-64/70 bg-white border rounded px-2 py-1"
                  placeholder="Enter number"
                />
              </div>
              <div>
                <label htmlFor="population_load_airports" className="block text-sm font-medium">
                  Population Load on Airports/Seaports:
                </label>
                <input
                  type="number"
                  id="population_load_airports"
                  value={institutionalFields.populationLoadAirports}
                  onChange={(e) => handleInstitutionalFieldChange('populationLoadAirports', e.target.value)}
                  className="mt-1 block w-full sm:w-1/2 md:w-64/70 bg-white border rounded px-2 py-1"
                  placeholder="Enter number"
                />
              </div>
              <div>
                <label htmlFor="junction_stations" className="block text-sm font-medium">
                  Junction Stations (Units):
                </label>
                <input
                  type="number"
                  id="junction_stations"
                  value={institutionalFields.junctionStations}
                  onChange={(e) => handleInstitutionalFieldChange('junctionStations', e.target.value)}
                  className="mt-1 block w-full sm:w-1/2 md:w-64/70 bg-white border rounded px-2 py-1"
                  placeholder="Enter number"
                />
              </div>
              <div>
                <label htmlFor="population_load_junction" className="block text-sm font-medium">
                  Population Load on Junction Stations:
                </label>
                <input
                  type="number"
                  id="population_load_junction"
                  value={institutionalFields.populationLoadJunction}
                  onChange={(e) => handleInstitutionalFieldChange('populationLoadJunction', e.target.value)}
                  className="mt-1 block w-full sm:w-1/2 md:w-64/70 bg-white border rounded px-2 py-1"
                  placeholder="Enter number"
                />
              </div>
              <div>
                <label htmlFor="terminal_stations" className="block text-sm font-medium">
                  Terminal Stations (Units):
                </label>
                <input
                  type="number"
                  id="terminal_stations"
                  value={institutionalFields.terminalStations}
                  onChange={(e) => handleInstitutionalFieldChange('terminalStations', e.target.value)}
                  className="mt-1 block w-full sm:w-1/2 md:w-64/70 bg-white border rounded px-2 py-1"
                  placeholder="Enter number"
                />
              </div>
              <div>
                <label htmlFor="population_load_terminal" className="block text-sm font-medium">
                  Population Load on Terminal Stations:
                </label>
                <input
                  type="number"
                  id="population_load_terminal"
                  value={institutionalFields.populationLoadTerminal}
                  onChange={(e) => handleInstitutionalFieldChange('populationLoadTerminal', e.target.value)}
                  className="mt-1 block w-full sm:w-1/2 md:w-64/70 bg-white border rounded px-2 py-1"
                  placeholder="Enter number"
                />
              </div>
              <div>
                <label htmlFor="intermediate_bathing" className="block text-sm font-medium">
                  Intermediate Bathing (Units):
                </label>
                <input
                  type="number"
                  id="intermediate_bathing"
                  value={institutionalFields.intermediateBathing}
                  onChange={(e) => handleInstitutionalFieldChange('intermediateBathing', e.target.value)}
                  className="mt-1 block w-full sm:w-1/2 md:w-64/70 bg-white border rounded px-2 py-1"
                  placeholder="Enter number"
                />
              </div>
              <div>
                <label htmlFor="population_load_bathing" className="block text-sm font-medium">
                  Population Load on Intermediate Bathing:
                </label>
                <input
                  type="number"
                  id="population_load_bathing"
                  value={institutionalFields.populationLoadBathing}
                  onChange={(e) => handleInstitutionalFieldChange('populationLoadBathing', e.target.value)}
                  className="mt-1 block w-full sm:w-1/2 md:w-64/70 bg-white border rounded px-2 py-1"
                  placeholder="Enter number"
                />
              </div>
              <div>
                <label htmlFor="intermediate_no_bathing" className="block text-sm font-medium">
                  Intermediate No Bathing (Units):
                </label>
                <input
                  type="number"
                  id="intermediate_no_bathing"
                  value={institutionalFields.intermediateNoBathing}
                  onChange={(e) => handleInstitutionalFieldChange('intermediateNoBathing', e.target.value)}
                  className="mt-1 block w-full sm:w-1/2 md:w-64/70 bg-white border rounded px-2 py-1"
                  placeholder="Enter number"
                />
              </div>
              <div>
                <label htmlFor="population_load_no_bathing" className="block text-sm font-medium">
                  Population Load on Intermediate No Bathing:
                </label>
                <input
                  type="number"
                  id="population_load_no_bathing"
                  value={institutionalFields.populationLoadNoBathing}
                  onChange={(e) => handleInstitutionalFieldChange('populationLoadNoBathing', e.target.value)}
                  className="mt-1 block w-full sm:w-1/2 md:w-64/70 bg-white border rounded px-2 py-1"
                  placeholder="Enter number"
                />
              </div>
              <div>
                <label htmlFor="day_schools" className="block text-sm font-medium">
                  Day Schools (Units):
                </label>
                <input
                  type="number"
                  id="day_schools"
                  value={institutionalFields.daySchools}
                  onChange={(e) => handleInstitutionalFieldChange('daySchools', e.target.value)}
                  className="mt-1 block w-full sm:w-1/2 md:w-64/70 bg-white border rounded px-2 py-1"
                  placeholder="Enter number"
                />
              </div>
              <div>
                <label htmlFor="students_day_schools" className="block text-sm font-medium">
                  Students in Day Schools:
                </label>
                <input
                  type="number"
                  id="students_day_schools"
                  value={institutionalFields.studentsDaySchools}
                  onChange={(e) => handleInstitutionalFieldChange('studentsDaySchools', e.target.value)}
                  className="mt-1 block w-full sm:w-1/2 md:w-64/70 bg-white border rounded px-2 py-1"
                  placeholder="Enter number"
                />
              </div>
              <div>
                  <label htmlFor="offices" className="block text-sm font-medium">
                    Offices (Units):
                  </label>
                  <input
                    type="number"
                    id="offices"
                    value={institutionalFields.offices}
                    onChange={(e) => handleInstitutionalFieldChange('offices', e.target.value)}
                    className="mt-1 block w-full sm:w-1/2 md:w-64/70 bg-white border rounded px-2 py-1"
                    placeholder="Enter number"
                  />
              </div>
              <div>
                <label htmlFor="employees_offices" className="block text-sm font-medium">
                  Employees in Offices:
                </label>
                <input
                  type="number"
                  id="employees_offices"
                  value={institutionalFields.employeesOffices}
                  onChange={(e) => handleInstitutionalFieldChange('employeesOffices', e.target.value)}
                  className="mt-1 block w-full sm:w-1/2 md:w-64/70 bg-white border rounded px-2 py-1"
                  placeholder="Enter number"
                />   
              </div>

              <div>
                <label htmlFor="factories" className="block text-sm font-medium">
                  Factories (Units):
                </label>
                <input
                  type="number"
                  id="factories"
                  value={institutionalFields.factorieswashrooms}
                  onChange={(e) => handleInstitutionalFieldChange('factorieswashrooms', e.target.value)}
                  className="mt-1 block w-full sm:w-1/2 md:w-64/70 bg-white border rounded px-2 py-1"
                  placeholder="Enter number"
                />
              </div>
              <div>
                <label htmlFor="employees_factories" className="block text-sm font-medium">
                  Employees in Factories (with Washrooms):
                </label>
                <input
                  type="number"
                  id="employees_factories"
                  value={institutionalFields.employeesFactories}
                  onChange={(e) => handleInstitutionalFieldChange('employeesFactories', e.target.value)}
                  className="mt-1 block w-full sm:w-1/2 md:w-64/70 bg-white border rounded px-2 py-1"
                  placeholder="Enter number"
                />
              </div>
              <div>
                <label htmlFor="factories_no_washrooms" className="block text-sm font-medium">
                  Factories without Washrooms (Units):
                </label>
                <input
                  type="number"
                  id="factories_no_washrooms"
                  value={institutionalFields.factoriesnoWashrooms}
                  onChange={(e) => handleInstitutionalFieldChange('factoriesnoWashrooms', e.target.value)}
                  className="mt-1 block w-full sm:w-1/2 md:w-64/70 bg-white border rounded px-2 py-1"
                  placeholder="Enter number"
                />              
              </div>
              <div>
                <label htmlFor="employees_factories_no_washrooms" className="block text-sm font-medium">
                  Employees in Factories (No Washrooms):
                </label>
                <input
                  type="number"
                  id="employees_factories_no_washrooms"
                  value={institutionalFields.employeesFactoriesNoWashrooms}
                  onChange={(e) => handleInstitutionalFieldChange('employeesFactoriesNoWashrooms', e.target.value)}
                  className="mt-1 block w-full sm:w-1/2 md:w-64/70 bg-white border rounded px-2 py-1"
                  placeholder="Enter number"
                />
              </div> 
           
              <div>
                <label htmlFor="cinemas" className="block text-sm font-medium">
                  Cinemas (Units):
                </label>
                <input
                  type="number"
                  id="cinemas"
                  value={institutionalFields.cinemas}
                  onChange={(e) => handleInstitutionalFieldChange('cinemas', e.target.value)}
                  className="mt-1 block w-full sm:w-1/2 md:w-64/70 bg-white border rounded px-2 py-1"
                  placeholder="Enter number"
                />
              </div>
              <div>
                <label htmlFor="seats_cinemas" className="block text-sm font-medium">
                  Seats in Cinemas:
                </label>
                <input
                  type="number"
                  id="seats_cinemas"
                  value={institutionalFields.seatsCinemas}
                  onChange={(e) => handleInstitutionalFieldChange('seatsCinemas', e.target.value)}
                  className="mt-1 block w-full sm:w-1/2 md:w-64/70 bg-white border rounded px-2 py-1"
                  placeholder="Enter number"
                />
              </div>
              
              {/* Add more institutional fields here if needed */}
            </div>
          )}
        </div>
      )}

      {/* Firefighting Fields */}
      {firefightingChecked && (
        <div className="mb-4 p-3 border rounded bg-blue-50">
          <h6 className="font-bold text-blue-700">Firefighting Fields</h6>
          <div className="flex flex-col gap-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={firefightingMethods.kuchling}
                onChange={(e) => handleFirefightingMethodChange('kuchling', e.target.checked)}
                className="mr-2"
              />
              Kuchling
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={firefightingMethods.freeman}
                onChange={(e) => handleFirefightingMethodChange('freeman', e.target.checked)}
                className="mr-2"
              />
              Freeman
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={firefightingMethods.buston}
                onChange={(e) => handleFirefightingMethodChange('buston', e.target.checked)}
                className="mr-2"
              />
              Buston
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={firefightingMethods.american_insurance}
                onChange={(e) => handleFirefightingMethodChange('american_insurance', e.target.checked)}
                className="mr-2"
              />
              American Insurance
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={firefightingMethods.ministry_urban}
                onChange={(e) => handleFirefightingMethodChange('ministry_urban', e.target.checked)}
                className="mr-2"
              />
              Ministry Urban
            </label>
          </div>
          {/* Button to calculate firefighting demand */}
          <button 
            type="button" 
            className="mt-3 bg-green-600 text-white px-3 py-2 rounded"
            onClick={handleCalculateFirefighting}
          >
            Calculate Firefighting Water Demand
          </button>
          {/* If firefighting demand has been calculated, display output table and radio buttons */}
          {firefightingDemand && (
            <div className="mt-3">
              <h6 className="font-semibold text-blue-700 mb-1">Firefighting Demand Output</h6>
              <div className="overflow-x-auto">
                <table className="table-auto w-full bg-white border border-gray-300">
                  <thead className="bg-gray-200">
                    <tr>
                      <th className="border px-4 py-2">Year</th>
                      {Object.keys(firefightingDemand).map((method) => (
                        <th key={method} className="border px-4 py-2">{method}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.keys(forecastData).sort().map((year) => (
                      <tr key={year}>
                        <td className="border px-4 py-2">{year}</td>
                        {Object.keys(firefightingDemand).map((method) => (
                          <td key={method} className="border px-4 py-2">
                            {firefightingDemand[method]?.[year]
                              ? firefightingDemand[method][year].toFixed(2)
                              : ""}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-sm font-semibold">Select one method for final output:</p>
              <div className="flex gap-4">
                {Object.keys(firefightingDemand).map((method) => (
                  <label key={method} className="flex items-center">
                    <input 
                      type="radio"
                      name="selectedFirefightingMethod"
                      value={method}
                      checked={selectedFirefightingMethod === method}
                      onChange={() => setSelectedFirefightingMethod(method)}
                      className="mr-1"
                    />
                    {method}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Calculate Water Demand Button */}
      <button 
        className="bg-blue-600 text-white px-4 py-2 rounded"
        onClick={handleCalculate}
      >
        Calculate Water Demand
      </button>

      {(domesticDemand || floatingDemand || institutionalDemand || firefightingDemand) && forecastData && (
        <div className="mt-6">
            <h2 className="text-lg font-semibold mb-4">Water Demand</h2>
            <div className="overflow-x-auto">
            <table className="table-auto w-full min-w-[300px] bg-white border border-gray-300">
                <thead className="bg-gray-200">
                <tr>
                    <th className="border px-4 py-2">Year</th>
                    {domesticChecked && (
                    <>
                        <th className="border px-4 py-2">Forecasted Population</th>
                        <th className="border px-4 py-2">Domestic Water Demand (MLD)</th>
                    </>
                    )}
                    {floatingChecked && (
                    <th className="border px-4 py-2">Floating Water Demand (MLD)</th>
                    )}
                    {institutionalChecked && (
                    <th className="border px-4 py-2">Institutional Water Demand (MLD)</th>
                    )}
                    {firefightingChecked && selectedFirefightingMethod && (
                        <th className="border px-4 py-2">
                        Firefighting Demand ({selectedFirefightingMethod}) (MLD)
                        </th>
                    )}
                    <th className="border px-4 py-2">Total Demand (MLD)</th>
                </tr>
                </thead>
                <tbody>
                {Object.keys(forecastData)
                    .sort()
                    .map((year) => {
                    // For domestic, retrieve the forecasted population from the global variable
                    const domesticPop = forecastData[year] ?? "";
                    const domesticVal = domesticChecked && domesticDemand?.[year] ? domesticDemand[year] : 0;
                    const floatingVal = floatingChecked && floatingDemand?.[year] ? floatingDemand[year] : 0;
                    const institutionalVal = institutionalChecked && institutionalDemand?.[year] ? institutionalDemand[year] : 0;
                    const firefightingVal =
                    firefightingChecked && selectedFirefightingMethod && firefightingDemand?.[selectedFirefightingMethod]?.[year]
                        ? firefightingDemand[selectedFirefightingMethod][year]
                        : 0;
                    const totalDemand = domesticVal + floatingVal + institutionalVal + firefightingVal;
                    return (
                        <tr key={year}>
                        <td className="border px-4 py-2">{year}</td>
                        {domesticChecked && (
                            <>
                            <td className="border px-4 py-2">{domesticPop}</td>
                            <td className="border px-4 py-2">
                                {domesticDemand?.[year]
                                ? domesticDemand[year].toFixed(2)
                                : ""}
                            </td>
                            </>
                        )}
                        {floatingChecked && (
                            <td className="border px-4 py-2">
                            {floatingDemand?.[year]
                                ? floatingDemand[year].toFixed(2)
                                : ""}
                            </td>
                        )}
                        {institutionalChecked && (
                            <td className="border px-4 py-2">
                            {institutionalDemand?.[year]
                                ? institutionalDemand[year].toFixed(2)
                                : ""}
                            </td>
                        )}
                        {firefightingChecked && selectedFirefightingMethod && (
                          <td className="border px-4 py-2">
                            {firefightingDemand?.[selectedFirefightingMethod]?.[year]
                              ? firefightingDemand[selectedFirefightingMethod][year].toFixed(2)
                              : ""}
                          </td>
                        )}
                        <td className="border px-4 py-2">{totalDemand.toFixed(2)}</td>
                        </tr>
                    );
                    })}
                </tbody>
            </table>
            </div>
        </div>
        )}


    </div>
  );
};

export default WaterDemandForm;
