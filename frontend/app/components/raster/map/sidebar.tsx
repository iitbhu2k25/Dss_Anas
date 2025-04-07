'use client'
import { ChevronDown, ChevronUp, Layers, Eye, EyeOff, RefreshCw, AlertTriangle } from 'lucide-react';
import { useMapContext } from '@/app/contexts/MapContext';
import { useEffect } from 'react';

const Sidebar: React.FC = () => {
  const {
    selectedRasterLayers,
    selectedOrganisation,
    selectedRasterFile,
    pixelInfo,
    isOrganisationsLoading,
    isRasterFilesLoading,
    organisationsError,
    rasterFilesError,
    organisationDropdownOpen,
    rasterFileDropdownOpen,
    organisations,
    rasterFiles,
    handleOrganisationSelect,
    handleRasterFileSelect,
    toggleRasterVisibility,
    updateRasterOpacity,
    removeRasterLayer,
    setOrganisationDropdownOpen,
    setRasterFileDropdownOpen,
    getOrganisationName,
    getRasterFileName
  } = useMapContext();

  // Get the currently active (visible) layer, if any
  const activeLayer = selectedRasterLayers.find(layer => layer.visible);
  
  // Debug logging
  useEffect(() => {
    console.log("Selected organisation:", selectedOrganisation);
    console.log("Available organisations:", organisations);
  }, [selectedOrganisation, organisations]);
  
  useEffect(() => {
    console.log("Raster files:", rasterFiles);
  }, [rasterFiles]);

  return (
    <div className="w-100 bg-white shadow-md p-4 h-full flex flex-col">
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2 flex items-center">
          <Layers className="mr-2 h-5 w-5 text-blue-500" />
          Raster Viewer
        </h2>
        
        <div className="space-y-4">
          {/* Organisation Dropdown */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Select Organisation
            </label>
            <div className="relative">
              <button
                type="button"
                className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-left text-sm flex justify-between items-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                onClick={() => setOrganisationDropdownOpen(!organisationDropdownOpen)}
                disabled={isOrganisationsLoading}
              >
                <span className="truncate">{selectedOrganisation ? getOrganisationName(selectedOrganisation) : 'Select an Organisation'}</span>
                {isOrganisationsLoading ? (
                  <RefreshCw className="h-4 w-4 text-gray-400 animate-spin" />
                ) : (
                  organisationDropdownOpen ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />
                )}
              </button>
              
              {organisationDropdownOpen && (
                <ul className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-sm ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none">
                  {organisations.length > 0 ? (
                    organisations.map((org) => (
                      <li
                        key={org.id}
                        className={`cursor-pointer select-none relative py-2 px-3 hover:bg-blue-50 ${selectedOrganisation === org.id ? 'bg-blue-100 text-blue-900' : 'text-gray-900'}`}
                        onClick={() => handleOrganisationSelect(org.name)}
                      >
                        {org.name}
                      </li>
                    ))
                  ) : (
                    <li className="cursor-default select-none relative py-2 px-3 text-gray-500">
                      {organisationsError ? 'Error loading Organisations' : 'No Organisations available'}
                    </li>
                  )}
                </ul>
              )}
            </div>
            
            {organisationsError && (
              <div className="text-red-500 text-xs flex items-center mt-1">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {organisationsError}
              </div>
            )}
          </div>
          
          {/* Raster File Dropdown */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Select raster file
            </label>
            <div className="relative">
              <button
                type="button"
                className={`w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-left text-sm flex justify-between items-center focus:outline-none ${!selectedOrganisation ? 'bg-gray-100 cursor-not-allowed' : 'focus:ring-2 focus:ring-blue-500 focus:border-blue-500'}`}
                onClick={() => setRasterFileDropdownOpen(!rasterFileDropdownOpen)}
                disabled={!selectedOrganisation || isRasterFilesLoading}
              >
                <span className="truncate">
                  {selectedRasterFile ? getRasterFileName(selectedRasterFile) : 'Select a raster file'}
                </span>
                {isRasterFilesLoading ? (
                  <RefreshCw className="h-4 w-4 text-gray-400 animate-spin" />
                ) : (
                  rasterFileDropdownOpen ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />
                )}
              </button>
              
              {rasterFileDropdownOpen && (
                <ul className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-sm ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none">
                  {rasterFiles.length > 0 ? (
                    rasterFiles.map((file) => (
                      <li
                        key={file.id}
                        className={`cursor-pointer select-none relative py-2 px-3 hover:bg-blue-50 ${selectedRasterFile === file.id ? 'bg-blue-100 text-blue-900' : 'text-gray-900'}`}
                        onClick={() => handleRasterFileSelect(file.id)}
                      >
                        {file.name}
                      </li>
                    ))
                  ) : (
                    <li className="cursor-default select-none relative py-2 px-3 text-gray-500">
                      {rasterFilesError ? 'Error loading raster files' : 'No raster files available'}
                    </li>
                  )}
                </ul>
              )}
            </div>
            
            {rasterFilesError && (
              <div className="text-red-500 text-xs flex items-center mt-1">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {rasterFilesError}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Available Layers Section */}
      {selectedRasterLayers.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Available Layers</h3>
          <ul className="space-y-2">
            {selectedRasterLayers.map(layer => (
              <li key={layer.id} className={`p-2 rounded ${layer.visible ? 'bg-blue-50' : 'bg-gray-50'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center flex-1 min-w-0">
                    <button 
                      className={`mr-2 hover:text-gray-700 flex-shrink-0 ${layer.visible ? 'text-blue-500' : 'text-gray-500'}`}
                      onClick={() => toggleRasterVisibility(layer.id)}
                      title={layer.visible ? "Active layer" : "Show this layer"}
                    >
                      {layer.visible ? 
                        <Eye className="h-4 w-4" /> : 
                        <EyeOff className="h-4 w-4" />
                      }
                    </button>
                    <span className={`text-sm truncate ${layer.visible ? 'font-medium' : ''}`}>{layer.name}</span>
                  </div>
                  <button 
                    className="text-gray-500 hover:text-red-500 ml-2 flex-shrink-0"
                    onClick={() => removeRasterLayer(layer.id)}
                    title="Remove layer"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                {/* Only show opacity controls for visible layers */}
                {layer.visible && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-medium text-gray-700">
                        Opacity
                      </label>
                      <span className="text-xs text-gray-500">
                        {Math.round(((layer.opacity ?? 1) * 100))}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={layer.opacity ?? 1}
                      onChange={(e) => updateRasterOpacity(layer.id, parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer mt-1"
                    />
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Pixel Information Display */}
      {Object.keys(pixelInfo).length > 0 && (
        <div className="mt-4 border-t pt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Pixel Information</h3>
          {Object.entries(pixelInfo).map(([rasterId, info]) => {
            const raster = selectedRasterLayers.find(r => r.id === rasterId);
            if (!raster?.visible) return null; // Only show info for active layers
            
            return (
              <div key={rasterId} className="mb-3 p-2 bg-gray-50 rounded text-xs">
                <p className="font-medium">{raster?.name || `Raster ${rasterId}`}</p>
                {info.loading ? (
                  <div className="flex items-center mt-1">
                    <RefreshCw className="h-3 w-3 text-gray-400 animate-spin mr-1" />
                    <span>Loading data...</span>
                  </div>
                ) : (
                  <>
                    <p>
                      Lon: {info.coords[0].toFixed(6)}, Lat: {info.coords[1].toFixed(6)}
                    </p>
                    {info.value !== null ? (
                      <p>Value: {typeof info.value === 'number' ? info.value.toFixed(2) : info.value}</p>
                    ) : (
                      <p className="text-red-500">{info.error || 'No data available'}</p>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
      
      {/* Footer info */}
      <div className="mt-auto pt-4 border-t">
        <div className="text-xs text-gray-500 text-center">
          Powered by OpenLayers
        </div>
      </div>
    </div>
  );
};

export default Sidebar;