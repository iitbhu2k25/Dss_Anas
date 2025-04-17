'use client';
import React, { useState, useRef, useEffect } from 'react';

interface DataSelectionProps {
  activeTab: string;
  onGeoJsonData?: (data: any) => void;
  initialData?: any;
}

const DataSelection: React.FC<DataSelectionProps> = ({ 
  activeTab,
  onGeoJsonData = () => {},
  initialData = null
}) => {
  // State for data selection
  const [selectionType, setSelectionType] = useState('');
  const [selectedWell, setSelectedWell] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [geoJsonData, setGeoJsonData] = useState<any>(initialData);
  
  // New error and loading states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State for tooltip
  const [showInfoTooltip, setShowInfoTooltip] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
    
  // Sample data for existing wells
  const existingWells = [
    { id: 'well-1', name: 'Wells Points' }
  ];
  
  // Reset selection state when activeTab changes
  useEffect(() => {
    // Reset all selection-related states when tab changes
    setSelectionType('');
    setSelectedWell('');
    setSelectedFile(null);
    setUploadSuccess(false);
    setError(null); // Reset error state too
  }, [activeTab]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
      setUploadSuccess(false);
      setError(null); // Clear previous errors
    }
  };

  const handleUpload = () => {
    if (selectionType === 'browse' && selectedFile) {
      // Simulate upload process
      setIsUploading(true);
      setError(null); // Clear previous errors
      
      // Simulate API call with timeout
      setTimeout(() => {
        setIsUploading(false);
        setUploadSuccess(true);
      }, 1500);
    }
  };

  const handlePlot = async () => {
    // Extract the ID part (without "well-" prefix)
    let wellId = selectedWell ? selectedWell.replace('well-', '') : '1';
    
    setIsLoading(true);
    setError(null);
    
    // Dispatch a custom event to notify DataSelectionOutput about loading
    window.dispatchEvent(new CustomEvent('geoJsonLoadingStart'));
    
    try {
      console.log(`Fetching GeoJSON for well ID: ${wellId}`);
      
      // Full URL with explicit protocol and port
      const apiUrl = `http://localhost:9000/api/gwa/get-well-geojson/?id=${wellId}`;
      console.log(`Making request to: ${apiUrl}`);
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        // Include credentials if your API requires authentication
        // credentials: 'include',
      });
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        // Try to get detailed error if available
        let errorMessage = `Failed to fetch GeoJSON: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          console.error('Error response:', errorData);
          if (errorData && errorData.error) {
            errorMessage = `Server error: ${errorData.error}`;
          }
        } catch (parseError) {
          console.error('Could not parse error response as JSON');
        }
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      console.log('GeoJSON fetched successfully:', data);
      
      // Update local state
      setGeoJsonData(data);
      
      // Pass data to parent component
      onGeoJsonData(data);
      
      // Dispatch a custom event to share with DataSelectionOutput
      window.dispatchEvent(new CustomEvent('geoJsonDataUpdate', { detail: data }));
      
    } catch (error) {
      console.error('Error fetching GeoJSON:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch GeoJSON data');
      setGeoJsonData(null);
      onGeoJsonData(null);
      
      // Dispatch an event with null data to clear any previous data
      window.dispatchEvent(new CustomEvent('geoJsonDataUpdate', { detail: null }));
    } finally {
      setIsLoading(false);
    }
  };
  
  // Close tooltip when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        setShowInfoTooltip(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const renderWellSelection = () => (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">Selection of Wells</label>
      <select 
        className="w-full p-2 border rounded-md text-sm"
        value={selectionType}
        onChange={(e) => {
          setSelectionType(e.target.value);
          setSelectedWell('');
          setSelectedFile(null);
          setUploadSuccess(false);
          setError(null); // Clear any errors
        }}
      >
        <option value="">Select an option...</option>
        <option value="current">Select Existing</option>
        <option value="browse">Add New Data</option>
      </select>
      
      {selectionType === 'current' && (
        <div className="mt-2">
          <select 
            className="w-full p-2 border rounded-md text-sm"
            value={selectedWell}
            onChange={(e) => {
              setSelectedWell(e.target.value);
              setError(null); // Clear any errors
            }}
          >
            <option value="">Select well group...</option>
            {existingWells
              .filter(well => well.id === 'well-1')
              .map(well => (
                <option key={well.id} value={well.id}>{well.name}</option>
              ))
            }
          </select>
          
          {selectedWell && (
            <div className="flex flex-col gap-2 mt-2">
              <button 
                className={`bg-blue-500 text-white text-sm py-1 px-3 rounded-md flex items-center justify-center ${
                  isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'
                }`}
                onClick={handlePlot}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading...
                  </>
                ) : (
                  <span>Plot</span>
                )}
              </button>
              
              {/* Error message */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-xs">
                  <p className="font-medium">Error</p>
                  <p>{error}</p>
                </div>
              )}
              
              {/* Success message when data is loaded */}
              {geoJsonData && !error && !isLoading && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-md text-xs">
                  <p>GeoJSON data loaded successfully!</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      {selectionType === 'browse' && (
        <div className="mt-2">
          <div className="border-2 border-dashed border-gray-300 rounded-md p-4">
            <div className="flex flex-col items-center justify-center">
              <svg 
                className="w-8 h-8 text-gray-400 mb-2" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth="2" 
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              
              <p className="text-sm text-gray-500 mb-2">
                {selectedFile ? selectedFile.name : 'Drag and drop file here or click to browse'}
              </p>
              
              <label className="bg-blue-50 text-blue-600 text-sm py-1 px-3 rounded-md cursor-pointer hover:bg-blue-100">
                Browse Files
                <input 
                  type="file" 
                  className="hidden" 
                  accept=".csv,.xlsx,.xls,.shp,.shx,.dbf,.geojson"
                  onChange={handleFileChange}
                />
              </label>
              
              <div className="flex items-center mt-1 relative">
                <p className="text-xs text-gray-400">
                  Supports: CSV, Excel files, Shapefiles, GeoJSON
                </p>
                <div className="relative ml-1" ref={tooltipRef}>
                  <button 
                    className="text-gray-400 hover:text-gray-600 focus:outline-none"
                    onClick={() => setShowInfoTooltip(!showInfoTooltip)}
                    aria-label="File information"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"></path>
                    </svg>
                  </button>
                  
                  {showInfoTooltip && (
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 bg-white shadow-lg rounded-md p-3 z-10 border border-gray-200">
                      <div className="text-xs">
                        <h4 className="font-semibold text-gray-800 mb-1">Required File Format:</h4>
                        <ul className="list-disc pl-4 text-gray-600 mb-2">
                          <li>File types: .csv, .xlsx, .xls, .shp (with .shx and .dbf), .geojson</li>
                          <li>Max size: 10MB</li>
                        </ul>
                        <h4 className="font-semibold text-gray-800 mb-1">Required Columns:</h4>
                        <ul className="list-disc pl-4 text-gray-600">
                          <li>Well ID (text): Unique identifier</li>
                          <li>Latitude (number): Decimal degrees</li>
                          <li>Longitude (number): Decimal degrees</li>
                          <li>Elevation (number): Meters above sea level</li>
                          <li>Measurement (number): Value in meters</li>
                          <li>Date (YYYY-MM-DD): Measurement date</li>
                        </ul>
                        <div className="border-t border-gray-200 mt-2 pt-2">
                          <a href="#" className="text-blue-500 hover:underline">Download template</a>
                        </div>
                      </div>
                      {/* Arrow pointing down */}
                      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-3 h-3 bg-white border-r border-b border-gray-200"></div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {selectedFile && (
            <div className="mt-2">
              <div className="flex gap-2">
                <button 
                  className={`flex-1 text-white text-sm py-1 px-3 rounded-md flex items-center justify-center ${
                    isUploading ? 'bg-blue-400' : 'bg-blue-500 hover:bg-blue-600'
                  }`}
                  onClick={handleUpload}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <span>Upload</span>
                      {uploadSuccess && (
                        <span className="ml-1 bg-white text-blue-500 rounded-full w-4 h-4 flex items-center justify-center text-xs">✓</span>
                      )}
                    </>
                  )}
                </button>
                
                {uploadSuccess && (
                  <button 
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-sm py-1 px-3 rounded-md flex items-center justify-center"
                    onClick={handlePlot}
                    disabled={isLoading}
                  >
                    <span>Plot</span>
                  </button>
                )}
              </div>
              
              {uploadSuccess && (
                <p className="text-xs text-green-600 mt-1 text-center">
                  File successfully uploaded!
                </p>
              )}
              
              {/* Error message for file upload */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-xs mt-2">
                  <p className="font-medium">Error</p>
                  <p>{error}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="h-full overflow-auto flex flex-col">
      <h3 className="font-medium text-blue-600 mb-4">Data Selection</h3>
      {renderWellSelection()}
    </div>
  );
};

export default DataSelection;