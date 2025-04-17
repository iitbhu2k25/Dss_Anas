'use client';
// app/components/DataSelectionOutput.tsx
import React, { useState, useEffect } from 'react';

interface Feature {
  type: string;
  properties: Record<string, any>;
  geometry: {
    type: string;
    coordinates: any;
  };
}

interface GeoJsonData {
  type: string;
  features: Feature[];
}

const DataSelectionOutput: React.FC = () => {
  const [geoJsonData, setGeoJsonData] = useState<GeoJsonData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Listen for GeoJSON data updates from DataSelection
  useEffect(() => {
    const handleGeoJsonUpdate = (event: CustomEvent) => {
      setGeoJsonData(event.detail);
      setIsLoading(false);
    };

    const handleLoadingStart = () => setIsLoading(true);
    
    window.addEventListener('geoJsonDataUpdate' as any, handleGeoJsonUpdate as EventListener);
    window.addEventListener('geoJsonLoadingStart' as any, handleLoadingStart);

    return () => {
      window.removeEventListener('geoJsonDataUpdate' as any, handleGeoJsonUpdate as EventListener);
      window.removeEventListener('geoJsonLoadingStart' as any, handleLoadingStart);
    };
  }, []);

  // Export GeoJSON features to CSV
  const exportToCsv = () => {
    if (!geoJsonData || !geoJsonData.features || geoJsonData.features.length === 0) {
      return;
    }

    setIsExporting(true);

    try {
      // Collect all unique property keys from all features
      const allKeys = new Set<string>();
      geoJsonData.features.forEach(feature => {
        Object.keys(feature.properties).forEach(key => allKeys.add(key));
      });
      
      // Add geometry columns
      allKeys.add('geometry_type');
      allKeys.add('longitude');
      allKeys.add('latitude');
      
      // Convert set to array
      const headers = Array.from(allKeys);
      
      // Create CSV header row
      let csvContent = headers.join(',') + '\n';
      
      // Add feature data rows
      geoJsonData.features.forEach(feature => {
        const row = headers.map(header => {
          if (header === 'geometry_type') {
            return feature.geometry.type;
          } else if (header === 'longitude' && feature.geometry.type === 'Point') {
            return feature.geometry.coordinates[0];
          } else if (header === 'latitude' && feature.geometry.type === 'Point') {
            return feature.geometry.coordinates[1];
          } else if (header in feature.properties) {
            // Handle values that might need escaping
            const value = feature.properties[header];
            if (value === null || value === undefined) {
              return '';
            }
            
            // Convert to string and handle values with commas
            const strValue = String(value);
            if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
              return `"${strValue.replace(/"/g, '""')}"`;
            }
            return strValue;
          }
          return ''; // Empty value for missing properties
        });
        
        csvContent += row.join(',') + '\n';
      });
      
      // Create a download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `geojson_features_${new Date().toISOString().slice(0, 10)}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      alert('Failed to export data to CSV.');
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-medium text-blue-600">Data Output</h3>
      </div>

      <div className="bg-white p-6 rounded-lg border border-gray-200 flex flex-col items-center justify-center">
        {!geoJsonData ? (
          <div className="text-center">
            <svg 
              className="w-12 h-12 text-gray-300 mx-auto mb-3" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth="1.5" 
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="text-gray-500">No data available.</p>
            <p className="text-gray-400 text-sm mt-1">Please select and plot data first.</p>
          </div>
        ) : (
          <div className="text-center">
            <div className="relative inline-flex mb-2">
              <svg 
                className="w-14 h-14 text-green-500" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth="1.5" 
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
                {geoJsonData.features.length}
              </div>
            </div>
            <h4 className="text-lg font-medium text-gray-700 mb-1">Data Ready for Export</h4>
            <p className="text-gray-500 mb-4">
              {geoJsonData.features.length} feature{geoJsonData.features.length !== 1 ? 's' : ''} available
            </p>
            <button
              onClick={exportToCsv}
              disabled={isExporting}
              className={`inline-flex items-center px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-300 transition ${isExporting ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isExporting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Exporting CSV...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                  </svg>
                  Export as CSV
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataSelectionOutput;