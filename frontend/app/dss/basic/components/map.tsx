'use client';

import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Define props interface
interface MapProps {
  selectedState?: string;
  selectedDistricts?: string[];
  selectedSubDistricts?: string[]; // Add this line
}

// Create a separate component to handle map updates
function MapLayers({ 
  selectedState, 
  selectedDistricts,
  selectedSubDistricts // Add this parameter
}: { 
  selectedState?: string; 
  selectedDistricts?: string[];
  selectedSubDistricts?: string[]; // Add this type
}) {
  const map = useMap();
  // Add state for sub-district layers
  const [currentSubDistrictLayers, setCurrentSubDistrictLayers] = useState<L.GeoJSON | null>(null);
  const [isLoadingSubDistricts, setIsLoadingSubDistricts] = useState(false);
  
  
  // Update the combined loading state
  const isLoading = isLoadingBase || isLoadingState || isLoadingDistricts || isLoadingSubDistricts;
  
  // Add styling for sub-districts
  const subDistrictGeoJsonStyle = {
    fillColor: '#ff6b6b',
    weight: 4,
    opacity: 1,
    color: 'purple',
    dashArray: '5',
    fillOpacity: 0.4,
  };
  
  // Add the sub-district effect cleanup whenever district changes
  useEffect(() => {
    // Clear sub-district layers when district selection changes
    if (currentSubDistrictLayers) {
      console.log('Districts changed: Removing sub-district layers');
      try {
        map.removeLayer(currentSubDistrictLayers);
        setCurrentSubDistrictLayers(null);
      } catch (error) {
        console.error('Error removing sub-district layers:', error);
      }
    }
    
    // Reset sub-district loading state
    setIsLoadingSubDistricts(false);
  }, [selectedDistricts, map]);
  
  // Add this effect to handle sub-district layers
  useEffect(() => {
    console.log('SubDistrictLayers: selectedSubDistricts changed to', selectedSubDistricts);
    
    // Create a cleanup function for the sub-district layers
    const cleanupCurrentSubDistrictLayers = () => {
      if (currentSubDistrictLayers) {
        console.log('Removing existing sub-district layers');
        try {
          map.removeLayer(currentSubDistrictLayers);
          setCurrentSubDistrictLayers(null);
        } catch (error) {
          console.error('Error removing sub-district layers:', error);
        }
      }
    };
    
    // Clean up current sub-district layers first
    cleanupCurrentSubDistrictLayers();
    
    // Exit if no sub-districts are selected or prerequisites are missing
    if (!selectedSubDistricts || selectedSubDistricts.length === 0 || !selectedState || !selectedDistricts || selectedDistricts.length === 0) {
      setIsLoadingSubDistricts(false);
      return;
    }
    
    // Set loading state for sub-districts
    setIsLoadingSubDistricts(true);
    
    const fetchSubDistrictShapefiles = async () => {
      try {
        console.log('Fetching shapefiles for sub-districts:', selectedSubDistricts);
        
        // Prepare request payload for the API
        // We need to match each sub-district with its parent district
        const subDistrictPayload = {
          subdistricts: selectedSubDistricts.map(subDistrictCode => {
            // Find the district this sub-district belongs to
            // This is a simplification - you'll need to determine the correct district for each sub-district
            // You might need to store a mapping of sub-districts to their parent districts
            const subDistrictObj = subDistricts?.find(sd => sd.id.toString() === subDistrictCode);
            return {
              district_c: subDistrictObj?.districtId.toString() || '',
              subdis_cod: subDistrictCode
            };
          }).filter(item => item.district_c !== '') // Filter out items with missing district codes
        };
        
        console.log('Sub-district API request payload:', subDistrictPayload);
        
        const response = await fetch('http://localhost:9000/api/basic/multiple-subdistricts/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(subDistrictPayload),
        });
        
        if (!response.ok) {
          console.error('Failed to fetch sub-district data:', response.status);
          setIsLoadingSubDistricts(false);
          return;
        }
        
        const data = await response.json();
        console.log('Sub-district shapefile data received:', data);
        
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
          throw new Error('No valid features found in sub-district GeoJSON');
        }
        
        // Create new GeoJSON layer for sub-districts
        const newSubDistrictLayers = L.geoJSON(
          { type: 'FeatureCollection', features: validFeatures },
          {
            style: subDistrictGeoJsonStyle,
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
          cleanupCurrentSubDistrictLayers();
          
          // Add the new layer and update state
          newSubDistrictLayers.addTo(map);
          setCurrentSubDistrictLayers(newSubDistrictLayers);
          
          setIsLoadingSubDistricts(false);
        });
      } catch (error) {
        console.error('Error fetching or rendering sub-district shapefiles:', error);
        setIsLoadingSubDistricts(false);
      }
    };
    
    // Start fetching sub-district data
    fetchSubDistrictShapefiles();
    
    // Cleanup sub-district layers on unmount or when selections change
    return () => {
      cleanupCurrentSubDistrictLayers();
    };
  }, [selectedSubDistricts, selectedDistricts, selectedState, map, subDistricts]);

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

export default function Map({ selectedState, selectedDistricts, selectedSubDistricts }: MapProps) {
  console.log('Map component rendering with selectedState:', selectedState);
  console.log('Map component rendering with selectedDistricts:', selectedDistricts);
  console.log('Map component rendering with selectedSubDistricts:', selectedSubDistricts);

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
        <MapLayers 
          selectedState={selectedState} 
          selectedDistricts={selectedDistricts}
          selectedSubDistricts={selectedSubDistricts} // Add this prop
        />
        
        {/* Optional: Debug display for state and districts */}
        <div className="absolute bottom-2 left-2 bg-white px-2 py-1 text-xs rounded shadow z-[1000]">
          {selectedState && <div>Selected State: {selectedState}</div>}
          {selectedDistricts && selectedDistricts.length > 0 && (
            <div>Selected Districts Count: {selectedDistricts.length}</div>
          )}
          {selectedSubDistricts && selectedSubDistricts.length > 0 && (
            <div>Selected Sub-Districts Count: {selectedSubDistricts.length}</div>
          )}
        </div>
      </MapContainer>
    </div>
  );
}