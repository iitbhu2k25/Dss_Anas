'use client'
import React, { useEffect, useState } from "react"
import StatusBar from "./components/statusbar"
import LocationSelector from "./components/locations"
import Population from "./populations/population"
import Water_Demand from "./water_demand/page"
import Water_Supply from "./water_supply/page"
import Sewage from "./seawage/page"
import ExportReport from './populations/components/export';
import GeographicMap from "./components/GeographicMap"
import DrainLocationSelector from "./components/Drain_location"

interface SelectedLocationData {
  villages: {
    id: string;
    name: string;
    subDistrictId: string;
    population: number;
  }[];
  subDistricts: {
    id: string;
    name: string;
    districtId: string;
  }[];
  totalPopulation: number;
}

interface FeatureInfo {
  type: 'state' | 'district' | 'subdistrict' | 'village';
  code: string;
  properties?: {
    state_code?: string;
    district_c?: string;
  };
}

const Basic: React.FC = () => {
  const [selectedLocationData, setSelectedLocationData] = useState<SelectedLocationData | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [transitionDirection, setTransitionDirection] = useState<'forward' | 'backward'>('forward');
  const [skippedSteps, setSkippedSteps] = useState<number[]>([]);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [showSuccess, setShowSuccess] = useState<boolean>(false);
  const [selectedStateCode, setSelectedStateCode] = useState<string>('');
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>([]);
  const [mode, setMode] = useState<'admin' | 'drain'>('admin');

  const handleDistrictsChange = (districts: string[]): void => {
    console.log('Districts changed to:', districts);
    setSelectedDistricts(districts);
  };

  const handleModeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setMode(event.target.value as 'admin' | 'drain');
  };

  const handleLocationConfirm = (data: SelectedLocationData): void => {
    console.log('Received confirmed location data:', data);
    setSelectedLocationData(data);
  };

  const handleStateChange = (stateCode: string): void => {
    console.log('State changed to:', stateCode);
    setSelectedStateCode(stateCode);
    setSelectedDistricts([]);
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
    setSelectedStateCode('');
    setSelectedDistricts([]);
  };

  const handleMapFeatureClick = (feature: FeatureInfo) => {
    console.log('Map feature clicked in page.tsx:', feature);
    switch (feature.type) {
      case 'state':
        handleStateChange(feature.code);
        break;
      case 'district':
        handleDistrictsChange(
          selectedDistricts.includes(feature.code)
            ? selectedDistricts.filter(d => d !== feature.code)
            : [...selectedDistricts, feature.code]
        );
        if (feature.properties?.state_code && feature.properties.state_code !== selectedStateCode) {
          handleStateChange(feature.properties.state_code);
        }
        break;
      case 'subdistrict':
        if (feature.properties?.state_code && feature.properties.state_code !== selectedStateCode) {
          handleStateChange(feature.properties.state_code);
        }
        if (feature.properties?.district_c) {
          handleDistrictsChange(
            selectedDistricts.includes(feature.properties.district_c)
              ? selectedDistricts
              : [...selectedDistricts, feature.properties.district_c]
          );
        }
        break;
      case 'village':
        if (feature.properties?.state_code && feature.properties.state_code !== selectedStateCode) {
          handleStateChange(feature.properties.state_code);
        }
        if (feature.properties?.district_c) {
          handleDistrictsChange(
            selectedDistricts.includes(feature.properties.district_c)
              ? selectedDistricts
              : [...selectedDistricts, feature.properties.district_c]
          );
        }
        break;
    }
  };

  const handleFinish = () => {
    setCompletedSteps(prev => [...prev.filter(step => step !== 3), 3]);
    setShowSuccess(true);
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
    <div className="flex w-full min-h-screen relative">

{/* Radio Buttons for Mode Selection */}
<div className="absolute top-4 right-140 flex space-x-4 z-50 bg-white p-2 rounded-md shadow-md border border-gray-200">
          <label className="flex items-center text-sm font-medium text-gray-700">
            <input
              type="radio"
              value="admin"
              checked={mode === 'admin'}
              onChange={handleModeChange}
              className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500"
            />
            Admin
          </label>
          <label className="flex items-center text-sm font-medium text-gray-700">
            <input
              type="radio"
              value="drain"
              checked={mode === 'drain'}
              onChange={handleModeChange}
              className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500"
            />
            Drain
          </label>
        </div>

      <div className="w-64 border-r border-gray-200">
        <StatusBar
          currentStep={currentStep}
          onStepChange={handleStepChange}
          skippedSteps={skippedSteps}
          completedSteps={completedSteps}
        />
      </div>

        

      <div className="flex-1 relative">
      

        {/* Conditional Rendering Based on Mode */}
        {mode === 'drain' ? (
          <div className="flex w-full">
            <div className="w-2/3">
          <DrainLocationSelector />
          </div>
          <div className="w-1/3">
              <GeographicMap
                selectedState={selectedStateCode}
                selectedDistricts={selectedDistricts}
                onFeatureClick={handleMapFeatureClick}
              />
            </div>
            </div>

        ) : (
          <div className="flex w-full">
            <div className="w-2/3">
              <LocationSelector
                onConfirm={handleLocationConfirm}
                onReset={handleLocationReset}
                onStateChange={handleStateChange}
                onDistrictsChange={handleDistrictsChange}
                onFeatureClick={handleMapFeatureClick}
              />
            </div>
            <div className="w-1/3">
              <GeographicMap
                selectedState={selectedStateCode}
                selectedDistricts={selectedDistricts}
                onFeatureClick={handleMapFeatureClick}
              />
            </div>
            </div>
        )}

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
            <ExportReport projectName="Report Basic Module DSS" />
          </div>
        </div>

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