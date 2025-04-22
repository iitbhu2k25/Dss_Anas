'use client';
import React, { useEffect, useRef, useState } from 'react';

interface GroundwaterSustainabilityMapProps {
  rechargeData?: any;
  showNotification?: (title: string, message: string, type?: string) => void;
}

const GroundwaterSustainabilityMap: React.FC<GroundwaterSustainabilityMapProps> = ({
  rechargeData,
  showNotification = (title, message) => console.log(`${title}: ${message}`),
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const drawnItemsRef = useRef<any>(null);
  
  const rechargeLayerRef = useRef<any>(null);
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

  // Effect to handle recharge data changes
  useEffect(() => {
    if (!rechargeData || !mapInstanceRef.current) return;

    try {
      // Clear previous layers
      if (rechargeLayerRef.current) {
        mapInstanceRef.current.removeLayer(rechargeLayerRef.current);
        rechargeLayerRef.current = null;
      }
      if (legendControlRef.current) {
        mapInstanceRef.current.removeControl(legendControlRef.current);
        legendControlRef.current = null;
      }

      // In a real application, you would use the actual recharge data
      // For demonstration, we'll create a example polygon layer
      
      // Define a color scale for recharge zones
      const getRechargeColor = (rechargeValue: number) => {
        return rechargeValue > 500 ? '#006837' :   // Very high recharge (dark green)
               rechargeValue > 300 ? '#31a354' :   // High recharge 
               rechargeValue > 150 ? '#78c679' :   // Moderate recharge
               rechargeValue > 50 ? '#c2e699' :    // Low recharge 
               rechargeValue > 0 ? '#ffffcc' :     // Very low recharge (pale yellow)
               '#d7301f';                         // Negative recharge (red)
      };
      
      // Create recharge layer from data
      const rechargeLayer = window.L.geoJSON(rechargeData, {
        style: function(feature) {
          const rechargeValue = feature.properties.recharge_mm_yr || 0;
          return {
            fillColor: getRechargeColor(rechargeValue),
            weight: 2,
            opacity: 1,
            color: 'white',
            dashArray: '3',
            fillOpacity: 0.7
          };
        },
        onEachFeature: (feature, layer) => {
          if (feature.properties) {
            let popupContent = '<div class="recharge-popup">';
            popupContent += `<h3 style="margin: 0 0 5px 0;">${feature.properties.name || 'Recharge Zone'}</h3>`;
            popupContent += `<p><strong>Recharge:</strong> ${feature.properties.recharge_mm_yr || 0} mm/year</p>`;
            popupContent += `<p><strong>Area:</strong> ${feature.properties.area_sqkm || 'N/A'} km²</p>`;
            popupContent += `<p><strong>Volume:</strong> ${feature.properties.volume_mcm || 'N/A'} MCM/year</p>`;
            
            if (feature.properties.sustainability) {
              const status = feature.properties.sustainability;
              let statusColor = '';
              
              if (status === 'Sustainable') {
                statusColor = 'green';
              } else if (status === 'Moderate stress') {
                statusColor = 'orange';
              } else if (status === 'Severe stress') {
                statusColor = 'red';
              }
              
              popupContent += `<p><strong>Status:</strong> <span style="color: ${statusColor}">${status}</span></p>`;
            }
            
            popupContent += '</div>';
            layer.bindPopup(popupContent);
          }
          
          // Add hover highlighting
          layer.on({
            mouseover: function(e) {
              const layer = e.target;
              layer.setStyle({
                weight: 5,
                color: '#666',
                dashArray: '',
                fillOpacity: 0.9
              });
              layer.bringToFront();
            },
            mouseout: function(e) {
              rechargeLayer.resetStyle(e.target);
            },
            click: function(e) {
              selectFeature(e.target);
            }
          });
        }
      });
      
      rechargeLayer.addTo(mapInstanceRef.current);
      rechargeLayerRef.current = rechargeLayer;
      
      // Add a legend
      const legend = window.L.control({ position: 'bottomright' });
      legend.onAdd = function() {
        const div = window.L.DomUtil.create('div', 'info legend');
        const grades = [0, 50, 150, 300, 500];
        const labels = [];
        
        div.innerHTML = '<div style="background: white; padding: 10px; border-radius: 5px; box-shadow: 0 0 5px rgba(0,0,0,0.3);">' +
          '<h4 style="margin: 0 0 5px 0; font-size: 14px;">Recharge (mm/year)</h4>';
        
        // Loop through recharge intervals and generate a label with colored square for each
        for (let i = 0; i < grades.length; i++) {
          div.innerHTML +=
            '<div style="display: flex; align-items: center; margin-bottom: 3px;">' +
              '<i style="width: 18px; height: 18px; background:' + getRechargeColor(grades[i] + 1) + '; ' +
              'margin-right: 8px; opacity: 0.7;"></i> ' +
              (grades[i + 1] ? grades[i] + '&ndash;' + grades[i + 1] + '<br>' : grades[i] + '+') +
            '</div>';
        }
        
        div.innerHTML += '</div>';
        return div;
      };
      
      legend.addTo(mapInstanceRef.current);
      legendControlRef.current = legend;
      
      // Try to zoom to recharge layer bounds
      try {
        const bounds = rechargeLayer.getBounds();
        if (bounds.isValid()) {
          mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
        }
      } catch (e) {
        console.error('Error zooming to recharge layer bounds:', e);
      }

      showNotification('Recharge Data Loaded', 'Groundwater recharge zones have been plotted on the map', 'success');
    } catch (error) {
      console.error('Error adding recharge data to map:', error);
      showNotification('Error', 'Failed to render recharge data on map', 'error');
    }
  }, [rechargeData, showNotification]);

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
        // Toggle recharge visibility
        if (rechargeLayerRef.current) {
          if (map.hasLayer(rechargeLayerRef.current)) {
            rechargeLayerRef.current.remove();
            showNotification('Layers', 'Recharge zones hidden', 'info');
          } else {
            rechargeLayerRef.current.addTo(map);
            showNotification('Layers', 'Recharge zones shown', 'info');
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
        {rechargeData && (
          <p className="text-sm font-medium mt-1 text-green-600">
            Showing groundwater recharge zones
          </p>
        )}
      </div>
    </div>
  );
};

export default GroundwaterSustainabilityMap;