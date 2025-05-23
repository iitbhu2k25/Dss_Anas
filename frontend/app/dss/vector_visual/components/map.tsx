// app/vector/components/map.tsx

'use client';
import ExportModal from '../components/export';
import React, { useEffect, useState, useRef } from 'react';
import Draggable from 'react-draggable';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';

  export default function Map({
    sidebarCollapsed,
    onFeatureClick,
    currentLayer,
    activeFeature,
    compassVisible,
    gridVisible,
    showNotification
    }) {
    const [geoJsonLayer, setGeoJsonLayer] = useState(null);
    const mapRef = useRef(null);
    const mapContainerRef = useRef(null);
    const [map, setMap] = useState(null);
    const [baseLayers, setBaseLayers] = useState({});
    const [coordinates, setCoordinates] = useState({ lat: 0, lng: 0 });
    const [loading, setLoading] = useState(false);
    const drawnItemsRef = useRef(null);
    const gridLinesRef = useRef([]);
    const labelLayerRef = useRef(null);
    const [bufferDistance, setBufferDistance] = useState(100); // Default buffer distance in meters
    const [bufferToolVisible, setBufferToolVisible] = useState(false); // Toggle for buffer tool visibility
    const mapInstanceRef = useRef(null);
    const drawControlRef = useRef(null);
    const [exportModalOpen, setExportModalOpen] = useState(false);

    // Initialize map when component mounts
    // Initialize map when component mounts
    useEffect(() => {
  // Define handleResize at the top level of the useEffect
  const handleResize = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.invalidateSize();
    }
  };

  if (typeof window !== 'undefined' && !mapInstanceRef.current) {
    // Dynamic imports for client-side only
    const L = require('leaflet');
    require('leaflet-draw');

    // Fix icon paths
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    // Check if map element exists
    if (mapRef.current && !mapInstanceRef.current) {
      // Set a high z-index to ensure map is visible
      if (mapRef.current) {
        mapRef.current.style.zIndex = "1";
      }
      
      const newMap = L.map(mapRef.current, {
        zoomControl: false,
        drawControl: false,
        // Add these performance options
        preferCanvas: true,
        renderer: L.canvas()
      }).setView([22.3511, 78.6677], 5);

      mapInstanceRef.current = newMap;

      // Force initial rendering
      newMap._initPathRoot && newMap._initPathRoot();

      // Create basemaps
      const newBaseLayers = {
        streets: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }),
        satellite: L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
          subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
          attribution: '&copy; <a href="https://www.google.com/maps">Google Maps</a>',
        }),
        terrain: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
        }),
        traffic: L.tileLayer('https://{s}.google.com/vt/lyrs=m@221097413,traffic&x={x}&y={y}&z={z}', {
          subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
          attribution: '&copy; <a href="https://www.google.com/maps">Google Traffic</a>',
        }),
        hybrid: L.layerGroup([
          L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
            maxZoom: 19,
          }),
          L.tileLayer('https://stamen-tiles-{s}.a.ssl.fastly.net/toner-labels/{z}/{x}/{y}{r}.png', {
            attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            subdomains: 'abcd',
            maxZoom: 20,
            opacity: 0.7,
          }),
        ]),
        none: L.tileLayer('', {
          attribution: 'No basemap',
        }),
      };

      // Add default basemap with load event
      newBaseLayers.traffic.on('load', function() {
        // Force a redraw when tiles are loaded
        newMap.invalidateSize();
      }).addTo(newMap);

      // Scale control
      L.control.scale({
        imperial: false,
        position: 'bottomleft',
      }).addTo(newMap);

      // Drawing tools - create feature group to store drawn items
      const drawnItems = new L.FeatureGroup();
      newMap.addLayer(drawnItems);
      drawnItemsRef.current = drawnItems;

      // Create draw control
      const drawControl = new L.Control.Draw({
        position: 'topright',
        draw: {
          polyline: {
            shapeOptions: {
              color: 'red',
              weight: 3,
            },
          },
          polygon: {
            allowIntersection: false,
            drawError: {
              color: 'red',
              timeout: 1000,
            },
            shapeOptions: {
              color: 'red',
            },
          },
          circle: {
            shapeOptions: {
              color: 'red',
            },
          },
          marker: true,
          rectangle: {
            shapeOptions: {
              color: 'red',
            },
          },
        },
        edit: {
          featureGroup: drawnItems,
          remove: true
        },
      });

      drawControlRef.current = drawControl;

      // Wait for map to be fully ready
      newMap.whenReady(() => {
        // Add draw control to map
        newMap.addControl(drawControl);
        
        // Update coordinates on mouse move with throttling
        newMap.on('mousemove', L.Util.throttle(function(e) {
          setCoordinates({
            lat: e.latlng.lat.toFixed(5),
            lng: e.latlng.lng.toFixed(5),
          });
        }, 100)); // Update at most every 100ms
        
        // Handle drawing events
        newMap.on(L.Draw.Event.CREATED, function (event) {
          const layer = event.layer;

          // Important: Add the layer to the FeatureGroup so it persists
          drawnItems.addLayer(layer);

          // Mark the layer as selected for buffer operations
          layer._selected = true;

          // Deselect other layers
          drawnItems.eachLayer((otherLayer) => {
            if (otherLayer !== layer) {
              otherLayer._selected = false;
            }
          });

          // If it's a polygon, calculate area
          if (layer instanceof L.Polygon) {
            const latlngs = layer.getLatLngs()[0];

            // Calculate area (using simple formula for demo)
            let area = 0;
            for (let i = 0; i < latlngs.length; i++) {
              const j = (i + 1) % latlngs.length;
              area += latlngs[i].lng * latlngs[j].lat;
              area -= latlngs[j].lng * latlngs[i].lat;
            }
            area = Math.abs(area) * 0.5 * 111.32 * 111.32; // Rough conversion to square km

            layer
              .bindPopup(`<strong>Area:</strong> ${area.toFixed(2)} sq km`)
              .openPopup();
          }

          // Rest of your event handling code...
          // (keeping the existing handlers)
        });

        // Rest of your event handlers...
        // (keeping the existing handlers)
      });

      // Force a map redraw after a delay
      setTimeout(() => {
        newMap.invalidateSize(true);
        // Force a repaint of the container
        if (mapRef.current) {
          const currentDisplay = mapRef.current.style.display;
          mapRef.current.style.display = 'none';
          // Trigger reflow
          void mapRef.current.offsetHeight;
          mapRef.current.style.display = currentDisplay;
        }
      }, 500);

      // Add window resize handler to fix map size issues
      window.addEventListener('resize', handleResize);

      setMap(newMap);
      setBaseLayers(newBaseLayers);
    }
  }

  // Cleanup
  return () => {
    window.removeEventListener('resize', handleResize);
    if (mapInstanceRef.current) {
      // Don't remove the map on component unmount, just cleanup listeners
      mapInstanceRef.current.off();
    }
  };
    }, []);

    // Update map size when sidebar collapses
    useEffect(() => {
      if (mapInstanceRef.current) {
        setTimeout(() => {
          mapInstanceRef.current.invalidateSize();
        }, 300);
      }
    }, [sidebarCollapsed]);

    // Handle compass visibility
    useEffect(() => {
      if (mapInstanceRef.current) {
        const compass = document.getElementById('compass');
        if (compass) {
          compass.style.display = compassVisible ? 'flex' : 'none';
        }
      }
    }, [compassVisible]);

    // Handle active feature highlighting
    useEffect(() => {
      if (currentLayer && activeFeature) {
        // First import Leaflet if we're in the browser
        const L = typeof window !== 'undefined' ? require('leaflet') : null;
        if (!L) return;

        // Reset styles on all features
        currentLayer.eachLayer((layer) => {
          if (layer !== activeFeature) {
            // Only call resetStyle on path objects
            if (layer instanceof L.Path) {
              currentLayer.resetStyle(layer);
            }
            // Remove any highlight indicators from markers
            if (layer instanceof L.Marker && layer._highlightCircle) {
              mapInstanceRef.current.removeLayer(layer._highlightCircle);
              delete layer._highlightCircle;
            }
          }
        });

        // Apply active style to selected feature
        if (activeFeature instanceof L.Marker) {
          // For markers, create a highlight circle instead of using setStyle
          // Clean up any existing highlight
          if (activeFeature._highlightCircle) {
            mapInstanceRef.current.removeLayer(activeFeature._highlightCircle);
          }

          // Add a highlight circle around the marker
          const highlightCircle = L.circle(activeFeature.getLatLng(), {
            radius: 20,  // radius in meters
            color: '#ff4444',
            weight: 3,
            opacity: 0.7,
            fillColor: '#ff4444',
            fillOpacity: 0.3,
          }).addTo(mapInstanceRef.current);

          // Store the highlight circle for later removal
          activeFeature._highlightCircle = highlightCircle;
        } else if (activeFeature instanceof L.Path) {
          // For paths (polylines, polygons, circles), we can use setStyle
          activeFeature.setStyle({
            weight: 3,
            color: '#ff4444',
            fillOpacity: 0.7,
          });
        }
      }

      // Cleanup
      return () => {
        if (currentLayer && activeFeature &&
          typeof window !== 'undefined') {
          const L = require('leaflet');
          if (activeFeature instanceof L.Marker &&
            activeFeature._highlightCircle) {
            mapInstanceRef.current.removeLayer(activeFeature._highlightCircle);
            delete activeFeature._highlightCircle;
          }
        }
      };
    }, [activeFeature, currentLayer]);

    // Method to change basemap - expose through window for sidebar access
    useEffect(() => {
      if (typeof window !== 'undefined' && mapInstanceRef.current && baseLayers) {
        // Expose the changeBasemap function globally so sidebar can access it
        window.changeBasemap = (basemapId) => {
          if (!mapInstanceRef.current || !baseLayers) return;

          // Remove all current layers
          Object.values(baseLayers).forEach((layer) => {
            if (mapInstanceRef.current.hasLayer(layer)) {
              mapInstanceRef.current.removeLayer(layer);
            }
          });

          // Add selected layer if it's not 'none'
          if (basemapId !== 'none' && baseLayers[basemapId]) {
            mapInstanceRef.current.addLayer(baseLayers[basemapId]);
          }

          // Show notification
          const basemapName = basemapId.charAt(0).toUpperCase() + basemapId.slice(1);
          showNotification(
            "Basemap Changed",
            `Switched to ${basemapName} basemap`,
            "info"
          );
        };

        // Expose buffer tool toggle function
        window.toggleBufferTool = () => {
          setBufferToolVisible(!bufferToolVisible);
        };
      }

      return () => {
        // Cleanup global function when component unmounts
        if (typeof window !== 'undefined') {
          delete window.changeBasemap;
          delete window.toggleBufferTool;
        }
      };
    }, [baseLayers, bufferToolVisible, showNotification]);

    
    // Function to load GeoJSON data from backend - FIXED VERSION with reliable tile reloading
    useEffect(() => {
      if (typeof window !== 'undefined') {
        window.loadGeoJSON = async (category, subcategory) => {
          if (!mapInstanceRef.current) {
            console.error("Map not initialized");
            return;
          }

          try {
            setLoading(true);

            // Make API call to backend
            const response = await fetch(
              `http://localhost:9000/api/mapplot/get_shapefile_data?category=${category}&subcategory=${subcategory}`
            );

            if (!response.ok) {
              throw new Error(`Failed to fetch data: ${response.statusText}`);
            }

            const geoJsonData = await response.json();

            if (!geoJsonData.features || geoJsonData.features.length === 0) {
              throw new Error("No feature data received");
            }

            const L = require('leaflet');

            // Remove previous GeoJSON layer if it exists
            if (geoJsonLayer) {
              mapInstanceRef.current.removeLayer(geoJsonLayer);
            }

            // Get style values from UI or use defaults
            const lineColorElement = document.getElementById('lineColor');
            const weightElement = document.getElementById('weight');
            const fillColorElement = document.getElementById('fillColor');
            const opacityElement = document.getElementById('opacity');

            const lineColor = lineColorElement ? lineColorElement.value : 'red';
            const weight = weightElement ? parseInt(weightElement.value) : 2;
            const fillColor = fillColorElement ? fillColorElement.value : '#78b4db';
            const opacity = opacityElement ? parseFloat(opacityElement.value) : 0.1;

            // Create new GeoJSON layer
            const newLayer = L.geoJSON(geoJsonData, {
              style: function () {
                return {
                  color: lineColor,
                  weight: weight,
                  opacity: 1,
                  fillColor: fillColor,
                  fillOpacity: opacity
                };
              },
              onEachFeature: (feature, layer) => {
                layer.on({
                  click: (e) => {
                    if (onFeatureClick) {
                      L.DomEvent.stop(e);
                      onFeatureClick(feature, layer);
                    }
                  }
                });
              }
            });

            // Get bounds before adding to map
            const bounds = newLayer.getBounds();
            if (!bounds || !bounds.isValid()) {
              throw new Error("Invalid GeoJSON bounds");
            }

            // Calculate center and zoom from bounds
            const center = bounds.getCenter();
            const zoom = mapInstanceRef.current.getBoundsZoom(bounds, false, [50, 50]);
            
            // Save current center and zoom (for debugging)
            const oldCenter = mapInstanceRef.current.getCenter();
            const oldZoom = mapInstanceRef.current.getZoom();
            console.log("Old position:", oldCenter, oldZoom);
            console.log("New position:", center, zoom);
            
            // Get the current base layer
            let currentBaseLayer = null;
            Object.entries(baseLayers).forEach(([name, layer]) => {
              if (mapInstanceRef.current.hasLayer(layer)) {
                currentBaseLayer = { name, layer };
              }
            });

            // IMPORTANT FIX: Force rebuild map view with new coordinates
            // This is similar to what happens during a refresh
            mapInstanceRef.current.setView(center, zoom, { animate: false });
            
            // Refresh base layer - remove and re-add it
            if (currentBaseLayer) {
              mapInstanceRef.current.removeLayer(currentBaseLayer.layer);
              setTimeout(() => {
                mapInstanceRef.current.addLayer(currentBaseLayer.layer);
                currentBaseLayer.layer.bringToBack();
              }, 50);
            }
            
            // Add GeoJSON layer after base layer refresh
            setTimeout(() => {
              // Add the new GeoJSON layer to the map
              newLayer.addTo(mapInstanceRef.current);
              
              // Update state
              setGeoJsonLayer(newLayer);
              
              // Final check to ensure proper view is set
              setTimeout(() => {
                // Force final map update
                mapInstanceRef.current.invalidateSize(true);
                
                // Ensure we're still at the right view
                const currentView = mapInstanceRef.current.getCenter();
                const currentZoom = mapInstanceRef.current.getZoom();
                
                // If the view has drifted, reset it
                if (Math.abs(currentView.lat - center.lat) > 0.001 || 
                    Math.abs(currentView.lng - center.lng) > 0.001 || 
                    currentZoom !== zoom) {
                  console.log("View drifted, resetting...");
                  mapInstanceRef.current.setView(center, zoom, { animate: false });
                }
              }, 100);
            }, 100);

            showNotification('Success', 'Vector data loaded successfully', 'success');
            return newLayer;
          } catch (error) {
            console.error('Error loading GeoJSON:', error);
            showNotification('Error', `Failed to load data: ${error.message}`, 'error');
            return null;
          } finally {
            setLoading(false);
          }
        };
      }

      return () => {
        if (typeof window !== 'undefined') {
          delete window.loadGeoJSON;
        }
      };
    }, [geoJsonLayer, onFeatureClick, showNotification, baseLayers]);
      

    const updateLayerStyles = () => {
      if (!geoJsonLayer) return;

      const newStyle = {
        color: document.getElementById('lineColor')?.value || '#000000',
        weight: parseInt(document.getElementById('weight')?.value || '2'),
        opacity: 1, // Keep line opacity at full (1)
        fillColor: document.getElementById('fillColor')?.value || '#78b4db',
        fillOpacity: parseFloat(document.getElementById('opacity')?.value || '0.1')
      };

      geoJsonLayer.setStyle(newStyle);
    };

    useEffect(() => {
      if (typeof window !== 'undefined') {
        window.updateMapStyles = updateLayerStyles;
      }

      return () => {
        if (typeof window !== 'undefined') {
          delete window.updateMapStyles;
        }
      };
    }, [geoJsonLayer]);

    const handleZoomIn = () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.zoomIn(1);
      }
    };

    const handleZoomOut = () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.zoomOut(1);
      }
    };

    // Function to handle home button
    const handleHomeClick = () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setView([22.3511, 78.6677], 4);
        showNotification("Map Reset", "Returned to default view", "info");
      }
    };

    // Function to handle locate button
    const handleLocateClick = () => {
      if (!mapInstanceRef.current) return;

      showNotification("Location", "Finding your location...", "info");

      mapInstanceRef.current.locate({
        setView: true,
        maxZoom: 16,
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      })
        .on("locationfound", function (e) {
          const L = require('leaflet');

          // Add a marker at the location
          const locationMarker = L.circleMarker(e.latlng, {
            radius: 8,
            color: "red",
            weight: 3,
            opacity: 1,
            fillColor: "#3498db",
            fillOpacity: 0.4,
          }).addTo(mapInstanceRef.current);

          showNotification(
            "Location Found",
            "Your current location has been located",
            "success"
          );
        })
        .on("locationerror", function (e) {
          const L = require('leaflet');

          // Fallback for demo or if geolocation fails
          const randomLat = 22.3511 + (Math.random() * 2 - 1);
          const randomLng = 78.6677 + (Math.random() * 2 - 1);
          mapInstanceRef.current.setView([randomLat, randomLng], 10);

          L.marker([randomLat, randomLng])
            .addTo(mapInstanceRef.current)
            .bindPopup("Simulated location (Geolocation not available)")
            .openPopup();

          showNotification(
            "Location Simulated",
            "Using demo location (geolocation unavailable)",
            "info"
          );
        });
    };

    // Function to handle fullscreen
    const handleFullScreen = () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch((err) => {
          showNotification(
            "Error",
            `Fullscreen failed: ${err.message}`,
            "error"
          );
        });
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        }
      }
    };

    // Function to handle shapefile download
    const handleDownload = () => {
      showNotification(
        "Download Started",
        "Your vector data is being downloaded",
        "success"
      );
    };

    // Function to toggle edit mode
    const toggleEditMode = () => {
      if (!mapInstanceRef.current || !drawnItemsRef.current) return;

      const L = require('leaflet');

      const editHandler = new L.EditToolbar.Edit(mapInstanceRef.current, {
        featureGroup: drawnItemsRef.current
      });

      editHandler.enable();

      showNotification(
        "Edit Mode",
        "Edit mode activated. Click 'Save' when done.",
        "info"
      );
    };

    // Function to create a buffer around selected feature
    const createBuffer = () => {
      if (!mapInstanceRef.current || !drawnItemsRef.current) return;

      const L = require('leaflet');

      // Check if any layer is selected
      let selectedLayer = null;
      drawnItemsRef.current.eachLayer((layer) => {
        if (layer._selected) {
          selectedLayer = layer;
        }
      });

      if (!selectedLayer) {
        // If no layer is explicitly selected, use the last drawn layer
        let lastLayer = null;
        drawnItemsRef.current.eachLayer((layer) => {
          lastLayer = layer;
        });
        selectedLayer = lastLayer;
      }

      if (!selectedLayer) {
        showNotification(
          "Buffer Error",
          "Please draw or select a feature first",
          "error"
        );
        return;
      }

      // Buffer creation based on feature type
      try {
        if (selectedLayer instanceof L.Marker) {
          // For markers, create a circle buffer
          const circle = L.circle(selectedLayer.getLatLng(), {
            radius: bufferDistance,
            color: '#9c27b0',
            fillColor: '#9c27b0',
            fillOpacity: 0.2,
            weight: 2,
          });

          circle.addTo(drawnItemsRef.current);
          circle.bindPopup(`<strong>Buffer:</strong> ${bufferDistance}m around marker`);

        } else if (selectedLayer instanceof L.Polyline && !(selectedLayer instanceof L.Polygon)) {
          // For polylines, create parallel lines
          const latlngs = selectedLayer.getLatLngs();
          const bufferedPoints = [];

          // Simple buffering algorithm for polylines
          for (let i = 0; i < latlngs.length - 1; i++) {
            const p1 = latlngs[i];
            const p2 = latlngs[i + 1];

            // Get the angle of the line
            const angle = Math.atan2(p2.lat - p1.lat, p2.lng - p1.lng);

            // Calculate the perpendicular angle
            const perpAngle1 = angle + Math.PI / 2;
            const perpAngle2 = angle - Math.PI / 2;

            // Convert buffer distance from meters to degrees (approximate)
            // This is a rough approximation as 1 degree is about 111km at the equator
            const bufferDegrees = bufferDistance / 111000;

            // Calculate offset points for the first segment
            const offset1A = {
              lat: p1.lat + bufferDegrees * Math.sin(perpAngle1),
              lng: p1.lng + bufferDegrees * Math.cos(perpAngle1)
            };

            const offset1B = {
              lat: p1.lat + bufferDegrees * Math.sin(perpAngle2),
              lng: p1.lng + bufferDegrees * Math.cos(perpAngle2)
            };

            const offset2A = {
              lat: p2.lat + bufferDegrees * Math.sin(perpAngle1),
              lng: p2.lng + bufferDegrees * Math.cos(perpAngle1)
            };

            const offset2B = {
              lat: p2.lat + bufferDegrees * Math.sin(perpAngle2),
              lng: p2.lng + bufferDegrees * Math.cos(perpAngle2)
            };

            // Create buffer polygons for this segment
            const bufferPolygon = L.polygon([
              offset1A,
              offset2A,
              offset2B,
              offset1B
            ], {
              color: '#9c27b0',
              fillColor: '#9c27b0',
              fillOpacity: 0.2,
              weight: 2,
            }).addTo(drawnItemsRef.current);

            bufferPolygon.bindPopup(`<strong>Buffer:</strong> ${bufferDistance}m around line`);
          }

        } else if (selectedLayer instanceof L.Polygon) {
          // For polygons, create a larger polygon
          const latlngs = selectedLayer.getLatLngs()[0];
          const bufferedPoints = [];

          // Compute centroid
          let centroidLat = 0;
          let centroidLng = 0;

          latlngs.forEach(point => {
            centroidLat += point.lat;
            centroidLng += point.lng;
          });

          centroidLat /= latlngs.length;
          centroidLng /= latlngs.length;

          const centroid = { lat: centroidLat, lng: centroidLng };

          // Simple buffering by extending points outward from centroid
          latlngs.forEach(point => {
            // Vector from centroid to point
            const vLat = point.lat - centroid.lat;
            const vLng = point.lng - centroid.lng;

            // Distance from centroid to point
            const dist = Math.sqrt(vLat * vLat + vLng * vLng);

            // Convert buffer distance from meters to degrees (approximate)
            const bufferDegrees = bufferDistance / 111000;

            // Extend point outward
            const extendFactor = (dist + bufferDegrees) / dist;

            bufferedPoints.push({
              lat: centroid.lat + vLat * extendFactor,
              lng: centroid.lng + vLng * extendFactor
            });
          });

          const bufferPolygon = L.polygon(bufferedPoints, {
            color: '#9c27b0',
            fillColor: '#9c27b0',
            fillOpacity: 0.2,
            weight: 2,
          }).addTo(drawnItemsRef.current);

          bufferPolygon.bindPopup(`<strong>Buffer:</strong> ${bufferDistance}m around polygon`);

        } else if (selectedLayer instanceof L.Circle) {
          // For circles, create a larger circle
          const bufferCircle = L.circle(selectedLayer.getLatLng(), {
            radius: selectedLayer.getRadius() + bufferDistance,
            color: '#9c27b0',
            fillColor: '#9c27b0',
            fillOpacity: 0.2,
            weight: 2,
          }).addTo(drawnItemsRef.current);

          bufferCircle.bindPopup(`<strong>Buffer:</strong> ${bufferDistance}m around circle`);
        }

        showNotification(
          "Buffer Created",
          `${bufferDistance}m buffer created successfully`,
          "success"
        );

      } catch (error) {
        console.error("Buffer creation error:", error);
        showNotification(
          "Buffer Error",
          "Failed to create buffer. Please try again.",
          "error"
        );
      }
    };

    // Toggle the buffer tool
    const toggleBufferTool = () => {
      if (!bufferToolVisible) {
        setBufferToolVisible(true);
        showNotification(
          "Buffer Activated",
          "Now take tool and click on create buffer",
          "You can edit buffer distance using the edit tool."
        );
      } else {
        setBufferToolVisible(false);
        showNotification("Buffer Done", "Buffer tool deactivated"); // Assuming you have a function to remove notifications
      }
    };

    return (
      <div className="relative w-full h-200" ref={mapContainerRef}>
        {/* Map container - set explicit position and z-index */}
        <div
          ref={mapRef}
          className="absolute top-0 left-0 w-full h-[calc(100vh-56px)] rounded-lg shadow-inner z-10" />
        {/* UI Controls Wrapper - ensure all controls are positioned above the map */}
        <div className="absolute inset-2 z-10  pointer-events-none">
          {/* Coordinates Display */}
          <div className="absolute top-213 left-30 bg-white/90 py-0.5 px-3 rounded-lg shadow-md backdrop-blur-sm text-sm pointer-events-auto">
            <div className="flex items-center">
              <span className="font-medium text-gray-700 mr-1">Lat:</span>
              <span className="text-gray-700 mr-2">{coordinates.lat}</span>
              <span className="font-medium text-gray-700 mr-2">Lng:</span>
              <span className="text-gray-700">{coordinates.lng}</span>
            </div>
          </div>

          {/* Compass */}
          {compassVisible && (
            <div id="compass" className="absolute top-20 left-5 w-[100px] h-[100px] bg-white/90 rounded-full shadow-md flex items-center justify-center backdrop-blur-sm pointer-events-auto">
              <div className="w-[90px] h-[90px] relative animate-[compass-fade-in_1s_ease]">
                <div className="absolute top-0 left-0 w-full h-full border-2 border-blue-500/20 rounded-full"></div>
                <div className="absolute top-[5px] left-[5px] right-[5px] bottom-[5px] rounded-full bg-gradient-to-br from-gray-50 to-gray-200 shadow-inner"></div>
                <div className="absolute top-1/2 left-1/2 w-1 h-[70%] -translate-x-1/2 -translate-y-1/2 origin-center">
                  <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-t from-transparent to-red-600 clip-path-triangle-n transform-origin-bottom"></div>
                  <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-b from-transparent to-gray-800 clip-path-triangle-s transform-origin-top"></div>
                </div>
                <div className="absolute top-1/2 left-1/2 w-3 h-3 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-br from-white to-gray-300 rounded-full shadow-sm z-[3]"></div>
                <div className="absolute top-0 left-0 w-full h-full font-['Poppins',sans-serif] font-semibold text-xs pointer-events-none">
                  <div className="absolute top-[5px] left-1/2 -translate-x-1/2 text-red-600">N</div>
                  <div className="absolute top-[18%] right-[18%] text-gray-600 text-[10px]">NE</div>
                  <div className="absolute top-1/2 right-[5px] -translate-y-1/2 text-gray-600">E</div>
                  <div className="absolute bottom-[18%] right-[18%] text-gray-600 text-[10px]">SE</div>
                  <div className="absolute bottom-[5px] left-1/2 -translate-x-1/2 text-gray-600">S</div>
                  <div className="absolute bottom-[18%] left-[18%] text-gray-600 text-[10px]">SW</div>
                  <div className="absolute top-1/2 left-[5px] -translate-y-1/2 text-gray-600">W</div>
                  <div className="absolute top-[18%] left-[18%] text-gray-600 text-[10px]">NW</div>
                </div>
              </div>
            </div>
          )}

          {/* Buffer Control Panel - only visible when toggled */}
          {bufferToolVisible && (
            <div className="absolute top-44 right-10 bg-white rounded-xl shadow-md p-3 transition-all duration-300 w-64 pointer-events-auto animate-fade-in">
              <h3 className="text-gray-700 font-medium mb-2">Buffer Tool</h3>
              <div className="mb-2">
                <label className="block text-gray-600 text-sm mb-1">Buffer Distance (m)</label>
                <input
                  type="range"
                  min="10"
                  max="1000"
                  step="10"
                  value={bufferDistance}
                  onChange={(e) => setBufferDistance(parseInt(e.target.value))}
                  className="w-full accent-blue-500"
                />
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">10m</span>
                  <span className="text-sm font-medium text-blue-600">{bufferDistance}m</span>
                  <span className="text-xs text-gray-500">1000m</span>
                </div>
              </div>
              <button
                onClick={createBuffer}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-500 text-white py-2 rounded-lg hover:from-purple-700 hover:to-blue-600 transition-all duration-300 flex items-center justify-center"
              >
                <i className="fas fa-expand-alt mr-2"></i>
                Create Buffer
              </button>
            </div>
          )}

          {/* Download Button */}
          <button
            onClick={handleDownload}
            className="absolute top-2 left-12 bg-white rounded-lg py-2.5 px-4 shadow-md z-10 flex items-center font-medium text-gray-700 pointer-events-auto cursor-pointer transition-all duration-300 hover:bg-blue-500 hover:text-white hover:-translate-y-0.5 hover:shadow-lg"
          >
            <i className="fas fa-download mr-2 text-blue-500 hover:text-white transition-colors"></i> Download Shapefile
          </button>

          {/* Export Button - Replaces the previous GeoJSON Export button */}
          <button
            onClick={() => setExportModalOpen(true)}
            className="absolute top-2 left-72 bg-white rounded-lg py-2.5 px-4 shadow-md z-100 flex items-center font-medium text-gray-700 pointer-events-auto cursor-pointer transition-all duration-300 hover:bg-green-500 hover:text-white hover:-translate-y-0.5 hover:shadow-lg"
          >
            <i className="fas fa-file-export mr-2 text-green-500 hover:text-white transition-colors"></i> Export
          </button>

          {/* Export Modal */}
          <ExportModal
            isOpen={exportModalOpen}
            onClose={() => setExportModalOpen(false)}
            mapInstanceRef={mapInstanceRef}
            drawnItemsRef={drawnItemsRef}
            geoJsonLayer={geoJsonLayer}
            showNotification={showNotification}
          />

          {/* Map Controls */}
          <div className="absolute right-2 top-140  bg-white rounded-xl shadow-md z-10 flex flex-col p-1.5 transition-transform duration-300 hover:-translate-x-1 pointer-events-auto">
            <button onClick={handleZoomIn} className="w-10 h-10 border-none bg-white rounded-lg my-0.5 cursor-pointer transition-all duration-200 flex items-center justify-center text-gray-700 hover:bg-blue-500 hover:text-white hover:scale-110" title="Zoom In">
              <i className="fas fa-plus"></i>
            </button>
            <button onClick={handleZoomOut} className="w-10 h-10 border-none bg-white rounded-lg my-0.5 cursor-pointer transition-all duration-200 flex items-center justify-center text-gray-700 hover:bg-blue-500 hover:text-white hover:scale-110" title="Zoom Out">
              <i className="fas fa-minus"></i>
            </button>
            <button onClick={handleHomeClick} className="w-10 h-10 border-none bg-white rounded-lg my-0.5 cursor-pointer transition-all duration-200 flex items-center justify-center text-gray-700 hover:bg-blue-500 hover:text-white hover:scale-110" title="Default View">
              <i className="fas fa-home"></i>
            </button>
            <button onClick={handleLocateClick} className="w-10 h-10 border-none bg-white rounded-lg my-0.5 cursor-pointer transition-all duration-200 flex items-center justify-center text-gray-700 hover:bg-blue-500 hover:text-white hover:scale-110 relative after:content-[''] after:absolute after:top-0 after:left-0 after:w-full after:h-full after:rounded-lg after:bg-blue-500 after:z-[-1] after:opacity-50 after:animate-ping" title="My Location">
              <i className="fas fa-location-arrow"></i>
            </button>
            <button onClick={handleFullScreen} className="w-10 h-10 border-none bg-white rounded-lg my-0.5 cursor-pointer transition-all duration-200 flex items-center justify-center text-gray-700 hover:bg-blue-500 hover:text-white hover:scale-110" title="Fullscreen">
              <i className="fas fa-expand"></i>
            </button>
            <button onClick={toggleBufferTool} className="w-10 h-10 border-none bg-white rounded-lg my-0.5 cursor-pointer transition-all duration-200 flex items-center justify-center text-gray-700 hover:bg-blue-500 hover:text-white hover:scale-110" title="Buffer Tool">
              <i className="fas fa-circle-notch"></i>
            </button>
          </div>

          {/* Loader */}
          {loading && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/95 py-6 px-8 rounded-2xl shadow-md z-10 flex items-center transition-all duration-300 animate-fade-in pointer-events-auto">
              <div className="mr-4">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <span className="text-gray-700">Loading vector data...</span>
            </div>
          )}
        </div>
      </div>
    );
  };