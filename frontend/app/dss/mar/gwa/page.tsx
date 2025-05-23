'use client';
// app/dss/mar/gwa/page.tsx
import React, { useState, useEffect } from 'react';
import DataSelection from './components/DataSelection';
import GroundwaterSustainability from './components/GroundwaterSustainability';
import TimeSeriesAnalysis from './components/TimeSeriesAnalysis';
import GroundwaterTrend from './components/GroundwaterTrend';
import GroundwaterContour from './components/GroundwaterContour';
import DataSelectionOutput from './components/DataSelectionOutput';
import GroundwaterContourOutput from './components/GroundwaterContourOutput';
import GroundwaterTrendOutput from './components/GroundwaterTrendOutput';
import TimeSeriesOutput from './components/TimeSeriesOutput';
import GroundwaterRechargeOutput from './components/GroundwaterRechargeOutput';

// Import our new map components
import DataSelectionMap from './components/DataSelectionMap';
import GroundwaterContourMap from './components/GroundwaterContourMap';
import GroundwaterTrendMap from './components/GroundwaterTrendMap';
import TimeSeriesMap from './components/TimeSeriesMap';
import GroundwaterSustainabilityMap from './components/GroundwaterSustainabilityMap';

type TabType = 'data-selection' | 'groundwater-contour' | 'groundwater-trend' | 'time-series-analysis' | 'groundwater-recharge';

interface TabConfig {
  id: TabType;
  label: string;
}

