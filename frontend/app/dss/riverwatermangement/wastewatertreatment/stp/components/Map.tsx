"use client";

import { useEffect, useState, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon issue in Next.js
const fixLeafletIcon = () => {
  // Only run on the client side
  if (typeof window !== 'undefined') {
    // @ts-ignore - Leaflet expects these assets to exist in the global scope
    delete L.Icon.Default.prototype._getIconUrl;
    
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });
  }
};

const Map = () => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mapType, setMapType] = useState<'street' | 'satellite' | 'terrain'>('street');
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layersRef = useRef<{
    street?: L.TileLayer;
    satellite?: L.TileLayer; 
    terrain?: L.TileLayer;
  }>({});

  // Handle fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (mapContainerRef.current?.requestFullscreen) {
        mapContainerRef.current.requestFullscreen().catch(err => {
          console.error(`Error attempting to enable fullscreen: ${err.message}`);
        });
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  // Initialize map on component mount
  useEffect(() => {
    // Fix the Leaflet icon issue
    fixLeafletIcon();

    // Initialize map if it doesn't exist
    if (!mapRef.current) {
      // Create map centered on India
      mapRef.current = L.map('leaflet-map', {
        center: [20.5937, 78.9629], // Center of India
        zoom: 5,
        zoomControl: true,
        attributionControl: true,
      });

      // Initialize tile layers
      layersRef.current.street = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      });

      layersRef.current.satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        maxZoom: 19,
      });

      // Empty tile layer for "No Basemap" option
      layersRef.current.terrain = L.tileLayer('', {
        attribution: '',
        maxZoom: 19,
      });

      // Add default street layer to map
      layersRef.current.street.addTo(mapRef.current);
    }

    // Monitor fullscreen changes
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);

    // Cleanup function
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      if (mapRef.current) {
        // We don't destroy the map on unmount as it causes issues with Next.js
        // Instead, we just make sure all event listeners are removed
        mapRef.current.off();
        // Don't call mapRef.current.remove() here as it causes problems with React's lifecycle
      }
    };
  }, []);

  // Change map type when mapType state changes
  useEffect(() => {
    if (mapRef.current && layersRef.current) {
      // Remove all existing layers
      Object.values(layersRef.current).forEach(layer => {
        if (layer && mapRef.current) {
          layer.removeFrom(mapRef.current);
        }
      });

      // Add the selected layer
      if (layersRef.current[mapType] && mapRef.current) {
        layersRef.current[mapType]!.addTo(mapRef.current);
      }
    }
  }, [mapType]);

  return (
    <div ref={mapContainerRef} className="bg-white rounded-lg shadow-sm h-full flex flex-col w-[750px]">
      <div className="bg-blue-600 text-white p-3 rounded-t-lg w-auto">
        <h3 className="text-lg font-semibold">
        <i className="fas fa-map-marker-alt mr-2 h-[30px]"></i>Map View
        </h3>
      </div>
      
      <div className="relative flex-grow rounded-b-lg overflow-hidden">
        {/* Map Controls */}
        <div className="absolute top-3 right-3 z-10 flex flex-col gap-2">
          <button 
            onClick={toggleFullscreen}
            className="bg-white p-2 rounded-md shadow-md hover:bg-gray-100 transition"
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            <i className={`fas fa-${isFullscreen ? 'compress' : 'expand'} text-gray-600`}></i>
          </button>
        </div>

        {/* Map Type Selector */}
        <div className="absolute top-3 left-3 z-10">
          <div className="bg-white rounded-md shadow-md p-1 flex">
            <button 
              onClick={() => setMapType('street')}
              className={`px-3 py-1.5 text-sm rounded ${mapType === 'street' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
              title="Street View"
            >
              <i className="fas fa-road mr-1"></i>
              <span>Map</span>
            </button>
            <button 
              onClick={() => setMapType('satellite')}
              className={`px-3 py-1.5 text-sm rounded ${mapType === 'satellite' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
              title="Satellite View"
            >
              <i className="fas fa-satellite mr-1"></i>
              <span>Satellite</span>
            </button>
            <button 
              onClick={() => setMapType('terrain')}
              className={`px-3 py-1.5 text-sm rounded ${mapType === 'terrain' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
              title="No Basemap"
            >
              <i className="fas fa-mountain mr-1"></i>
              <span>No Basemap</span>
            </button>
          </div>
        </div>

        {/* The actual map div */}
        <div id="leaflet-map" className="h-full w-full" />
      </div>
    </div>
  );
};

export default Map;