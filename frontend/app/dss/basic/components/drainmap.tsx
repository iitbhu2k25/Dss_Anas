
'use client'
import React, { useEffect, useState, useRef, useCallback } from 'react';
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
    const [initialZoomDone, setInitialZoomDone] = useState<boolean>(false);

    // Initialize map
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

    // Trigger initial zoom when all data is loaded
    useEffect(() => {
        if (mapRef.current && !initialZoomDone && basinData && riversData && stretchesData && drainsData) {
            console.log("Initial data loaded, triggering zoomToAllLayers");
            zoomToAllLayers();
            setInitialZoomDone(true);
        }
    }, [basinData, riversData, stretchesData, drainsData, initialZoomDone, zoomToAllLayers]);

    // Handle river selection
    useEffect(() => {
        if (mapRef.current) {
            console.log(`River selection changed to: ${selectedRiver}`);
            if (riversData && riverLayerRef.current) {
                highlightSelectedRiver(selectedRiver);
            }
            if (selectedRiver) {
                fetchStretchesByRiver(selectedRiver);
                zoomToSelectedLayer('river');
            } else {
                resetAllStretchStyles();
                zoomToAllLayers();
            }
        }
    }, [selectedRiver, riversData, zoomToSelectedLayer, zoomToAllLayers]);

    // Handle stretch selection
    useEffect(() => {
        if (selectedStretch && mapRef.current) {
            console.log(`Stretch selection changed to: ${selectedStretch}`);
            if (stretchesData && stretchLayerRef.current) {
                highlightSelectedStretch(selectedStretch);
                zoomToSelectedLayer('stretch');
            }
        }
    }, [selectedStretch, stretchesData, zoomToSelectedLayer]);

    // Handle drains selection
    useEffect(() => {
        if (selectedDrains.length > 0 && mapRef.current) {
            console.log(`Drains selection changed to: ${selectedDrains.join(', ')}`);
            if (drainsData && drainLayerRef.current) {
                highlightSelectedDrains();
                fetchCatchmentsByDrains(selectedDrains);
                zoomToSelectedLayer('drains');
            }
        } else {
            if (catchmentLayerRef.current && mapRef.current) {
                mapRef.current.removeLayer(catchmentLayerRef.current);
                catchmentLayerRef.current = null;
            }
            if (villageLayerRef.current && mapRef.current) {
                mapRef.current.removeLayer(villageLayerRef.current);
                villageLayerRef.current = null;
            }
            zoomToAllLayers();
        }
    }, [selectedDrains, drainsData, zoomToSelectedLayer, zoomToAllLayers]);

    // Toggle labels
    useEffect(() => {
        if (stretchesData) {
            if (showLabels) {
                createStretchLabels(stretchesData);
            } else {
                clearLabelLayers();
            }
        }
    }, [showLabels, stretchesData]);

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
                                color: '#FF4500',
                                weight: 5,
                                opacity: 1.0,
                            });
                        }
                        if (layer.bringToFront) {
                            layer.bringToFront();
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
                                color: '#FF0066',
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
            console.log("All data fetched and layers updated");
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
            stretchLayerRef.current.eachLayer((layer: any) => {
                if (layer.feature?.properties) {
                    const stretchId = layer.feature.properties.Stretch_ID?.toString();
                    if (riverStretchIds.includes(stretchId)) {
                        if (layer.setStyle) {
                            layer.setStyle({
                                color: '#0066FF',
                                weight: 4,
                                opacity: 0.9,
                            });
                        }
                        if (layer.bringToFront) {
                            layer.bringToFront();
                        }
                    } else {
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
            if (selectedStretch) {
                highlightSelectedStretch(selectedStretch);
            }
        } catch (err) {
            console.error("Error highlighting river stretches:", err);
        }
    };

    const fetchStretchesByRiver = async (riverId: string) => {
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
            const riverStretchIds = data.features.map(feature =>
                feature.properties.Stretch_ID?.toString()
            );
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
                }
            }
        } catch (error: any) {
            console.error("Error fetching all stretches:", error);
            setError(`Stretches: ${error.message}`);
        }
    };

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

            if (data.village_geojson?.features?.length > 0) {
                console.log(`Received ${data.village_geojson.features.length} village features`);
                setVillageData(data.village_geojson);
                if (mapRef.current) {
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

            if (data.catchment_geojson?.features?.length > 0) {
                console.log(`Received ${data.catchment_geojson.features.length} catchment features`);
                setCatchmentData(data.catchment_geojson);
                if (mapRef.current) {
                    updateCatchmentsLayer(data.catchment_geojson);
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
                    color: '#800080',
                    weight: 2,
                    opacity: 0.8,
                    fillColor: '#E6E6FA',
                    fillOpacity: 0.3,
                }),
                onEachFeature: (feature, layer) => {
                    const catchmentName = feature.properties.Catchment_Name || 'Unknown';
                    const drainNo = feature.properties.Drain_No || 'N/A';
                    layer.bindPopup(`Catchment: ${catchmentName}<br>Drain No: ${drainNo}`);
                },
            }).addTo(mapRef.current);
            console.log(`Catchment layer added with ${data.features.length} features`);
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
                    color: 'red',
                    weight: 3,
                    opacity: 0.8,
                    fillColor: 'white',
                    fillOpacity: 0,
                }),
                onEachFeature: (feature, layer) => {
                    const basinName = feature.properties.Basin_Name || 'Unknown';
                    layer.bindPopup(`Basin: ${basinName}`);
                },
                pane: 'tilePane',
            }).addTo(mapRef.current);
            basinLayerRef.current.bringToBack();
            console.log(`Basin layer added with ${data.features.length} features`);
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
        } catch (error) {
            console.error("Error updating rivers layer:", error);
            setError("Failed to display rivers");
        }
    };

    const updateStretchesLayer = (data: GeoJSONFeatureCollection) => {
        if (!mapRef.current) return;
        console.log("Updating stretches layer...");
        if (stretchLayerRef.current) {
            mapRef.current.removeLayer(stretchLayerRef.current);
            stretchLayerRef.current = null;
        }
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
            try {
                if (showLabels) {
                    createStretchLabels(data);
                }
            } catch (labelError) {
                console.error("Error creating stretch labels:", labelError);
            }
            if (selectedRiver) {
                fetchStretchesByRiver(selectedRiver);
            }
            if (selectedStretch) {
                highlightSelectedStretch(selectedStretch);
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
                if (feature.geometry.type === 'Point') {
                    const coords = feature.geometry.coordinates;
                    const latlng = L.latLng(coords[1], coords[0]);
                    addLabel(latlng, stretchId);
                } else if (feature.geometry.type === 'LineString') {
                    const coords = feature.geometry.coordinates;
                    if (coords.length > 0) {
                        const midIndex = Math.floor(coords.length / 2);
                        const midCoord = coords[midIndex];
                        const latlng = L.latLng(midCoord[1], midCoord[0]);
                        addLabel(latlng, stretchId);
                    }
                } else if (feature.geometry.type === 'MultiLineString') {
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

    const addLabel = (latlng: L.LatLng, text: string) => {
        if (!mapRef.current) return;
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
                    color: '#FFA500',
                    weight: 2,
                    opacity: 0.8,
                    fillColor: '#FFD700',
                    fillOpacity: 0.3,
                }),
                onEachFeature: (feature, layer) => {
                    const villageName = feature.properties.shapeName || 'Unknown';
                    const shapeID = feature.properties.shapeID || 'N/A';
                    layer.bindPopup(`Village: ${villageName}<br>ID: ${shapeID}`);
                },
            }).addTo(mapRef.current);
            console.log(`Village layer added with ${data.features.length} features`);
            villageLayerRef.current.bringToFront();
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
                        weight: 3,
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
                                color: '#1E90FF',
                                weight: 5,
                                opacity: 1.0,
                                fillOpacity: 0.8,
                            });
                        }
                        if (layer.bringToFront) {
                            layer.bringToFront();
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

    const zoomToSelectedLayer = useCallback((layerType: 'river' | 'stretch' | 'drains') => {
        if (!mapRef.current) {
            console.warn("Map not initialized, cannot zoom to selected layer");
            return;
        }
        console.log(`Zooming to selected layer: ${layerType}`);

        const bounds = L.latLngBounds([]);
        let anyValidBounds = false;

        if (layerType === 'river' && selectedRiver && stretchesData) {
            const riverStretches = stretchesData.features.filter(feature =>
                feature.properties.River_Code?.toString() === selectedRiver
            );
            if (riverStretches.length > 0) {
                try {
                    const tempLayer = L.geoJSON({ type: 'FeatureCollection', features: riverStretches });
                    const layerBounds = tempLayer.getBounds();
                    if (layerBounds.isValid()) {
                        bounds.extend(layerBounds);
                        anyValidBounds = true;
                        console.log(`River stretches: Extended bounds with ${riverStretches.length} features`);
                    } else {
                        console.warn("River stretches: Invalid bounds");
                    }
                } catch (err) {
                    console.error("River stretches: Error processing bounds", err);
                }
            } else {
                console.warn("No stretches found for selected river");
            }
        } else if (layerType === 'stretch' && selectedStretch && stretchesData) {
            const stretchFeature = stretchesData.features.find(feature =>
                feature.properties.Stretch_ID?.toString() === selectedStretch
            );
            if (stretchFeature) {
                try {
                    const tempLayer = L.geoJSON(stretchFeature);
                    const layerBounds = tempLayer.getBounds();
                    if (layerBounds.isValid()) {
                        bounds.extend(layerBounds);
                        anyValidBounds = true;
                        console.log("Selected stretch: Extended bounds");
                    } else {
                        console.warn("Selected stretch: Invalid bounds");
                    }
                } catch (err) {
                    console.error("Selected stretch: Error processing bounds", err);
                }
            } else {
                console.warn("Selected stretch not found in data");
            }
        } else if (layerType === 'drains' && selectedDrains.length > 0 && drainsData) {
            const drainFeatures = drainsData.features.filter(feature =>
                selectedDrains.includes(feature.properties.Drain_No?.toString())
            );
            if (drainFeatures.length > 0) {
                try {
                    const tempLayer = L.geoJSON({ type: 'FeatureCollection', features: drainFeatures });
                    const layerBounds = tempLayer.getBounds();
                    if (layerBounds.isValid()) {
                        bounds.extend(layerBounds);
                        anyValidBounds = true;
                        console.log(`Selected drains: Extended bounds with ${drainFeatures.length} features`);
                    } else {
                        console.warn("Selected drains: Invalid bounds");
                    }
                } catch (err) {
                    console.error("Selected drains: Error processing bounds", err);
                }
            }
            if (catchmentData?.features?.length > 0) {
                try {
                    const tempLayer = L.geoJSON(catchmentData);
                    const layerBounds = tempLayer.getBounds();
                    if (layerBounds.isValid()) {
                        bounds.extend(layerBounds);
                        anyValidBounds = true;
                        console.log(`Catchments: Extended bounds with ${catchmentData.features.length} features`);
                    } else {
                        console.warn("Catchments: Invalid bounds");
                    }
                } catch (err) {
                    console.error("Catchments: Error processing bounds", err);
                }
            }
        }

        if (!anyValidBounds || !bounds.isValid()) {
            console.warn(`No valid bounds for ${layerType}, falling back to all layers`);
            zoomToAllLayers();
        } else {
            console.log(`Zooming to ${layerType} bounds:`, bounds.toBBoxString());
            try {
                const ne = bounds.getNorthEast();
                const sw = bounds.getSouthWest();
                if (Math.abs(ne.lat - sw.lat) < 0.0001 && Math.abs(ne.lng - sw.lng) < 0.0001) {
                    mapRef.current.setView(bounds.getCenter(), 14);
                } else {
                    mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
                }
            } catch (err) {
                console.error(`Error zooming to ${layerType} bounds:`, err);
                zoomToAllLayers();
            }
        }
    }, [selectedRiver, selectedStretch, selectedDrains, stretchesData, drainsData, catchmentData, zoomToAllLayers]);

    const zoomToAllLayers = useCallback(() => {
        if (!mapRef.current) {
            console.warn("Map not initialized, cannot zoom");
            return;
        }
        console.log("Zooming to all layers...");

        const bounds = L.latLngBounds([]);
        let anyValidBounds = false;

        // Process each layer's data
        const layers = [
            { name: 'Basin', data: basinData },
            { name: 'Rivers', data: riversData },
            { name: 'Stretches', data: stretchesData },
            { name: 'Drains', data: drainsData },
            { name: 'Catchment', data: catchmentData },
        ];

        layers.forEach(({ name, data }) => {
            if (data?.features?.length > 0) {
                try {
                    const tempLayer = L.geoJSON(data, {
                        filter: feature => {
                            if (!feature.geometry || !feature.geometry.type) {
                                console.warn(`${name}: Skipping feature with invalid geometry`, feature);
                                return false;
                            }
                            return true;
                        },
                    });
                    const layerBounds = tempLayer.getBounds();
                    if (layerBounds.isValid()) {
                        bounds.extend(layerBounds);
                        anyValidBounds = true;
                        console.log(`${name}: Extended bounds with ${data.features.length} features`);
                    } else {
                        console.warn(`${name}: Invalid bounds for dataset`);
                    }
                } catch (err) {
                    console.error(`${name}: Error processing bounds`, err);
                }
            }
        });

        if (!anyValidBounds || !bounds.isValid()) {
            console.warn("No valid bounds found, using default view");
            mapRef.current.setView([23.5937, 80.9629], 5); // Center of India
        } else {
            console.log("Zooming to combined bounds:", bounds.toBBoxString());
            try {
                const ne = bounds.getNorthEast();
                const sw = bounds.getSouthWest();
                if (Math.abs(ne.lat - sw.lat) < 0.0001 && Math.abs(ne.lng - sw.lng) < 0.0001) {
                    mapRef.current.setView(bounds.getCenter(), 12);
                } else {
                    mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
                }
            } catch (err) {
                console.error("Error fitting bounds:", err);
                mapRef.current.setView([23.5937, 80.9629], 5);
            }
        }
    }, [basinData, riversData, stretchesData, drainsData, catchmentData]);

    const toggleDebug = () => {
        setDebug(!debug);
    };

    const toggleLabels = () => {
        setShowLabels(!showLabels);
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
                        <span className="w-4 h-4 bg-orange-400 inline-block mr-1 border border-gray-600"></span>
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
                    <div className="flex items-center">
                        <span className="w-4 h-4 inline-block mr-1 border"
                            style={{ backgroundColor: '#E6E6FA', borderColor: '#800080' }}></span>
                        Catchments
                    </div>
                    <div className="flex items-center">
                        <span className="w-4 h-4 inline-block mr-1 border"
                            style={{ backgroundColor: '#FFD700', borderColor: '#FFA500' }}></span>
                        Villages
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
                className="flex-grow w-full"
                style={{ height: '100%', minHeight: '400px' }}
            ></div>
            {debug && (
                <div className="bg-gray-100 border-t border-gray-300 p-2 text-xs font-mono overflow-auto max-h-32">
                    <div>Debug Info:</div>
                    <div>Map: {mapRef.current ? 'Initialized' : 'Not initialized'}</div>
                    <div>Initial Zoom: {initialZoomDone ? 'Done' : 'Pending'}</div>
                    <div>Basin: {basinData ? `${basinData.features.length} features` : 'None'}</div>
                    <div>Rivers: {riversData ? `${riversData.features.length} features` : 'None'}</div>
                    <div>Stretches: {stretchesData ? `${stretchesData.features.length} features` : 'None'}</div>
                    <div>Selected River: {selectedRiver || 'None'}</div>
                    <div>Drains: {drainsData ? `${drainsData.features.length} features` : 'None'}</div>
                    <div>Selected Stretch: {selectedStretch || 'None'}</div>
                    <div>Selected Drains: {selectedDrains.length > 0 ? selectedDrains.join(', ') : 'None'}</div>
                    <div>Catchments: {catchmentData ? `${catchmentData.features.length} features` : 'None'}</div>
                    <div>Villages: {villageData ? `${villageData.features.length} features` : 'None'}</div>
                    <div>Labels: {showLabels ? `Visible (${labelLayersRef.current.length})` : 'Hidden'}</div>
                </div>
            )}
        </div>
    );
};

export default DrainMap;
