'use client';
// app/components/outputs/TimeSeriesOutput.tsx
import React from 'react';

const TimeSeriesOutput: React.FC = () => {
  return (
    <div className="space-y-4">
      <h4 className="font-semibold text-blue-700">Time Series Analysis</h4>
      
      <div className="bg-blue-50 p-3 rounded-md">
        <p className="text-sm font-medium">Model Performance</p>
        <div className="text-xs mt-1 text-gray-700">
          <p>• Model Type: <span className="font-medium">ARIMA(2,1,1)</span></p>
          <p>• R²: <span className="font-medium">0.86</span></p>
          <p>• RMSE: <span className="font-medium">1.24 ft</span></p>
        </div>
      </div>
      
      <div className="border border-gray-200 rounded-md p-3">
        <p className="text-sm font-medium">Forecast Summary</p>
        <ul className="text-xs mt-1 text-gray-700 space-y-1">
          <li>• 6-month forecast: <span className="font-medium text-red-600">-1.8 ft</span></li>
          <li>• 1-year forecast: <span className="font-medium text-red-600">-3.5 ft</span></li>
          <li>• 5-year forecast: <span className="font-medium text-red-600">-14.2 ft</span></li>
        </ul>
      </div>
      
      <div className="bg-gray-50 p-3 rounded-md">
        <p className="text-sm font-medium">Seasonality</p>
        <div className="text-xs mt-1 text-gray-700">
          <p>Detected annual cycle with peak in <span className="font-medium">March</span></p>
          <p>Secondary cycle with period of <span className="font-medium">~4 years</span></p>
        </div>
      </div>
    </div>
  );
};

export default TimeSeriesOutput;