const Dashboard: React.FC = () => {
  // Define all tabs
  const tabs: TabConfig[] = [
    { id: 'data-selection', label: 'Data Selection' },
    { id: 'groundwater-contour', label: 'Groundwater Contour' },
    { id: 'groundwater-trend', label: 'Groundwater Trend' },
    { id: 'time-series-analysis', label: 'Time Series Analysis and Forecasting' },
    { id: 'groundwater-recharge', label: 'Groundwater Sustainability Recharge' }
  ];
 
  // Initialize state
  const [activeTab, setActiveTab] = useState<TabType>('data-selection');
  const [completedSteps, setCompletedSteps] = useState<TabType[]>([]);
  
  // Data states for map components
  const [geoJsonData, setGeoJsonData] = useState<any>(null);
  const [contourData, setContourData] = useState<any>(null);
  const [trendData, setTrendData] = useState<any>(null);
  const [timeSeriesData, setTimeSeriesData] = useState<any>(null);
  const [rechargeData, setRechargeData] = useState<any>(null);
  
  // Track initial data for each tab to enable reset functionality
  const [tabInitialStates, setTabInitialStates] = useState<Record<TabType, any>>({
    'data-selection': null,
    'groundwater-contour': null,
    'groundwater-trend': null,
    'time-series-analysis': null,
    'groundwater-recharge': null
  });

  // Function to check if a tab can be accessed
  const canAccessTab = (tabId: TabType) => {
    // First tab is always accessible
    if (tabId === 'data-selection') return true;
    
    // After first tab is completed, all tabs become accessible
    if (completedSteps.includes('data-selection')) return true;
    
    const tabIndex = tabs.findIndex(tab => tab.id === tabId);
    const activeIndex = tabs.findIndex(tab => tab.id === activeTab);
    
    // A tab is accessible if it's the active tab, a completed step, or the next immediate step
    return tabId === activeTab || 
           completedSteps.includes(tabId) || 
           (tabIndex === activeIndex + 1 && completedSteps.includes(activeTab));
  };

  // Handle tab change
  const handleTabChange = (tabId: TabType) => {
    if (canAccessTab(tabId)) {
      setActiveTab(tabId);
      
      // Add current tab to completed steps if not already included
      if (!completedSteps.includes(activeTab)) {
        setCompletedSteps([...completedSteps, activeTab]);
      }
    }
  };
  
  // Function to show notifications
  const showNotification = (title: string, message: string, type: string = 'info') => {
    console.log(`${title}: ${message} (${type})`);
    // You can implement a proper notification system here if you have one
  };

  // Function to handle contour data from GroundwaterContour component
  const handleContourData = (data: any) => {
    console.log('Contour data received in Dashboard:', data);
    setContourData(data);
  };

  // Function to handle trend data
  const handleTrendData = (data: any) => {
    console.log('Trend data received in Dashboard:', data);
    setTrendData(data);
  };

  // Function to handle time series data
  const handleTimeSeriesData = (data: any) => {
    console.log('Time series data received in Dashboard:', data);
    setTimeSeriesData(data);
  };

  // Function to handle recharge data
  const handleRechargeData = (data: any) => {
    console.log('Recharge data received in Dashboard:', data);
    setRechargeData(data);
  };

  // Function to render the appropriate component based on active tab
  const renderInputComponent = () => {
    switch (activeTab) {
      case 'data-selection':
        return <DataSelection 
                 activeTab={activeTab} 
                 onGeoJsonData={setGeoJsonData} 
                 initialData={tabInitialStates['data-selection']}
               />;
      case 'groundwater-contour':
        return <GroundwaterContour 
                 activeTab={activeTab}
                 onGeoJsonData={handleContourData} 
                 initialData={tabInitialStates['groundwater-contour']} />;
      case 'groundwater-trend':
        return <GroundwaterTrend 
                 activeTab={activeTab}
                 onGeoJsonData={handleTrendData}
                 initialData={tabInitialStates['groundwater-trend']} />;
      case 'time-series-analysis':
        return <TimeSeriesAnalysis 
                 activeTab={activeTab}
                 onGeoJsonData={handleTimeSeriesData}
                 initialData={tabInitialStates['time-series-analysis']} />;
      case 'groundwater-recharge':
        return <GroundwaterSustainability 
                 activeTab={activeTab}
                 onGeoJsonData={handleRechargeData}
                 initialData={tabInitialStates['groundwater-recharge']} />;
      default:
        return <DataSelection 
                 activeTab={activeTab} 
                 onGeoJsonData={setGeoJsonData}
                 initialData={tabInitialStates['data-selection']}
               />;
    }
  };

  // Function to render the appropriate map component based on active tab
  const renderMapComponent = () => {
    switch (activeTab) {
      case 'data-selection':
        return <DataSelectionMap 
                 geoJsonData={geoJsonData} 
                 showNotification={showNotification} 
               />;
      case 'groundwater-contour':
        return <GroundwaterContourMap 
                 contourData={contourData} 
                 showNotification={showNotification} 
               />;
      case 'groundwater-trend':
        return <GroundwaterTrendMap 
                 trendData={trendData} 
                 showNotification={showNotification} 
               />;
      case 'time-series-analysis':
        return <TimeSeriesMap 
                 timeSeriesData={timeSeriesData} 
                 showNotification={showNotification} 
               />;
      case 'groundwater-recharge':
        return <GroundwaterSustainabilityMap 
                 rechargeData={rechargeData} 
                 showNotification={showNotification} 
               />;
      default:
        return <DataSelectionMap 
                 geoJsonData={geoJsonData} 
                 showNotification={showNotification} 
               />;
    }
  };

  const renderOutputComponent = () => {
    switch (activeTab) {
      case 'data-selection':
        return <DataSelectionOutput />;
      case 'groundwater-contour':
        return <GroundwaterContourOutput />;
      case 'groundwater-trend':
        return <GroundwaterTrendOutput />;
      case 'time-series-analysis':
        return <TimeSeriesOutput />;
      case 'groundwater-recharge':
        return <GroundwaterRechargeOutput />;
      default:
        return <DataSelectionOutput />;
    }
  };

  // Reset all progress (simulating page refresh)
  const resetAllProgress = () => {
    setActiveTab('data-selection');
    setCompletedSteps([]);
    setGeoJsonData(null);
    setContourData(null);
    setTrendData(null);
    setTimeSeriesData(null);
    setRechargeData(null);
    // Reset all tab initial states
    setTabInitialStates({
      'data-selection': null,
      'groundwater-contour': null,
      'groundwater-trend': null,
      'time-series-analysis': null,
      'groundwater-recharge': null
    });
  };

  // Go to previous step
  const goToPreviousStep = () => {
    const currentIndex = tabs.findIndex(tab => tab.id === activeTab);
    if (currentIndex > 0) {
      setActiveTab(tabs[currentIndex - 1].id);
    }
  };

  // Go to next step
  const goToNextStep = () => {
    // Add current tab to completed steps if not already included
    if (!completedSteps.includes(activeTab)) {
      setCompletedSteps([...completedSteps, activeTab]);
    }
                      
    // Move to the next tab if not on the last tab
    const currentIndex = tabs.findIndex(tab => tab.id === activeTab);
    if (currentIndex < tabs.length - 1) {
      setActiveTab(tabs[currentIndex + 1].id);
    }
  };

  return (
    <div className="flex flex-col w-full h-full bg-gray-100">
      {/* Main Content */}
      <div className="flex-1 p-4 overflow-auto">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Process Step Tabs */}
          <div className="border-b relative">
            {/* Progress Indicators */}
            <div className="flex w-full justify-between items-start px-4 py-6 overflow-x-auto">
              {tabs.map((tab, index) => {
                const isAccessible = canAccessTab(tab.id);
                const isActive = activeTab === tab.id;
                const isCompleted = completedSteps.includes(tab.id) && !isActive;

                const textColor = isActive
                  ? "text-blue-700"
                  : isCompleted
                  ? "text-green-600"
                  : isAccessible
                  ? "text-gray-700"
                  : "text-gray-500";

                const circleColor = isActive
                  ? "bg-blue-600 border-blue-600 text-white"
                  : isCompleted
                  ? "bg-green-600 border-green-600 text-white"
                  : isAccessible
                  ? "bg-white border-blue-300 text-gray-600 hover:border-blue-500"
                  : "bg-white border-gray-300 text-gray-600";

                const rightLineColor =
                  index < tabs.length - 1 &&
                  (isCompleted || (isActive && completedSteps.includes(tabs[index + 1].id)))
                    ? "bg-green-600"
                    : "bg-gray-200";

                const leftLineColor =
                  index > 0 &&
                  (isCompleted || (isActive && completedSteps.includes(tabs[index - 1].id)))
                    ? "bg-green-600"
                    : "bg-gray-200";

                return (
                  <div
                    key={tab.id}
                    className="flex flex-col items-center text-center relative z-10 flex-1 min-w-[80px]"
                  >
                    {/* Left Line - connects to previous circle */}
                    {index > 0 && (
                      <div
                        className={`absolute h-0.5 ${leftLineColor} z-0`}
                        style={{
                          top: "20px",
                          right: "50%", 
                          width: "50%"
                        }}
                      ></div>
                    )}
                    
                    {/* Right Line - connects to next circle */}
                    {index < tabs.length - 1 && (
                      <div
                        className={`absolute h-0.5 ${rightLineColor} z-0`}
                        style={{
                          top: "20px",
                          left: "50%",
                          width: "50%"
                        }}
                      ></div>
                    )}

                    {/* Step Circle */}
                    <button
                      className={`relative w-10 h-10 rounded-full border-2 flex items-center justify-center mb-2 transition-all duration-200 z-10 ${
                        circleColor
                      } ${
                        !isAccessible
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:scale-105 shadow-sm"
                      }`}
                      onClick={() => isAccessible && handleTabChange(tab.id)}
                      disabled={!isAccessible}
                      title={tab.label}
                    >
                      {isCompleted ? (
                        <svg
                          className="w-5 h-5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      ) : (
                        <span className="font-semibold">{index + 1}</span>
                      )}
                    </button>

                    {/* Label */}
                    <span
                      className={`text-xs sm:text-sm font-medium ${textColor} px-1`}
                    >
                      {tab.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-8">
            <div className="grid grid-cols-12 gap-4">
              {/* Left Column - Inputs */}
              <div className="col-span-3 border border-gray-300 shadow-lg rounded-md p-4">
                {renderInputComponent()}
              </div>

              {/* Middle Column - Map Preview */}
              <div className="col-span-6 border border-gray-100 rounded-md p-4 h-full">
                <h3 className="text-sm font-medium mb-2">Map Preview</h3>
                {renderMapComponent()}
              </div>

              {/* Right Column - Visualization & Output */}
              <div className="col-span-3 border border-gray-300 shadow-lg rounded-md p-4">
                <h3 className="text-sm font-medium mb-2">Visualization & Output</h3>
                {renderOutputComponent()}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="w-full flex justify-between mt-8">
        {/* Right aligned buttons */}
        <div className="flex-1 flex justify-end gap-3">
        <button 
            onClick={goToPreviousStep} 
            disabled={activeTab === 'data-selection'} 
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous Step
          </button>
          <button 
            onClick={goToNextStep} 
            disabled={activeTab === tabs[tabs.length - 1].id && completedSteps.includes(activeTab)} 
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {activeTab === tabs[tabs.length - 1].id 
              ? (completedSteps.includes(activeTab) ? "Completed" : "Complete") 
              : "Next Step"}
          </button>
          <button 
            onClick={resetAllProgress} 
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Reset All Progress
          </button>
        </div> 
      </div>
    </div>
  );
};

export default Dashboard;