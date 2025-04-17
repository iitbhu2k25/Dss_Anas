'use client';
// app/components/outputs/GroundwaterTrendOutput.tsx
import React from 'react';

const GroundwaterTrendOutput: React.FC = () => {
  return (
    <div className="space-y-4">
      <h4 className="font-semibold text-blue-700">Trend Analysis</h4>
      
      <div className="border border-gray-200 rounded-md p-3">
        <p className="text-sm font-medium">Change Detection</p>
        <div className="flex items-center mt-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span className="text-xs ml-2">Declining (63% of area)</span>
        </div>
        <div className="flex items-center mt-1">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="text-xs ml-2">Stable/Rising (37% of area)</span>
        </div>
      </div>
      
      <div className="bg-blue-50 p-3 rounded-md">
        <p className="text-sm font-medium">Rate of Change</p>
        <div className="text-xs mt-1 text-gray-700">
          <p>• Average: <span className="font-medium">-2.1 ft/year</span></p>
          <p>• Maximum: <span className="font-medium">-4.7 ft/year</span></p>
          <p>• Minimum: <span className="font-medium">+0.8 ft/year</span></p>
        </div>
      </div>
      
      <div className="bg-red-50 border border-red-200 p-2 rounded-md text-xs text-red-800">
        <p>⚠️ Critical decline detected in SW region</p>
      </div>
    </div>
  );
};

export default GroundwaterTrendOutput;