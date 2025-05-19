'use client';

import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Define props interface
interface MapProps {
  selectedState?: string;
  selectedDistricts?: string[];
  selectedSubDistricts?: string[];
  selectedVillages?: string[]; // Add this line
  subDistrictData?: any[];
}

// Create a separate component to handle map updates
function MapLayers({
  selectedState,
  selectedDistricts,
  selectedSubDistricts,
  selectedVillages, // Add this parameter
  subDistrictData
}: {
  selectedState?: string;
  selectedDistricts?: string[];
  selectedSubDistricts?: string[];
  selectedVillages?: string[]; // Add this type
  subDistrictData?: any[];
}) {
  const map = useMap();

  // Use refs to ensure we always have access to the most current layer objects
  const stateLayerRef = useRef<L.GeoJSON | null>(null);
  const districtLayersRef = useRef<L.GeoJSON | null>(null);
  const subDistrictLayersRef = useRef<L.GeoJSON | null>(null);
  const villageLayersRef = useRef<L.GeoJSON | null>(null); // Add this line
  const baseMapLayerRef = useRef<L.GeoJSON | null>(null);

  // State for UI loading indicators
  const [isLoadingBase, setIsLoadingBase] = useState(true);
  const [isLoadingState, setIsLoadingState] = useState(false);
  const [isLoadingDistricts, setIsLoadingDistricts] = useState(false);
  const [isLoadingSubDistricts, setIsLoadingSubDistricts] = useState(false);
  const [isLoadingVillages, setIsLoadingVillages] = useState(false); // Add this line

  // Track previous selection states for comparison
  const prevStateRef = useRef<string | undefined>();
  const prevDistrictsRef = useRef<string[] | undefined>([]);
  const prevSubDistrictsRef = useRef<string[] | undefined>([]);
  const prevVillagesRef = useRef<string[] | undefined>([]); // Add this line

  // Combined loading state
  const isLoading = isLoadingBase || isLoadingState || isLoadingDistricts || isLoadingSubDistricts || isLoadingVillages; // Add isLoadingVillages

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

  const subDistrictGeoJsonStyle = {
    fillColor: '#ff6b6b',
    weight: 4,
    opacity: 1,
    color: 'blue',
    dashArray: '5',
    fillOpacity: 0.4,
  };

  const villageGeoJsonStyle = { // Add this style
    fillColor: '#ffff00',
    weight: 1,
    opacity: 1,
    color: 'purple',
    dashArray: '2',
    fillOpacity: 0.5,
  };

  const baseMapGeoJsonStyle = {
    fillColor: '#blue',
    weight: 2,
    opacity: 1,
    color: 'blue',
    fillOpacity: 0,
  };

  // Helper function to clean up district layers - using ref for more reliable access
  const cleanupDistrictLayers = () => {
    if (districtLayersRef.current) {
      console.log('FORCE REMOVING district layers');
      try {
        map.removeLayer(districtLayersRef.current);
        districtLayersRef.current = null;
      } catch (error) {
        console.error('Error removing district layers:', error);
      }
    }
  };

  // Helper function to clean up sub-district layers - using ref for more reliable access
  const cleanupSubDistrictLayers = () => {
    if (subDistrictLayersRef.current) {
      console.log('FORCE REMOVING sub-district layers');
      try {
        map.removeLayer(subDistrictLayersRef.current);
        subDistrictLayersRef.current = null;
      } catch (error) {
        console.error('Error removing sub-district layers:', error);
      }
    }
  };

  // Helper function to clean up village layers - using ref for more reliable access
  const cleanupVillageLayers = () => { // Add this function
    if (villageLayersRef.current) {
      console.log('FORCE REMOVING village layers');
      try {
        map.removeLayer(villageLayersRef.current);
        villageLayersRef.current = null;
      } catch (error) {
        console.error('Error removing village layers:', error);
      }
    }
  };

  // Helper function to clean up state layer - using ref for more reliable access
  const cleanupStateLayer = () => {
    if (stateLayerRef.current) {
      console.log('FORCE REMOVING state layer');
      try {
        map.removeLayer(stateLayerRef.current);
        stateLayerRef.current = null;
      } catch (error) {
        console.error('Error removing state layer:', error);
      }
    }
  };

  // Force cleanup when state changes
  useEffect(() => {
    // Check if state has actually changed
    if (selectedState !== prevStateRef.current) {
      console.log('*** STATE CHANGED: Forcing cleanup of district, subdistrict, and village layers ***');
      cleanupDistrictLayers();
      cleanupSubDistrictLayers();
      cleanupVillageLayers(); // Add this line

      // Always clear loading states when state changes
      setIsLoadingDistricts(false);
      setIsLoadingSubDistricts(false);
      setIsLoadingVillages(false); // Add this line

      // Update previous state ref
      prevStateRef.current = selectedState;
    }
  }, [selectedState, map]);

  // Force cleanup when districts change
  useEffect(() => {
    // Deep compare arrays to check if districts have actually changed
    const prevDistrictsJSON = JSON.stringify(prevDistrictsRef.current || []);
    const currentDistrictsJSON = JSON.stringify(selectedDistricts || []);

    if (prevDistrictsJSON !== currentDistrictsJSON) {
      console.log('*** DISTRICTS CHANGED: Forcing cleanup of subdistrict and village layers ***');
      cleanupSubDistrictLayers();
      cleanupVillageLayers(); // Add this line

      // Always clear subdistrict and village loading states when districts change
      setIsLoadingSubDistricts(false);
      setIsLoadingVillages(false); // Add this line

      // Update previous districts ref
      prevDistrictsRef.current = selectedDistricts;
    }
  }, [selectedDistricts, map]);

  // Track subdistrict changes
  useEffect(() => {
    const prevSubDistrictsJSON = JSON.stringify(prevSubDistrictsRef.current || []);
    const currentSubDistrictsJSON = JSON.stringify(selectedSubDistricts || []);

    if (prevSubDistrictsJSON !== currentSubDistrictsJSON) {
      console.log('*** SUBDISTRICTS CHANGED: Forcing cleanup of village layers ***');
      // Clear existing subdistrict layers before loading new ones
      cleanupSubDistrictLayers();
      cleanupVillageLayers(); // Add this line

      // Clear village loading state when subdistricts change
      setIsLoadingVillages(false); // Add this line

      // Update previous subdistricts ref
      prevSubDistrictsRef.current = selectedSubDistricts;
    }
  }, [selectedSubDistricts, map]);

  // Track village changes - Add this useEffect
  useEffect(() => {
    const prevVillagesJSON = JSON.stringify(prevVillagesRef.current || []);
    const currentVillagesJSON = JSON.stringify(selectedVillages || []);

    if (prevVillagesJSON !== currentVillagesJSON) {
      console.log('*** VILLAGES CHANGED ***');
      // Clear existing village layers before loading new ones
      cleanupVillageLayers();

      // Update previous villages ref
      prevVillagesRef.current = selectedVillages;
    }
  }, [selectedVillages, map]);

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
        console.log('Base map data received');

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
            // Remove existing base map if it exists
            if (baseMapLayerRef.current) {
              try {
                map.removeLayer(baseMapLayerRef.current);
              } catch (error) {
                console.error('Error removing base map layer:', error);
              }
            }

            newBaseLayer.addTo(map);
            baseMapLayerRef.current = newBaseLayer;

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
      if (baseMapLayerRef.current) {
        try {
          map.removeLayer(baseMapLayerRef.current);
          baseMapLayerRef.current = null;
        } catch (error) {
          console.error('Error removing base map layer:', error);
        }
      }
    };
  }, [map]);

  // Handle state-specific shapefile updates
  useEffect(() => {
    console.log('StateLayer: selectedState changed to', selectedState);

    // Clean up the current state layer first
    cleanupStateLayer();

    // Exit if no state is selected
    if (!selectedState) {
      setIsLoadingState(false);
      return;
    }

    // Set loading state as soon as state changes
    setIsLoadingState(true);

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
        console.log('State shapefile data received');

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
          // Make sure any existing layer is removed again
          cleanupStateLayer();

          // Add the new layer and update state
          newStateLayer.addTo(map);
          stateLayerRef.current = newStateLayer;

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
      cleanupStateLayer();
    };
  }, [selectedState, map]);

  // Handle district-specific shapefile updates
  useEffect(() => {
    console.log('DistrictLayers: selectedDistricts changed to', selectedDistricts);
    console.log('Current state for districts:', selectedState);

    // Clean up current district layers first
    cleanupDistrictLayers();

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
          alert('We have data only for uttar pradesh ');
          console.error('Failed to fetch district data:', response.status);
          setIsLoadingDistricts(false);
          return;
        }

        const data = await response.json();
        console.log('District shapefile data received');

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
          // Remove existing layers again to be sure
          cleanupDistrictLayers();

          // Add the new layer and update state
          newDistrictLayers.addTo(map);
          districtLayersRef.current = newDistrictLayers;

          // Fit map to the bounds if no state layer is active
          try {
            const bounds = newDistrictLayers.getBounds();
            if (bounds.isValid()) {
              // The padding value [50, 50] makes the view zoom in a bit more
              map.fitBounds(bounds, { padding: [50, 50] });
            }
          } catch (error) {
            console.error('Error fitting map to district layer bounds:', error);
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
      cleanupDistrictLayers();
    };
  }, [selectedDistricts, selectedState, map]);

  // Handle sub-district-specific shapefile updates
  useEffect(() => {
    console.log('SubDistrictLayers: selectedSubDistricts changed to', selectedSubDistricts);

    // Clean up current sub-district layers first
    cleanupSubDistrictLayers();

    // Exit if no sub-districts are selected
    if (!selectedSubDistricts || selectedSubDistricts.length === 0) {
      setIsLoadingSubDistricts(false);
      return;
    }

    // Set loading state for sub-districts
    setIsLoadingSubDistricts(true);

    const fetchSubDistrictShapefiles = async () => {
      try {
        console.log('Fetching shapefiles for sub-districts:', selectedSubDistricts);

        // UPDATED: Only send subdis_cod in the payload
        const subDistrictPayload = {
          subdistricts: selectedSubDistricts.map(subDistrictCode => ({
            subdis_cod: subDistrictCode
          }))
        };

        console.log('SubDistrict API request payload:', subDistrictPayload);

        const response = await fetch('http://localhost:9000/api/basic/multiple-subdistricts/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(subDistrictPayload),
        });

        if (!response.ok) {
          console.error('Failed to fetch subdistrict data:', response.status);
          setIsLoadingSubDistricts(false);
          return;
        }

        const data = await response.json();
        console.log('SubDistrict shapefile data received');

        // Validate the GeoJSON
        if (!data || !data.features || data.features.length === 0) {
          console.warn('No valid subdistrict data received');
          setIsLoadingSubDistricts(false);
          return;
        }

        // Create new GeoJSON layer for sub-districts
        const newSubDistrictLayers = L.geoJSON(
          data,
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
          // Remove existing layers again to be sure
          cleanupSubDistrictLayers();

          // Add the new layer and update state
          newSubDistrictLayers.addTo(map);
          subDistrictLayersRef.current = newSubDistrictLayers;

          try {
            const bounds = newSubDistrictLayers.getBounds();
            if (bounds.isValid()) {
              // Using a larger padding for an even closer zoom
              map.fitBounds(bounds, { padding: [30, 30] });
            }
          } catch (error) {
            console.error('Error fitting map to sub-district layer bounds:', error);
          }

          setIsLoadingSubDistricts(false);
        });
      } catch (error) {
        console.error('Error fetching or rendering sub-district shapefiles:', error);
        setIsLoadingSubDistricts(false);
      }
    };
    // Start fetching sub-district data
    fetchSubDistrictShapefiles();

    // Cleanup sub-district layers on unmount or when selectedSubDistricts changes
    return () => {
      cleanupSubDistrictLayers();
    };
  }, [selectedSubDistricts, map]);

  // Handle village-specific shapefile updates - Add this useEffect
  useEffect(() => {
    console.log('VillageLayers: selectedVillages changed to', selectedVillages);

    // Clean up current village layers first
    cleanupVillageLayers();

    // Exit if no villages are selected
    if (!selectedVillages || selectedVillages.length === 0) {
      setIsLoadingVillages(false);
      return;
    }

    // Set loading state for villages
    setIsLoadingVillages(true);

    const fetchVillageShapefiles = async () => {
      try {
        console.log('Fetching shapefiles for villages:', selectedVillages);

        // Prepare the payload for the multiple villages API
        const villagePayload = {
          villages: selectedVillages.map(villageCode => ({
            shape_id: villageCode
          }))
        };

        console.log('Village API request payload:', villagePayload);

        const response = await fetch('http://localhost:9000/api/basic/multiple-villages/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(villagePayload),
        });

        if (!response.ok) {
          console.error('Failed to fetch village data:', response.status);
          setIsLoadingVillages(false);
          return;
        }

        const data = await response.json();
        console.log('Village shapefile data received');

        // Validate the GeoJSON
        if (!data || !data.features || data.features.length === 0) {
          console.warn('No valid village data received');
          setIsLoadingVillages(false);
          return;
        }

        // Create new GeoJSON layer for villages
        const newVillageLayers = L.geoJSON(
          data,
          {
            style: villageGeoJsonStyle,
            onEachFeature: (feature, layer) => {
              if (feature.properties && (feature.properties.shapeName || feature.properties.name)) {
                const name = feature.properties.shapeName || feature.properties.name;
                layer.bindPopup(name);
              }
            },
          }
        );

        // Ensure map is ready before adding the layer
        map.whenReady(() => {
          // Remove existing layers again to be sure
          cleanupVillageLayers();

          // Add the new layer and update state
          newVillageLayers.addTo(map);
          villageLayersRef.current = newVillageLayers;

          try {
            const bounds = newVillageLayers.getBounds();
            if (bounds.isValid()) {
              // Using even closer padding for village level zoom
              map.fitBounds(bounds, { padding: [20, 20] });
            }
          } catch (error) {
            console.error('Error fitting map to village layer bounds:', error);
          }

          setIsLoadingVillages(false);
        });
      } catch (error) {
        console.error('Error fetching or rendering village shapefiles:', error);
        setIsLoadingVillages(false);
      }
    };

    // Start fetching village data
    fetchVillageShapefiles();

    // Cleanup village layers on unmount or when selectedVillages changes
    return () => {
      cleanupVillageLayers();
    };
  }, [selectedVillages, map]);

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

