'use client'
import React, { useEffect, useState } from "react"
import StatusBar from "./components/statusbar"
import LocationSelector from "./components/locations"
import Population from "./populations/population"
import Water_Demand from "./water_demand/page"
import Water_Supply from "./water_supply/page"
import Sewage from "./seawage/page"

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

  const handleLocationConfirm = (data: SelectedLocationData): void => {
    console.log('Received confirmed location data:', data);
    setSelectedLocationData(data);
  };

  const handleNext = () => {
    if (currentStep < 3) {
      setCompletedSteps(prev => [...prev.filter(step => step !== currentStep), currentStep]);
      setSkippedSteps(prev => prev.filter(step => step !== currentStep));
      setTransitionDirection('forward');
      setCurrentStep(prev => prev + 1);
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

  // Add a new handler for location reset
  const handleLocationReset = (): void => {
    setCurrentStep(0);
    setSkippedSteps([]);
    setCompletedSteps([]);
    setSelectedLocationData(null);
  };

  useEffect(() => {
    if (selectedLocationData) {
      setCurrentStep(0);
      setSkippedSteps([]);
      setCompletedSteps([]);
    }
  }, [selectedLocationData]);

  return (
    <div className="flex w-full min-h-0">
      <div className="w-64 border-r border-gray-200">
        <StatusBar 
          currentStep={currentStep} 
          onStepChange={handleStepChange}
          skippedSteps={skippedSteps}
        />
      </div>

      <div className="flex-1 p-4">
        <LocationSelector 
          onConfirm={handleLocationConfirm} 
          onReset={handleLocationReset} 
        />
        

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
          </div>
        </div>

        {/* Navigation buttons */}
        {selectedLocationData && (
          <div className="mt-6 flex justify-between">
            <button
              className={`${currentStep === 0 ? "bg-gray-600 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"} text-white font-medium py-2 px-4 rounded-md transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50`}
              disabled={currentStep === 0}
              onClick={handleSkip}
            >
              Skip
            </button>
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 mr-20 rounded-md transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
              onClick={handleNext}
              disabled={currentStep === 3}
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