'use client';
// app/components/Dashboard.tsx
import React, { useState } from 'react';
import Input from './components/input';
import MapPreview from './components/map';




type TabType = 'groundwater-contour' | 'groundwater-trend' | 'time-series-analysis' | 'groundwater-recharge';

interface TabConfig {
  id: TabType;
  label: string;
}

const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('groundwater-contour');

  const tabs: TabConfig[] = [
    { id: 'groundwater-contour', label: 'Groundwater Contour' },
    { id: 'groundwater-trend', label: 'Groundwater Trend' },
    { id: 'time-series-analysis', label: 'Time Series Analysis and Forecasting' },
    { id: 'groundwater-recharge', label: 'Groundwater Sustainability Recharge' }
  ];

  return (
    <div className="flex flex-col w-full h-full bg-gray-100">
      {/* Main Content */}
      <div className="flex-1 p-4 overflow-auto">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`px-4 py-2 text-sm font-medium flex items-center ${
                  activeTab === tab.id
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                <div className={`w-2 h-2 rounded-full mr-2 ${activeTab === tab.id ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-8">
            <div className="grid grid-cols-12 gap-4">
              {/* Left Column - Inputs */}
              <div className="col-span-3 border border-gray-300 shadow-lg rounded-md p-4">
                <Input activeTab={activeTab} />
              </div>

              {/* Middle Column - Map Preview */}
              <div className="col-span-6 border border-gray-100 rounded-md p-4 h-full">
                <h3 className="text-sm font-medium mb-2">Map Preview</h3>
                <MapPreview activeTab={activeTab} />
              </div>

              {/* Right Column - Visualization & Output */}
              <div className="col-span-3 border border-gray-300 shadow-lg rounded-md p-4">
                <h3 className="text-sm font-medium mb-2">Visualization & Output</h3>
                {/* <VisualOutput activeTab={activeTab} /> */}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;