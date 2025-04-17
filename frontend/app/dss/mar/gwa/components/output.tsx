// 'use client';
// // app/components/VisualOutput.tsx
// import React from 'react';

// interface VisualOutputProps {
//   activeTab: string;
//   // You can add more props as needed, like data that should be displayed
// }

// const VisualOutput: React.FC<VisualOutputProps> = ({ activeTab }) => {
//   // Render different output sections based on the active tab
//   const renderOutputContent = () => {
//     switch (activeTab) {
//       case 'data-selection':
//         return <DataSelectionOutput />;
//       case 'groundwater-contour':
//         return <GroundwaterContourOutput />;
//       case 'groundwater-trend':
//         return <GroundwaterTrendOutput />;
//       case 'time-series-analysis':
//         return <TimeSeriesOutput />;
//       case 'groundwater-recharge':
//         return <GroundwaterRechargeOutput />;
//       default:
//         return <DataSelectionOutput />;
//     }
//   };

//   return (
//     <div className="h-full flex flex-col">
//       {renderOutputContent()}
//     </div>
//   );
// };

// // Data Selection Output Component
// const DataSelectionOutput: React.FC = () => {
//   return (
//     <div className="space-y-4">
//       <h4 className="font-semibold text-blue-700">Data Selection Summary</h4>
      
//       <div className="bg-blue-50 p-3 rounded-md">
//         <p className="text-sm font-medium">Selected Dataset</p>
//         <div className="text-xs mt-1 text-gray-700">
//           <p>• Region: <span className="font-medium">North Basin</span></p>
//           <p>• Time Period: <span className="font-medium">2020-2023</span></p>
//           <p>• Wells: <span className="font-medium">23 active</span></p>
//         </div>
//       </div>
      
//       <div className="border border-gray-200 rounded-md p-3">
//         <p className="text-sm font-medium">Data Quality</p>
//         <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
//           <div className="bg-green-500 h-full" style={{ width: '87%' }}></div>
//         </div>
//         <p className="text-xs text-right mt-1 text-gray-600">87% complete</p>
//       </div>
      
//       <div className="text-xs text-gray-500 italic mt-4">
//         Complete data selection to proceed to groundwater analysis
//       </div>
//     </div>
//   );
// };

// // Groundwater Contour Output Component
// const GroundwaterContourOutput: React.FC = () => {
//   return (
//     <div className="space-y-4">
//       <h4 className="font-semibold text-blue-700">Contour Analysis</h4>
      
//       <div className="bg-blue-50 p-3 rounded-md">
//         <p className="text-sm font-medium">Interpolation Results</p>
//         <div className="text-xs mt-1 text-gray-700">
//           <p>• Method: <span className="font-medium">Kriging</span></p>
//           <p>• Resolution: <span className="font-medium">High (10m)</span></p>
//           <p>• Error Range: <span className="font-medium">±2.3 ft</span></p>
//         </div>
//       </div>
      
//       <div className="border border-gray-200 rounded-md p-3">
//         <p className="text-sm font-medium">Contour Statistics</p>
//         <ul className="text-xs mt-1 text-gray-700 space-y-1">
//           <li>• Highest elevation: <span className="font-medium">432 ft</span></li>
//           <li>• Lowest elevation: <span className="font-medium">128 ft</span></li>
//           <li>• Average gradient: <span className="font-medium">1.2%</span></li>
//         </ul>
//       </div>
      
//       <div className="bg-yellow-50 border border-yellow-200 p-2 rounded-md text-xs text-yellow-800">
//         <p>Flow direction primarily from NW to SE across the basin</p>
//       </div>
//     </div>
//   );
// };

// // Groundwater Trend Output Component
// const GroundwaterTrendOutput: React.FC = () => {
//   return (
//     <div className="space-y-4">
//       <h4 className="font-semibold text-blue-700">Trend Analysis</h4>
      
//       <div className="border border-gray-200 rounded-md p-3">
//         <p className="text-sm font-medium">Change Detection</p>
//         <div className="flex items-center mt-2">
//           <div className="w-3 h-3 rounded-full bg-red-500"></div>
//           <span className="text-xs ml-2">Declining (63% of area)</span>
//         </div>
//         <div className="flex items-center mt-1">
//           <div className="w-3 h-3 rounded-full bg-green-500"></div>
//           <span className="text-xs ml-2">Stable/Rising (37% of area)</span>
//         </div>
//       </div>
      
