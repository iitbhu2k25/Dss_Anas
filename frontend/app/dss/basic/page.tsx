'use client'
import React, { useEffect, useState } from "react"
import dynamic from "next/dynamic";
import StatusBar from "./components/statusbar"
import LocationSelector from "./components/locations"
import Population from "./populations/population"
import Water_Demand from "./water_demand/page"
import Water_Supply from "./water_supply/page"
import Sewage from "./seawage/page"
import ExportReport from './populations/components/export';
import Map from "./components/map"


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

const Basic: React.FC = () => {
  const [selectedLocationData, setSelectedLocationData] = useState<SelectedLocationData | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [transitionDirection, setTransitionDirection] = useState<'forward' | 'backward'>('forward');
  const [skippedSteps, setSkippedSteps] = useState<number[]>([]);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [showSuccess, setShowSuccess] = useState<boolean>(false);
  // Add new state for selected state code
  const [selectedStateCode, setSelectedStateCode] = useState<string>('');
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>([]);
  const [selectedSubDistricts, setSelectedSubDistricts] = useState<string[]>([]);

  // Add a handler for district selection
  const handleDistrictsChange = (districts: string[]): void => {
    console.log('Districts changed to:', districts);
    setSelectedDistricts(districts);
  };
  const handleSubDistrictsChange = (subdistricts: string[]): void => {
    console.log('Sub-districts changed to:', subdistricts);
    setSelectedSubDistricts(subdistricts);
  };


  const handleLocationConfirm = (data: SelectedLocationData): void => {
    console.log('Received confirmed location data:', data);
    setSelectedLocationData(data);
  };

  // Add new handler for state changes
  const handleStateChange = (stateCode: string): void => {
    console.log('State changed to:', stateCode);
    setSelectedStateCode(stateCode);
  };

  const handleNext = () => {
    if (currentStep < 3) {
      setCompletedSteps(prev => [...prev.filter(step => step !== currentStep), currentStep]);
      setSkippedSteps(prev => prev.filter(step => step !== currentStep));
      setTransitionDirection('forward');
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setTransitionDirection('backward');
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    if (currentStep > 0 && currentStep < 3) {
      setSkippedSteps(prev => [...prev.filter(step => step !== currentStep), currentStep]);
      setCompletedSteps(prev => prev.filter(step => step !== currentStep));
      setTransitionDirection('forward');
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleStepChange = (newStep: number) => {
    if (newStep < currentStep) {
      setTransitionDirection('backward');
      setCurrentStep(newStep);
    }
  };

  const handleLocationReset = (): void => {
    setCurrentStep(0);
    setSkippedSteps([]);
    setCompletedSteps([]);
    setSelectedLocationData(null);
    setShowSuccess(false);
    // Reset selected state code
    setSelectedStateCode('');
    setSelectedDistricts([]); // Add this line
    setSelectedSubDistricts([]); // Add this line
  };

  const handleFinish = () => {
    setCompletedSteps(prev => [...prev.filter(step => step !== 3), 3]);
    setShowSuccess(true);

    // Hide success message after 3 seconds
    setTimeout(() => {
      setShowSuccess(false);
    }, 2000);
  };

  useEffect(() => {
    if (selectedLocationData) {
      setCurrentStep(0);
      setSkippedSteps([]);
      setCompletedSteps([]);
      setShowSuccess(false);
    }
  }, [selectedLocationData]);

  return (
    <div className="flex flex-col md:flex-row w-full min-h-0">
      <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-gray-200">
        <StatusBar
          currentStep={currentStep}
          onStepChange={handleStepChange}
          skippedSteps={skippedSteps}
          completedSteps={completedSteps}
        />
      </div>

      <div className="w-full relative">
      <div className="absolute top-4 right-4">

        </div>

        {/* Modified layout for LocationSelector and Map side by side */}
        <div className="flex w-full">
          {/* Left side - Location Selector (half width) */}
          <div className="w-2/3 mt-3 ml-4">
            <LocationSelector
              onConfirm={handleLocationConfirm}
              onReset={handleLocationReset}
              onStateChange={handleStateChange} // Add the new prop
              onDistrictsChange={handleDistrictsChange} // Add this prop
              onSubDistrictsChange={handleSubDistrictsChange} // Add this line
            />
          </div>

          {/* Right side - Map (half width) */}
          <div className="w-1/2 mt-3 mr-6">
            <Map
              selectedState={selectedStateCode}
              selectedDistricts={selectedDistricts} // Add this prop
              selectedSubDistricts={selectedSubDistricts} // Add this line
            />
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
              <span className="text-sm font-medium">All Calculation has been completed now you can download the report</span>
            </div>
          </div>
        )}

        {/* Step Content - keep all mounted */}
        <div className="transition-all duration-300 transform">
          <div className={currentStep === 0 ? 'block' : 'hidden'}>
            {selectedLocationData && (
              <Population
                villages_props={selectedLocationData.villages}
                subDistricts_props={selectedLocationData.subDistricts}
                totalPopulation_props={selectedLocationData.totalPopulation}
              />
            )}
          </div>

          <div className={currentStep === 1 ? 'block' : 'hidden'}>
            <Water_Demand />
          </div>

          <div className={currentStep === 2 ? 'block' : 'hidden'}>
            <Water_Supply />
          </div>

          <div className={currentStep === 3 ? 'block' : 'hidden'}>
            <Sewage />
            {/* <ExportReport projectName="Report Basic Module DSS" /> */}
          </div>
        </div>

        {/* Navigation buttons */}
        {selectedLocationData && (
          <div className="mt-6 flex justify-between">
            <div className="flex space-x-4">
              <button
                className={`${currentStep === 0 || currentStep === 3 ? "bg-gray-600 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"} text-white font-medium py-2 px-4 rounded-md transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50`}
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
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 mr-20 rounded-md transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
              onClick={currentStep === 3 ? handleFinish : handleNext}
              disabled={currentStep === 3 && completedSteps.includes(3)}
            >
              {currentStep === 3 ? "Finish" : "Save and Next"}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default Basic