'use client'
import React, { useEffect, useState, useRef } from "react"
import dynamic from "next/dynamic";
import StatusBar from "./components/statusbar"
import LocationSelector from "./components/locations"
import DrainLocationSelector from "./components/drainlocations"
import Population from "./populations/population"
import Water_Demand from "./water_demand/page"
import Water_Supply from "./water_supply/page"
import Sewage from "./seawage/page"
import ExportReport from './populations/components/export';
import Map from "./components/map"
import DrainMap from "./components/drainmap" // New import for DrainMap

interface SelectedLocationData {
  villages: {
    id: number;
    name: string;
    subDistrictId: number;
    population: number;
  }[];
  subDistricts: {
    id: number;
    name: string;
    districtId: number;
  }[];
  totalPopulation: number;
}

interface SelectedRiverData {
  drains: {
    id: number;
    name: string;
    stretchId: number;
    flowRate: number;
  }[];
  totalFlowRate: number;
}

const Basic: React.FC = () => {
  const [selectedLocationData, setSelectedLocationData] = useState<SelectedLocationData | null>(null);
  const [selectedRiverData, setSelectedRiverData] = useState<SelectedRiverData | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [transitionDirection, setTransitionDirection] = useState<'forward' | 'backward'>('forward');
  const [skippedSteps, setSkippedSteps] = useState<number[]>([]);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [showSuccess, setShowSuccess] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'admin' | 'drain'>('admin'); // State for view toggle
  
  // Separate completed steps for admin and drain views
  const [adminCompletedSteps, setAdminCompletedSteps] = useState<number[]>([]);
  const [drainCompletedSteps, setDrainCompletedSteps] = useState<number[]>([]);
  
  // Separate skipped steps for admin and drain views
  const [adminSkippedSteps, setAdminSkippedSteps] = useState<number[]>([]);
  const [drainSkippedSteps, setDrainSkippedSteps] = useState<number[]>([]);
  
  // Separate current step for admin and drain views
  const [adminCurrentStep, setAdminCurrentStep] = useState<number>(0);
  const [drainCurrentStep, setDrainCurrentStep] = useState<number>(0);

  // State for LocationSelector
  const [selectedStateCode, setSelectedStateCode] = useState<string>('');
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>([]);
  const [selectedSubDistricts, setSelectedSubDistricts] = useState<string[]>([]);

  // State for RiverSelector
  const [selectedRiver, setSelectedRiver] = useState<string>('');
  const [selectedStretch, setSelectedStretch] = useState<string>('');
  const [selectedDrainIds, setSelectedDrainIds] = useState<string[]>([]);
  const [selectedDrains, setSelectedDrains] = useState<string[]>([]);
  // Refs for LocationSelector
  const stateRef = useRef<string>('');
  const districtsRef = useRef<string[]>([]);
  const subDistrictsRef = useRef<string[]>([]);

  // Refs for RiverSelector
  const riverRef = useRef<string>('');
  const stretchRef = useRef<string>('');
  const drainsRef = useRef<string[]>([]);

  // Sync refs with state for LocationSelector
  useEffect(() => {
    stateRef.current = selectedStateCode;
  }, [selectedStateCode]);

  useEffect(() => {
    districtsRef.current = [...selectedDistricts];
  }, [selectedDistricts]);

  useEffect(() => {
    subDistrictsRef.current = [...selectedSubDistricts];
  }, [selectedSubDistricts]);

  // Sync refs with state for RiverSelector
  useEffect(() => {
    riverRef.current = selectedRiver;
  }, [selectedRiver]);

  useEffect(() => {
    stretchRef.current = selectedStretch;
  }, [selectedStretch]);

  useEffect(() => {
    drainsRef.current = [...selectedDrains];
  }, [selectedDrains]);

  // Update current step based on view mode
  useEffect(() => {
    if (viewMode === 'admin') {
      setCurrentStep(adminCurrentStep);
      setCompletedSteps(adminCompletedSteps);
      setSkippedSteps(adminSkippedSteps);
    } else {
      setCurrentStep(drainCurrentStep);
      setCompletedSteps(drainCompletedSteps);
      setSkippedSteps(drainSkippedSteps);
    }
  }, [viewMode, adminCurrentStep, drainCurrentStep, adminCompletedSteps, drainCompletedSteps, adminSkippedSteps, drainSkippedSteps]);

  // Handle confirm for LocationSelector
  const handleLocationConfirm = (data: SelectedLocationData): void => {
    console.log('Received confirmed location data:', data);
    setSelectedLocationData(data);
    setSelectedRiverData(null); // Clear RiverSelector data
  };

  // Handle confirm for RiverSelector
  const handleRiverConfirm = (data: SelectedRiverData): void => {
    console.log('Received confirmed river data:', data);
    setSelectedRiverData(data);
    setSelectedLocationData(null); // Clear LocationSelector data
  };

  // Handle district selection for LocationSelector
  const handleDistrictsChange = (districts: string[]): void => {
    console.log('Districts changed to:', districts);
    if (JSON.stringify(districts) !== JSON.stringify(districtsRef.current)) {
      console.log('Resetting subdistrict selections');
      setSelectedSubDistricts([]);
      if (window.resetSubDistrictSelectionsInLocationSelector) {
        window.resetSubDistrictSelectionsInLocationSelector();
      }
    }
    setSelectedDistricts([...districts]);
  };

  // Handle subdistrict selection for LocationSelector
  const handleSubDistrictsChange = (subdistricts: string[]): void => {
    console.log('Sub-districts changed to:', subdistricts);
    setSelectedSubDistricts([...subdistricts]);
  };

  // Handle state selection for LocationSelector
  const handleStateChange = (stateCode: string): void => {
    console.log('State changed to:', stateCode);
    if (stateCode !== stateRef.current) {
      console.log('Resetting district and subdistrict selections');
      setSelectedDistricts([]);
      setSelectedSubDistricts([]);
      if (window.resetDistrictSelectionsInLocationSelector) {
        window.resetDistrictSelectionsInLocationSelector();
      }
      if (window.resetSubDistrictSelectionsInLocationSelector) {
        window.resetSubDistrictSelectionsInLocationSelector();
      }
    }
    setSelectedStateCode(stateCode);
  };

  // Handle river selection for RiverSelector
  const handleRiverChange = (riverId: string): void => {
    console.log('River changed to:', riverId);
    if (riverId !== riverRef.current) {
      console.log('Resetting stretch and drain selections');
      setSelectedStretch('');
      setSelectedDrains([]);
      if (window.resetStretchSelectionsInDrainLocationSelector) {
        window.resetStretchSelectionsInDrainLocationSelector();
      }
      if (window.resetDrainSelectionsInDrainLocationSelector) {
        window.resetDrainSelectionsInDrainLocationSelector();
      }
    }
    setSelectedRiver(riverId);
  };

  // Handle stretch selection for RiverSelector
  const handleStretchChange = (stretchId: string): void => {
    console.log('Stretch changed to:', stretchId);
    if (stretchId !== stretchRef.current) {
      console.log('Resetting drain selections');
      setSelectedDrains([]);
      if (window.resetDrainSelectionsInDrainLocationSelector) {
        window.resetDrainSelectionsInDrainLocationSelector();
      }
    }
    setSelectedStretch(stretchId);
  };

  // Handle drains selection for RiverSelector
  const handleDrainsChange = (drainIds: string[]) => {
    setSelectedDrainIds(drainIds);
    console.log("Selected drain IDs updated:", drainIds);
  };

  // Navigation handlers with view mode awareness
  const handleNext = () => {
    if (currentStep < 3) {
      if (viewMode === 'admin') {
        setAdminCompletedSteps(prev => [...prev.filter(step => step !== currentStep), currentStep]);
        setAdminSkippedSteps(prev => prev.filter(step => step !== currentStep));
        setAdminCurrentStep(prev => prev + 1);
      } else {
        setDrainCompletedSteps(prev => [...prev.filter(step => step !== currentStep), currentStep]);
        setDrainSkippedSteps(prev => prev.filter(step => step !== currentStep));
        setDrainCurrentStep(prev => prev + 1);
      }
      setTransitionDirection('forward');
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      if (viewMode === 'admin') {
        setAdminCurrentStep(prev => prev - 1);
      } else {
        setDrainCurrentStep(prev => prev - 1);
      }
      setTransitionDirection('backward');
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    if (currentStep > 0 && currentStep < 3) {
      if (viewMode === 'admin') {
        setAdminSkippedSteps(prev => [...prev.filter(step => step !== currentStep), currentStep]);
        setAdminCompletedSteps(prev => prev.filter(step => step !== currentStep));
        setAdminCurrentStep(prev => prev + 1);
      } else {
        setDrainSkippedSteps(prev => [...prev.filter(step => step !== currentStep), currentStep]);
        setDrainCompletedSteps(prev => prev.filter(step => step !== currentStep));
        setDrainCurrentStep(prev => prev + 1);
      }
      setTransitionDirection('forward');
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleStepChange = (newStep: number) => {
    if (newStep < currentStep) {
      if (viewMode === 'admin') {
        setAdminCurrentStep(newStep);
      } else {
        setDrainCurrentStep(newStep);
      }
      setTransitionDirection('backward');
      setCurrentStep(newStep);
    }
  };
 // Complete reset handler
  const handleReset = (): void => {
    console.log('FULL RESET triggered');
    setCurrentStep(0);
    setAdminCurrentStep(0);
    setDrainCurrentStep(0);
    setSkippedSteps([]);
    setAdminSkippedSteps([]);
    setDrainSkippedSteps([]);
    setCompletedSteps([]);
    setAdminCompletedSteps([]);
    setDrainCompletedSteps([]);
 
    // Reset LocationSelector data
    setSelectedLocationData(null);
    setSelectedStateCode('');
    setSelectedDistricts([]);
    setSelectedSubDistricts([]);
    stateRef.current = '';
    districtsRef.current = [];
    subDistrictsRef.current = [];

    // Reset RiverSelector data
    setSelectedRiverData(null);
    setSelectedRiver('');
    setSelectedStretch('');
    setSelectedDrains([]);
    riverRef.current = '';
    stretchRef.current = [];
    drainsRef.current = [];

    // Clear global variables
    (window as any).totalWaterSupply = undefined;
    (window as any).previousTotalWaterSupply = undefined;
    (window as any).selectedLocations = undefined;
    (window as any).selectedRiverData = undefined;

    // Reset view mode to admin
    setViewMode('admin');

    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  const handleFinish = () => {
    if (viewMode === 'admin') {
      setAdminCompletedSteps(prev => [...prev.filter(step => step !== 3), 3]);
    } else {
      setDrainCompletedSteps(prev => [...prev.filter(step => step !== 3), 3]);
    }
    setCompletedSteps(prev => [...prev.filter(step => step !== 3), 3]);
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
    }, 2000);
  };

  // Toggle view mode handler
  const handleViewModeChange = (mode: 'admin' | 'drain') => {
    setViewMode(mode);
  };

  // Reset steps when new data is confirmed
  useEffect(() => {
    if (selectedLocationData || selectedRiverData) {
      setCurrentStep(0);
      setAdminCurrentStep(0);
      setDrainCurrentStep(0);
      setSkippedSteps([]);
      setAdminSkippedSteps([]);
      setDrainSkippedSteps([]);
      setCompletedSteps([]);
      setAdminCompletedSteps([]);
      setDrainCompletedSteps([]);
      setShowSuccess(false);
    }
  }, [selectedLocationData, selectedRiverData]);

return (
  <div className="flex flex-col md:flex-row w-full min-h-0">
    <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-gray-200">
      <StatusBar
        currentStep={currentStep}
        onStepChange={handleStepChange}
        skippedSteps={skippedSteps}
        completedSteps={completedSteps}
        viewMode={viewMode}
      />
    </div>

    <div className="w-full relative flex flex-col">
      {/* Toggle Buttons - Moved Above Location Selectors */}
      <div className="flex justify-center mt-4 mb-6 px-4 z-10">
        <div className="inline-flex rounded-full bg-gray-100 p-1 shadow-md">
          <button
            className={`px-6 py-2 rounded-full text-sm font-semibold transition-all duration-300 ease-in-out flex items-center space-x-2 ${
              viewMode === 'admin'
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
            onClick={() => handleViewModeChange('admin')}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 14l9-5-9-5-9 5 9 5z"
              />
            </svg>
            <span>Admin</span>
          </button>
          <button
            className={`px-6 py-2 rounded-full text-sm font-semibold transition-all duration-300 ease-in-out flex items-center space-x-2 ${
              viewMode === 'drain'
                ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
            onClick={() => handleViewModeChange('drain')}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7 16l-4-4m0 0l4-4m-4 4h18"
              />
            </svg>
            <span>Drain</span>
          </button>
        </div>
      </div>

      {/* Selector and Map Layout */}
      <div className="flex w-full px-4">
        <div className="w-2/3 mt-3">
          {viewMode === 'admin' ? (
            <LocationSelector
              onConfirm={handleLocationConfirm}
              onReset={handleReset}
              onStateChange={handleStateChange}
              onDistrictsChange={handleDistrictsChange}
              onSubDistrictsChange={handleSubDistrictsChange}
            />
          ) : (
            <DrainLocationSelector
              onConfirm={handleRiverConfirm}
              onReset={handleReset}
              onRiverChange={handleRiverChange}
              onStretchChange={handleStretchChange}
              onDrainsChange={handleDrainsChange}
            />
          )}
        </div>
        <div className="w-1/2 ml-2 mb-5 rounded-md">
          {viewMode === 'admin' ? (
            <Map
              selectedState={selectedStateCode}
              selectedDistricts={selectedDistricts}
              selectedSubDistricts={selectedSubDistricts}
            />
          ) : (
            <div className="flex w-full  ml-2 mb-5 border border-blue ">
            <DrainMap
              selectedRiver={selectedRiver}
              selectedStretch={selectedStretch}
              selectedDrains={selectedDrainIds}
            />
            </div>
          )}
        </div>
      </div>

      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/30 animate-fade-in-out">
          <div className="bg-green-100 text-green-800 px-6 py-4 rounded-2xl shadow-xl border border-green-300 flex items-center space-x-3 max-w-sm w-full mx-4">
            <svg
              className="w-6 h-6 text-green-600 shrink-0"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm font-medium">
              All Calculation has been completed now you can download the report
            </span>
          </div>
        </div>
      )}

      {/* Step Content with view mode awareness */}
      <div className="transition-all duration-300 transform px-4">
        <div className={currentStep === 0 ? 'block' : 'hidden'}>
          {selectedLocationData && viewMode === 'admin' && (
            <Population
              villages_props={selectedLocationData.villages}
              subDistricts_props={selectedLocationData.subDistricts}
              totalPopulation_props={selectedLocationData.totalPopulation}
            />
          )}
          {selectedRiverData && viewMode === 'drain' && (
            <div className="p-4 bg-gray-100 rounded-lg shadow-md">
              <h3 className="text-lg font-medium text-gray-800 mb-2">Drain Analysis</h3>
              <p className="text-sm text-gray-700">
                Total Flow Rate: {selectedRiverData.totalFlowRate.toLocaleString()} m³/s
              </p>
              <p className="text-sm text-gray-700">
                Selected Drains: {selectedRiverData.drains.map(d => d.name).join(', ')}
              </p>
            </div>
          )}
        </div>

        <div className={currentStep === 1 ? 'block' : 'hidden'}>
          {viewMode === 'admin' && <Water_Demand />}
          {viewMode === 'drain' && (
            <div className="p-4 bg-gray-100 rounded-lg shadow-md">
              <h3 className="text-lg font-medium text-gray-800 mb-2">Drain Water Demand</h3>
              <p className="text-sm text-gray-700">
                Placeholder for drain-specific water demand calculations.
              </p>
            </div>
          )}
        </div>

        <div className={currentStep === 2 ? 'block' : 'hidden'}>
          {viewMode === 'admin' && <Water_Supply />}
          {viewMode === 'drain' && (
            <div className="p-4 bg-gray-100 rounded-lg shadow-md">
              <h3 className="text-lg font-medium text-gray-800 mb-2">Drain Water Supply</h3>
              <p className="text-sm text-gray-700">
                Placeholder for drain-specific water supply calculations.
              </p>
            </div>
          )}
        </div>

        <div className={currentStep === 3 ? 'block' : 'hidden'}>
          {viewMode === 'admin' && <Sewage />}
          {viewMode === 'drain' && (
            <div className="p-4 bg-gray-100 rounded-lg shadow-md">
              <h3 className="text-lg font-medium text-gray-800 mb-2">Drain Sewage</h3>
              <p className="text-sm text-gray-700">
                Placeholder for drain-specific sewage calculations.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation buttons */}
      {((selectedLocationData && viewMode === 'admin') || (selectedRiverData && viewMode === 'drain')) && (
        <div className="mt-6 mb-6 mx-4 border border-gray-300 rounded-xl shadow-md p-4 hover:shadow-lg transition-shadow duration-300">
          <div className="flex justify-between items-center">
            <div className="flex space-x-4">
              <button
                className={`${
                  currentStep === 0 || currentStep === 3
                    ? 'bg-gray-600 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                } text-white font-medium py-2 px-4 rounded-md transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50`}
                disabled={currentStep === 0 || currentStep === 3}
                onClick={handleSkip}
              >
                Skip
              </button>

              {currentStep > 0 && (
                <button
                  className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-md transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50"
                  onClick={handlePrevious}
                >
                  Previous
                </button>
              )}
            </div>

            <button
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
              onClick={currentStep === 3 ? handleFinish : handleNext}
              disabled={currentStep === 3 && completedSteps.includes(3)}
            >
              {currentStep === 3 ? 'Finish' : 'Save and Next'}
            </button>
          </div>
        </div>
      )}
    </div>
  </div>
)
}

export default Basic