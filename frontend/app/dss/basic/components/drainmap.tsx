'use client'
import React, { useEffect, useState, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.3/dist/images/marker-shadow.png',
});

interface GeoJSONFeature {
    type: string;
    properties: any;
    geometry: any;
}

interface GeoJSONFeatureCollection {
    type: string;
    features: GeoJSONFeature[];
}

interface DrainMapProps {
    selectedRiver: string;
    selectedStretch: string;
    selectedDrains: string[];
}

const DrainMap: React.FC<DrainMapProps> = ({
    selectedRiver,
    selectedStretch,
    selectedDrains
}) => {
    const mapRef = useRef<L.Map | null>(null);
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const basinLayerRef = useRef<L.GeoJSON | null>(null);
    const riverLayerRef = useRef<L.GeoJSON | null>(null);
    const stretchLayerRef = useRef<L.GeoJSON | null>(null);
    const drainLayerRef = useRef<L.GeoJSON | null>(null);
    const labelLayersRef = useRef<L.Marker[]>([]);
    const catchmentLayerRef = useRef<L.GeoJSON | null>(null);
    const villageLayerRef = useRef<L.GeoJSON | null>(null);

    const [basinData, setBasinData] = useState<GeoJSONFeatureCollection | null>(null);
    const [riversData, setRiversData] = useState<GeoJSONFeatureCollection | null>(null);
    const [stretchesData, setStretchesData] = useState<GeoJSONFeatureCollection | null>(null);
    const [drainsData, setDrainsData] = useState<GeoJSONFeatureCollection | null>(null);
    const [catchmentData, setCatchmentData] = useState<GeoJSONFeatureCollection | null>(null);
    const [villageData, setVillageData] = useState<GeoJSONFeatureCollection | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [debug, setDebug] = useState<boolean>(false);
    const [showLabels, setShowLabels] = useState<boolean>(false);
    const [showCatchment, setShowCatchment] = useState<boolean>(false);
    const [showVillage, setShowVillage] = useState<boolean>(false);

    useEffect(() => {
        if (mapContainerRef.current && !mapRef.current) {
            console.log("Initializing map...");
            try {
                mapRef.current = L.map(mapContainerRef.current, {
                    center: [23.5937, 80.9629], // Center of India
                    zoom: 5,
                    maxZoom: 18,
                    preferCanvas: true,
                });

                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap contributors',
                    maxZoom: 18,
                    zIndex: 1,
                }).addTo(mapRef.current);

                fetchAllData();
            } catch (err) {
                console.error("Error initializing map:", err);
                setError("Failed to initialize map");
            }
        }

        return () => {
            clearLabelLayers();
            if (mapRef.current) {
                console.log("Cleaning up map...");
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, []);

    // Fetch river-specific stretches when selectedRiver changes
    useEffect(() => {
        if (mapRef.current) {
            console.log(`River selection changed to: ${selectedRiver}`);

            // Highlight the selected river on the map
            if (riversData && riverLayerRef.current) {
                highlightSelectedRiver(selectedRiver);

            }
          //  this is commneted out because when we select river it will highlight but then disappear and go back so it is fix 
            // if (selectedRiver) {
            //     // Fetch and highlight stretches for the selected river
            //     fetchStretchesByRiver(selectedRiver);
            // } 
            else {
                // If no river is selected, reset all stretch styles
                resetAllStretchStyles();
            }
        }
    }, [selectedRiver]);

    useEffect(() => {
        if (selectedStretch && mapRef.current) {
            console.log(`Stretch selection changed to: ${selectedStretch}`);
            // Highlight the selected stretch on the map
            if (stretchesData && stretchLayerRef.current) {
                highlightSelectedStretch(selectedStretch);
                zoomToFeature('stretch', selectedStretch);
            }
        }
    }, [selectedStretch]);

    // Add this useEffect to watch for selected drains changes
    useEffect(() => {
        if (selectedDrains.length > 0 && mapRef.current) {
            console.log(`Drains selection changed to: ${selectedDrains.join(', ')}`);
            // Highlight the selected drains on the map
            if (drainsData && drainLayerRef.current) {
                highlightSelectedDrains();
                zoomToFeature('drain', selectedDrains[0]);
            }
            // Fetch catchments for the selected drains
            fetchCatchmentsByDrains(selectedDrains);
        } else {
            // Clear catchment and village layers if no drains are selected
            if (catchmentLayerRef.current && mapRef.current) {
                mapRef.current.removeLayer(catchmentLayerRef.current);
                catchmentLayerRef.current = null;
            }
            if (villageLayerRef.current && mapRef.current) {
                mapRef.current.removeLayer(villageLayerRef.current);
                villageLayerRef.current = null;
            }
            // Reset data
            setCatchmentData(null);
            setVillageData(null);
        }
    }, [selectedDrains]);

    // Add effects to handle layer visibility toggles
    useEffect(() => {
        toggleCatchmentVisibility();
    }, [showCatchment, catchmentData]);

    useEffect(() => {
        toggleVillageVisibility();
    }, [showVillage, villageData]);

    // Toggle catchment layer visibility
    const toggleCatchmentVisibility = () => {
        if (!mapRef.current) return;

        if (catchmentData && showCatchment) {
            // Show catchment layer
            if (!catchmentLayerRef.current) {
                updateCatchmentsLayer(catchmentData);
            }
        } else if (catchmentLayerRef.current) {
            // Hide catchment layer
            mapRef.current.removeLayer(catchmentLayerRef.current);
            catchmentLayerRef.current = null;
        }
    };

    // Toggle village layer visibility
    const toggleVillageVisibility = () => {
        if (!mapRef.current) return;

        if (villageData && showVillage) {
            // Show village layer
            if (!villageLayerRef.current) {
                updateVillageLayer(villageData);
            }
        } else if (villageLayerRef.current) {
            // Hide village layer
            mapRef.current.removeLayer(villageLayerRef.current);
            villageLayerRef.current = null;
        }
    };

    // Toggle labels visibility
    useEffect(() => {
        if (stretchesData) {
            if (showLabels) {
                createStretchLabels(stretchesData);
            } else {
                clearLabelLayers();
            }
        }
    }, [showLabels, stretchesData]);

    // New function to zoom to specific features when they're selected
    const zoomToFeature = (featureType: 'river' | 'stretch' | 'drain' | 'catchment', featureId: string) => {
        if (!mapRef.current) return;

        console.log(`Zooming to ${featureType} with ID: ${featureId}`);

        try {
            let targetLayer: L.GeoJSON | null = null;
            let targetId = featureId;
            let idProperty = '';

            // Determine which layer and property to use for finding the feature
            if (featureType === 'river' && riverLayerRef.current) {
                targetLayer = riverLayerRef.current;
                idProperty = 'River_Code';
            } else if (featureType === 'stretch' && stretchLayerRef.current) {
                targetLayer = stretchLayerRef.current;
                idProperty = 'Stretch_ID';
            } else if (featureType === 'drain' && drainLayerRef.current) {
                targetLayer = drainLayerRef.current;
                idProperty = 'Drain_No';
            } else if (featureType === 'catchment' && catchmentLayerRef.current) {
                targetLayer = catchmentLayerRef.current;
                idProperty = 'Catchment_ID';
            }

            if (!targetLayer) {
                console.warn(`Cannot zoom: ${featureType} layer not available`);
                return;
            }

            let featureBounds: L.LatLngBounds | null = null;

            // Find the target feature and get its bounds
            targetLayer.eachLayer((layer: any) => {
                if (layer.feature?.properties &&
                    layer.feature.properties[idProperty]?.toString() === targetId) {
                    if (layer.getBounds) {
                        featureBounds = layer.getBounds();
                    } else if (layer.getLatLng) {
                        // For point features
                        featureBounds = L.latLngBounds([layer.getLatLng()]);
                        featureBounds.extend(layer.getLatLng());
                    }
                }
            });

            if (featureBounds && featureBounds.isValid()) {
                console.log(`Zooming to bounds of ${featureType}: ${featureId}`);
                mapRef.current.fitBounds(featureBounds, {
                    padding: [50, 50],
                    maxZoom: 14,
                    animate: true
                });
            } else {
                console.warn(`No valid bounds found for ${featureType}: ${featureId}`);
            }
        } catch (error) {
            console.error(`Error zooming to ${featureType}:`, error);
        }
    };

    // Add this function to highlight the selected river
    const highlightSelectedRiver = (riverId: string) => {
        if (!mapRef.current || !riverLayerRef.current || !riversData) {
            console.log("Cannot highlight river: map, layer or data missing");
            return;
        }
        try {
            riverLayerRef.current.eachLayer((layer: any) => {
                if (layer.feature?.properties) {
                    const riverCode = layer.feature.properties.River_Code?.toString();
                    if (riverCode === riverId) {
                        if (layer.setStyle) {
                            layer.setStyle({
                                color: '#FF4500',  // OrangeRed for highlighted river
                                weight: 5,
                                opacity: 1.0,
                            });
                        }
                        if (layer.bringToFront) {
                            layer.bringToFront();
                        }

                        // Zoom to the selected river
                        if (layer.getBounds) {
                            mapRef.current.fitBounds(layer.getBounds(), {
                                padding: [50, 50],
                                maxZoom: 12
                            });
                        }
                    } else {
                        if (layer.setStyle) {
                            layer.setStyle({
                                color: 'orange',
                                weight: 3,
                                opacity: 0.7,
                            });
                        }
                    }
                }
            });
            console.log("Highlighted river:", riverId);
        } catch (err) {
            console.error("Error highlighting river:", err);
        }
    };

    // Add this function to highlight the selected stretch
    const highlightSelectedStretch = (stretchId: string) => {
        if (!mapRef.current || !stretchLayerRef.current) {
            console.log("Cannot highlight stretch: map, layer or data missing");
            return;
        }
        try {
            stretchLayerRef.current.eachLayer((layer: any) => {
                if (layer.feature?.properties) {
                    const stretch = layer.feature.properties.Stretch_ID?.toString();
                    if (stretch === stretchId) {
                        if (layer.setStyle) {
                            layer.setStyle({
                                color: '#FF0066',  // Bright pink/magenta for selected stretch
                                weight: 6,
                                opacity: 1.0,
                            });
                        }
                        if (layer.bringToFront) {
                            layer.bringToFront();
                        }
                    }
                }
            });
            console.log("Highlighted stretch:", stretchId);
        } catch (err) {
            console.error("Error highlighting stretch:", err);
        }
    };

    const resetAllStretchStyles = () => {
        if (!mapRef.current || !stretchLayerRef.current) {
            console.log("Cannot reset stretch styles: map or layer missing");
            return;
        }

        try {
            console.log("Resetting all stretch styles to default");

            stretchLayerRef.current.eachLayer((layer: any) => {
                if (layer.feature?.properties) {
                    if (layer.setStyle) {
                        layer.setStyle({
                            color: 'green',
                            weight: 2,
                            opacity: 0.4,
                        });
                    }
                }
            });

            // If a specific stretch is still selected, keep it highlighted
            if (selectedStretch) {
                highlightSelectedStretch(selectedStretch);
            }

        } catch (err) {
            console.error("Error resetting stretch styles:", err);
        }
    };

    const fetchAllData = async () => {
        setLoading(true);
        setError(null);
        try {
            console.log("Starting data fetch...");
            await Promise.all([
                fetchBasin(),
                fetchRivers(),
                fetchAllDrains(),
                fetchAllStretches()
            ]);

            if (selectedRiver) {
                await fetchStretchesByRiver(selectedRiver);
            }
        } catch (err) {
            console.error("Error fetching data:", err);
            setError("Failed to load map data");
        } finally {
            setLoading(false);
        }
    };

    const fetchBasin = async () => {
        try {
            console.log("Fetching basin data...");
            const response = await fetch('http://localhost:9000/api/basic/basin/');
            console.log("Basin response status:", response.status);
            if (!response.ok) {
                throw new Error(`Failed to fetch basin: ${response.statusText}`);
            }
            const data = await response.json();
            console.log("Basin data:", data);
            if (data.features?.length > 0) {
                console.log(`Received ${data.features.length} basin features`);
            } else {
                console.warn("No basin features received");
            }
            setBasinData(data);
            if (mapRef.current) {
                updateBasinLayer(data);
            }
        } catch (error: any) {
            console.error("Error fetching basin:", error);
            setError(`Basin: ${error.message}`);
        }
    };

    const fetchRivers = async () => {
        try {
            console.log("Fetching rivers...");
            const response = await fetch('http://localhost:9000/api/basic/rivers/');
            console.log("Rivers response status:", response.status);
            if (!response.ok) {
                throw new Error(`Failed to fetch rivers: ${response.statusText}`);
            }
            const data = await response.json();
            console.log("Rivers data:", data);
            if (data.features?.length > 0) {
                console.log(`Received ${data.features.length} river features`);
            } else {
                console.warn("No river features received");
            }
            setRiversData(data);
            if (mapRef.current) {
                updateRiversLayer(data);
            }
        } catch (error: any) {
            console.error("Error fetching rivers:", error);
            setError(`Rivers: ${error.message}`);
        }
    };

    const highlightRiverStretches = (riverId: string, riverStretchIds: string[]) => {
        if (!mapRef.current || !stretchLayerRef.current) {
            console.log("Cannot highlight river stretches: map or layer missing");
            return;
        }

        try {
            console.log(`Highlighting ${riverStretchIds.length} stretches for river ${riverId}`);

            // Update styling of all stretches
            stretchLayerRef.current.eachLayer((layer: any) => {
                if (layer.feature?.properties) {
                    const stretchId = layer.feature.properties.Stretch_ID?.toString();
                    if (riverStretchIds.includes(stretchId)) {
                        // This stretch belongs to the selected river - highlight in blue
                        if (layer.setStyle) {
                            layer.setStyle({
                                color: '#0066FF',  // Blue for river's stretches
                                weight: 4,
                                opacity: 0.9,
                            });
                        }
                        if (layer.bringToFront) {
                            layer.bringToFront();
                        }
                    } else {
                        // This stretch belongs to other rivers - use muted style
                        if (layer.setStyle) {
                            layer.setStyle({
                                color: 'green',
                                weight: 2,
                                opacity: 0.4,
                            });
                        }
                    }
                }
            });

            // If a specific stretch is selected, make sure it's highlighted properly
            if (selectedStretch) {
                highlightSelectedStretch(selectedStretch);
            }

            // Zoom to the river's stretches
            if (riverStretchIds.length > 0 && stretchLayerRef.current) {
                const bounds = L.latLngBounds([]);
                let hasValidBounds = false;

                stretchLayerRef.current.eachLayer((layer: any) => {
                    if (layer.feature?.properties) {
                        const stretchId = layer.feature.properties.Stretch_ID?.toString();
                        if (riverStretchIds.includes(stretchId) && layer.getBounds) {
                            const layerBounds = layer.getBounds();
                            if (layerBounds.isValid()) {
                                bounds.extend(layerBounds);
                                hasValidBounds = true;
                            }
                        }
                    }
                });

                if (hasValidBounds && mapRef.current) {
                    mapRef.current.fitBounds(bounds, {
                        padding: [50, 50],
                        maxZoom: 13,
                        animate: true
                    });
                }
            }

        } catch (err) {
            console.error("Error highlighting river stretches:", err);
        }
    };

    const fetchStretchesByRiver = async (riverId: number) => {
        try {
            console.log(`Fetching stretches for river ${riverId}...`);
            const response = await fetch('http://localhost:9000/api/basic/river-stretched/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ River_ID: riverId })
            });
            console.log("Stretches response status:", response.status);
            if (!response.ok) {
                throw new Error(`Failed to fetch stretches: ${response.statusText}`);
            }
            const data = await response.json();
            console.log("Stretches data:", data);
            if (data.features?.length > 0) {
                console.log(`Received ${data.features.length} stretch features`);
            } else {
                console.warn("No stretch features received for selected river");
            }

            // Store the river's stretch IDs for highlighting
            const riverStretchIds = data.features.map(feature =>
                feature.properties.Stretch_ID?.toString()
            );

            // Highlight the river's stretches within the existing layer
            highlightRiverStretches(riverId, riverStretchIds);

        } catch (error: any) {
            console.error("Error fetching stretches:", error);
            setError(`Stretches: ${error.message}`);
        }
    };

    const fetchAllDrains = async () => {
        try {
            console.log("Fetching drains...");
            const response = await fetch('http://localhost:9000/api/basic/drain/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            });
            console.log("Drains response status:", response.status);
            if (!response.ok) {
                throw new Error(`Failed to fetch drains: ${response.statusText}`);
            }
            const data = await response.json();
            console.log("Drains data:", data);
            if (data.features?.length > 0) {
                console.log(`Received ${data.features.length} drain features`);
            } else {
                console.warn("No drain features received");
            }
            setDrainsData(data);
            if (mapRef.current) {
                updateDrainsLayer(data);
            }
        } catch (error: any) {
            console.error("Error fetching drains:", error);
            setError(`Drains: ${error.message}`);
        }
    };

    const fetchAllStretches = async () => {
        try {
            console.log("Fetching all stretches...");
            const response = await fetch('http://localhost:9000/api/basic/all-stretches/');
            console.log("All stretches response status:", response.status);
            if (!response.ok) {
                throw new Error(`Failed to fetch stretches: ${response.statusText}`);
            }
            const data = await response.json();
            console.log("All stretches data:", data);
            if (data.features?.length > 0) {
                console.log(`Received ${data.features.length} stretch features`);
            } else {
                console.warn("No stretch features received");
            }
            setStretchesData(data);
            if (mapRef.current) {
                updateStretchesLayer(data);
                try {
                    if (showLabels) {
                        createStretchLabels(data);
                    }
                } catch (labelError) {
                    console.error("Error creating stretch labels:", labelError);
                    // Don't let label errors prevent the map from loading
                }
            }
        } catch (error: any) {
            console.error("Error fetching all stretches:", error);
            setError(`Stretches: ${error.message}`);
        }
    };

    // Add this function to the component to fetch catchment data
    const fetchCatchmentsByDrains = async (drainIds: string[]) => {
        try {
            console.log(`Fetching catchments and villages for drains: ${drainIds}...`);
            const response = await fetch('http://localhost:9000/api/basic/catchment_village/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    Drain_No: drainIds.map(id => parseInt(id, 10))
                })
            });
            console.log("Catchments and villages response status:", response.status);
            if (!response.ok) {
                throw new Error(`Failed to fetch catchments and villages: ${response.statusText}`);
            }
            const data = await response.json();
            console.log("Catchments and villages data:", data);

            // Handle village data
            if (data.village_geojson?.features?.length > 0) {
                console.log(`Received ${data.village_geojson.features.length} village features`);
                setVillageData(data.village_geojson);
                if (mapRef.current && showVillage) {
                    updateVillageLayer(data.village_geojson);
                }
            } else {
                console.warn("No village features received for selected drains");
                setVillageData(null);
                if (villageLayerRef.current && mapRef.current) {
                    mapRef.current.removeLayer(villageLayerRef.current);
                    villageLayerRef.current = null;
                }
            }

            // Handle catchment data
            if (data.catchment_geojson?.features?.length > 0) {
                console.log(`Received ${data.catchment_geojson.features.length} catchment features`);
                setCatchmentData(data.catchment_geojson);
                if (mapRef.current && showCatchment) {
                    updateCatchmentsLayer(data.catchment_geojson);

                    // Zoom to the catchments
                    const catchmentLayer = L.geoJSON(data.catchment_geojson);
                    if (catchmentLayer.getBounds().isValid()) {
                        mapRef.current.fitBounds(catchmentLayer.getBounds(), {
                            padding: [50, 50],
                            maxZoom: 13
                        });
                    }
                }
            } else {
                console.warn("No catchment features received for selected drains");
                setCatchmentData(null);
                if (catchmentLayerRef.current && mapRef.current) {
                    mapRef.current.removeLayer(catchmentLayerRef.current);
                    catchmentLayerRef.current = null;
                }
            }
        } catch (error: any) {
            console.error("Error fetching catchments and villages:", error);
            setError(`Catchments and Villages: ${error.message}`);
        }
    };

    const clearLabelLayers = () => {
        if (mapRef.current && labelLayersRef.current.length > 0) {
            labelLayersRef.current.forEach(layer => mapRef.current?.removeLayer(layer));
            labelLayersRef.current = [];
            console.log("Cleared label layers");
        }
    };

    // Add this function to update the catchment layer
    const updateCatchmentsLayer = (data: GeoJSONFeatureCollection) => {
        if (!mapRef.current) return;
        console.log("Updating catchment layer...");
        if (catchmentLayerRef.current) {
            mapRef.current.removeLayer(catchmentLayerRef.current);
            catchmentLayerRef.current = null;
        }
        if (!data?.features?.length) {
            console.warn("No catchment features to display");
            return;
        }
        try {
            catchmentLayerRef.current = L.geoJSON(data, {
                style: () => ({
                    color: 'black', // Purple border for catchments
                    weight: 2,
                    opacity: 0.8,
                    fillColor: '#E6E6FA', // Light purple fill
                    fillOpacity: 0.3,
                }),
                onEachFeature: (feature, layer) => {
                    const catchmentName = feature.properties.Catchment_Name || 'Unknown';
                    const drainNo = feature.properties.Drain_No || 'N/A';
                    layer.bindPopup(`Catchment: ${catchmentName}<br>Drain No: ${drainNo}`);
                },
            }).addTo(mapRef.current);
            console.log(`Catchment layer added with ${data.features.length} features`);

            // Auto-zoom to catchment
            if (mapRef.current && catchmentLayerRef.current) {
                const bounds = catchmentLayerRef.current.getBounds();
                if (bounds.isValid()) {
                    mapRef.current.fitBounds(bounds, {
                        padding: [50, 50],
                        maxZoom: 13
                    });
                }
            }

            // Ensure catchments are behind villages
            if (villageLayerRef.current) {
                villageLayerRef.current.bringToFront();
            }
        } catch (error) {
            console.error("Error updating catchment layer:", error);
            setError("Failed to display catchments");
        }
    };

    const updateBasinLayer = (data: GeoJSONFeatureCollection) => {
        if (!mapRef.current) return;
        console.log("Updating basin layer...");
        if (basinLayerRef.current) {
            mapRef.current.removeLayer(basinLayerRef.current);
            basinLayerRef.current = null;
        }
        if (!data?.features?.length) {
            console.warn("No basin features to display");
            return;
        }
        try {
            basinLayerRef.current = L.geoJSON(data, {
                style: () => ({
                    color: 'red',  // Changed from '#999' to a bluish color
                    weight: 3,         // Reduced from 20 to 5 for lighter weight
                    opacity: 0.8,      // Increased from 0.5 for better visibility
                    fillColor: 'white', // Changed from '#eee' to a light purple/reddish color
                    fillOpacity: 0,
                }),
                onEachFeature: (feature, layer) => {
                    const basinName = feature.properties.Basin_Name || 'Unknown';
                    layer.bindPopup(`Basin: ${basinName}`);
                },
                // Ensure the basin layer stays at the bottom so other layers appear on top
                pane: 'tilePane',
            }).addTo(mapRef.current);

            // Make sure basin is at the back of all layers
            basinLayerRef.current.bringToBack();
            console.log(`Basin layer added with ${data.features.length} features`);

            // Zoom to basin
            if (mapRef.current && basinLayerRef.current) {
                const bounds = basinLayerRef.current.getBounds();
                if (bounds.isValid()) {
                    mapRef.current.fitBounds(bounds, {
                        padding: [50, 50],
                        maxZoom: 9  // Lower max zoom for basin to show more context
                    });
                }
            }
        } catch (error) {
            console.error("Error updating basin layer:", error);
            setError("Failed to display basin");
        }
    };

    const updateRiversLayer = (data: GeoJSONFeatureCollection) => {
        if (!mapRef.current) return;
        console.log("Updating rivers layer...");
        if (riverLayerRef.current) {
            mapRef.current.removeLayer(riverLayerRef.current);
            riverLayerRef.current = null;
        }
        if (!data?.features?.length) {
            console.warn("No river features to display");
            return;
        }
        try {
            riverLayerRef.current = L.geoJSON(data, {
                style: () => ({
                    color: 'orange',
                    weight: 3,
                    opacity: 0.7,
                }),
                pointToLayer: (feature, latlng) => {
                    return L.circleMarker(latlng, {
                        radius: 5,
                        fillColor: 'orange',
                        color: 'green',
                        weight: 2,
                        opacity: 0.7,
                        fillOpacity: 0.5,
                    });
                },
                onEachFeature: (feature, layer) => {
                    const riverName = feature.properties.River_Name || 'Unknown';
                    layer.bindPopup(`River: ${riverName}`);
                },
            }).addTo(mapRef.current);
            console.log(`Rivers layer added with ${data.features.length} features`);

            // Zoom to rivers layer if basin is not available
            if (mapRef.current && riverLayerRef.current && !basinLayerRef.current) {
                const bounds = riverLayerRef.current.getBounds();
                if (bounds.isValid()) {
                    mapRef.current.fitBounds(bounds, {
                        padding: [50, 50],
                        maxZoom: 10
                    });
                }
            }
        } catch (error) {
            console.error("Error updating rivers layer:", error);
            setError("Failed to display rivers");
        }
    };

    const updateStretchesLayer = (data: GeoJSONFeatureCollection) => {
        if (!mapRef.current) return;
        console.log("Updating stretches layer...");

        // Remove the existing layer
        if (stretchLayerRef.current) {
            mapRef.current.removeLayer(stretchLayerRef.current);
            stretchLayerRef.current = null;
        }

        // Clear any existing labels
        try {
            clearLabelLayers();
        } catch (error) {
            console.error("Error clearing label layers:", error);
        }

        if (!data?.features?.length) {
            console.warn("No stretch features to display");
            return;
        }

        try {
            // Create the layer with initial styling
            stretchLayerRef.current = L.geoJSON(data, {
                style: () => ({
                    color: 'green',
                    weight: 2,
                    opacity: 0.4,
                }),
                pointToLayer: (feature, latlng) => {
                    return L.circleMarker(latlng, {
                        radius: 6,
                        fillColor: '#444',
                        color: '#222',
                        weight: 1,
                        opacity: 0.6,
                        fillOpacity: 0.4,
                    });
                },
                onEachFeature: (feature, layer) => {
                    const stretchId = feature.properties.Stretch_ID || 'N/A';
                    const riverName = feature.properties.River_Name || 'Unknown River';
                    layer.bindPopup(`Stretch: ${stretchId}<br>River: ${riverName}`);
                },
            }).addTo(mapRef.current);
            console.log(`Stretches layer added with ${data.features.length} features`);

            // Create labels if enabled
            try {
                if (showLabels) {
                    createStretchLabels(data);
                }
            } catch (labelError) {
                console.error("Error creating stretch labels:", labelError);
            }

            // If a river is already selected, highlight its stretches
            if (selectedRiver) {
                fetchStretchesByRiver(selectedRiver);
            }

            // If a specific stretch is already selected, highlight it
            if (selectedStretch) {
                highlightSelectedStretch(selectedStretch);
            }

            // Zoom to stretches layer if rivers and basin are not available
            if (mapRef.current && stretchLayerRef.current && !riverLayerRef.current && !basinLayerRef.current) {
                const bounds = stretchLayerRef.current.getBounds();
                if (bounds.isValid()) {
                    mapRef.current.fitBounds(bounds, {
                        padding: [50, 50],
                        maxZoom: 12
                    });
                }
            }

        } catch (error) {
            console.error("Error updating stretches layer:", error);
            setError("Failed to display stretches");
        }
    };

    const createStretchLabels = (data: GeoJSONFeatureCollection) => {
        if (!mapRef.current) return;
        console.log("Creating stretch labels...");
        clearLabelLayers();

        if (!data?.features?.length) {
            console.warn("No stretch features for labeling");
            return;
        }

        try {
            data.features.forEach(feature => {
                const stretchId = feature.properties.Stretch_ID || 'N/A';

                // For point features
                if (feature.geometry.type === 'Point') {
                    const coords = feature.geometry.coordinates;
                    const latlng = L.latLng(coords[1], coords[0]);
                    addLabel(latlng, stretchId);
                }
                // For LineString features - add label at midpoint
                else if (feature.geometry.type === 'LineString') {
                    const coords = feature.geometry.coordinates;
                    if (coords.length > 0) {
                        const midIndex = Math.floor(coords.length / 2);
                        const midCoord = coords[midIndex];
                        const latlng = L.latLng(midCoord[1], midCoord[0]);
                        addLabel(latlng, stretchId);
                    }
                }
                // For MultiLineString features - add label at midpoint of first line
                else if (feature.geometry.type === 'MultiLineString') {
                    const lines = feature.geometry.coordinates;
                    if (lines.length > 0 && lines[0].length > 0) {
                        const midIndex = Math.floor(lines[0].length / 2);
                        const midCoord = lines[0][midIndex];
                        const latlng = L.latLng(midCoord[1], midCoord[0]);
                        addLabel(latlng, stretchId);
                    }
                }
            });

            console.log(`Created ${labelLayersRef.current.length} stretch labels`);
        } catch (error) {
            console.error("Error creating stretch labels:", error);
        }
    };

    // Make sure the addLabel function is defined
    const addLabel = (latlng: L.LatLng, text: string) => {
        if (!mapRef.current) return;

        // Create a custom icon with text
        const icon = L.divIcon({
            html: `<div style="background: none; border: none; color: #000; font-weight: bold; text-shadow: 0px 0px 3px white;">${text}</div>`,
            className: 'stretch-label',
            iconSize: [100, 20],
            iconAnchor: [50, 10]
        });

        const marker = L.marker(latlng, {
            icon: icon,
            interactive: false,
            zIndexOffset: 1000
        }).addTo(mapRef.current);

        labelLayersRef.current.push(marker);
    };

    const updateVillageLayer = (data: GeoJSONFeatureCollection) => {
        if (!mapRef.current) return;
        console.log("Updating village layer...");
        if (villageLayerRef.current) {
            mapRef.current.removeLayer(villageLayerRef.current);
            villageLayerRef.current = null;
        }
        if (!data?.features?.length) {
            console.warn("No village features to display");
            return;
        }
        try {
            villageLayerRef.current = L.geoJSON(data, {
                style: () => ({
                    color: 'skyblue', // Orange for village boundaries
                    weight: 2,
                    opacity: 0.8,
                    fillColor: 'hollow', // Gold fill
                    fillOpacity: 0.3,
                }),
                onEachFeature: (feature, layer) => {
                    const villageName = feature.properties.shapeName || 'Unknown';
                    const shapeID = feature.properties.shapeID || 'N/A';
                    layer.bindPopup(`Village: ${villageName}<br>ID: ${shapeID}`);
                },
            }).addTo(mapRef.current);
            console.log(`Village layer added with ${data.features.length} features`);
            villageLayerRef.current.bringToFront(); // Ensure villages are on top

            // If no catchment bounds available, zoom to villages
            if (!catchmentLayerRef.current && villageLayerRef.current) {
                const bounds = villageLayerRef.current.getBounds();
                if (bounds.isValid()) {
                    mapRef.current.fitBounds(bounds, {
                        padding: [50, 50],
                        maxZoom: 14
                    });
                }
            }
        } catch (error) {
            console.error("Error updating village layer:", error);
            setError("Failed to display villages");
        }
    };

    const updateDrainsLayer = (data: GeoJSONFeatureCollection) => {
        if (!mapRef.current) return;
        console.log("Updating drains layer...");
        if (drainLayerRef.current) {
            mapRef.current.removeLayer(drainLayerRef.current);
            drainLayerRef.current = null;
        }
        if (!data?.features?.length) {
            console.warn("No drain features to display");
            return;
        }
        try {
            drainLayerRef.current = L.geoJSON(data, {
                style: () => ({
                    color: 'blue',
                    weight: 3,
                    opacity: 0.8,
                }),
                pointToLayer: (feature, latlng) => {
                    return L.circleMarker(latlng, {
                        radius: 4,
                        fillColor: 'blue',
                        color: 'violet',
                        weight: 1,
                        opacity: 0.5,
                        fillOpacity: 0.3,
                    });
                },
                onEachFeature: (feature, layer) => {
                    const drainNo = feature.properties.Drain_No || 'N/A';
                    layer.bindPopup(`Drain: ${drainNo}`);
                },
            }).addTo(mapRef.current);
            console.log(`Drains layer added with ${data.features.length} features`);

            // Auto-zoom to drains if no other layers are available
            if (!basinLayerRef.current && !riverLayerRef.current && !stretchLayerRef.current) {
                const bounds = drainLayerRef.current.getBounds();
                if (bounds.isValid()) {
                    mapRef.current.fitBounds(bounds, {
                        padding: [50, 50],
                        maxZoom: 12
                    });
                }
            }

            if (selectedDrains.length > 0) {
                highlightSelectedDrains();
            }
        } catch (error) {
            console.error("Error updating drains layer:", error);
            setError("Failed to display drains");
        }
    };

    const highlightSelectedDrains = () => {
        if (!mapRef.current || !drainLayerRef.current || !drainsData) {
            console.log("Cannot highlight drains: map, layer or data missing");
            return;
        }
        try {
            drainLayerRef.current.eachLayer((layer: any) => {
                if (layer.feature?.properties) {
                    const drainNo = layer.feature.properties.Drain_No?.toString();
                    if (selectedDrains.includes(drainNo)) {
                        if (layer.setStyle) {
                            layer.setStyle({
                                color: 'blue',  // DodgerBlue for highlighted drains
                                weight: 10,
                                opacity: 1.0,
                                fillOpacity: 0.8,
                            });
                        }
                        if (layer.bringToFront) {
                            layer.bringToFront();
                        }

                        // Zoom to the selected drain
                        if (layer.getBounds) {
                            mapRef.current.fitBounds(layer.getBounds(), {
                                padding: [50, 50],
                                maxZoom: 14
                            });
                        } else if (layer.getLatLng) {
                            mapRef.current.setView(layer.getLatLng(), 14);
                        }
                    } else {
                        if (layer.setStyle) {
                            layer.setStyle({
                                color: 'blue',
                                weight: 3,
                                opacity: 0.8,
                                fillOpacity: 0.3,
                            });
                        }
                    }
                }
            });
            console.log("Highlighted drains:", selectedDrains);
        } catch (err) {
            console.error("Error highlighting drains:", err);
        }
    };

    const toggleDebug = () => {
        setDebug(!debug);
    };

    const toggleLabels = () => {
        setShowLabels(!showLabels);
    };

    const toggleCatchment = () => {
        setShowCatchment(!showCatchment);
        if (showCatchment) {
            setShowVillage(false); // Uncheck village checkbox when catchment is unchecked
        }
    };

    const toggleVillage = () => {
        setShowVillage(!showVillage);
    };

    return (
        <div className="flex flex-col h-full relative" style={{ height: '60vh' }}>
            {loading && (
                <div className="absolute top-0 left-0 right-0 bg-blue-500 text-white text-center text-sm py-1 z-[1000]">
                    Loading map data...
                </div>
            )}
            {error && (
                <div className="absolute top-0 left-0 right-0 bg-red-500 text-white text-center text-sm py-1 z-[1000]">
                    Error: {error}
                </div>
            )}
            <div className="p-2 bg-gray-100 border-b border-gray-300 text-sm">
                <div className="flex flex-wrap gap-4 mb-2 items-center">
                    <div className="flex items-center">
                        <span className="w-4 h-4 bg-purple-200 inline-block mr-1 border border-blue-400"
                            style={{ backgroundColor: '#c493d6', borderColor: 'red' }}></span>
                        Basin
                    </div>
                    <div className="flex items-center">
                        <span className="w-4 h-4 bg-orange-600 inline-block mr-1 border border-gray-600"></span>
                        Rivers
                    </div>
                    <div className="flex items-center">
                        <span className="w-4 h-4 bg-green-600 inline-block mr-1 border"
                            style={{ opacity: 0.4 }}></span>
                        All Stretches
                    </div>
                    <div className="flex items-center">
                        <span className="w-4 h-4 inline-block mr-1 border"
                            style={{ backgroundColor: '#0066FF', borderColor: '#0033CC' }}></span>
                        River's Stretches
                    </div>
                    <div className="flex items-center">
                        <span className="w-4 h-4 inline-block mr-1 border"
                            style={{ backgroundColor: '#FF0066', borderColor: '#CC0033' }}></span>
                        Selected Stretch
                    </div>
                    <div className="flex items-center">
                        <span className="w-4 h-4 bg-blue-900 inline-block mr-1 border border-blue-700"></span>
                        Drains
                    </div>
                    <button
                        className="text-xs bg-gray-200 hover:bg-gray-300 py-1 px-2 rounded"
                        onClick={toggleLabels}
                    >
                        {showLabels ? "Hide Labels" : "Show Labels"}
                    </button>
                    <button
                        className="ml-auto text-xs bg-gray-200 hover:bg-gray-300 py-1 px-2 rounded"
                        onClick={toggleDebug}
                    >
                        {debug ? "Disable Debug" : "Enable Debug"}
                    </button>
                </div>
            </div>
            <div
                ref={mapContainerRef}
                className="flex-grow w-full relative"
                style={{ height: '100%', minHeight: '400px' }}
            >
                {selectedDrains.length > 0 && (
                    <div className="absolute bottom-4 left-4 flex flex-col gap-2 z-[1000]">
                        <div className="flex items-center bg-gray-100 p-2 rounded border border-gray-300">
                            <input
                                type="checkbox"
                                id="catchment-toggle"
                                checked={showCatchment}
                                onChange={toggleCatchment}
                                className="mr-1"
                            />
                            <label htmlFor="catchment-toggle" className="flex items-center cursor-pointer">
                                <span
                                    className="w-4 h-4 inline-block mr-1 border"
                                    style={{ backgroundColor: '#E6E6FA', borderColor: 'black' }}
                                ></span>
                                Delineate Catchments!
                            </label>
                        </div>
                        <div className="flex items-center bg-gray-100 p-2 rounded border border-gray-300">
                            <input
                                type="checkbox"
                                id="village-toggle"
                                checked={showVillage}
                                onChange={toggleVillage}
                                className="mr-1"
                                disabled={!showCatchment} // Disable village checkbox if showCatchment is false
                            />
                            <label htmlFor="village-toggle" className="flex items-center cursor-pointer">
                                <span
                                    className="w-4 h-4 inline-block mr-1 border"
                                    style={{ backgroundColor: 'hollow', borderColor: 'skyblue' }}
                                ></span>
                                Show Villages of Selected Drains
                            </label>
                        </div>
                    </div>
                )}
            </div>
            {debug && (
                <div className="bg-gray-100 border-t border-gray-300 p-2 text-xs font-mono overflow-auto max-h-32">
                    <div>Debug Info:</div>
                    <div>Map: {mapRef.current ? 'Initialized' : 'Not initialized'}</div>
                    <div>Basin: {basinData ? `${basinData.features.length} features` : 'None'}</div>
                    <div>Rivers: {riversData ? `${riversData.features.length} features` : 'None'}</div>
                    <div>Stretches: {stretchesData ? `${stretchesData.features.length} features` : 'None'}</div>
                    <div>Selected River: {selectedRiver || 'None'}</div>
                    <div>Drains: {drainsData ? `${drainsData.features.length} features` : 'None'}</div>
                    <div>Selected Stretch: {selectedStretch || 'None'}</div>
                    <div>Selected Drains: {selectedDrains.length > 0 ? selectedDrains.join(', ') : 'None'}</div>
                    <div>Catchments: {catchmentData ? `${catchmentData.features.length} features${showCatchment ? '' : ' (hidden)'}` : 'None'}</div>
                    <div>Villages: {villageData ? `${villageData.features.length} features${showVillage ? '' : ' (hidden)'}` : 'None'}</div>
                    <div>Labels: {showLabels ? `Visible (${labelLayersRef.current.length})` : 'Hidden'}</div>
                </div>
            )}
        </div>
    );

};

export default DrainMap;