'use client';

import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Define props interface
interface MapProps {
  selectedState?: string;
}

// Create a separate component to handle map updates for state and base map
function MapLayers({ selectedState }: { selectedState?: string }) {
  const map = useMap();
  const [currentStateLayer, setCurrentStateLayer] = useState<L.GeoJSON | null>(null);
  const [baseMapLayer, setBaseMapLayer] = useState<L.GeoJSON | null>(null);
  const [isLoadingBase, setIsLoadingBase] = useState(true); // Track base map loading
  const [isLoadingState, setIsLoadingState] = useState(false); // Track state layer loading

  // Combined loading state
  const isLoading = isLoadingBase || isLoadingState;

  // GeoJSON style for state layer
  const stateGeoJsonStyle = {
    fillColor: '#3388ff',
    weight: 2,
    opacity: 1,
    color: 'red',
    dashArray: '3',
    fillOpacity: 0.5,
  };

  // GeoJSON style for base map (India)
  const baseMapGeoJsonStyle = {
    fillColor: '#blue',
    weight: 2,
    opacity: 2,
    color: 'blue',
    fillOpacity: 0,
  };

  // Fetch and display the base map of India on initial load
  useEffect(() => {
    let isMounted = true;

    const fetchBaseMap = async () => {
      try {
        setIsLoadingBase(true);
        console.log('Fetching base map for India');
        const response = await fetch('http://localhost:9000/api/basic/basemap/', {
          method: 'GET',
        });

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Base map data received:', data);

        // Validate GeoJSON
        if (!data || !data.type || data.type !== 'FeatureCollection' || !Array.isArray(data.features)) {
          throw new Error('Invalid GeoJSON: Expected a FeatureCollection with features');
        }

        // Filter out invalid features
        const validFeatures = data.features.filter((feature: any) => {
          return (
            feature &&
            feature.type === 'Feature' &&
            feature.geometry &&
            feature.geometry.coordinates &&
            feature.geometry.coordinates.length > 0
          );
        });

        if (validFeatures.length === 0) {
          throw new Error('No valid features found in GeoJSON');
        }

        // Create a new GeoJSON layer for the base map
        const newBaseLayer = L.geoJSON(
          { type: 'FeatureCollection', features: validFeatures },
          {
            style: baseMapGeoJsonStyle,
            onEachFeature: (feature, layer) => {
              if (feature.properties && feature.properties.name) {
                layer.bindPopup(feature.properties.name);
              }
            },
          }
        );

        // Ensure map is ready before adding the layer
        map.whenReady(() => {
          if (isMounted) {
            newBaseLayer.addTo(map);
            setBaseMapLayer(newBaseLayer);

            // Fit map to the bounds of the base map
            try {
              const bounds = newBaseLayer.getBounds();
              if (bounds.isValid()) {
                map.fitBounds(bounds);
              } else {
                console.warn('Invalid bounds for base map layer');
              }
            } catch (error) {
              console.error('Error fitting map to base map bounds:', error);
            }
            
            // Important: Set loading to false after map operations are complete
            setIsLoadingBase(false);
          }
        });
      } catch (error) {
        console.error('Error fetching or rendering base map:', error);
        if (isMounted) {
          setIsLoadingBase(false); // Ensure loading state is reset even on error
        }
      }
    };

    fetchBaseMap();

    // Cleanup base map layer on component unmount
    return () => {
      isMounted = false;
      if (baseMapLayer) {
        try {
          map.removeLayer(baseMapLayer);
        } catch (error) {
          console.error('Error removing base map layer:', error);
        }
      }
    };
  }, [map]);

  // Handle state-specific shapefile updates
  useEffect(() => {
    console.log('StateLayer: selectedState changed to', selectedState);
    
    // Set loading state as soon as state changes
    if (selectedState) {
      setIsLoadingState(true);
    }

    // Create a cleanup function to properly handle the current state layer
    const cleanupCurrentStateLayer = () => {
      if (currentStateLayer) {
        console.log('Removing existing state layer');
        try {
          map.removeLayer(currentStateLayer);
          setCurrentStateLayer(null);
        } catch (error) {
          console.error('Error removing state layer:', error);
        }
      }
    };
    
    // Clean up the current state layer first
    cleanupCurrentStateLayer();
    
    // Exit if no state is selected
    if (!selectedState) {
      setIsLoadingState(false);
      return;
    }

    const fetchStateShapefile = async () => {
      try {
        console.log('Fetching shapefile for state:', selectedState);
        const response = await fetch('http://localhost:9000/api/basic/state-shapefile/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ state_code: selectedState }),
        });

        if (!response.ok) {
          alert('Due to unavailability of the JSON data, the map will not be displayed for the selected state. Please select another state.');
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        console.log('State shapefile data received:', data);

        // Validate GeoJSON
        if (!data || !data.type || data.type !== 'FeatureCollection' || !Array.isArray(data.features)) {
          throw new Error('Invalid GeoJSON: Expected a FeatureCollection with features');
        }

        // Filter out invalid features
        const validFeatures = data.features.filter((feature: any) => {
          return (
            feature &&
            feature.type === 'Feature' &&
            feature.geometry &&
            feature.geometry.coordinates &&
            feature.geometry.coordinates.length > 0
          );
        });

        if (validFeatures.length === 0) {
          throw new Error('No valid features found in state GeoJSON');
        }

        // Create a new GeoJSON layer for the state
        const newStateLayer = L.geoJSON(
          { type: 'FeatureCollection', features: validFeatures },
          {
            style: stateGeoJsonStyle,
            onEachFeature: (feature, layer) => {
              if (feature.properties && feature.properties.name) {
                layer.bindPopup(feature.properties.name);
              }
            },
          }
        );

        // Ensure map is ready before adding the layer
        map.whenReady(() => {
          // Make sure any existing layer is removed again (redundant but safe)
          cleanupCurrentStateLayer();
          
          // Add the new layer and update state
          newStateLayer.addTo(map);
          setCurrentStateLayer(newStateLayer);

          // Fit map to the bounds of the state layer
          try {
            const bounds = newStateLayer.getBounds();
            if (bounds.isValid()) {
              map.fitBounds(bounds);
            } else {
              console.warn('Invalid bounds for state layer');
            }
          } catch (error) {
            console.error('Error fitting map to state layer bounds:', error);
          }
          
          // Set loading state to false only after everything is complete
          setIsLoadingState(false);
        });
      } catch (error) {
        console.error('Error fetching or rendering state shapefile:', error);
        setIsLoadingState(false); // Ensure loading state is reset even on error
      }
    };

    // Start fetching the new state data
    fetchStateShapefile();

    // Cleanup state layer on component unmount or when selectedState changes
    return () => {
      cleanupCurrentStateLayer();
    };
  }, [selectedState, map]);

  return (
    <>
      {isLoading && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[1000]">
          <button className="flex items-center bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg animate-pulse">
            <svg
              className="animate-spin h-5 w-5 mr-2 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Loading...
          </button>
        </div>
      )}
    </>
  );
}