//       <div className="bg-blue-50 p-3 rounded-md">
//         <p className="text-sm font-medium">Rate of Change</p>
//         <div className="text-xs mt-1 text-gray-700">
//           <p>• Average: <span className="font-medium">-2.1 ft/year</span></p>
//           <p>• Maximum: <span className="font-medium">-4.7 ft/year</span></p>
//           <p>• Minimum: <span className="font-medium">+0.8 ft/year</span></p>
//         </div>
//       </div>
      
//       <div className="bg-red-50 border border-red-200 p-2 rounded-md text-xs text-red-800">
//         <p>⚠️ Critical decline detected in SW region</p>
//       </div>
//     </div>
//   );
// };

// // Time Series Analysis Output Component
// const TimeSeriesOutput: React.FC = () => {
//   return (
//     <div className="space-y-4">
//       <h4 className="font-semibold text-blue-700">Time Series Analysis</h4>
      
//       <div className="bg-blue-50 p-3 rounded-md">
//         <p className="text-sm font-medium">Model Performance</p>
//         <div className="text-xs mt-1 text-gray-700">
//           <p>• Model Type: <span className="font-medium">ARIMA(2,1,1)</span></p>
//           <p>• R²: <span className="font-medium">0.86</span></p>
//           <p>• RMSE: <span className="font-medium">1.24 ft</span></p>
//         </div>
//       </div>
      
//       <div className="border border-gray-200 rounded-md p-3">
//         <p className="text-sm font-medium">Forecast Summary</p>
//         <ul className="text-xs mt-1 text-gray-700 space-y-1">
//           <li>• 6-month forecast: <span className="font-medium text-red-600">-1.8 ft</span></li>
//           <li>• 1-year forecast: <span className="font-medium text-red-600">-3.5 ft</span></li>
//           <li>• 5-year forecast: <span className="font-medium text-red-600">-14.2 ft</span></li>
//         </ul>
//       </div>
      
//       <div className="bg-gray-50 p-3 rounded-md">
//         <p className="text-sm font-medium">Seasonality</p>
//         <div className="text-xs mt-1 text-gray-700">
//           <p>Detected annual cycle with peak in <span className="font-medium">March</span></p>
//           <p>Secondary cycle with period of <span className="font-medium">~4 years</span></p>
//         </div>
//       </div>
//     </div>
//   );
// };

// // Groundwater Recharge Output Component
// const GroundwaterRechargeOutput: React.FC = () => {
//   return (
//     <div className="space-y-4">
//       <h4 className="font-semibold text-blue-700">Sustainability Assessment</h4>
      
//       <div className="border-l-4 border-red-500 pl-3 py-1">
//         <p className="text-sm font-medium">Current Status</p>
//         <p className="text-xs text-red-600 font-medium">CRITICAL</p>
//         <p className="text-xs text-gray-600">Extraction exceeds recharge by 165%</p>
//       </div>
      
//       <div className="bg-blue-50 p-3 rounded-md">
//         <p className="text-sm font-medium">Recharge Estimates</p>
//         <div className="text-xs mt-1 text-gray-700">
//           <p>• Natural: <span className="font-medium">4,200 acre-ft/year</span></p>
//           <p>• Artificial: <span className="font-medium">1,800 acre-ft/year</span></p>
//           <p>• Total extraction: <span className="font-medium">9,900 acre-ft/year</span></p>
//         </div>
//       </div>
      
//       <div className="border border-gray-200 rounded-md p-3">
//         <p className="text-sm font-medium">Sustainability Plan</p>
//         <div className="mt-2 space-y-1 text-xs">
//           <div className="flex items-center">
//             <div className="w-2 h-2 rounded-full bg-green-500"></div>
//             <span className="ml-2">Increase artificial recharge by 2,500 acre-ft/year</span>
//           </div>
//           <div className="flex items-center">
//             <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
//             <span className="ml-2">Reduce agricultural pumping by 20%</span>
//           </div>
//           <div className="flex items-center">
//             <div className="w-2 h-2 rounded-full bg-blue-500"></div>
//             <span className="ml-2">Implement water banking program</span>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default VisualOutput;