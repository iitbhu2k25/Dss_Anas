'use client';

import React, { useState } from 'react';
import DataSelectionPart, { Dataset } from './components/DataSelection';
import MapPart from './components/Map';
import ProcessingPart from './components/Processing';
import WeightedOverlayPart from './components/WeightedOverlay';

export default function SiteSuitabilityPage() {
  const [selectedDatasets, setSelectedDatasets] = useState<Dataset[]>([]);
  const [selectedConstraints, setSelectedConstraints] = useState<string[]>([]);
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [showFinalOptions, setShowFinalOptions] = useState<boolean>(false);
  const [showValidationPopup, setShowValidationPopup] = useState<boolean>(false);
  
  // Handle dataset selection
  const handleDatasetSelection = (datasets: Dataset[]) => {
    setSelectedDatasets(datasets);
  };
  
  // Handle constraints change
  const handleConstraintsChange = (constraintIds: string[]) => {
    setSelectedConstraints(constraintIds);
  };
  
  // Handle conditions change
  const handleConditionsChange = (conditionIds: string[]) => {
    setSelectedConditions(conditionIds);
  };
  
  // Handle export as PNG
  const handleExportPng = () => {
    console.log('Exporting visualization as PNG');
    // Implement PNG export logic here
  };
  
  // Handle export as Layer
  const handleExportLayer = () => {
    console.log('Exporting visualization as Layer');
    // Implement Layer export logic here
  };
  
  // Handle save project
  const handleSaveProject = () => {
    console.log('Saving project...');
    // Implement save project logic here
    alert('Project saved successfully!');
  };
  
  // Handle export project
  const handleExportProject = () => {
    console.log('Exporting project...');
    // Implement export project logic here
    alert('Project exported successfully!');
  };
  
  // Handle next step with validation
  const handleNext = () => {
    // For Step 1 (Data Selection), validate that at least one dataset is selected
    if (currentStep === 1 && selectedDatasets.length === 0) {
      setShowValidationPopup(true);
      return;
    }
    
    if (currentStep < 3) {
      // Mark current step as completed
      if (!completedSteps.includes(currentStep)) {
        setCompletedSteps([...completedSteps, currentStep]);
      }
      setCurrentStep(currentStep + 1);
    } else if (currentStep === 3) {
      // Mark the last step as completed if it's not already
      if (!completedSteps.includes(3)) {
        setCompletedSteps([...completedSteps, 3]);
      }
      // Show final options when finish is clicked
      setShowFinalOptions(true);
    }
  };
  
  // Handle previous step
  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Function to render the correct component based on current step
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <DataSelectionPart 
            onSelectDatasets={handleDatasetSelection}
            onConstraintsChange={handleConstraintsChange}
            onConditionsChange={handleConditionsChange}
          />
        );
      case 2:
        return (
          <ProcessingPart 
            selectedDatasets={selectedDatasets}
            selectedConstraints={selectedConstraints}
          />
        );
      case 3:
        return (
          <WeightedOverlayPart 
            selectedDatasets={selectedDatasets}
            selectedConditions={selectedConditions}
          />
        );
      default:
        return null;
    }
  };
  
  return (
    <div className="container mx-5 mr-5 my-8 max-w-full">
      <div className="bg-white rounded-lg shadow-md">
        <style jsx>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fadeIn {
            animation: fadeIn 0.4s ease-out forwards;
          }
        `}</style>
        {/* Header */}
        <div className="bg-cyan-400 p-4 text-center text-black font-semibold text-xl rounded-t-lg">
          STP Site Suitability
        </div>
        
        {/* Improved Progress Steps */}
        <div className="p-6 bg-gray-50 border-b">
          
          <div className="relative flex items-center justify-between max-w-3xl mx-auto mb-8">
            {/* Progress Bar Background */}
            <div className="absolute h-1.5 w-full bg-gray-200 rounded-full"></div>
            
            {/* Progress Bar Fill - Animated */}
            <div 
              className="absolute h-1.5 bg-gradient-to-r from-green-400 to-green-600 rounded-full transition-all duration-500 ease-out" 
              style={{ width: `${completedSteps.length * 33.33}%` }}
            ></div>
            
            {/* Step Indicators */}
            {[1, 2, 3].map((step) => (
              <div key={step} className="relative z-10">
                <div 
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium transition-all duration-300 cursor-pointer transform hover:scale-110 ${
                    completedSteps.includes(step) 
                      ? 'bg-gradient-to-r from-green-500 to-green-600 shadow-lg' 
                      : currentStep === step 
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 shadow-lg' 
                        : completedSteps.includes(1) 
                          ? 'bg-gray-300' 
                          : 'bg-gray-400'
                  } ${currentStep === step ? 'ring-4 ring-blue-200 scale-110' : ''}`}
                  onClick={() => {
                    // Only allow navigation to steps after data selection (step 1)
                    if (completedSteps.includes(1) || step === 1) {
                      setCurrentStep(step);
                    }
                  }}
                >
                  {step}
                </div>
                <div className={`absolute mt-3 -ml-10 w-20 text-center space-y-1 ${
                  completedSteps.includes(step) 
                    ? 'text-green-600 font-medium' 
                    : currentStep === step 
                      ? 'text-blue-600 font-medium' 
                      : completedSteps.includes(1) 
                        ? 'text-gray-500' 
                        : 'text-gray-400'
                } cursor-pointer`} 
                  onClick={() => {
                    // Only allow navigation to steps after data selection (step 1)
                    if (completedSteps.includes(1) || step === 1) {
                      setCurrentStep(step);
                    }
                  }}>
                  <span className="block text-xs">
                    {step === 1 && "Data Selection"}
                    {step === 2 && "Processing"}
                    {step === 3 && "Weighted Overlay"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Main Content - Added top margin to prevent overlap */}
        <div className="flex flex-col md:flex-row gap-4 p-4 mt-8">
          {/* Left Section - Dynamic based on step - Now 65% width */}
          <div className="left-section w-full md:w-[55%]">
            {renderStepContent()}
          </div>
          
          {/* Right Section - Map stays consistent - Now 35% width */}
          <div className="right-section w-full md:w-[45%] ">
            <MapPart 
              onExportPng={handleExportPng}
              onExportLayer={handleExportLayer}
            />
          </div>
        </div>
        
        {/* Navigation Footer */}
        <div className="flex justify-between p-4 border-t">
          <button 
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className={`px-4 py-2 rounded-md flex items-center transition-all ${
              currentStep === 1 
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <span className="mr-1">←</span> Previous
          </button>
          <button 
            onClick={handleNext}
            className={`px-4 py-2 rounded-md flex items-center transition-all ${
              currentStep === 3 && showFinalOptions
                ? 'bg-blue-300 text-white cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            {currentStep === 3 ? 'Finish' : 'Next'} {currentStep < 3 && <span className="ml-1">→</span>}
          </button>
        </div>
        
        {/* Final Options Section - Appears after clicking Finish */}
        {showFinalOptions && (
          <div className="p-4 bg-green-50 border-t border-green-100 animate-fadeIn">
            <div className="max-w-3xl mx-auto">
              <h3 className="text-lg font-medium text-green-700 mb-3">Project Complete!</h3>
              <p className="text-green-600 mb-4">Your site suitability analysis is complete. You can now save or export your project.</p>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button 
                  onClick={handleSaveProject}
                  className="px-5 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center justify-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  Save Project
                </button>
                
                <button 
                  onClick={handleExportProject}
                  className="px-5 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export Project
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Validation Popup */}
        {showValidationPopup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <div className="flex items-center mb-4 text-red-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-lg font-medium">Selection Required</h3>
              </div>
              <p className="mb-4 text-gray-600">
                Please select at least one dataset from either Constraints or Conditions before proceeding.
              </p>
              <div className="flex justify-end">
                <button
                  className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  onClick={() => setShowValidationPopup(false)}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}