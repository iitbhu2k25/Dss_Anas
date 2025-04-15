import React, { useState, useRef, useEffect } from 'react';

interface GroundwaterSustainabilityProps {
  activeTab: string;
}

const GroundwaterSustainability: React.FC<GroundwaterSustainabilityProps> = ({ activeTab }) => {
  // State for recharge data selection
  const [selectionType, setSelectionType] = useState('');
  const [selectedWell, setSelectedWell] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // State for demand data selection
  const [demandSelectionType, setDemandSelectionType] = useState('');
  
  // State for tooltip
  const [showInfoTooltip, setShowInfoTooltip] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Reset selection state when activeTab changes
  useEffect(() => {
    // Reset all selection-related states when tab changes
    setSelectionType('');
    setSelectedWell('');
    setSelectedFile(null);
    setUploadSuccess(false);
    setDemandSelectionType('');
  
  }, [activeTab]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
      setUploadSuccess(false);
    }
  };

  
  const handleUpload = () => {
    if (selectionType === 'browse' && selectedFile) {
      // Simulate upload process
      setIsUploading(true);
      
      // Simulate API call with timeout
      setTimeout(() => {
        setIsUploading(false);
        setUploadSuccess(true);
      }, 1500);
    }
  };
  
  const handlePlot = () => {
    // Placeholder for plot functionality
    console.log('Plotting data...');
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

  // Groundwater Recharge
  const renderGroundwaterRecharge = () => (
    <div>
      <h3 className="font-medium text-blue-600 mb-4">Groundwater Sustainability Recharge</h3>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Data Source</label>
        <select 
          className="w-full p-2 border rounded-md text-sm mb-3"
          value={selectionType}
          onChange={(e) => {
            setSelectionType(e.target.value);
            setSelectedWell('');
            setSelectedFile(null);
            setUploadSuccess(false);
          }}
        >
          <option value="">Select an option...</option>
          <option value="model">Model Output</option>
          <option value="browse">Add New Dataset</option>
        </select>
        
        {selectionType === 'model' && (
          <div className="mt-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Existing Data</label>
            <select 
              className="w-full p-2 border rounded-md text-sm"
              value={selectedWell}
              onChange={(e) => setSelectedWell(e.target.value)}
            >
              <option value="">Select dataset...</option>
              <option value="dataset-1">Recharge Dataset 2023</option>
              <option value="dataset-2">Monsoon Recharge Data</option>
              <option value="dataset-3">Winter Recharge Assessment</option>
              <option value="dataset-4">Regional Recharge Study</option>
            </select>
            
            {selectedWell && (
              <div className="flex gap-2 mt-3">
                <button className="flex-1 bg-blue-500 text-white text-sm py-1 px-3 rounded-md flex items-center justify-center">
                  <span>Display on Map</span>
                </button>
                <button 
                  className="flex-1 bg-blue-500 text-white text-sm py-1 px-3 rounded-md flex items-center justify-center"
                  onClick={handlePlot}
                >
                  <span>Plot Time Series</span>
                </button>
              </div>
            )}
          </div>
        )}
        
        {selectionType === 'browse' && (
          <div className="mt-2">
            <div className="border-2 border-dashed border-gray-300 rounded-md p-4 mb-3">
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
                  {selectedFile ? selectedFile.name : 'Upload shapefile of recharge zones (subbasins or HRUs)'}
                </p>
                
                <label className="bg-blue-50 text-blue-600 text-sm py-1 px-3 rounded-md cursor-pointer hover:bg-blue-100">
                  Browse Files
                  <input 
                    type="file" 
                    className="hidden" 
                    accept=".shp,.shx,.dbf"
                    onChange={handleFileChange}
                  />
                </label>
                
                <div className="flex items-center mt-1 relative">
                  <p className="text-xs text-gray-400">
                    Supports: Shapefile (.shp, .shx, .dbf)
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
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-72 bg-white shadow-lg rounded-md p-3 z-10 border border-gray-200">
                        <div className="text-xs">
                          <h4 className="font-semibold text-gray-800 mb-1">Required Shapefile Format:</h4>
                          <table className="w-full border-collapse text-xs mb-2">
                            <thead>
                              <tr className="bg-gray-100">
                                <th className="border border-gray-300 px-1 py-1 text-left">Column</th>
                                <th className="border border-gray-300 px-1 py-1 text-left">Description</th>
                                <th className="border border-gray-300 px-1 py-1 text-left">Dtype</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td className="border border-gray-300 px-1 py-1">HRUID</td>
                                <td className="border border-gray-300 px-1 py-1">The ID for the recharge zones (alphanumeric)</td>
                                <td className="border border-gray-300 px-1 py-1">string</td>
                              </tr>
                              <tr>
                                <td className="border border-gray-300 px-1 py-1">NAME1</td>
                                <td className="border border-gray-300 px-1 py-1">name of the assessment unit (optional)</td>
                                <td className="border border-gray-300 px-1 py-1">string</td>
                              </tr>
                            </tbody>
                          </table>
                          
                          <h4 className="font-semibold text-gray-800 mb-1">Required CSV Format:</h4>
                          <table className="w-full border-collapse text-xs">
                            <thead>
                              <tr className="bg-gray-100">
                                <th className="border border-gray-300 px-1 py-1 text-left">Column</th>
                                <th className="border border-gray-300 px-1 py-1 text-left">Description</th>
                                <th className="border border-gray-300 px-1 py-1 text-left">Dtype</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td className="border border-gray-300 px-1 py-1">HRUID</td>
                                <td className="border border-gray-300 px-1 py-1">The ID for the assessment unit</td>
                                <td className="border border-gray-300 px-1 py-1">string</td>
                              </tr>
                              <tr>
                                <td className="border border-gray-300 px-1 py-1">DATE</td>
                                <td className="border border-gray-300 px-1 py-1">Date (dd/mm/yyyy)</td>
                                <td className="border border-gray-300 px-1 py-1">Datetime</td>
                              </tr>
                              <tr>
                                <td className="border border-gray-300 px-1 py-1">TIME</td>
                                <td className="border border-gray-300 px-1 py-1">Time (HH:MM:SS) (optional)</td>
                                <td className="border border-gray-300 px-1 py-1">time</td>
                              </tr>
                              <tr>
                                <td className="border border-gray-300 px-1 py-1">GW RECH</td>
                                <td className="border border-gray-300 px-1 py-1">Groundwater recharge in m³/day</td>
                                <td className="border border-gray-300 px-1 py-1">float (.5f)</td>
                              </tr>
                            </tbody>
                          </table>
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
            
            <div className="border-2 border-dashed border-gray-300 rounded-md p-4">
              <div className="flex flex-col items-center justify-center">
                <p className="text-sm text-gray-500 mb-2">
                  Upload CSV with recharge time series data
                </p>
                
                <label className="bg-blue-50 text-blue-600 text-sm py-1 px-3 rounded-md cursor-pointer hover:bg-blue-100">
                  Browse Files
                  <input 
                    type="file" 
                    className="hidden" 
                    accept=".csv"
                    onChange={handleFileChange}
                  />
                </label>
              </div>
            </div>
            
            {selectedFile && (
              <div className="mt-3">
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
                        Validating...
                      </>
                    ) : (
                      <>
                        <span>Validate & Upload</span>
                        {uploadSuccess && (
                          <span className="ml-1 bg-white text-blue-500 rounded-full w-4 h-4 flex items-center justify-center text-xs">✓</span>
                        )}
                      </>
                    )}
                  </button>
                </div>
                
                {uploadSuccess && (
                  <p className="text-xs text-green-600 mt-1 text-center">
                    Files successfully validated and uploaded!
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      
      <button className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md mb-4">
        Compute Recharge
      </button>
    </div>
  );

  // Groundwater Demand
  const renderGroundwaterDemand = () => (
    <div>
      <h3 className="font-medium text-blue-600 mb-4">Groundwater Demand</h3>
  
      <div className="mb-4">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Demand Category</label>
          <select className="w-full p-2 border rounded-md text-sm">
            <option value="">Select Category...</option>
            <option value="agricultural">Agricultural</option>
            <option value="domestic">Domestic</option>
            <option value="industrial">Industrial</option>
            <option value="all">All Categories</option>
          </select>
        </div>
  
       
      </div>
  
      <button className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md">
        Analyze Demand
      </button>
      <div className="mt-4">
      <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Select Year</label>
          <select className="w-full p-2 border rounded-md text-sm">
            <option value="">Select Year</option>
            <option value="2011">2011</option>
            <option value="2012">2012</option>
            <option value="2013">2013</option>
            <option value="2014">2014</option>
          </select>
        </div>
      <button className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md">
        Compute GSR
      </button>
      </div>
    </div>
    
  );

  return (
    <div className="h-full overflow-auto flex flex-col">
      {renderGroundwaterRecharge()}
      {renderGroundwaterDemand()}
    </div>
  );
};

export default GroundwaterSustainability;