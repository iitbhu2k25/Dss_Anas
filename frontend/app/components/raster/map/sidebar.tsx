'use client'
import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Layers, Settings, Eye, EyeOff, RefreshCw, AlertTriangle, Info } from 'lucide-react';

// Updated interface definitions to work with OpenLayers component
interface RasterLayerProps {
  id: string;
  name: string;
  visible: boolean;
  url?: string;
  opacity?: number;
}

interface SidebarProps {
  selectedMapLibrary: 'openlayers' | 'leaflet';
  onMapLibraryChange: (library: 'openlayers' | 'leaflet') => void;
  onRasterSelectionChange?: (selectedRasters: RasterLayerProps[]) => void;
  pixelInfo?: Record<string, any>;
}

interface Organisation {
  id: string;
  name: string;
}

interface RasterFile {
  id: string;
  name: string;
  url?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  selectedMapLibrary, 
  onMapLibraryChange,
  onRasterSelectionChange,
  pixelInfo = {}
}) => {
  // State for Organisations and raster files
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [rasterFiles, setRasterFiles] = useState<RasterFile[]>([]);

  // State for selected items
  const [selectedOrganisation, setSelectedOrganisation] = useState<string>('');
  const [selectedRasterFile, setSelectedRasterFile] = useState<string>('');
  const [selectedRasterLayers, setSelectedRasterLayers] = useState<RasterLayerProps[]>([]);

  // UI state
  const [isOrganisationsLoading, setIsOrganisationsLoading] = useState<boolean>(true);
  const [isRasterFilesLoading, setIsRasterFilesLoading] = useState<boolean>(false);
  const [organisationsError, setOrganisationsError] = useState<string | null>(null);
  const [rasterFilesError, setRasterFilesError] = useState<string | null>(null);
  
  // Dropdown state
  const [organisationDropdownOpen, setOrganisationDropdownOpen] = useState<boolean>(false);
  const [rasterFileDropdownOpen, setRasterFileDropdownOpen] = useState<boolean>(false);

  // Fetch Organisations on component mount
  useEffect(() => {
    const fetchOrganisations = async () => {
      try {
        setIsOrganisationsLoading(true);
        setOrganisationsError(null);
        const response = await fetch('http://localhost:9000/api/raster_visual/categories/');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch Organisations: ${response.statusText}`);
        }      
          
        const data = await response.json();
        console.log("data is ",data)
        setOrganisations(data);
      } catch (error) {
        console.error('Error fetching Organisations:', error);
        setOrganisationsError(error instanceof Error ? error.message : 'Failed to load Organisations');
      } finally {
        setIsOrganisationsLoading(false);
      }
    };

    fetchOrganisations();
  }, []);

  // Fetch raster files when Organisation is selected
  useEffect(() => {
    if (!selectedOrganisation) return;
    
    const fetchRasterFiles = async () => {
      try {
        setIsRasterFilesLoading(true);
        setRasterFilesError(null);
        
        const response = await fetch(`http://localhost:9000/api/raster_visual/categories/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ organisation: selectedOrganisation }),
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch raster files: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Raster files:', data);
        setRasterFiles(data);
      } catch (error) {
        console.error('Error fetching raster files:', error);
        setRasterFilesError(error instanceof Error ? error.message : 'Failed to load raster files');
      } finally {
        setIsRasterFilesLoading(false);
      }
    };

    fetchRasterFiles();
  }, [selectedOrganisation]);

  // Handle Organisation selection
  const handleOrganisationSelect = (organisationName: string) => {
    setSelectedOrganisation(organisationName);
    setSelectedRasterFile(''); // Reset raster file selection
    setSelectedRasterLayers([]); // Reset raster layers
    setOrganisationDropdownOpen(false);
    
    // Clear any selected rasters in parent component
    if (onRasterSelectionChange) {
      onRasterSelectionChange([]);
    }
  };

  // Handle raster file selection
  const handleRasterFileSelect = async (rasterFileId: string) => {
    setSelectedRasterFile(rasterFileId);
    setRasterFileDropdownOpen(false);
    
    // Find the selected raster file
    const selectedFile = rasterFiles.find(file => file.id === rasterFileId);
    
    if (selectedFile && onRasterSelectionChange) {
      try {
        // Fetch detailed information including URL if not present
        let rasterUrl = selectedFile.url;
        
        if (!rasterUrl) {
          // Fetch the raster file URL
          const response = await fetch(`http://localhost:9000/api/raster_visual/rasters/${rasterFileId}/`);
          if (response.ok) {
            const data = await response.json();
            rasterUrl = data.file_url || data.url;
          }
        }
        
        // Create raster layer
        const rasterLayer: RasterLayerProps = {
          id: selectedFile.id,
          name: selectedFile.name,
          visible: true,
          url: rasterUrl,
          opacity: 1.0
        };
        
        setSelectedRasterLayers([rasterLayer]);
        onRasterSelectionChange([rasterLayer]);
        console.log('Selected raster layer:', rasterLayer);
      } catch (error) {
        console.error('Error fetching raster details:', error);
      }
    }
  };

  // Toggle raster layer visibility
  const toggleRasterVisibility = (rasterId: string) => {
    const updatedLayers = selectedRasterLayers.map(layer => 
      layer.id === rasterId ? { ...layer, visible: !layer.visible } : layer
    );
    
    setSelectedRasterLayers(updatedLayers);
    if (onRasterSelectionChange) {
      onRasterSelectionChange(updatedLayers);
    }
  };

  // Update raster layer opacity
  const updateRasterOpacity = (rasterId: string, opacity: number) => {
    const updatedLayers = selectedRasterLayers.map(layer => 
      layer.id === rasterId ? { ...layer, opacity } : layer
    );
    
    setSelectedRasterLayers(updatedLayers);
    if (onRasterSelectionChange) {
      onRasterSelectionChange(updatedLayers);
    }
  };

  // Remove raster layer
  const removeRasterLayer = (rasterId: string) => {
    const updatedLayers = selectedRasterLayers.filter(layer => layer.id !== rasterId);
    setSelectedRasterLayers(updatedLayers);
    if (onRasterSelectionChange) {
      onRasterSelectionChange(updatedLayers);
    }
  };

  // Get Organisation name by ID
  const getOrganisationName = (id: string) => {
    const org = organisations.find(org => org.id === id);
    return org ? org.name : 'Select an Organisation';
  };

  // Get raster file name by ID
  const getRasterFileName = (id: string) => {
    const file = rasterFiles.find(file => file.id === id);
    return file ? file.name : 'Select a raster file';
  };

  return (
    <div className="w-64 bg-white shadow-md p-4 h-full flex flex-col">
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
                <span className="truncate">{selectedRasterFile ? getRasterFileName(selectedRasterFile) : 'Select a raster file'}</span>
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
      
      {/* Selected Layers Section */}
      {selectedRasterLayers.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Selected Layers</h3>
          <ul className="space-y-2">
            {selectedRasterLayers.map(layer => (
              <li key={layer.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div className="flex items-center flex-1 min-w-0">
                  <button 
                    className="mr-2 text-gray-500 hover:text-gray-700 flex-shrink-0"
                    onClick={() => toggleRasterVisibility(layer.id)}
                    title={layer.visible ? "Hide layer" : "Show layer"}
                  >
                    {layer.visible ? 
                      <Eye className="h-4 w-4" /> : 
                      <EyeOff className="h-4 w-4" />
                    }
                  </button>
                  <span className="text-sm truncate">{layer.name}</span>
                </div>
                <button 
                  className="text-gray-500 hover:text-gray-700 ml-2 flex-shrink-0"
                  onClick={() => removeRasterLayer(layer.id)}
                  title="Remove layer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
          
          {/* Opacity Slider for the selected layer */}
          {selectedRasterLayers.length > 0 && (
            <div className="mt-3">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Opacity: {(selectedRasterLayers[0].opacity ?? 1) * 100}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={selectedRasterLayers[0].opacity ?? 1}
                onChange={(e) => updateRasterOpacity(selectedRasterLayers[0].id, parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          )}
        </div>
      )}
      
      {/* Pixel Information Display */}
      {Object.keys(pixelInfo).length > 0 && (
        <div className="mt-4 border-t pt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Pixel Information</h3>
          {Object.entries(pixelInfo).map(([rasterId, info]) => {
            const raster = selectedRasterLayers.find(r => r.id === rasterId);
            return (
              <div key={rasterId} className="mb-3 p-2 bg-gray-50 rounded text-xs">
                <p className="font-medium">{raster?.name || `Raster ${rasterId}`}</p>
                <p>
                  Lon: {info.coords[0].toFixed(6)}, Lat: {info.coords[1].toFixed(6)}
                </p>
                {info.value !== null ? (
                  <p>Value: {typeof info.value === 'number' ? info.value.toFixed(2) : info.value}</p>
                ) : (
                  <p className="text-red-500">{info.error || 'No data available'}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
      
      {/* Map Library Selection */}
      <div className="mt-auto pt-4 border-t">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Map Library</h3>
        <div className="flex space-x-2">
          <button
            className={`px-3 py-1 text-sm rounded ${selectedMapLibrary === 'openlayers' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
            onClick={() => onMapLibraryChange('openlayers')}
          >
            OpenLayers
          </button>
          <button
            className={`px-3 py-1 text-sm rounded ${selectedMapLibrary === 'leaflet' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
            onClick={() => onMapLibraryChange('leaflet')}
          >
            Leaflet
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;