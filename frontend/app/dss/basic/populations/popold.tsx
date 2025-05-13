'use client'
import React, { useState, useEffect, useCallback } from "react"

import TimeMethods from "./components/timeseries";
import DemographicPopulation, { DemographicData } from "./components/demographic";
import Cohort from "./components/cohort"; // Import the Cohort component
import dynamic from "next/dynamic";
import { Info } from "lucide-react";

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

interface CohortData {
    year: number;
    data: {
        [ageGroup: string]: {
            male: number;
            female: number;
            total: number;
        };
    };
}

interface PopulationProps {
    villages_props: Village[];
    subDistricts_props: SubDistrict[];
    totalPopulation_props: number;
    demographicData?: DemographicData; // New prop to receive demographic data
    state_props?: { id: string; name: string }; // Added for cohort API
    district_props?: { id: string; name: string }; // Added for cohort API
}

const Population: React.FC<PopulationProps> = ({
    villages_props,
    subDistricts_props,
    totalPopulation_props,
    demographicData,
    state_props,
    district_props
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
    const [cohortData, setCohortData] = useState<CohortData[] | null>(null); // New state for cohort data
    const [cohortPopulationData, setCohortPopulationData] = useState<{ [year: string]: number } | null>(null); // New state for cohort population data
    const [selectedMethod, setSelectedMethodd] = useState<string>("");
    const [localDemographicData, setLocalDemographicData] = useState<DemographicData>(demographicData || {
        annualBirthRate: "",
        annualDeathRate: "",
        annualEmigrationRate: "",
        annualImmigrationRate: ""
    });

    // Flag to track if cohort request is pending
    const [cohortRequestPending, setCohortRequestPending] = useState(false);

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

    // Function to extract total population from cohort data
    const extractCohortPopulation = (cohortDataArray: CohortData[]) => {
        if (!cohortDataArray || cohortDataArray.length === 0) return null;

        const populationByYear: { [year: string]: number } = {};

        cohortDataArray.forEach(cohortItem => {
            let totalPop = 0;

            // Sum up all age groups for this year
            Object.values(cohortItem.data).forEach(ageGroup => {
                totalPop += ageGroup.total;
            });

            populationByYear[cohortItem.year.toString()] = totalPop;
        });

        return populationByYear;
    };

    //////////////////////////

    ////////////This api call for special case of 2025 population and save window.selectedPopulationMethod and used in sewage drain basis calculation
    // This function will make a separate API call to always get the 2025 population based on the selected method
    useEffect(() => {
        // Only proceed if we have a selected method
        if (selectedMethod) {
            console.log("Making API call for method:", selectedMethod);

            // Determine which API endpoint to use based on the selected method
            let apiEndpoint = '';
            let requestBody = {};

            // Set up the appropriate API endpoint and request body based on the selected method
            if (selectedMethod.toLowerCase().includes('demographic')) {
                apiEndpoint = 'http://localhost:9000/api/basic/time_series/demographic/';

                requestBody = {
                    "start_year": null,
                    "end_year": null,
                    "year": 2025,
                    "villages_props": villages_props,
                    "subdistrict_props": subDistricts_props,
                    "totalPopulation_props": totalPopulation_props,
                    "demographic": localDemographicData ? {
                        "birthRate": localDemographicData.annualBirthRate === "" ? null : localDemographicData.annualBirthRate,
                        "deathRate": localDemographicData.annualDeathRate === "" ? null : localDemographicData.annualDeathRate,
                        "emigrationRate": localDemographicData.annualEmigrationRate === "" ? null : localDemographicData.annualEmigrationRate,
                        "immigrationRate": localDemographicData.annualImmigrationRate === "" ? null : localDemographicData.annualImmigrationRate
                    } : null
                };
            } else if (selectedMethod.toLowerCase().includes('cohort')) {
                // Handle cohort method for 2025
                apiEndpoint = 'http://localhost:9000/api/basic/cohort/';

                requestBody = {
                    "start_year": null,
                    "end_year": null,
                    "year": 2025,
                    "state_props": state_props,
                    "district_props": district_props,
                    "subdistrict_props": subDistricts_props.length > 0 ? {
                        id: subDistricts_props[0].id.toString(),
                        name: subDistricts_props[0].name
                    } : undefined,
                    "villages_props": villages_props.map(village => ({
                        id: village.id.toString(),
                        name: village.name,
                        subDistrictId: village.subDistrictId.toString(),
                        subDistrictName: subDistricts_props.find(sd => sd.id === village.subDistrictId)?.name || "",
                        districtName: district_props?.name || ""
                    }))
                };
            } else {
                // For all non-demographic methods
                apiEndpoint = 'http://localhost:9000/api/basic/time_series/arthemitic/';

                requestBody = {
                    "start_year": null,
                    "end_year": null,
                    "year": 2025,
                    "method": selectedMethod.toLowerCase().includes('exponential') ? "exponential" : undefined,
                    "villages_props": villages_props,
                    "subdistrict_props": subDistricts_props,
                    "totalPopulation_props": totalPopulation_props
                };
            }

            console.log("Selected API endpoint:", apiEndpoint);
            console.log("Request body:", requestBody);

            // Make the API call
            if (apiEndpoint) {
                fetch(apiEndpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestBody)
                })
                    .then(response => {
                        if (!response.ok) throw new Error(`API error: ${response.status}`);
                        return response.json();
                    })
                    .then(result => {
                        console.log("API Response for 2025:", result);

                        // Clear previous values
                        window.population2025 = null;
                        window.selectedPopulationForecast2025 = null;

                        // Handle cohort response
                        if (selectedMethod.toLowerCase().includes('cohort')) {
                            if (result.cohort) {
                                let totalPop = 0;
                                // Sum up all age groups for this year
                                Object.values(result.cohort.data).forEach((ageGroup: any) => {
                                    totalPop += ageGroup.total;
                                });

                                window.population2025 = totalPop;
                                window.selectedPopulationForecast2025 = totalPop;
                                window.selectedMethod = "Cohort";
                                console.log("2025 Cohort Population:", window.population2025);
                            }
                        }
                        // Handle demographic response differently
                        else if (selectedMethod.toLowerCase().includes('demographic')) {
                            // For demographic, we need to navigate the specific structure
                            // Find the Demographic key in results
                            if (result.Demographic) {
                                window.population2025 = result.Demographic['2025'];
                                window.selectedPopulationForecast2025 = result.Demographic['2025'];
                                window.selectedMethod = "Demographic";
                                console.log("2025 Demographic Population:", window.population2025);
                            }
                            // If the demographic data is returned directly with the method name
                            else if (result[selectedMethod] && result[selectedMethod]['2025']) {
                                window.population2025 = result[selectedMethod]['2025'];
                                window.selectedPopulationForecast2025 = result[selectedMethod]['2025'];
                                window.selectedMethod = selectedMethod;
                                console.log("2025 Population for", selectedMethod, ":", window.population2025);
                            }
                            // Search through all keys for demographic data
                            else {
                                const demographicKeys = Object.keys(result).filter(key =>
                                    key.toLowerCase().includes('demographic'));

                                if (demographicKeys.length > 0) {
                                    const key = demographicKeys[0];
                                    if (result[key] && result[key]['2025']) {
                                        window.population2025 = result[key]['2025'];
                                        window.selectedPopulationForecast2025 = result[key]['2025'];
                                        window.selectedMethod = selectedMethod;
                                        console.log("Found 2025 Demographic Population:", window.population2025);
                                    }
                                } else {
                                    // Last resort: search all objects in the result for 2025 data
                                    for (const key in result) {
                                        if (typeof result[key] === 'object') {
                                            if (result[key]['2025']) {
                                                window.population2025 = result[key]['2025'];
                                                window.selectedPopulationForecast2025 = result[key]['2025'];
                                                window.selectedMethod = selectedMethod;
                                                console.log("Found 2025 Population in", key, ":", window.population2025);
                                                break;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        // For non-demographic methods
                        else {
                            // Extract the 2025 population for the specifically selected method
                            if (result[selectedMethod] && result[selectedMethod]['2025']) {
                                window.population2025 = result[selectedMethod]['2025'];
                                window.selectedPopulationForecast2025 = result[selectedMethod]['2025'];
                                window.selectedMethod = selectedMethod;
                                console.log("2025 Population for", selectedMethod, ":", window.population2025);
                            } else {
                                console.warn("2025 population data not found for method:", selectedMethod);
                                console.log("Available methods in result:", Object.keys(result));

                                // Try to find the data in any available format in the response
                                let found = false;

                                // Check if the selected method exists in the results but with a different structure
                                if (result[selectedMethod] && typeof result[selectedMethod] === 'object') {
                                    for (const yearKey in result[selectedMethod]) {
                                        if (yearKey === '2025' || parseInt(yearKey) === 2025) {
                                            window.population2025 = result[selectedMethod][yearKey];
                                            window.selectedPopulationForecast2025 = result[selectedMethod][yearKey];
                                            window.selectedMethod = selectedMethod;
                                            console.log("Found 2025 Population for", selectedMethod, ":", window.population2025);
                                            found = true;
                                            break;
                                        }
                                    }
                                }

                                // If still not found, check for other keys in the result that might match
                                if (!found) {
                                    // Look for method-specific keys
                                    const methodName = selectedMethod.toLowerCase();
                                    const possibleKeys = Object.keys(result).filter(key =>
                                        key.toLowerCase().includes(methodName));

                                    if (possibleKeys.length > 0) {
                                        const key = possibleKeys[0];
                                        if (result[key] && result[key]['2025']) {
                                            window.population2025 = result[key]['2025'];
                                            window.selectedPopulationForecast2025 = result[key]['2025'];
                                            window.selectedMethod = selectedMethod;
                                            console.log("Found 2025 Population in matching key:", window.population2025);
                                            found = true;
                                        }
                                    }
                                }

                                // If we still haven't found it, log the full response for debugging
                                if (!found) {
                                    console.log("Full response:", JSON.stringify(result, null, 2));
                                }
                            }
                        }
                    })
                    .catch(error => {
                        console.error("Error fetching 2025 population:", error);
                    });
            }
        }
    }, [selectedMethod, localDemographicData]);
    ///end of special case 2025 
    ///////////////////////////////////

    // Process cohort data and update state
    const processCohortData = async (cohortApiRequests) => {
        try {
            const yearResponses = await Promise.all(cohortApiRequests);
            // Process each year's response
            const allCohortData: CohortData[] = [];

            for (const yearResponse of yearResponses) {
                const { year, data } = yearResponse;
                const responseData = await data;

                if (responseData.cohort) {
                    allCohortData.push(responseData.cohort);
                }
            }

            // Sort cohort data by year
            allCohortData.sort((a, b) => a.year - b.year);

            // Update state with all cohort data
            setCohortData(allCohortData);

            // Extract total population from cohort data
            const cohortPopulation = extractCohortPopulation(allCohortData);
            setCohortPopulationData(cohortPopulation);

            // Add cohort population data to results
            if (cohortPopulation && Object.keys(cohortPopulation).length > 0) {
                setResults(prevResults => {
                    if (prevResults) {
                        return {
                            ...prevResults,
                            "Cohort": cohortPopulation
                        };
                    }
                    return prevResults;
                });
            }

            // Reset cohort request pending flag
            setCohortRequestPending(false);
        } catch (error) {
            console.error("Error processing cohort data:", error);
            setCohortRequestPending(false);
        }
    };

    // Handle form submission - in a real app, you would make an API call here
    const handleSubmit = async () => {
        setLoading(true);
        try {
            console.log("methods", methods);
            if (!isMethodSelected) {
                setError('Please select at least one method');
                setLoading(false);
                return;
            }

            let requests = [];
            let requestTypes = []; // Track which request is which type

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
                requestTypes.push('timeseries');
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
                requestTypes.push('demographic');
            }

            // Updated cohort API request handling for range of years
            if (methods.cohort) {
                // Set cohort request as pending to prevent double submissions
                setCohortRequestPending(true);

                const cohortYears = [];

                // If single year is specified, use it
                if (single_year !== null) {
                    cohortYears.push(single_year);
                }
                // If range years are specified, create an array with all years in the range
                else if (range_year_start !== null && range_year_end !== null) {
                    // Create an array with all years in the range (inclusive)
                    for (let year = range_year_start; year <= range_year_end; year++) {
                        cohortYears.push(year);
                    }
                }
                // Only use default if neither single nor range years are specified
                else {
                    cohortYears.push(2036);
                }

                // Reset cohort data
                setCohortData(null);
                const cohortApiRequests = [];

                // Create multiple requests for each year
                cohortYears.forEach(year => {
                    cohortApiRequests.push(
                        fetch('http://localhost:9000/api/basic/cohort/', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                "start_year": null,
                                "end_year": null,
                                "year": year,
                                "state_props": state_props,
                                "district_props": district_props,
                                "subdistrict_props": subDistricts_props.length > 0 ? {
                                    id: subDistricts_props[0].id.toString(),
                                    name: subDistricts_props[0].name
                                } : undefined,
                                "villages_props": villages_props.map(village => ({
                                    id: village.id.toString(),
                                    name: village.name,
                                    subDistrictId: village.subDistrictId.toString(),
                                    subDistrictName: subDistricts_props.find(sd => sd.id === village.subDistrictId)?.name || "",
                                    districtName: district_props?.name || ""
                                }))
                            })
                        }).then(response => {
                            if (!response.ok) throw new Error(`Cohort API error: ${response.status}`);
                            return { year, data: response.json() };
                        })
                    );
                });

                // Process all cohort API requests separately
                if (cohortApiRequests.length > 0) {
                    // Start processing cohort data - this is now separated into its own function
                    processCohortData(cohortApiRequests);
                }
            }

            if (requests.length > 0) {
                try {
                    const responses = await Promise.all(requests);

                    let result: { [key: string]: any } = {}; // Initialize empty result with index signature

                    // Process each response according to its request type
                    responses.forEach((response, index) => {
                        const requestType = requestTypes[index];

                        if (requestType === 'timeseries') {
                            // Spread timeseries results
                            result = { ...result, ...response };
                        }
                        else if (requestType === 'demographic') {
                            // For demographic data, properly add it to the result object
                            if (response.Demographic) {
                                result.Demographic = response.Demographic;
                            } else if (response.demographic) {
                                result.Demographic = response.demographic;
                            }

                            // If demographic response also contains population data
                            if (response.population) {
                                result = { ...result, ...response.population };
                            }

                            // If the demographic endpoint returns population forecasts directly
                            const populationKeys = Object.keys(response).filter(key =>
                                key !== 'demographic' && key !== 'Demographic' && typeof response[key] === 'object');

                            populationKeys.forEach(key => {
                                result[key] = response[key];
                            });
                        }
                    });

                    // Add cohort data if available
                    if (cohortPopulationData) {
                        result["Cohort"] = cohortPopulationData;
                    }

                    console.log("Final Merged Result:", result);
                    setResults(result);

                    // Determine the default method with the highest total population
                    let maxMethod = "";
                    let maxPopulation = -Infinity;

                    Object.keys(result).forEach((method) => {
                        // We'll include Demographic in the methods selection - change from original code
                        if (method === 'Demographic' && typeof result[method] === 'object') {
                            const totalPop = Object.values(result[method]).reduce((sum: number, val: number) => sum + val, 0);
                            if (totalPop > maxPopulation) {
                                maxPopulation = totalPop;
                                maxMethod = method;
                            }
                            return; // Continue to next method after processing Demographic
                        }

                        const methodData = result[method];
                        // Check if method data is an object with population values
                        if (methodData && typeof methodData === 'object') {
                            const totalPop = Object.values(methodData).reduce((sum: number, val: number) => sum + val, 0);
                            if (totalPop > maxPopulation) {
                                maxPopulation = totalPop;
                                maxMethod = method;
                            }
                        }
                    });

                    // If no population method was found but we have demographic data, use a fallback
                    if (maxMethod === "" && result.Demographic) {
                        maxMethod = "Demographic";
                    }

                    const finalMethod = selectedMethod ? selectedMethod : maxMethod;
                    setSelectedMethodd(finalMethod);
                    console.log("Selected Method:", finalMethod);

                    (window as any).selectedPopulationForecast = result[finalMethod]; // For debugging
                    console.log("Selected Population Forecast:", (window as any).selectedPopulationForecast);

                } catch (error) {
                    console.error("Error fetching data:", error);
                    setError('Failed to fetch data. Please try again.');
                }
                finally {
                    // Only set loading to false if cohort requests are not pending
                    if (!methods.cohort || !cohortRequestPending) {
                        setLoading(false);
                    }
                }
            } else if (methods.cohort) {
                // If only cohort method is selected, loading state will be managed by the cohort processing
            } else {
                console.warn("No method selected. Skipping API calls.");
                setLoading(false);
            }
        } catch (error) {
            console.error("Error fetching data:", error);
            setError('Failed to fetch data. Please try again.');
            setLoading(false);
        }
    };

    // Function to extract unique years from all models 
    const getYears = (data: any) => {
        if (!data) return [];
        const allYears = new Set<number>();

        Object.keys(data).forEach((modelName) => {
            const model = data[modelName];
            if (modelName !== 'Demographic' && typeof model === 'object') {
                Object.keys(model).forEach((year) => {
                    const yearNum = Number(year);
                    allYears.add(yearNum); // Exclude 2011
                });
            } else if (modelName === 'Demographic' && typeof model === 'object') {
                // Also include years from Demographic data
                Object.keys(model).forEach((year) => {
                    const yearNum = Number(year);
                    allYears.add(yearNum);
                });
            }
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
                <h3 className="font-medium text-gray-700 mb-3">Select Design Year</h3>
                <div className="flex flex-wrap items-end gap-4">
                    {/* Single Year */}
                    <div className={`${inputMode === 'range' ? 'opacity-60' : ''}`}>
                        <label className="block text-gray-700 font-medium mb-2" htmlFor="single-year">
                            Initial Year
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
                            Intermediate Year
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
                            Ultimate Year
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

                        <label className="block text-sm font-medium flex items-center">
                            <span className="ml-2 text-gray-700">Cohort</span>
                            <div className="relative ml-1 group">
                                <span className="flex items-center justify-center h-4 w-4 text-xs bg-red-500 text-white rounded-full cursor-help">i</span>
                                <div className="absolute z-10 hidden group-hover:block w-64  text-red text-xs rounded p-0 -mt-12 ml-6">
                                    Cohort Data only available for a 2011 to 2035 till now and if you go beyond that range then it will shown zero (0) or NaNa
                                </div>
                            </div>
                        </label>
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
            )}

            {/* Submit Button */}
            <div className="mt-6">
                <button
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 flex items-center justify-center gap-2"
                    disabled={
                        loading || // Disable button when loading
                        cohortRequestPending || // Also disable when cohort request is pending
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
                    {loading || cohortRequestPending ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                        "Calculate"
                    )}
                </button>
            </div>

            {/* Results Table */}

            {/* Show Table */}
            {results && (
                <div className="mt-8 max-w-4xl">
                    <h2 className="text-3xl font-bold text-blue-800 mb-6">Population Data</h2>

                    {/* Scrollable Table Container */}
                    <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-lg bg-white">
                        <div className="max-h-96 overflow-y-auto">
                            <table className="w-full min-w-[600px] border-collapse">
                                <thead className="sticky top-0 z-10 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700">
                                    <tr>
                                        <th className="border-b px-6 py-4 text-left font-semibold text-sm w-28">Year</th>
                                        {Object.keys(results).map(
                                            (method) => (
                                                <th
                                                    key={method}
                                                    className="border-b px-6 py-4 text-center font-semibold text-sm"
                                                >
                                                    {method}
                                                </th>
                                            )
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {getYears(results).map((year, index) => (
                                        <tr
                                            key={year}
                                            className={`border-b hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-gray-50/50' : 'bg-white'
                                                }`}
                                        >
                                            <td className="border-b px-6 py-4 font-medium text-gray-800">{year}</td>
                                            {Object.keys(results).map(
                                                (method) => (
                                                    <td
                                                        key={`${method}-${year}`}
                                                        className="border-b px-6 py-4 text-center text-gray-600"
                                                    >
                                                        {method === 'Demographic' ?
                                                            results[method][year] ?? '-' :
                                                            results[method][year] ?? '-'}
                                                    </td>
                                                )
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Radio Buttons Below Table */}
                    <div className="mt-6 bg-gray-50 p-6 rounded-xl shadow-sm border border-gray-200">
                        <div className="flex items-center mb-4 space-x-2">
                            <h3 className="text-lg font-semibold text-gray-800">Select a Method</h3>

                            {/* Info Icon with Tooltip */}
                            <div className="relative group">
                                <Info className="w-5 h-5 text-blue-600 cursor-pointer" />

                                <div className="absolute left-1/2 -translate-x-1/2 top-full mb-10 -mt-11 ml-50 w-max max-w-xs text-black text-sm rounded-lg shadow-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-all duration-300 ease-in-out z-10 pointer-events-none">
                                    This method's data will be used in further analysis.
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-6">
                            {Object.keys(results).map((method) => (
                                <label
                                    key={method}
                                    className="flex items-center gap-2 cursor-pointer group"
                                >
                                    <input
                                        type="radio"
                                        name="selectedMethod"
                                        value={method}
                                        checked={selectedMethod === method}
                                        onChange={() => {
                                            setSelectedMethodd(method);
                                            window.selectedPopulationMethod = method;
                                        }}
                                        className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 transition"
                                    />
                                    <span className="text-gray-700 font-medium group-hover:text-blue-600 transition">
                                        {method}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Show Cohort Data Tables */}
            {cohortData && cohortData.length > 0 && <Cohort cohortData={cohortData} />}

            {/* Show Chart */}
            {results && <PopulationChart results={results} />}

        </div>
    )
}

export default Population