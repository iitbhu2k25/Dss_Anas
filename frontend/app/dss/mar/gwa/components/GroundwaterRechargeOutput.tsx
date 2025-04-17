'use client';
// app/components/outputs/GroundwaterRechargeOutput.tsx
import React from 'react';

const GroundwaterRechargeOutput: React.FC = () => {
  return (
    <div className="space-y-4">
      <h4 className="font-semibold text-blue-700">Sustainability Assessment</h4>
      
      <div className="border-l-4 border-red-500 pl-3 py-1">
        <p className="text-sm font-medium">Current Status</p>
        <p className="text-xs text-red-600 font-medium">CRITICAL</p>
        <p className="text-xs text-gray-600">Extraction exceeds recharge by 165%</p>
      </div>
      
      <div className="bg-blue-50 p-3 rounded-md">
        <p className="text-sm font-medium">Recharge Estimates</p>
        <div className="text-xs mt-1 text-gray-700">
          <p>• Natural: <span className="font-medium">4,200 acre-ft/year</span></p>
          <p>• Artificial: <span className="font-medium">1,800 acre-ft/year</span></p>
          <p>• Total extraction: <span className="font-medium">9,900 acre-ft/year</span></p>
        </div>
      </div>
      
      <div className="border border-gray-200 rounded-md p-3">
        <p className="text-sm font-medium">Sustainability Plan</p>
        <div className="mt-2 space-y-1 text-xs">
          <div className="flex items-center">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="ml-2">Increase artificial recharge by 2,500 acre-ft/year</span>
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
            <span className="ml-2">Reduce agricultural pumping by 20%</span>
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            <span className="ml-2">Implement water banking program</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroundwaterRechargeOutput;