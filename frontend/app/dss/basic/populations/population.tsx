'use client'
import React, { useState, useEffect, useCallback } from "react"

import TimeMethods from "./components/timeseries";
import DemographicPopulation, { DemographicData } from "./components/demographic"; 
import dynamic from "next/dynamic";

const PopulationChart = dynamic(() => import("./components/PopulationChart"), { ssr: false })
interface Village {
    id: number;
    name: string;
    subDistrictId: number;
    population: number;
  }
  
  interface SubDistrict {
    id: number;
    name: string;
    districtId: number;
  }
  interface PopulationProps {
    villages_props: Village[];
    subDistricts_props: SubDistrict[];
    totalPopulation_props: number;
    demographicData?: DemographicData; // New prop to receive demographic data
  }
const Population: React.FC<PopulationProps> = ({
    villages_props,
    subDistricts_props,
    totalPopulation_props,
    demographicData
}) => {
    const [single_year, setSingleYear] = useState<number | null>(null);
    const [range_year_start, setRangeYearStart] = useState<number | null>(null);
    const [range_year_end, setRangeYearEnd] = useState<number | null>(null);
    const [inputMode, setInputMode] = useState<'single' | 'range' | null>(null);
    const [error, setError] = useState<string | null>(null);
    // Add state for calculation methods
    const [methods, setMethods] = useState({
        timeseries: false,
        demographic: false,
        cohort: false
    });
    // Add state for results
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<any | null>(null);
    const [selectedMethod, setSelectedMethodd] = useState<string>("");
    const [localDemographicData, setLocalDemographicData] = useState<DemographicData>(demographicData || {
        annualBirthRate: "",
        annualDeathRate: "",
        annualEmigrationRate: "",
        annualImmigrationRate: ""
      });

    // Update input mode when user interacts with fields
    useEffect(() => {
        if (single_year !== null && (single_year > 0)) {
            setInputMode('single');
            // Clear range inputs if single year is used
            if (range_year_start !== null || range_year_end !== null) {
                setRangeYearStart(null);
                setRangeYearEnd(null);
            }
        } else if ((range_year_start !== null && range_year_start > 0) || 
                  (range_year_end !== null && range_year_end > 0)) {
            setInputMode('range');
            // Clear single year input if range is used
            if (single_year !== null) {
                setSingleYear(null);
            }
        } else if (range_year_start === null && range_year_end === null && single_year === null) {
            // If all fields are empty, allow selecting either mode
            setInputMode(null);
        }
    }, [single_year, range_year_start, range_year_end]);

    // Validate all inputs
    useEffect(() => {
        // Validate single year
        if (inputMode === 'single') {
            if (single_year !== null && (single_year < 2011 || single_year > 2099)) {
                setError('Year must be between 2011 and 2099');
            } else {
                setError(null);
            }
        } 
        // Validate range years
        else if (inputMode === 'range') {
            if (range_year_start !== null && (range_year_start < 2011 || range_year_start > 2099)) {
                setError('Start year must be between 2011 and 2099');
            } else if (range_year_end !== null && (range_year_end < 2011 || range_year_end > 2099)) {
                setError('End year must be between 2011 and 2099');
            } else if (range_year_start !== null && range_year_end !== null && 
                range_year_start >= range_year_end) {
                setError('End year must be greater than start year');
            } else {
                setError(null);
            }
        } else {
            setError(null);
        }
    }, [inputMode, single_year, range_year_start, range_year_end]);

    // Handle single year input with validation
    const handleSingleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const inputValue = e.target.value;
        
        // Allow empty input
        if (inputValue === '') {
            setSingleYear(null);
            return;
        }
        
        // Allow any input while typing, but enforce range on blur
        setSingleYear(parseInt(inputValue));
    };

    // Handle range start year input with validation
    const handleRangeStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const inputValue = e.target.value;
        
        // Allow empty input
        if (inputValue === '') {
            setRangeYearStart(null);
            return;
        }
        
        // Allow any input while typing, but enforce range on blur
        setRangeYearStart(parseInt(inputValue));
    };

    // Handle range end year input with validation
    const handleRangeEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const inputValue = e.target.value;
        
        // Allow empty input
        if (inputValue === '') {
            setRangeYearEnd(null);
            return;
        }
        
        // Allow any input while typing, but enforce range on blur
        setRangeYearEnd(parseInt(inputValue));
    };

    // Handle method selection
    const handleMethodChange = (method: 'timeseries' | 'demographic' | 'cohort') => {
        setMethods({
            ...methods,
            [method]: !methods[method]
        });
    };
    const handleLocalDemographicDataChange = useCallback((data) => {
        console.log("Local demographic data updated:", data);
        setLocalDemographicData(data);
      }, []); 

    // Check if at least one method is selected
    const isMethodSelected = methods.timeseries || methods.demographic || methods.cohort;
    useEffect(() => {
        if (results && selectedMethod) {
          (window as any).selectedPopulationForecast = results[selectedMethod];
          console.log("Updated selectedPopulationForecast:", (window as any).selectedPopulationForecast);
        }
      }, [selectedMethod, results]);
      

    // Handle form submission - in a real app, you would make an API call here
    const handleSubmit = async () => {
        setLoading(true); 
        try {
            console.log("methods", methods);
            if(!isMethodSelected){
                setError('Please select at least one method');
                return;
            }
            
            let requests = [];
            
            if (methods.timeseries) {
                requests.push(
                    fetch('http://localhost:9000/api/basic/time_series/arthemitic/', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            "start_year": range_year_start,
                            "end_year": range_year_end,
                            "year": single_year,
                            "villages_props": villages_props,
                            "subdistrict_props": subDistricts_props,
                            "totalPopulation_props": totalPopulation_props                    
                        })
                    }).then(response => {
                        if (!response.ok) throw new Error(`Timeseries API error: ${response.status}`);
                        return response.json();
                    })
                );
            }
            
            
            if (methods.demographic) {
                requests.push(
                    fetch('http://localhost:9000/api/basic/time_series/demographic/', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            "start_year": range_year_start,
                            "end_year": range_year_end,
                            "year": single_year,
                            "villages_props": villages_props,
                            "subdistrict_props": subDistricts_props,
                            "totalPopulation_props": totalPopulation_props,
                            "demographic": localDemographicData ? {
                                "birthRate": localDemographicData.annualBirthRate === "" ? null : localDemographicData.annualBirthRate,
                                "deathRate": localDemographicData.annualDeathRate === "" ? null : localDemographicData.annualDeathRate,
                                "emigrationRate": localDemographicData.annualEmigrationRate === "" ? null : localDemographicData.annualEmigrationRate,
                                "immigrationRate": localDemographicData.annualImmigrationRate === "" ? null : localDemographicData.annualImmigrationRate
                            } : null
                        })
                    }).then(response => {
                        if (!response.ok) throw new Error(`Demographic API error: ${response.status}`);
                        return response.json();
                    })
                );
            }
            
            
            
            if (requests.length > 0) {
                try {
                    const responses = await Promise.all(requests);
            
                    let result: { [key: string]: any } = {}; // Initialize empty result with index signature
            
                    if (methods.timeseries) {
                        result = { ...result, ...responses[0] }; // Spread timeseries results
                    }
            
                    if (methods.demographic) {
                        result = { ...result, Demographic: responses.length > 1 ? responses[1].demographic : {} }; // Append Demographic
                    }
            
                    console.log("Final Merged Result:", result);
                    setResults(result);
            
                    // Determine the default method with the highest total population
                    let maxMethod = "";
                    let maxPopulation = -Infinity;
            
                    Object.keys(result).forEach((method) => {
                        const totalPop = Object.values(result[method]).reduce((sum: number, val: number) => sum + val, 0);
                        if (totalPop > maxPopulation) {
                            maxPopulation = totalPop;
                            maxMethod = method;
                        }
                    });
                    
                    const finalMethod = selectedMethod ? selectedMethod : maxMethod;
                    setSelectedMethodd(finalMethod);
                    console.log("Selected Method:", finalMethod);

                    (window as any).selectedPopulationForecast = result[finalMethod]; // For debugging
                    console.log("Selected Population Forecast:", (window as any).selectedPopulationForecast);
            
                } catch (error) {
                    console.error("Error fetching data:", error);
                }
                finally{
                    setLoading(false)
                }
            } else {
                console.warn("No method selected. Skipping API calls.");
            }
        } catch (error) {
            console.error("Error fetching data:", error);
            setError('Failed to fetch data. Please try again.');
        }
    };
   
    // Function to extract unique years from all models 
    const getYears = (data: any) => {
        if (!data) return [];
        const allYears = new Set<number>();

        Object.values(data).forEach((model: any) => {
            Object.keys(model).forEach((year) => {
                const yearNum = Number(year);
                 allYears.add(yearNum); // Exclude 2011
            });
        });

        return Array.from(allYears).sort((a, b) => a - b);
    };


    return (
        <div className="p-4 mt-5 bg-white rounded-lg shadow-md">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">Population Estimation and Forecasting</h1>
            
            <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-700 mb-3">Select Design Year</h2>
                <div className="bg-blue-50 p-4 mb-4 rounded-md text-sm text-blue-700">
                    Please use either a single year or a range of years, not both. Years must be between 2011 and 2099.
                </div>
            </div>

            {/* Year Input Options - All on a single line */}
            <div className="mb-4 p-4 rounded-md border border-gray-200">
                <h3 className="font-medium text-gray-700 mb-3">Select Year</h3>
                <div className="flex flex-wrap items-end gap-4">
                    {/* Single Year */}
                    <div className={`${inputMode === 'range' ? 'opacity-60' : ''}`}>
                        <label className="block text-gray-700 font-medium mb-2" htmlFor="single-year">
                            Single Year
                        </label>
                        <input 
                            id="single-year"
                            type="number" 
                            className={`w-32 border rounded-md px-3 py-2 focus:outline-none focus:ring-2 
                                   ${inputMode === 'range' ? 'bg-gray-200 cursor-not-allowed' : 'focus:ring-blue-500 border-gray-300'}`}
                            value={single_year === null ? '' : single_year} 
                            onChange={handleSingleYearChange}
                            placeholder="Year"
                            disabled={inputMode === 'range'}
                            min="2011"
                            max="2099"
                        />
                    </div>
                    
                    <div className="mx-4 text-gray-500 self-center">OR</div>
                    
                    {/* Range Start Year */}
                    <div className={`${inputMode === 'single' ? 'opacity-60' : ''}`}>
                        <label className="block text-gray-700 mb-2" htmlFor="range-start">
                            Start Year
                        </label>
                        <input 
                            id="range-start"
                            type="number" 
                            className={`w-32 border rounded-md px-3 py-2 focus:outline-none focus:ring-2 
                                      ${inputMode === 'single' ? 'bg-gray-200 cursor-not-allowed' : 'focus:ring-blue-500 border-gray-300'}`}
                            value={range_year_start === null ? '' : range_year_start} 
                            onChange={handleRangeStartChange}
                            placeholder="Start"
                            disabled={inputMode === 'single'}
                            min="2011"
                            max="2099"
                        />
                    </div>
                    
                    {/* Range End Year */}
                    <div className={`${inputMode === 'single' ? 'opacity-60' : ''}`}>
                        <label className="block text-gray-700 mb-2" htmlFor="range-end">
                            End Year
                        </label>
                        <input 
                            id="range-end"
                            type="number" 
                            className={`w-32 border rounded-md px-3 py-2 focus:outline-none focus:ring-2 
                                      ${inputMode === 'single' ? 'bg-gray-200 cursor-not-allowed' : 'focus:ring-blue-500 border-gray-300'}`}
                            value={range_year_end === null ? '' : range_year_end} 
                            onChange={handleRangeEndChange}
                            placeholder="End"
                            disabled={inputMode === 'single'}
                            min="2011"
                            max="2099"
                        />
                    </div>
                </div>
                {error && (
                    <div className="mt-3 text-red-500 text-sm">{error}</div>
                )}
            </div>

            {/* Method Selection */}
            <div className="mb-4 p-4 rounded-md border border-gray-200">
                <h3 className="font-medium text-gray-700 mb-3">Calculation Methods</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <label className="inline-flex items-center">
                        <input
                            type="checkbox"
                            className="form-checkbox h-5 w-5 text-blue-600"
                            checked={methods.timeseries}
                            onChange={() => handleMethodChange('timeseries')}
                        />
                        <span className="ml-2 text-gray-700">Time Series</span>
                    </label>
                    <label className="inline-flex items-center">
                        <input
                            type="checkbox"
                            className="form-checkbox h-5 w-5 text-blue-600"
                            checked={methods.demographic}
                            onChange={() => handleMethodChange('demographic')}
                        />
                        <span className="ml-2 text-gray-700">Demographic</span>
                    </label>
                    <label className="inline-flex items-center">
                        <input
                            type="checkbox"
                            className="form-checkbox h-5 w-5 text-blue-600"
                            checked={methods.cohort}
                            onChange={() => handleMethodChange('cohort')}
                        />
                        <span className="ml-2 text-gray-700">Cohort</span>
                    </label>
                </div>
                {!isMethodSelected && (
                    <div className="mt-2 text-red-500 text-sm">Please select at least one calculation method</div>
                )}
            </div>

            {/* TimeMethods Component - Show when timeseries is selected */}
            {methods.timeseries && (
                <div className="mb-4 p-4 rounded-md border border-gray-200">
                    <h3 className="font-medium text-gray-700 mb-3">Time Series Analysis</h3>
                    <TimeMethods />
                </div>
            )}
            {methods.demographic && (
                <div className="mb-4 p-4 rounded-md border border-gray-200">
                    <h3 className="font-medium text-gray-700 mb-3">Demographic Analysis</h3>
                    <DemographicPopulation 
                    onDataChange={handleLocalDemographicDataChange}
                    initialData={demographicData} // Use the props data, not the local state!
                    />
                </div>
                )} {/* Add DemographicMethods component here.}

            {/* Submit Button */}
            <div className="mt-6">
            <button 
    className={`bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 flex items-center justify-center gap-2`}
    disabled={
        loading || // Disable button when loading
        (inputMode === 'single' && (single_year === null || single_year < 2011 || single_year > 2099)) || 
        (inputMode === 'range' && (range_year_start === null || range_year_end === null || 
                                range_year_start < 2011 || range_year_start > 2099 ||
                                range_year_end < 2011 || range_year_end > 2099 ||
                                error !== null)) ||
        inputMode === null ||
        !isMethodSelected
    }
    onClick={handleSubmit}
>
    {loading ? (
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
    ) : (
        "Calculate"
    )}
</button>

            </div>

            {/* Results Table */}

          
            
             {/* Show Table */}
             {results && (
                <div className="mt-6">
                <h2 className="text-lg font-semibold mb-4">Population Data</h2>
            
                {/* Scrollable Table Container */}
                <div className="table-container overflow-x-auto border border-gray-300 rounded-lg shadow-md">
                    <table className="w-auto min-w-[500px] bg-white border-collapse table-auto">
                        <thead className="bg-gray-200">
                            <tr>
                                <th className="border px-4 py-2 w-24">Year</th>
                                {Object.keys(results).map((method) => (
                                    <th key={method} className="border px-4 py-2">
                                        <label className="flex items-center gap-2 justify-center">
                                            <input
                                                type="radio"
                                                name="selectedMethod"
                                                value={method}
                                                checked={selectedMethod === method}
                                                onChange={() => setSelectedMethodd(method)}
                                            />
                                            {method}
                                        </label>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {getYears(results).map((year) => (
                                <tr key={year} className="border-t">
                                    <td className="border px-4 py-2 font-semibold">{year}</td>
                                    {Object.keys(results).map((method) => (
                                        <td key={`${method}-${year}`} className="border px-4 py-2 text-center">
                                            {results[method][year] ?? "-"}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            
            
            )}

            {/* Show Chart */}
            {results && <PopulationChart results={results} />}
        
        </div>
    )
}

export default Population