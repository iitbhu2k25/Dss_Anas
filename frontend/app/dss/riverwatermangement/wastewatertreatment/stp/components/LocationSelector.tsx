"use client";

import React, { useState, useEffect } from 'react';

// TypeScript interfaces
interface LocationItem {
  id: number;
  name: string;
}

interface District extends LocationItem {
  stateId: number;
}

interface SubDistrict extends LocationItem {
  districtId: number;
}

interface Village extends LocationItem {
  subDistrictId: number;
  population: number;
}

interface Town extends LocationItem {
  subDistrictId: number;
}

interface LocationSelectorProps {
  onConfirm?: (selectedData: {
    villages: Village[];
    subDistricts: SubDistrict[];
    totalPopulation: number;
  }) => void;
}

const LocationSelector: React.FC<LocationSelectorProps> = ({ onConfirm }) => {
  // Rural section states
  const [states, setStates] = useState<LocationItem[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [subDistricts, setSubDistricts] = useState<SubDistrict[]>([]);
  const [villages, setVillages] = useState<Village[]>([]);
  const [totalPopulation, setTotalPopulation] = useState<number>(0);
  
  // Urban section states
  const [urbanSelectedState, setUrbanSelectedState] = useState<string>('');
  const [urbanSelectedDistricts, setUrbanSelectedDistricts] = useState<string[]>([]);
  const [urbanSelectedSubDistricts, setUrbanSelectedSubDistricts] = useState<string[]>([]);
  const [urbanSelectedTowns, setUrbanSelectedTowns] = useState<string[]>([]);
  const [urbanDistricts, setUrbanDistricts] = useState<District[]>([]);
  const [urbanSubDistricts, setUrbanSubDistricts] = useState<SubDistrict[]>([]);
  const [urbanTowns, setUrbanTowns] = useState<Town[]>([]);
  
  // Sample tiers data (static)
  const tiers = ['Tier 1', 'Tier 2', 'Tier 3', 'Tier 4', 'Tier 5', 'Tier 6'];
  
  // Rural section selected values
  const [selectedState, setSelectedState] = useState<string>('');
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>([]);
  const [selectedSubDistricts, setSelectedSubDistricts] = useState<string[]>([]);
  const [selectedVillages, setSelectedVillages] = useState<string[]>([]);
  
  // Dropdown visibility states
  const [isDistrictDropdownOpen, setIsDistrictDropdownOpen] = useState(false);
  const [isSubDistrictDropdownOpen, setIsSubDistrictDropdownOpen] = useState(false);
  const [isVillageDropdownOpen, setIsVillageDropdownOpen] = useState(false);
  const [isUrbanDistrictDropdownOpen, setIsUrbanDistrictDropdownOpen] = useState(false);
  const [isUrbanSubDistrictDropdownOpen, setIsUrbanSubDistrictDropdownOpen] = useState(false);
  const [isTownDropdownOpen, setIsTownDropdownOpen] = useState(false);
  
  // Search filters
  const [districtSearchFilter, setDistrictSearchFilter] = useState<string>('');
  const [subDistrictSearchFilter, setSubDistrictSearchFilter] = useState<string>('');
  const [villageSearchFilter, setVillageSearchFilter] = useState<string>('');
  const [urbanDistrictSearchFilter, setUrbanDistrictSearchFilter] = useState<string>('');
  const [urbanSubDistrictSearchFilter, setUrbanSubDistrictSearchFilter] = useState<string>('');
  const [townSearchFilter, setTownSearchFilter] = useState<string>('');

  // Fetch states on component mount
  useEffect(() => {
    const fetchStates = async (): Promise<void> => {
      try {
        console.log('Fetching states...');
        const response = await fetch('http://localhost:9000/api/basic/');
        if (!response.ok) {
          const text = await response.text();
          console.error('States response:', text);
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const text = await response.text();
          console.error('Non-JSON response for states:', text);
          throw new Error('Expected JSON, received non-JSON response');
        }
        const data = await response.json();
        const stateData: LocationItem[] = data.map((state: any) => ({
          id: state.state_code,
          name: state.state_name
        }));
        setStates(stateData);
      } catch (error) {
        console.error('Error fetching states:', error);
      }
    };
    fetchStates();
  }, []);

  // Fetch rural districts when rural state changes
  useEffect(() => {
    if (selectedState) {
      const fetchDistricts = async (): Promise<void> => {
        try {
          console.log('Fetching districts for state:', selectedState);
          const response = await fetch('http://localhost:9000/api/basic/district/', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ state_code: selectedState }),
          });
          if (!response.ok) {
            const text = await response.text();
            console.error('Districts response:', text);
            throw new Error(`HTTP error! Status: ${response.status}`);
          }
          const contentType = response.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            console.error('Non-JSON response for districts:', text);
            throw new Error('Expected JSON, received non-JSON response');
          }
          const data = await response.json();
          const districtData: LocationItem[] = data.map((district: any) => ({
            id: district.district_code,
            name: district.district_name
          }));
          const mappedDistricts: District[] = districtData.map(district => ({ 
            ...district, 
            stateId: parseInt(selectedState) 
          }));
          setDistricts(mappedDistricts);
          setSelectedDistricts([]);
        } catch (error) {
          console.error('Error fetching rural districts:', error);
        }
      };
      fetchDistricts();
    } else {
      setDistricts([]);
      setSelectedDistricts([]);
    }
    setSubDistricts([]);
    setSelectedSubDistricts([]);
    setVillages([]);
    setSelectedVillages([]);
    setTotalPopulation(0);
  }, [selectedState]);

  // Fetch rural sub-districts when rural districts change
  useEffect(() => {
    if (selectedDistricts.length > 0) {
      const fetchSubDistricts = async (): Promise<void> => {
        try {
          console.log('Fetching sub-districts for districts:', selectedDistricts);
          const response = await fetch('http://localhost:9000/api/basic/subdistrict/', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ district_code: selectedDistricts }),
          });
          if (!response.ok) {
            const text = await response.text();
            console.error('Sub-districts response:', text);
            throw new Error(`HTTP error! Status: ${response.status}`);
          }
          const contentType = response.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            console.error('Non-JSON response for sub-districts:', text);
            throw new Error('Expected JSON, received non-JSON response');
          }
          const data = await response.json();
          const subDistrictData: LocationItem[] = data.map((subDistrict: any) => ({
            id: subDistrict.subdistrict_code,
            name: subDistrict.subdistrict_name
          }));
          const mappedSubDistricts: SubDistrict[] = subDistrictData.map(subdistrict => ({ 
            ...subdistrict, 
            districtId: parseInt(selectedDistricts[0])
          }));
          setSubDistricts(mappedSubDistricts);
          setSelectedSubDistricts([]);
        } catch (error) {
          console.error('Error fetching rural sub-districts:', error);
        }
      };
      fetchSubDistricts();
    } else {
      setSubDistricts([]);
      setSelectedSubDistricts([]);
    }
    setVillages([]);
    setSelectedVillages([]);
    setTotalPopulation(0);
  }, [selectedDistricts]);

  // Fetch villages when rural sub-districts change
  useEffect(() => {
    if (selectedSubDistricts.length > 0) {
      const fetchVillages = async (): Promise<void> => {
        try {
          console.log('Fetching villages for sub-districts:', selectedSubDistricts);
          const response = await fetch('http://localhost:9000/api/basic/village/', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ subdistrict_code: selectedSubDistricts }),
          });
          if (!response.ok) {
            const text = await response.text();
            console.error('Villages response:', text);
            throw new Error(`HTTP error! Status: ${response.status}`);
          }
          const contentType = response.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            console.error('Non-JSON response for villages:', text);
            throw new Error('Expected JSON, received non-JSON response');
          }
          const data = await response.json();
          const villageData: Village[] = data.map((village: any) => ({
            id: village.village_code,
            name: village.village_name,
            subDistrictId: parseInt(selectedSubDistricts[0]),
            population: village.population_2011 || 0
          }));
          setVillages(villageData);
          setSelectedVillages([]);
        } catch (error) {
          console.error('Error fetching villages:', error);
          setVillages([]);
        }
      };
      fetchVillages();
    } else {
      setVillages([]);
      setSelectedVillages([]);
    }
    setTotalPopulation(0);
  }, [selectedSubDistricts]);

  // Calculate total population when selected villages change
  useEffect(() => {
    if (selectedVillages.length > 0) {
      const selectedVillageObjects = villages.filter(village => 
        selectedVillages.includes(village.id.toString())
      );
      const total = selectedVillageObjects.reduce(
        (sum, village) => sum + village.population, 
        0
      );
      setTotalPopulation(total);
    } else {
      setTotalPopulation(0);
    }
  }, [selectedVillages, villages]);

  // Fetch urban districts when urban state changes
  useEffect(() => {
    if (urbanSelectedState) {
      const fetchUrbanDistricts = async (): Promise<void> => {
        try {
          console.log('Fetching urban districts for state:', urbanSelectedState);
          const response = await fetch('http://localhost:9000/api/basic/district/', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ state_code: urbanSelectedState }),
          });
          if (!response.ok) {
            const text = await response.text();
            console.error('Urban districts response:', text);
            throw new Error(`HTTP error! Status: ${response.status}`);
          }
          const contentType = response.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            console.error('Non-JSON response for urban districts:', text);
            throw new Error('Expected JSON, received non-JSON response');
          }
          const data = await response.json();
          const districtData: LocationItem[] = data.map((district: any) => ({
            id: district.district_code,
            name: district.district_name
          }));
          const mappedDistricts: District[] = districtData.map(district => ({ 
            ...district, 
            stateId: parseInt(urbanSelectedState) 
          }));
          setUrbanDistricts(mappedDistricts);
          setUrbanSelectedDistricts([]);
        } catch (error) {
          console.error('Error fetching urban districts:', error);
        }
      };
      fetchUrbanDistricts();
    } else {
      setUrbanDistricts([]);
      setUrbanSelectedDistricts([]);
    }
    setUrbanSubDistricts([]);
    setUrbanSelectedSubDistricts([]);
    setUrbanTowns([]);
    setUrbanSelectedTowns([]);
  }, [urbanSelectedState]);

  // Fetch urban sub-districts when urban districts change
  useEffect(() => {
    if (urbanSelectedDistricts.length > 0) {
      const fetchUrbanSubDistricts = async (): Promise<void> => {
        try {
          console.log('Fetching urban sub-districts for districts:', urbanSelectedDistricts);
          const response = await fetch('http://localhost:9000/api/basic/subdistrict/', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ district_code: urbanSelectedDistricts }),
          });
          if (!response.ok) {
            const text = await response.text();
            console.error('Urban sub-districts response:', text);
            throw new Error(`HTTP error! Status: ${response.status}`);
          }
          const contentType = response.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            console.error('Non-JSON response for urban sub-districts:', text);
            throw new Error('Expected JSON, received non-JSON response');
          }
          const data = await response.json();
          const subDistrictData: LocationItem[] = data.map((subDistrict: any) => ({
            id: subDistrict.subdistrict_code,
            name: subDistrict.subdistrict_name
          }));
          const mappedSubDistricts: SubDistrict[] = subDistrictData.map(subdistrict => ({ 
            ...subdistrict, 
            districtId: parseInt(urbanSelectedDistricts[0])
          }));
          setUrbanSubDistricts(mappedSubDistricts);
          setUrbanSelectedSubDistricts([]);
        } catch (error) {
          console.error('Error fetching urban sub-districts:', error);
        }
      };
      fetchUrbanSubDistricts();
    } else {
      setUrbanSubDistricts([]);
      setUrbanSelectedSubDistricts([]);
    }
    setUrbanTowns([]);
    setUrbanSelectedTowns([]);
  }, [urbanSelectedDistricts]);

  // Fetch towns when urban sub-districts change
  useEffect(() => {
    if (urbanSelectedSubDistricts.length > 0) {
      const fetchTowns = async (): Promise<void> => {
        try {
          console.log('Fetching towns for sub-districts:', urbanSelectedSubDistricts);
          const response = await fetch('http://localhost:9000/api/basic/town/', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ subdistrict_code: urbanSelectedSubDistricts }),
          });
          if (!response.ok) {
            const text = await response.text();
            console.error('Towns response:', text);
            throw new Error(`HTTP error! Status: ${response.status}`);
          }
          const contentType = response.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            console.error('Non-JSON response for towns:', text);
            throw new Error('Expected JSON, received non-JSON response');
          }
          const data = await response.json();
          const townData: Town[] = data.map((town: any) => ({
            id: town.town_code,
            name: town.town_name,
            subDistrictId: parseInt(urbanSelectedSubDistricts[0])
          }));
          setUrbanTowns(townData);
          setUrbanSelectedTowns([]);
        } catch (error) {
          console.error('Error fetching towns:', error);
          setUrbanTowns([]);
        }
      };
      fetchTowns();
    } else {
      setUrbanTowns([]);
      setUrbanSelectedTowns([]);
    }
  }, [urbanSelectedSubDistricts]);

  // Handle rural state selection
  const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    setSelectedState(e.target.value);
    // Close all dropdowns when state changes
    setIsDistrictDropdownOpen(false);
    setIsSubDistrictDropdownOpen(false);
    setIsVillageDropdownOpen(false);
  };

  // Handle urban state selection
  const handleUrbanStateChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    setUrbanSelectedState(e.target.value);
    // Close all urban dropdowns when state changes
    setIsUrbanDistrictDropdownOpen(false);
    setIsUrbanSubDistrictDropdownOpen(false);
    setIsTownDropdownOpen(false);
  };

  // Handle rural district selection/deselection
  const toggleDistrictSelection = (districtId: string): void => {
    setSelectedDistricts(prevSelection => {
      const isSelecting = !prevSelection.includes(districtId);
      return isSelecting
        ? [...prevSelection, districtId]
        : prevSelection.filter(id => id !== districtId);
    });
    // Keep district dropdown open; do not open sub-district dropdown here
  };

  // Handle urban district selection/deselection
  const toggleUrbanDistrictSelection = (districtId: string): void => {
    setUrbanSelectedDistricts(prevSelection => {
      const isSelecting = !prevSelection.includes(districtId);
      return isSelecting
        ? [...prevSelection, districtId]
        : prevSelection.filter(id => id !== districtId);
    });
    // Keep urban district dropdown open; do not open sub-district dropdown here
  };

  // Handle rural sub-district selection/deselection
  const toggleSubDistrictSelection = (subDistrictId: string): void => {
    setSelectedSubDistricts(prevSelection => {
      const isSelecting = !prevSelection.includes(subDistrictId);
      const newSelection = isSelecting
        ? [...prevSelection, subDistrictId]
        : prevSelection.filter(id => id !== subDistrictId);
      
      // If selecting (not deselecting), close district dropdown and open sub-district dropdown
      if (isSelecting && newSelection.length === 1) {
        setIsDistrictDropdownOpen(false);
        setIsSubDistrictDropdownOpen(true);
      }
      
      return newSelection;
    });
  };

  // Handle urban sub-district selection/deselection
  const toggleUrbanSubDistrictSelection = (subDistrictId: string): void => {
    setUrbanSelectedSubDistricts(prevSelection => {
      const isSelecting = !prevSelection.includes(subDistrictId);
      const newSelection = isSelecting
        ? [...prevSelection, subDistrictId]
        : prevSelection.filter(id => id !== subDistrictId);
      
      // If selecting (not deselecting), close urban district dropdown and open sub-district dropdown
      if (isSelecting && newSelection.length === 1) {
        setIsUrbanDistrictDropdownOpen(false);
        setIsUrbanSubDistrictDropdownOpen(true);
      }
      
      return newSelection;
    });
  };

  // Handle village selection/deselection
  const toggleVillageSelection = (villageId: string): void => {
    setSelectedVillages(prevSelection => {
      const isSelecting = !prevSelection.includes(villageId);
      const newSelection = isSelecting
        ? [...prevSelection, villageId]
        : prevSelection.filter(id => id !== villageId);
      
      // If selecting (not deselecting), close sub-district dropdown and open village dropdown
      if (isSelecting && newSelection.length === 1) {
        setIsSubDistrictDropdownOpen(false);
        setIsVillageDropdownOpen(true);
      }
      
      return newSelection;
    });
  };

  // Handle town selection/deselection
  const toggleTownSelection = (townId: string): void => {
    setUrbanSelectedTowns(prevSelection => {
      const isSelecting = !prevSelection.includes(townId);
      const newSelection = isSelecting
        ? [...prevSelection, townId]
        : prevSelection.filter(id => id !== townId);
      
      // If selecting (not deselecting), close sub-district dropdown and open town dropdown
      if (isSelecting && newSelection.length === 1) {
        setIsUrbanSubDistrictDropdownOpen(false);
        setIsTownDropdownOpen(true);
      }
      
      return newSelection;
    });
  };

  // Filter districts
  const filteredDistricts = districts.filter(district => 
    district.name.toLowerCase().includes(districtSearchFilter.toLowerCase())
  );

  const filteredUrbanDistricts = urbanDistricts.filter(district => 
    district.name.toLowerCase().includes(urbanDistrictSearchFilter.toLowerCase())
  );

  // Filter sub-districts
  const filteredSubDistricts = subDistricts.filter(subDistrict => 
    subDistrict.name.toLowerCase().includes(subDistrictSearchFilter.toLowerCase())
  );

  const filteredUrbanSubDistricts = urbanSubDistricts.filter(subDistrict => 
    subDistrict.name.toLowerCase().includes(urbanSubDistrictSearchFilter.toLowerCase())
  );

  // Filter villages
  const filteredVillages = villages.filter(village => 
    village.name.toLowerCase().includes(villageSearchFilter.toLowerCase())
  );

  // Filter towns
  const filteredTowns = urbanTowns.filter(town => 
    town.name.toLowerCase().includes(townSearchFilter.toLowerCase())
  );

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="bg-blue-600 text-white p-3 rounded-t-lg w-auto">
        <h3 className="text-lg font-semibold">
          <i className="fas fa-map-marker-alt mr-2 h-[30px]"></i>Site Priority and Suitability
        </h3>
      </div>
      <div className="p-4">
        {/* Rural Section - First Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          {/* State Dropdown */}
          <div>
            <label htmlFor="state-dropdown" className="block text-sm font-medium text-gray-700 mb-1">
              State:
            </label>
            <select
              id="state-dropdown"
              className="block w-full rounded-md border border-blue-500 py-1.5 px-2 text-gray-900 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              value={selectedState}
              onChange={handleStateChange}
            >
              <option value="">--Choose a State--</option>
              {states.map(state => (
                <option key={state.id} value={state.id}>{state.name}</option>
              ))}
            </select>
          </div>

          {/* District Dropdown */}
          <div>
            <label htmlFor="district-dropdown" className="block text-sm font-medium text-gray-700 mb-1">
              District:
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsDistrictDropdownOpen(!isDistrictDropdownOpen)}
                className="flex justify-between items-center w-full rounded-md border border-blue-500 py-1.5 px-2 text-gray-700 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                disabled={!selectedState}
              >
                {selectedDistricts.length > 0 
                  ? `${selectedDistricts.length} District(s) Selected` 
                  : '--Choose Districts--'}
                <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
              
              {isDistrictDropdownOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white shadow-lg max-h-60 rounded-md py-1 text-base overflow-auto focus:outline-none sm:text-sm">
                  <div className="sticky top-0 z-10 bg-white p-2">
                    <input
                      type="text"
                      className="block w-full rounded-md border border-gray-300 py-1.5 px-2 text-gray-900 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Search districts..."
                      value={districtSearchFilter}
                      onChange={(e) => setDistrictSearchFilter(e.target.value)}
                    />
                  </div>
                  <div className="border-t border-gray-200"></div>
                  <div className="py-1">
                    {filteredDistricts.map((district) => (
                      <div key={district.id} className="flex items-center px-3 py-1.5 hover:bg-gray-100">
                        <input
                          type="checkbox"
                          id={`district-${district.id}`}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          checked={selectedDistricts.includes(district.id.toString())}
                          onChange={() => toggleDistrictSelection(district.id.toString())}
                        />
                        <label htmlFor={`district-${district.id}`} className="ml-2 block text-sm text-gray-900">
                          {district.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sub-District Dropdown */}
          <div>
            <label htmlFor="sub-district-dropdown" className="block text-sm font-medium text-gray-700 mb-1">
              Sub-District:
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsSubDistrictDropdownOpen(!isSubDistrictDropdownOpen)}
                className="flex justify-between items-center w-full rounded-md border border-blue-500 py-1.5 px-2 text-gray-700 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                disabled={selectedDistricts.length === 0}
              >
                {selectedSubDistricts.length > 0 
                  ? `${selectedSubDistricts.length} Sub-District(s) Selected` 
                  : '--Choose Sub-Districts--'}
                <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
              
              {isSubDistrictDropdownOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white shadow-lg max-h-60 rounded-md py-1 text-base overflow-auto focus:outline-none sm:text-sm">
                  <div className="sticky top-0 z-10 bg-white p-2">
                    <input
                      type="text"
                      className="block w-full rounded-md border border-gray-300 py-1.5 px-2 text-gray-900 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Search sub-districts..."
                      value={subDistrictSearchFilter}
                      onChange={(e) => setSubDistrictSearchFilter(e.target.value)}
                    />
                  </div>
                  <div className="border-t border-gray-200"></div>
                  <div className="py-1">
                    {filteredSubDistricts.map((subDistrict) => (
                      <div key={subDistrict.id} className="flex items-center px-3 py-1.5 hover:bg-gray-100">
                        <input
                          type="checkbox"
                          id={`sub-district-${subDistrict.id}`}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          checked={selectedSubDistricts.includes(subDistrict.id.toString())}
                          onChange={() => toggleSubDistrictSelection(subDistrict.id.toString())}
                        />
                        <label htmlFor={`sub-district-${subDistrict.id}`} className="ml-2 block text-sm text-gray-900">
                          {subDistrict.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Village Dropdown */}
          <div>
            <label htmlFor="village-dropdown" className="block text-sm font-medium text-gray-700 mb-1">
              Village:
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsVillageDropdownOpen(!isVillageDropdownOpen)}
                className="flex justify-between items-center w-full rounded-md border border-blue-500 py-1.5 px-2 text-gray-700 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                disabled={selectedSubDistricts.length === 0}
              >
                {selectedVillages.length > 0 
                  ? `${selectedVillages.length} Village(s) Selected` 
                  : '--Choose Villages--'}
                <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
              
              {isVillageDropdownOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white shadow-lg max-h-60 rounded-md py-1 text-base overflow-auto focus:outline-none sm:text-sm">
                  <div className="sticky top-0 z-10 bg-white p-2">
                    <input
                      type="text"
                      className="block w-full rounded-md border border-gray-300 py-1.5 px-2 text-gray-900 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Search villages..."
                      value={villageSearchFilter}
                      onChange={(e) => setVillageSearchFilter(e.target.value)}
                    />
                  </div>
                  <div className="border-t border-gray-200"></div>
                  <div className="py-1">
                    {filteredVillages.map((village) => (
                      <div key={village.id} className="flex items-center px-3 py-1.5 hover:bg-gray-100">
                        <input
                          type="checkbox"
                          id={`village-${village.id}`}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          checked={selectedVillages.includes(village.id.toString())}
                          onChange={() => toggleVillageSelection(village.id.toString())}
                        />
                        <label htmlFor={`village-${village.id}`} className="ml-2 block text-sm text-gray-900">
                          {village.name} (Pop: {village.population.toLocaleString()})
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <hr className="my-4 border-gray-200" />

        {/* Urban Section - Second Row */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Tier Dropdown */}
          <div>
            <label htmlFor="tier-dropdown" className="block text-sm font-medium text-gray-700 mb-1">
              Tier:
            </label>
            <select
              id="tier-dropdown"
              className="block w-full rounded-md border border-blue-500 py-1.5 px-2 text-gray-900 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">--Choose a Tier--</option>
              {tiers.map((tier, index) => (
                <option key={index} value={tier}>{tier}</option>
              ))}
            </select>
          </div>

          {/* Urban State Dropdown */}
          <div>
            <label htmlFor="urban-state-dropdown" className="block text-sm font-medium text-gray-700 mb-1">
              State:
            </label>
            <select
              id="urban-state-dropdown"
              className="block w-full rounded-md border border-blue-500 py-1.5 px-2 text-gray-900 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              value={urbanSelectedState}
              onChange={handleUrbanStateChange}
            >
              <option value="">--Choose a State--</option>
              {states.map(state => (
                <option key={state.id} value={state.id}>{state.name}</option>
              ))}
            </select>
          </div>

          {/* Urban District Dropdown */}
          <div>
            <label htmlFor="urban-district-dropdown" className="block text-sm font-medium text-gray-700 mb-1">
              District:
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsUrbanDistrictDropdownOpen(!isUrbanDistrictDropdownOpen)}
                className="flex justify-between items-center w-full rounded-md border border-blue-500 py-1.5 px-2 text-gray-700 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                disabled={!urbanSelectedState}
              >
                {urbanSelectedDistricts.length > 0 
                  ? `${urbanSelectedDistricts.length} District(s) Selected` 
                  : '--Choose Districts--'}
                <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
              
              {isUrbanDistrictDropdownOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white shadow-lg max-h-60 rounded-md py-1 text-base overflow-auto focus:outline-none sm:text-sm">
                  <div className="sticky top-0 z-10 bg-white p-2">
                    <input
                      type="text"
                      className="block w-full rounded-md border border-gray-300 py-1.5 px-2 text-gray-900 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Search districts..."
                      value={urbanDistrictSearchFilter}
                      onChange={(e) => setUrbanDistrictSearchFilter(e.target.value)}
                    />
                  </div>
                  <div className="border-t border-gray-200"></div>
                  <div className="py-1">
                    {filteredUrbanDistricts.map((district) => (
                      <div key={district.id} className="flex items-center px-3 py-1.5 hover:bg-gray-100">
                        <input
                          type="checkbox"
                          id={`urban-district-${district.id}`}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          checked={urbanSelectedDistricts.includes(district.id.toString())}
                          onChange={() => toggleUrbanDistrictSelection(district.id.toString())}
                        />
                        <label htmlFor={`urban-district-${district.id}`} className="ml-2 block text-sm text-gray-900">
                          {district.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Urban Sub-District Dropdown */}
          <div>
            <label htmlFor="urban-sub-district-dropdown" className="block text-sm font-medium text-gray-700 mb-1">
              Sub-District:
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsUrbanSubDistrictDropdownOpen(!isUrbanSubDistrictDropdownOpen)}
                className="flex justify-between items-center w-full rounded-md border border-blue-500 py-1.5 px-2 text-gray-700 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                disabled={urbanSelectedDistricts.length === 0}
              >
                {urbanSelectedSubDistricts.length > 0 
                  ? `${urbanSelectedSubDistricts.length} Sub-District(s) Selected` 
                  : '--Choose Sub-Districts--'}
                <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
              
              {isUrbanSubDistrictDropdownOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white shadow-lg max-h-60 rounded-md py-1 text-base overflow-auto focus:outline-none sm:text-sm">
                  <div className="sticky top-0 z-10 bg-white p-2">
                    <input
                      type="text"
                      className="block w-full rounded-md border border-gray-300 py-1.5 px-2 text-gray-900 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Search sub-districts..."
                      value={urbanSubDistrictSearchFilter}
                      onChange={(e) => setUrbanSubDistrictSearchFilter(e.target.value)}
                    />
                  </div>
                  <div className="border-t border-gray-200"></div>
                  <div className="py-1">
                    {filteredUrbanSubDistricts.map((subDistrict) => (
                      <div key={subDistrict.id} className="flex items-center px-3 py-1.5 hover:bg-gray-100">
                        <input
                          type="checkbox"
                          id={`urban-sub-district-${subDistrict.id}`}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          checked={urbanSelectedSubDistricts.includes(subDistrict.id.toString())}
                          onChange={() => toggleUrbanSubDistrictSelection(subDistrict.id.toString())}
                        />
                        <label htmlFor={`urban-sub-district-${subDistrict.id}`} className="ml-2 block text-sm text-gray-900">
                          {subDistrict.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Town Dropdown */}
          <div>
            <label htmlFor="town-dropdown" className="block text-sm font-medium text-gray-700 mb-1">
              Town:
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsTownDropdownOpen(!isTownDropdownOpen)}
                className="flex justify-between items-center w-full rounded-md border border-blue-500 py-1.5 px-2 text-gray-700 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                disabled={urbanSelectedSubDistricts.length === 0}
              >
                {urbanSelectedTowns.length > 0 
                  ? `${urbanSelectedTowns.length} Town(s) Selected` 
                  : '--Choose Towns--'}
                <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
              
              {isTownDropdownOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white shadow-lg max-h-60 rounded-md py-1 text-base overflow-auto focus:outline-none sm:text-sm">
                  <div className="sticky top-0 z-10 bg-white p-2">
                    <input
                      type="text"
                      className="block w-full rounded-md border border-gray-300 py-1.5 px-2 text-gray-900 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Search towns..."
                      value={townSearchFilter}
                      onChange={(e) => setTownSearchFilter(e.target.value)}
                    />
                  </div>
                  <div className="border-t border-gray-200"></div>
                  <div className="py-1">
                    {filteredTowns.length > 0 ? (
                      filteredTowns.map((town) => (
                        <div key={town.id} className="flex items-center px-3 py-1.5 hover:bg-gray-100">
                          <input
                            type="checkbox"
                            id={`town-${town.id}`}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            checked={urbanSelectedTowns.includes(town.id.toString())}
                            onChange={() => toggleTownSelection(town.id.toString())}
                          />
                          <label htmlFor={`town-${town.id}`} className="ml-2 block text-sm text-gray-900">
                            {town.name}
                          </label>
                        </div>
                      ))
                    ) : (
                      <div className="px-3 py-1.5 text-sm text-gray-500">
                        No towns available
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocationSelector;