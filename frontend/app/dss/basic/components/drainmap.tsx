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

    const [basinData, setBasinData] = useState<GeoJSONFeatureCollection | null>(null);
    const [riversData, setRiversData] = useState<GeoJSONFeatureCollection | null>(null);
    const [stretchesData, setStretchesData] = useState<GeoJSONFeatureCollection | null>(null);
    const [drainsData, setDrainsData] = useState<GeoJSONFeatureCollection | null>(null);

    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [debug, setDebug] = useState<boolean>(false);
    const [showLabels, setShowLabels] = useState<boolean>(true);

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
        if (selectedRiver && mapRef.current) {
            fetchStretchesByRiver(selectedRiver);
        }
    }, [selectedRiver]);

    
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

    const fetchAllData = async () => {
        setLoading(true);
        setError(null);
        try {
            console.log("Starting data fetch...");
            await Promise.all([
                fetchBasin(),
                fetchRivers(),
                fetchAllDrains()
            ]);

            if (selectedRiver) {
                await fetchStretchesByRiver(selectedRiver);
            }

            console.log("All data fetched, zooming to layers...");
            if (mapRef.current) {
                zoomToAllLayers();
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

    const fetchStretchesByRiver = async (riverId: string) => {
        try {
            console.log(`Fetching stretches for river ${riverId}...`);
            const response = await fetch('http://localhost:9000/api/basic/river-stretched/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ river_id: riverId })
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
            setStretchesData(data);
            if (mapRef.current) {
                updateStretchesLayer(data);
                if (showLabels) {
                    createStretchLabels(data);
                }
            }
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

    const clearLabelLayers = () => {
        if (mapRef.current && labelLayersRef.current.length > 0) {
            labelLayersRef.current.forEach(layer => mapRef.current?.removeLayer(layer));
            labelLayersRef.current = [];
            console.log("Cleared label layers");
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
        clearLabelLayers();
        if (!data?.features?.length) {
            console.warn("No stretch features to display");
            return;
        }
        try {
            stretchLayerRef.current = L.geoJSON(data, {
                style: () => ({
                    color: 'green',
                    weight: 4,
                    opacity: 0.6,
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
                    layer.bindPopup(`Stretch: ${stretchId}`);
                },
            }).addTo(mapRef.current);
            console.log(`Stretches layer added with ${data.features.length} features`);

            if (showLabels) {
                createStretchLabels(data);
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
                                color: '#555',
                                weight: 2,
                                opacity: 0.8,
                                fillOpacity: 0.5,
                            });
                        }
                        if (layer.bringToFront) {
                            layer.bringToFront();
                        }
                    }
                }
            });
            console.log("Highlighted drains:", selectedDrains);
        } catch (err) {
            console.error("Error highlighting drains:", err);
        }
    };

    const zoomToAllLayers = () => {
        if (!mapRef.current) return;
        console.log("Zooming to all layers...");

        // Create new bounds
        const bounds = L.latLngBounds([]);
        let anyValidBounds = false;

        // Add basin bounds if available
        if (basinData?.features?.length) {
            try {
                const tempLayer = L.geoJSON(basinData);
                if (tempLayer.getBounds().isValid()) {
                    bounds.extend(tempLayer.getBounds());
                    anyValidBounds = true;
                }
            } catch (err) {
                console.error("Error processing basin bounds:", err);
            }
        }

        // Add river bounds if available
        if (riversData?.features?.length) {
            try {
                const tempLayer = L.geoJSON(riversData);
                if (tempLayer.getBounds().isValid()) {
                    bounds.extend(tempLayer.getBounds());
                    anyValidBounds = true;
                }
            } catch (err) {
                console.error("Error processing river bounds:", err);
            }
        }

        // Add stretch bounds if available
        if (stretchesData?.features?.length) {
            try {
                const tempLayer = L.geoJSON(stretchesData);
                if (tempLayer.getBounds().isValid()) {
                    bounds.extend(tempLayer.getBounds());
                    anyValidBounds = true;
                }
            } catch (err) {
                console.error("Error processing stretch bounds:", err);
            }
        }

        // Add drain bounds if available
        if (drainsData?.features?.length) {
            try {
                const tempLayer = L.geoJSON(drainsData);
                if (tempLayer.getBounds().isValid()) {
                    bounds.extend(tempLayer.getBounds());
                    anyValidBounds = true;
                }
            } catch (err) {
                console.error("Error processing drain bounds:", err);
            }
        }

        // If no valid bounds found at all, add a fallback point
        if (!anyValidBounds) {
            console.warn("No valid bounds at all, trying a fallback approach");
            // Add a single point to ensure we have valid bounds
            const center = [23.5937, 80.9629]; // Center of India
            bounds.extend(L.latLng(center));
            mapRef.current.setView(center, 5);
        } else {
            console.log("Zooming to bounds:", bounds);
            mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
        }
    };

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
                        <span className="w-4 h-4 bg-green-600 inline-block mr-1 border border-black-800"></span>
                        Stretches
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
                className="flex-grow w-full"
                style={{ height: '100%', minHeight: '400px' }}
            ></div>
            {debug && (
                <div className="bg-gray-100 border-t border-gray-300 p-2 text-xs font-mono overflow-auto max-h-32">
                    <div>Debug Info:</div>
                    <div>Map: {mapRef.current ? 'Initialized' : 'Not initialized'}</div>
                    <div>Basin: {basinData ? `${basinData.features.length} features` : 'None'}</div>
                    <div>Rivers: {riversData ? `${riversData.features.length} features` : 'None'}</div>
                    <div>Stretches: {stretchesData ? `${stretchesData.features.length} features` : 'None'}</div>
                    <div>Selected River: {selectedRiver || 'None'}</div>
                    <div>Drains: {drainsData ? `${drainsData.features.length} features` : 'None'}</div>
                    <div>Labels: {showLabels ? `Visible (${labelLayersRef.current.length})` : 'Hidden'}</div>
                </div>
            )}
        </div>
    );
};

export default DrainMap;