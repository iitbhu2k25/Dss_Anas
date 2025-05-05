'use client';

import React, { useState } from 'react';
import { Dataset } from './DataSelection';

interface WeightedOverlayProps {
  selectedDatasets: Dataset[];
  selectedConditions: string[];
}

interface WeightItem {
  id: string;
  name: string;
  weight: number;
  influence: string;
}

export default function WeightedOverlayPart({ selectedDatasets, selectedConditions }: WeightedOverlayProps) {
  // Sample condition data for display
  const conditionItems: WeightItem[] = [
    { id: 'elevation', name: 'Elevation', weight: 25, influence: 'positive' },
    { id: 'rainfall', name: 'Annual Rainfall', weight: 20, influence: 'positive' },
    { id: 'soilQuality', name: 'Soil Quality', weight: 30, influence: 'positive' },
    { id: 'slope', name: 'Slope', weight: 15, influence: 'negative' },
    { id: 'distWater', name: 'Distance to Water', weight: 10, influence: 'negative' },
  ];
  
  // Filter conditions based on selected IDs
  const activeConditions = conditionItems.filter(c => selectedConditions.includes(c.id));
  
  // State for weights
  const [weights, setWeights] = useState<{ [key: string]: number }>(
    Object.fromEntries(conditionItems.map(item => [item.id, item.weight]))
  );
  
  // State for influence
  const [influences, setInfluences] = useState<{ [key: string]: string }>(
    Object.fromEntries(conditionItems.map(item => [item.id, item.influence]))
  );
  
  // Calculate total weight
  const totalWeight = activeConditions.reduce((sum, item) => sum + weights[item.id], 0);
  
  // Handle weight change
  const handleWeightChange = (id: string, value: number) => {
    setWeights(prev => ({
      ...prev,
      [id]: value
    }));
  };
  
  // Handle influence change
  const handleInfluenceChange = (id: string, value: string) => {
    setInfluences(prev => ({
      ...prev,
      [id]: value
    }));
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h2 className="text-lg font-semibold mb-4 text-purple-600">Weighted Overlay Analysis</h2>
      
      {selectedDatasets.length === 0 ? (
        <div className="p-4 bg-yellow-50 text-yellow-700 rounded-md">
          Please go back and select datasets first
        </div>
      ) : (
        <>
          <div className="mb-4">
            <h3 className="font-medium mb-2 text-gray-700">Weighted Factors</h3>
            
            {activeConditions.length > 0 ? (
              <>
                <div className="bg-purple-50 p-3 rounded-t-md">
                  <div className="flex items-center text-sm font-medium text-purple-800">
                    <span className="w-1/3">Factor</span>
                    <span className="w-1/3 text-center">Influence</span>
                    <span className="w-1/3 text-center">Weight (%)</span>
                  </div>
                </div>
                
                <div className="border-l border-r border-b border-purple-100 rounded-b-md mb-4 overflow-hidden">
                  {activeConditions.map((condition) => (
                    <div key={condition.id} className="flex items-center p-3 border-b border-purple-100 last:border-b-0 hover:bg-purple-50">
                      <div className="w-1/3 flex items-center">
                        <div className="w-3 h-3 rounded-full bg-purple-500 mr-2"></div>
                        <span className="text-sm">{condition.name}</span>
                      </div>
                      
                      <div className="w-1/3 flex justify-center">
                        <select
                          value={influences[condition.id]}
                          onChange={(e) => handleInfluenceChange(condition.id, e.target.value)}
                          className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                          <option value="positive">Positive</option>
                          <option value="negative">Negative</option>
                        </select>
                      </div>
                      
                      <div className="w-1/3 flex items-center justify-center space-x-2">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="5"
                          value={weights[condition.id]}
                          onChange={(e) => handleWeightChange(condition.id, parseInt(e.target.value))}
                          className="w-24"
                        />
                        <span className="text-sm w-8">{weights[condition.id]}%</span>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="flex justify-between items-center p-2">
                  <span className="text-sm font-medium">Total Weight:</span>
                  <span className={`text-sm font-bold ${totalWeight === 100 ? 'text-green-600' : 'text-red-600'}`}>
                    {totalWeight}% {totalWeight !== 100 && '(Should be 100%)'}
                  </span>
                </div>
              </>
            ) : (
              <div className="p-4 bg-gray-50 text-gray-700 rounded-md">
                No factors selected for weighted overlay.
                Please go back to the Data Selection step and select factors.
              </div>
            )}
          </div>
          
          <div className="mb-4 mt-6">
            <div className="flex">
              <div className="w-full bg-gray-100 rounded-md p-3">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Suitability Preview</h4>
                <div className="bg-white border border-gray-200 rounded-md h-40 flex items-center justify-center">
                  {totalWeight === 100 ? (
                    <div className="p-4 text-center">
                      <div className="h-4 w-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded-full mb-2"></div>
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>Less Suitable</span>
                        <span>Suitable</span>
                        <span>More Suitable</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-400 text-sm">
                      Adjust weights to total 100% to see preview
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-4 flex space-x-3">
            <button 
              className={`px-4 py-2 rounded-md ${
                totalWeight === 100 
                  ? 'bg-purple-600 text-white hover:bg-purple-700' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              } focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2`}
              disabled={totalWeight !== 100}
            >
              Run Weighted Overlay
            </button>
            <button className="border border-gray-300 bg-white text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2">
              Save Analysis
            </button>
          </div>
        </>
      )}
    </div>
  );