export default function Map({
  selectedState,
  selectedDistricts,
  selectedSubDistricts,
  selectedVillages, // Add this parameter
  subDistrictData
}: MapProps) {
  console.log('Map component rendering with selectedState:', selectedState);
  console.log('Map component rendering with selectedDistricts:', selectedDistricts);
  console.log('Map component rendering with selectedSubDistricts:', selectedSubDistricts);
  console.log('Map component rendering with selectedVillages:', selectedVillages); // Add this log

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
          selectedSubDistricts={selectedSubDistricts}
          selectedVillages={selectedVillages} // Add this prop
          subDistrictData={subDistrictData}
        />

        <div className="absolute bottom-2 left-2 bg-white px-3 py-2 text-xs rounded shadow z-[1000] space-y-1">
          <div className="flex items-center space-x-2">
            <span className="w-4 h-2 bg-blue-500 inline-block"></span>
            <span>India Boundary</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-4 h-2 bg-red-500 inline-block"></span>
            <span>State Boundary</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-4 h-2 bg-green-500 inline-block"></span>
            <span>District</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-4 h-2 bg-blue-500 inline-block"></span>
            <span>Sub-District</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-4 h-2 bg-yellow-500 inline-block"></span>
            <span>Village</span>
          </div>
        </div>

      </MapContainer>
    </div>
  );
}