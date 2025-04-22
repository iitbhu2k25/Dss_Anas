'use client';
import React, { useEffect, useRef, useState } from 'react';

interface GroundwaterTrendMapProps {
  trendData?: any;
  showNotification?: (title: string, message: string, type?: string) => void;
}

const GroundwaterTrendMap: React.FC<GroundwaterTrendMapProps> = ({
  trendData,
  showNotification = (title, message) => console.log(`${title}: ${message}`),
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const drawnItemsRef = useRef<any>(null);
  
  const trendLayerRef = useRef<any>(null);
  const basinBoundaryLayerRef = useRef<any>(null);
  const legendControlRef = useRef<any>(null);
  const [coordinates, setCoordinates] = useState<string>('');
  const [selectedFeature, setSelectedFeature] = useState<any>(null);
  const [baseLayers, setBaseLayers] = useState<any>({});
  const compassRef = useRef<HTMLDivElement>(null);

  // Load Leaflet dependencies
  useEffect(() => {
    // Load CSS files
    if (!document.getElementById('leaflet-css')) {
      const leafletCSS = document.createElement('link');
      leafletCSS.id = 'leaflet-css';
      leafletCSS.rel = 'stylesheet';
      leafletCSS.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      leafletCSS.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
      leafletCSS.crossOrigin = '';
      document.head.appendChild(leafletCSS);
    }

    if (!document.getElementById('leaflet-draw-css')) {
      const leafletDrawCSS = document.createElement('link');
      leafletDrawCSS.id = 'leaflet-draw-css';
      leafletDrawCSS.rel = 'stylesheet';
      leafletDrawCSS.href = 'https://unpkg.com/leaflet-draw@1.0.4/dist/leaflet.draw.css';
      document.head.appendChild(leafletDrawCSS);
    }

    // Load JS libraries
    const loadLeaflet = () => {
      return new Promise<void>((resolve) => {
        if (!window.L) {
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
          script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
          script.crossOrigin = '';
          script.onload = () => resolve();
          document.body.appendChild(script);
        } else {
          resolve();
        }
      });
    };

    const loadLeafletDraw = () => {
      return new Promise<void>((resolve) => {
        if (window.L && !window.L.Draw) {
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/leaflet-draw@1.0.4/dist/leaflet.draw.js';
          script.onload = () => resolve();
          document.body.appendChild(script);
        } else if (window.L && window.L.Draw) {
          resolve();
        }
      });
    };

    const setupMap = async () => {
      await loadLeaflet();
      await loadLeafletDraw();
      initializeMap();
    };

    setupMap();

    // Cleanup function
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.off();
      }
    };
  }, []);

  // Effect to handle trend data changes
  useEffect(() => {
    if (!trendData || !mapInstanceRef.current) return;

    try {
      // Clear previous layers
      if (trendLayerRef.current) {
        mapInstanceRef.current.removeLayer(trendLayerRef.current);
        trendLayerRef.current = null;
      }
      if (legendControlRef.current) {
        mapInstanceRef.current.removeControl(legendControlRef.current);
        legendControlRef.current = null;
      }

      // Add trend layer - we'll simulate trend data as it's not included in your code examples
      // In a real application, you would use the actual trend data structure
      
      // Example of how you might display trend data
      const trendLayer = window.L.geoJSON(trendData, {
        style: function(feature) {
          // Apply different styles based on trend value
          // For example, red for declining, green for increasing
          const trendValue = feature.properties.trend;
          const color = trendValue < 0 ? 
                       '#ff0000' : // Red for declining
                       trendValue > 0 ? 
                       '#00ff00' : // Green for increasing
                       '#ffff00';  // Yellow for stable
          
          return {
            fillColor: color,
            weight: 2,
            opacity: 0.7,
            color: 'white',
            fillOpacity: 0.7
          };
        },
        onEachFeature: (feature, layer) => {
          if (feature.properties) {
            let popupContent = '<div class="trend-popup">';
            popupContent += `<strong>Trend:</strong> ${feature.properties.trend.toFixed(2)} ft/year<br>`;
            popupContent += `<strong>Significance:</strong> ${feature.properties.significance || 'N/A'}<br>`;
            
            if (feature.properties.well_id) {
              popupContent += `<strong>Well ID:</strong> ${feature.properties.well_id}<br>`;
            }
            
            popupContent += '</div>';
            layer.bindPopup(popupContent);
          }
        }
      });

      trendLayer.addTo(mapInstanceRef.current);
      trendLayerRef.current = trendLayer;

      // Add a legend
      const legend = window.L.control({ position: 'bottomright' });
      legend.onAdd = function() {
        const div = window.L.DomUtil.create('div', 'info legend');
        div.innerHTML = `
          <div style="background: white; padding: 10px; border-radius: 5px; box-shadow: 0 0 5px rgba(0,0,0,0.3);">
            <h4 style="margin: 0 0 5px 0; font-size: 14px;">Groundwater Trend</h4>
            <div style="display: flex; align-items: center; margin-bottom: 5px;">
              <div style="width: 20px; height: 20px; background: #ff0000; margin-right: 5px;"></div>
              <span>Declining</span>
            </div>
            <div style="display: flex; align-items: center; margin-bottom: 5px;">
              <div style="width: 20px; height: 20px; background: #ffff00; margin-right: 5px;"></div>
              <span>Stable</span>
            </div>
            <div style="display: flex; align-items: center;">
              <div style="width: 20px; height: 20px; background: #00ff00; margin-right: 5px;"></div>
              <span>Rising</span>
            </div>
          </div>
        `;
        return div;
      };
      
      legend.addTo(mapInstanceRef.current);
      legendControlRef.current = legend;
      
      // Try to zoom to trend layer bounds
      try {
        const bounds = trendLayer.getBounds();
        if (bounds.isValid()) {
          mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
        }
      } catch (e) {
        console.error('Error zooming to trend layer bounds:', e);
      }

      showNotification('Trend Data Loaded', 'Groundwater trend data has been plotted on the map', 'success');
    } catch (error) {
      console.error('Error adding trend data to map:', error);
      showNotification('Error', 'Failed to render trend data on map', 'error');
    }
  }, [trendData, showNotification]);

  // Load basin boundary
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Load GeoJSON basin boundary from API endpoint
    fetch('http://localhost:9000/api/gwa/basin-boundary/')
      .then(res => res.json())
      .then(data => {
        // Create GeoJSON layer with custom styling
        const basinLayer = window.L.geoJSON(data, {
          style: {
            color: '#2196F3',
            weight: 2,
            fillOpacity: 0.1,
            fillColor: '#2196F3'
          },
          onEachFeature: function(feature, layer) {
            // Add popups if the feature has properties
            if (feature.properties) {
              let popupContent = '<div class="basin-popup">';
              
              // Loop through properties to build popup content
              for (const [key, value] of Object.entries(feature.properties)) {
                if (value && key !== 'shape_leng' && key !== 'shape_area') {
                  popupContent += `<strong>${key}:</strong> ${value}<br>`;
                }
              }
              
              popupContent += '</div>';
              layer.bindPopup(popupContent);
            }
          }
        });
        
        // Add the basin layer to the map
        basinLayer.addTo(mapInstanceRef.current);
        basinBoundaryLayerRef.current = basinLayer;
        
        showNotification('Data Loaded', 'Basin boundaries loaded successfully', 'success');
      })
      .catch(error => {
        console.error("Error loading basin boundary data:", error);
        showNotification('Error', 'Failed to load basin boundaries', 'error');
      });
  }, [showNotification]);

  const initializeMap = () => {
    if (!mapContainerRef.current || !window.L || mapInstanceRef.current) return;

    // Fix icon paths for markers
    delete window.L.Icon.Default.prototype._getIconUrl;
    window.L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    // Create map
    const map = window.L.map(mapContainerRef.current, {
      zoomControl: false,
      drawControl: false,
    }).setView([22.9734, 78.6569], 5);

    // Define basemap layers
    const osmLayer = window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    });

    const satelliteLayer = window.L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: 'Tiles © Esri',
        maxZoom: 19,
      }
    );

    const topoLayer = window.L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
      attribution: 'Map data © OpenStreetMap contributors, SRTM | Map style © OpenTopoMap',
      maxZoom: 17,
    });

    const googleStreets = window.L.tileLayer('http://mt1.google.com/vt/lyrs=r&x={x}&y={y}&z={z}', {
      attribution: '© Google',
      maxZoom: 20,
    });

    const googleHybrid = window.L.tileLayer('http://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
      attribution: '© Google',
      maxZoom: 20,
    });

    const googleTerrain = window.L.tileLayer('http://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}', {
      attribution: '© Google',
      maxZoom: 20,
    });

    const googleTraffic = window.L.tileLayer(
      'https://{s}.google.com/vt/lyrs=m@221097413,traffic&x={x}&y={y}&z={z}',
      {
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        attribution: '© <a href="https://www.google.com/maps">Google Traffic</a>',
        maxZoom: 20,
      }
    );

    // Organize base layers
    const newBaseLayers = {
      'Google Traffic': googleTraffic,
      OpenStreetMap: osmLayer,
      Satellite: satelliteLayer,
      Topographic: topoLayer,
      'Google Streets': googleStreets,
      'Google Hybrid': googleHybrid,
      'Google Terrain': googleTerrain,
    };

    // Add Google Traffic as the default layer
    googleTraffic.addTo(map);

    // Layer control
    const layerControl = window.L.control.layers(newBaseLayers, {});
    layerControl.addTo(map);

    // Scale control
    window.L.control.scale({
      imperial: false,
      position: 'bottomleft',
    }).addTo(map);

    // Create feature group for drawn items
    const drawnItems = new window.L.FeatureGroup();
    map.addLayer(drawnItems);
    drawnItemsRef.current = drawnItems;

    // Add drawing controls
    const drawControlOptions = {
      position: 'topright',
      draw: {
        polyline: {
          shapeOptions: {
            color: '#f357a1',
            weight: 3,
          },
        },
        polygon: {
          allowIntersection: false,
          drawError: {
            color: '#e1e100',
            message: '<strong>Error:</strong> Shape edges cannot cross!',
          },
          shapeOptions: {
            color: '#3388ff',
          },
        },
        circle: {
          shapeOptions: {
            color: '#662d91',
          },
        },
        rectangle: {
          shapeOptions: {
            color: '#ff9800',
          },
        },
        marker: true,
      },
      edit: {
        featureGroup: drawnItems,
        remove: true,
      },
    };

    const drawControl = new window.L.Control.Draw(drawControlOptions);
    map.addControl(drawControl);

    // Handle created items
    map.on('draw:created', function (e: any) {
      const layer = e.layer;
      drawnItems.addLayer(layer);

      // Make the layer selectable
      layer.on('click', function () {
        selectFeature(layer);

        // Show specific information based on feature type
        if (layer instanceof window.L.Marker) {
          const latLng = layer.getLatLng();
          setCoordinates(`Marker at: ${latLng.lat.toFixed(6)}, ${latLng.lng.toFixed(6)}`);
          layer
            .bindPopup(
              `<strong>Coordinates:</strong><br>Lat: ${latLng.lat.toFixed(5)}<br>Lng: ${latLng.lng.toFixed(5)}`
            )
            .openPopup();
        } else if (layer instanceof window.L.Polygon) {
          // Calculate area (simplified calculation)
          const latlngs = layer.getLatLngs()[0];
          let area = 0;
          for (let i = 0; i < latlngs.length; i++) {
            const j = (i + 1) % latlngs.length;
            area += latlngs[i].lng * latlngs[j].lat;
            area -= latlngs[j].lng * latlngs[i].lat;
          }
          area = Math.abs(area) * 0.5 * 111.32 * 111.32; // Rough conversion to square km

          layer.bindPopup(`<strong>Area:</strong> ${area.toFixed(2)} sq km`).openPopup();
        } else if (layer instanceof window.L.Polyline && !(layer instanceof window.L.Polygon)) {
          // Calculate length
          const latlngs = layer.getLatLngs();
          let length = 0;

          for (let i = 0; i < latlngs.length - 1; i++) {
            length += latlngs[i].distanceTo(latlngs[i + 1]);
          }

          layer.bindPopup(`<strong>Length:</strong> ${(length / 1000).toFixed(2)} km`).openPopup();
        } else if (layer instanceof window.L.Circle) {
          const radius = layer.getRadius();
          layer.bindPopup(`<strong>Radius:</strong> ${radius.toFixed(2)} meters`).openPopup();
        }
      });

      showNotification('Drawing Complete', 'Your drawing has been added to the map', 'success');
    });

    // Handle editing events
    map.on('draw:edited', function (e: any) {
      const layers = e.layers;
      let count = 0;

      layers.eachLayer(function (layer: any) {
        count++;

        // Update popups for the edited features
        if (layer instanceof window.L.Polygon) {
          const latlngs = layer.getLatLngs()[0];

          // Recalculate area
          let area = 0;
          for (let i = 0; i < latlngs.length; i++) {
            const j = (i + 1) % latlngs.length;
            area += latlngs[i].lng * latlngs[j].lat;
            area -= latlngs[j].lng * latlngs[i].lat;
          }
          area = Math.abs(area) * 0.5 * 111.32 * 111.32;

          layer.setPopupContent(`<strong>Area:</strong> ${area.toFixed(2)} sq km`);
        } else if (layer instanceof window.L.Circle) {
          const radius = layer.getRadius();
          layer.setPopupContent(`<strong>Radius:</strong> ${radius.toFixed(2)} meters`);
        } else if (layer instanceof window.L.Polyline && !(layer instanceof window.L.Polygon)) {
          const latlngs = layer.getLatLngs();
          let length = 0;

          for (let i = 0; i < latlngs.length - 1; i++) {
            length += latlngs[i].distanceTo(latlngs[i + 1]);
          }

          layer.setPopupContent(`<strong>Length:</strong> ${(length / 1000).toFixed(2)} km`);
        } else if (layer instanceof window.L.Marker) {
          const latLng = layer.getLatLng();
          layer.setPopupContent(
            `<strong>Coordinates:</strong><br>Lat: ${latLng.lat.toFixed(5)}<br>Lng: ${latLng.lng.toFixed(5)}`
          );
        }
      });

      showNotification('Edit Successful', `${count} ${count === 1 ? 'layer' : 'layers'} edited`, 'success');
    });

    // Handle delete events
    map.on('draw:deleted', function (e: any) {
      const layers = e.layers;
      let count = 0;

      layers.eachLayer(function () {
        count++;
      });

      showNotification('Delete Successful', `${count} ${count === 1 ? 'layer' : 'layers'} deleted`, 'success');
    });

    // Update coordinates on mouse move
    map.on('mousemove', function (e: any) {
      const { lat, lng } = e.latlng;
      setCoordinates(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    });

    // Fix for draw control events
    map.on('draw:drawstart', function () {
      // Disable layer selection while drawing to avoid conflicts
      map.off('click');
    });

    map.on('draw:drawstop', function () {
      // Re-enable layer selection after drawing is complete
      map.on('click', function (e: any) {
        // Check if the click is on an existing feature
        const clickPoint = e.latlng;
        let clickedLayer = null;

        drawnItems.eachLayer(function (layer: any) {
          // For polygons, polylines, circles, rectangles
          if (layer.getBounds && layer.contains && layer.contains(clickPoint)) {
            clickedLayer = layer;
          }
          // For markers
          else if (layer.getLatLng && layer.getLatLng().distanceTo(clickPoint) < 20) {
            clickedLayer = layer;
          }
        });

        if (clickedLayer) {
          selectFeature(clickedLayer);
        }
      });
    });

    // Add compass (North arrow)
    const compassControl = window.L.control({ position: 'topleft' });
    compassControl.onAdd = function () {
      const div = window.L.DomUtil.create('div', 'compass-control');
      div.innerHTML = `
        <div style="background-color: white; padding: 5px; border-radius: 5px; box-shadow: 0 0 5px rgba(0,0,0,0.3);">
          <svg width="40" height="40" viewBox="0 0 100 100">
            <polygon points="50,0 40,40 50,30 60,40" fill="#e74c3c" />
            <polygon points="50,100 40,60 50,70 60,60" fill="#3498db" />
          </svg>
        </div>
      `;
      compassRef.current = div;
      return div;
    };
    compassControl.addTo(map);

    // Add button to clear all drawn items
    const clearControl = window.L.control({ position: 'bottomright' });
    clearControl.onAdd = function () {
      const div = window.L.DomUtil.create('div', 'clear-control');
      div.innerHTML = `
        <button style="background-color: white; padding: 5px 10px; border-radius: 5px; box-shadow: 0 0 5px rgba(0,0,0,0.3); cursor: pointer;">
          Clear All
        </button>
      `;
      div.onclick = function () {
        drawnItems.clearLayers();
        setSelectedFeature(null);
        setCoordinates('');
        showNotification('Cleared', 'All drawings have been removed from the map', 'info');
      };
      return div;
    };
    clearControl.addTo(map);

    // Add button to toggle data visibility
    const toggleDataControl = window.L.control({ position: 'bottomright' });
    toggleDataControl.onAdd = function () {
      const div = window.L.DomUtil.create('div', 'toggle-data-control');
      div.innerHTML = `
        <button style="background-color: white; padding: 5px 10px; border-radius: 5px; box-shadow: 0 0 5px rgba(0,0,0,0.3); cursor: pointer; margin-bottom: 10px;">
          Toggle Data Layers
        </button>
      `;
      div.onclick = function () {
        // Toggle trend visibility
        if (trendLayerRef.current) {
          if (map.hasLayer(trendLayerRef.current)) {
            trendLayerRef.current.remove();
            showNotification('Layers', 'Trend data hidden', 'info');
          } else {
            trendLayerRef.current.addTo(map);
            showNotification('Layers', 'Trend data shown', 'info');
          }
        }

        // Toggle basin boundary visibility
        if (basinBoundaryLayerRef.current) {
          if (map.hasLayer(basinBoundaryLayerRef.current)) {
            basinBoundaryLayerRef.current.remove();
            showNotification('Layers', 'Basin boundaries hidden', 'info');
          } else {
            basinBoundaryLayerRef.current.addTo(map);
            showNotification('Layers', 'Basin boundaries shown', 'info');
          }
        }
      };
      return div;
    };
    toggleDataControl.addTo(map);

    // Add zoom controls
    const zoomControl = window.L.control.zoom({
      position: 'topright',
    });
    zoomControl.addTo(map);

    // Store map instance and baseLayers
    mapInstanceRef.current = map;
    setBaseLayers(newBaseLayers);
  };

  // Function to select a feature and deselect others
  const selectFeature = (layer: any) => {
    // Reset previously selected feature
    if (selectedFeature) {
      if (selectedFeature.setStyle) {
        selectedFeature.setStyle({
          weight: 3,
          color: selectedFeature.options.color || '#3388ff',
          opacity: 1,
          fillOpacity: 0.2,
        });
      }
    }

    // Set new selected feature
    setSelectedFeature(layer);

    // Apply active style to selected feature
    if (layer.setStyle) {
      layer.setStyle({
        weight: 5,
        color: '#ff0000',
        opacity: 1,
        fillOpacity: 0.4,
      });
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div
        ref={mapContainerRef}
        className="w-full h-[700px] border rounded-md overflow-hidden shadow-md"
      />

      <div className="mt-2 p-2 bg-gray-100 rounded-md">
        <p className="text-sm font-medium">Coordinates: {coordinates}</p>
        {selectedFeature && (
          <p className="text-sm font-medium mt-1 text-blue-600">
            Feature selected:{' '}
            {selectedFeature instanceof window.L.Marker
              ? 'Marker'
              : selectedFeature instanceof window.L.Polygon
                ? 'Polygon'
                : selectedFeature instanceof window.L.Polyline
                  ? 'Line'
                  : selectedFeature instanceof window.L.Circle
                    ? 'Circle'
                    : selectedFeature instanceof window.L.Rectangle
                      ? 'Rectangle'
                      : 'Unknown'}
          </p>
        )}
        {trendData && (
          <p className="text-sm font-medium mt-1 text-green-600">
            Showing groundwater trend analysis results
          </p>
        )}
      </div>
    </div>
  );
};

export default GroundwaterTrendMap;