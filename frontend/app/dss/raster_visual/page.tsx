'use client'
'use client';

import { useState } from 'react';
import Sidebar from '@/app/components/raster/map/sidebar';
import MapLibreMap from '@/app/components/raster/map/mapview';
import { RasterLayerProps, MapLibrary } from '@/app/types/raster';

const RasterLayout = () => {
  const [selectedRasters, setSelectedRasters] = useState<RasterLayerProps[]>([]);
  const [mapLibrary, setMapLibrary] = useState<MapLibrary>('openlayers');
  const [pixelInfo, setPixelInfo] = useState<Record<string, any>>({});
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleRasterSelect = (rasters: RasterLayerProps[]) => {
    setSelectedRasters(rasters);
  };

  const handleMapLibraryChange = (library: MapLibrary) => {
    setMapLibrary(library);
  };

  const handlePixelInfoRequest = (rasterId: string, coords: [number, number]) => {
    setPixelInfo(prev => ({
      ...prev,
      [rasterId]: {
        coords,
        value: Math.random() * 1000,
        timestamp: new Date().toISOString()
      }
    }));
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <div className="flex h-screen w-full bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Sidebar with collapsible functionality */}
      <div className={`transition-all duration-300 ease-in-out ${sidebarCollapsed ? 'w-16' : 'w-80'} h-full bg-white dark:bg-gray-800 shadow-lg z-10`}>
        <div className="flex justify-end p-2">
          <button 
            onClick={toggleSidebar}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-5 w-5 text-gray-500 dark:text-gray-400" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              {sidebarCollapsed ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              )}
            </svg>
          </button>
        </div>
        <div className={`${sidebarCollapsed ? 'invisible opacity-0' : 'visible opacity-100'} transition-opacity duration-300`}>
          <Sidebar
            selectedMapLibrary={mapLibrary}
            onMapLibraryChange={handleMapLibraryChange}
            onRasterSelectionChange={handleRasterSelect}
          />
        </div>
      </div>
      
      {/* Main content area */}
      <div className="flex-1 flex flex-col h-full">
        {/* Top bar with controls */}
        <div className="h-16 bg-white dark:bg-gray-800 border-b dark:border-gray-700 flex items-center justify-between px-6 shadow-sm">
          <h1 className="text-xl font-semibold text-gray-800 dark:text-white">Raster Map Viewer</h1>
          
          <div className="flex items-center space-x-4">
            <div className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 px-3 py-1 rounded-full text-sm">
              {mapLibrary === 'openlayers' ? 'OpenLayers' : 'Leaflet'}
            </div>
            <div className="bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-300 px-3 py-1 rounded-full text-sm">
              {selectedRasters.length} Layer{selectedRasters.length !== 1 ? 's' : ''} Active
            </div>
          </div>
        </div>
        
        {/* Map container */}
        <div className="flex-1 relative">
          <MapLibreMap
            selectedRasters={selectedRasters}
            onPixelInfoRequest={handlePixelInfoRequest}
          />
          
          {/* Pixel info overlay */}
          {Object.keys(pixelInfo).length > 0 && (
            <div className="absolute bottom-6 right-6 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg max-w-sm max-h-64 overflow-auto">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Pixel Information</h3>
              {Object.entries(pixelInfo).map(([rasterId, info]: [string, any]) => (
                <div key={rasterId} className="mb-3 pb-3 border-b dark:border-gray-700 last:border-0 last:mb-0 last:pb-0">
                  <div className="text-xs text-gray-500 dark:text-gray-400">Raster ID: {rasterId}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Coordinates: [{info.coords[0].toFixed(2)}, {info.coords[1].toFixed(2)}]
                  </div>
                  <div className="text-sm font-medium text-gray-800 dark:text-gray-200 mt-1">
                    Value: {info.value.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RasterLayout;