export default function Map({ selectedState }: MapProps) {
  console.log('Map component rendering with selectedState:', selectedState);

  // Fix Leaflet icon issues
  useEffect(() => {
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
    });
  }, []);

  // Load Google Traffic Layer (optional, may need revision)
  useEffect(() => {
    const loadGoogleTrafficLayer = () => {
      if (window.google && window.google.maps) {
        const mapElement = document.querySelector('.leaflet-container');
        if (mapElement && mapElement._leaflet_map) {
          const trafficLayer = new window.google.maps.TrafficLayer();
          trafficLayer.setMap(mapElement._leaflet_map);
        }
      }
    };

    // Add a delay to ensure the map is fully loaded
    const timer = setTimeout(() => {
      loadGoogleTrafficLayer();
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative">
      <MapContainer
        center={[22.9734, 78.6569]} // India center coordinates
        zoom={4}
        className="map-container  border-4 border-blue-500 rounded-xl shadow-lg p-4 hover:border-green-500 hover:shadow-2xl transition-all duration-300 w-[30vw] h-[48vh] mx-auto"
        worldCopyJump={true}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {/* Use the child component to handle base map and state updates */}
        <MapLayers selectedState={selectedState} />
        {/* Optional: Debug display */}
        {selectedState && (
          <div className="absolute bottom-2 left-2 bg-white px-2 py-1 text-xs rounded shadow z-[1000]">
            Selected State: {selectedState}
          </div>
        )}
      </MapContainer>
    </div>
  );
}