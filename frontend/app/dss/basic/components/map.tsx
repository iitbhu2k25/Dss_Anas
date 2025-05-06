'use client';

import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Define props interface
interface MapProps {
  selectedState?: string;
  selectedDistricts?: string[];
}

// Create a separate component to handle map updates
function MapLayers({ selectedState, selectedDistricts }: { selectedState?: string; selectedDistricts?: string[] }) {
  const map = useMap();
  const [currentStateLayer, setCurrentStateLayer] = useState<L.GeoJSON | null>(null);
  const [currentDistrictLayers, setCurrentDistrictLayers] = useState<L.GeoJSON | null>(null);
  const [baseMapLayer, setBaseMapLayer] = useState<L.GeoJSON | null>(null);
  const [isLoadingBase, setIsLoadingBase] = useState(true);
  const [isLoadingState, setIsLoadingState] = useState(false);
  const [isLoadingDistricts, setIsLoadingDistricts] = useState(false);

  // Combined loading state
  const isLoading = isLoadingBase || isLoadingState || isLoadingDistricts;

  // GeoJSON styles
  const stateGeoJsonStyle = {
    fillColor: '#3388ff',
    weight: 2,
    opacity: 1,
    color: 'red',
    dashArray: '1',
    fillOpacity: 0,
  };

  const districtGeoJsonStyle = {
    fillColor: '#33ff88',
    weight: 3,
    opacity: 1,
    color: 'green',
    dashArray: '3',
    fillOpacity: 0.3,
  };

  const baseMapGeoJsonStyle = {
    fillColor: '#blue',
    weight: 2,
    opacity: 1,
    color: 'blue',
    fillOpacity: 0,
  };

  // NEW EFFECT: Clear district layers whenever state changes
  useEffect(() => {
    // Clear district layers whenever state changes
    console.log('State changed to:', selectedState);
    
    // Remove existing district layers when state changes
    if (currentDistrictLayers) {
      console.log('State changed: Removing district layers');
      try {
        map.removeLayer(currentDistrictLayers);
        setCurrentDistrictLayers(null);
      } catch (error) {
        console.error('Error removing district layers:', error);
      }
    }
    
    // Reset district loading state
    setIsLoadingDistricts(false);
  }, [selectedState, map]); // Only depend on selectedState to detect changes

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
            
            setIsLoadingBase(false);
          }
        });
      } catch (error) {
        console.error('Error fetching or rendering base map:', error);
        if (isMounted) {
          setIsLoadingBase(false);
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
          
          setIsLoadingState(false);
        });
      } catch (error) {
        console.error('Error fetching or rendering state shapefile:', error);
        setIsLoadingState(false);
      }
    };

    // Start fetching the new state data
    fetchStateShapefile();

    // Cleanup state layer on component unmount or when selectedState changes
    return () => {
      cleanupCurrentStateLayer();
    };
  }, [selectedState, map]);

  // UPDATED: Handle district-specific shapefile updates
  useEffect(() => {
    console.log('DistrictLayers: selectedDistricts changed to', selectedDistricts);
    console.log('Current state for districts:', selectedState);
    
    // Create a cleanup function to properly handle the current district layers
    const cleanupCurrentDistrictLayers = () => {
      if (currentDistrictLayers) {
        console.log('Removing existing district layers');
        try {
          map.removeLayer(currentDistrictLayers);
          setCurrentDistrictLayers(null);
        } catch (error) {
          console.error('Error removing district layers:', error);
        }
      }
    };
    
    // Clean up current district layers first
    cleanupCurrentDistrictLayers();
    
    // Exit if no districts are selected or no state is selected
    if (!selectedDistricts || selectedDistricts.length === 0 || !selectedState) {
      setIsLoadingDistricts(false);
      return;
    }
    
    // Set loading state for districts
    setIsLoadingDistricts(true);

    const fetchDistrictShapefiles = async () => {
      try {
        // Extra validation check before making the API call
        if (!selectedState || !selectedDistricts || selectedDistricts.length === 0) {
          setIsLoadingDistricts(false);
          return;
        }
        
        console.log('Fetching shapefiles for districts:', selectedDistricts, 'for state:', selectedState);
        
        // Prepare request payload for the API
        const districtPayload = {
          districts: selectedDistricts.map(districtCode => {
            return {
              state_code: selectedState,
              district_c: districtCode
            };
          })
        };
        
        console.log('District API request payload:', districtPayload);
        
        const response = await fetch('http://localhost:9000/api/basic/multiple-districts/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(districtPayload),
        });

        if (!response.ok) {
          console.error('Failed to fetch district data:', response.status);
          setIsLoadingDistricts(false);
          return;
        }

        const data = await response.json();
        console.log('District shapefile data received:', data);

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
          throw new Error('No valid features found in district GeoJSON');
        }

        // Create new GeoJSON layer for districts
        const newDistrictLayers = L.geoJSON(
          { type: 'FeatureCollection', features: validFeatures },
          {
            style: districtGeoJsonStyle,
            onEachFeature: (feature, layer) => {
              if (feature.properties && feature.properties.name) {
                layer.bindPopup(feature.properties.name);
              }
            },
          }
        );

        // Ensure map is ready before adding the layer
        map.whenReady(() => {
          // Remove existing layers again (redundant but safe)
          cleanupCurrentDistrictLayers();
          
          // Add the new layer and update state
          newDistrictLayers.addTo(map);
          setCurrentDistrictLayers(newDistrictLayers);

          // Fit map to the bounds if no state layer is active
          if (!currentStateLayer) {
            try {
              const bounds = newDistrictLayers.getBounds();
              if (bounds.isValid()) {
                map.fitBounds(bounds);
              }
            } catch (error) {
              console.error('Error fitting map to district layer bounds:', error);
            }
          }
          
          setIsLoadingDistricts(false);
        });
      } catch (error) {
        console.error('Error fetching or rendering district shapefiles:', error);
        setIsLoadingDistricts(false);
      }
    };

    // Start fetching district data
    fetchDistrictShapefiles();

    // Cleanup district layers on unmount or when selectedDistricts changes
    return () => {
      cleanupCurrentDistrictLayers();
    };
  }, [selectedDistricts, selectedState, map, currentStateLayer]);

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

export default function Map({ selectedState, selectedDistricts }: MapProps) {
  console.log('Map component rendering with selectedState:', selectedState);
  console.log('Map component rendering with selectedDistricts:', selectedDistricts);

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
        className="map-container border-4 border-blue-500 rounded-xl shadow-lg p-4 hover:border-green-500 hover:shadow-2xl transition-all duration-300 w-[30vw] h-[48vh] mx-auto"
        worldCopyJump={true}
        maxBoundsViscosity={1.0}
        minZoom={2}
        scrollWheelZoom={true}
        doubleClickZoom={true}
      >
        <TileLayer 
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          noWrap={false}
          continuousWorld={true}
          bounds={[[-90, -180], [90, 180]]}
        />
        <MapLayers selectedState={selectedState} selectedDistricts={selectedDistricts} />
        
        {/* Optional: Debug display for state and districts */}
        <div className="absolute bottom-2 left-2 bg-white px-2 py-1 text-xs rounded shadow z-[1000]">
          {selectedState && <div>Selected State: {selectedState}</div>}
          {selectedDistricts && selectedDistricts.length > 0 && (
            <div>Selected Districts Count: {selectedDistricts.length}</div>
          )}
        </div>
      </MapContainer>
    </div>
  );
}