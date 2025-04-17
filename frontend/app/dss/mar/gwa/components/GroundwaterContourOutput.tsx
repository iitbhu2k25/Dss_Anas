'use client';
// app/components/outputs/GroundwaterContourOutput.tsx
import React from 'react';

const GroundwaterContourOutput: React.FC = () => {
  return (
    <div className="space-y-4">
      <h4 className="font-semibold text-blue-700">Contour Analysis</h4>
      
      <div className="bg-blue-50 p-3 rounded-md">
        <p className="text-sm font-medium">Interpolation Results</p>
        <div className="text-xs mt-1 text-gray-700">
          <p>• Method: <span className="font-medium">Kriging</span></p>
          <p>• Resolution: <span className="font-medium">High (10m)</span></p>
          <p>• Error Range: <span className="font-medium">±2.3 ft</span></p>
        </div>
      </div>
      
      <div className="border border-gray-200 rounded-md p-3">
        <p className="text-sm font-medium">Contour Statistics</p>
        <ul className="text-xs mt-1 text-gray-700 space-y-1">
          <li>• Highest elevation: <span className="font-medium">432 ft</span></li>
          <li>• Lowest elevation: <span className="font-medium">128 ft</span></li>
          <li>• Average gradient: <span className="font-medium">1.2%</span></li>
        </ul>
      </div>
      
      <div className="bg-yellow-50 border border-yellow-200 p-2 rounded-md text-xs text-yellow-800">
        <p>Flow direction primarily from NW to SE across the basin</p>
      </div>
    </div>
  );
};

export default GroundwaterContourOutput;