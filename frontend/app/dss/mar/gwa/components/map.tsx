'use client';
import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

interface MapPreviewProps {
  activeTab: string;
  geoJsonData?: any; // For well data points
  contourData?: any; // For contour data
  showNotification?: (title: string, message: string, type?: string) => void;
}

const LeafletMapPreview: React.FC<MapPreviewProps> = ({
  activeTab,
  geoJsonData,
  contourData,
  showNotification = (title, message) => console.log(`${title}: ${message}`),
  }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const drawnItemsRef = useRef<any>(null);
  const compassRef = useRef<any>(null);
  const geoJsonLayerRef = useRef<any>(null); // For well points data
  const contourLayerRef = useRef<any>(null); // For contour lines
  const boundaryLayerRef = useRef<any>(null); // For boundary data
  const legendControlRef = useRef<any>(null); // For contour legend
  const [coordinates, setCoordinates] = useState<string>('');
  const [showCompass, setShowCompass] = useState<boolean>(true);
  const [selectedFeature, setSelectedFeature] = useState<any>(null);
  const [baseLayers, setBaseLayers] = useState<any>({});
  

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
        // Just remove event listeners, not the map itself
        mapInstanceRef.current.off();
      }
    };
  }, []);

  // Effect to handle well data GeoJSON changes
  useEffect(() => {
    if (!geoJsonData || !mapInstanceRef.current) return;

    try {
      const geoJsonLayer = window.L.geoJSON(geoJsonData, {
        pointToLayer: (feature, latlng) =>
          window.L.circleMarker(latlng, {
            radius: 8,
            fillColor: '#ff7800',
            color: '#000',
            weight: 1,
            opacity: 1,
            fillOpacity: 0.8,
          }),
        onEachFeature: (feature, layer) => {
          if (feature.properties) {
            let popupContent = '<div class="feature-popup">';
            for (const key in feature.properties) {
              if (Object.prototype.hasOwnProperty.call(feature.properties, key)) {
                popupContent += `<strong>${key}:</strong> ${feature.properties[key]}<br>`;
              }
            }
            popupContent += '</div>';
            layer.bindPopup(popupContent);
          }
        },
      });

      // Clear previous GeoJSON layer if needed
      if (geoJsonLayerRef.current) {
        geoJsonLayerRef.current.remove();
      }

      geoJsonLayer.addTo(mapInstanceRef.current);
      geoJsonLayerRef.current = geoJsonLayer;

      // Fit map to bounds
      const bounds = geoJsonLayer.getBounds();
      if (bounds.isValid()) {
        mapInstanceRef.current.fitBounds(bounds, {
          padding: [50, 50],
          maxZoom: 15,
        });
      }

      showNotification('Data Loaded', 'Well data has been plotted on the map', 'success');
    } catch (error) {
      console.error('Error adding well GeoJSON to map:', error);
      showNotification('Error', 'Failed to render well data on map', 'error');
    }
  }, [geoJsonData, showNotification]);

  // Effect to handle contour data changes
  useEffect(() => {
    if (!contourData || !mapInstanceRef.current) return;

    console.log('Processing contour data for map display', contourData);
    console.log('Colormap URL:', contourData.colormap_url); // Log colormap URL for reference

    try {
      // Log GeoJSON structure
      console.log('Contour GeoJSON:', JSON.stringify(contourData.geojson, null, 2));
      console.log('Contour features count:', contourData.geojson?.features?.length || 'No features');

      // Validate GeoJSON
      if (!contourData.geojson || !contourData.geojson.features || !Array.isArray(contourData.geojson.features)) {
        console.error('Invalid GeoJSON structure:', contourData.geojson);
        showNotification('Error', 'Invalid contour data structure', 'error');
        return;
      }

      // Check for valid geometries
      const invalidFeatures = contourData.geojson.features.filter(
        (feature) => !feature.geometry || !feature.geometry.type || !feature.geometry.coordinates
      );
      if (invalidFeatures.length > 0) {
        console.error('Invalid features found:', invalidFeatures);
        showNotification('Error', 'Contour data contains invalid geometries', 'error');
        return;
      }

      // Clear previous layers
      if (contourLayerRef.current) {
        mapInstanceRef.current.removeLayer(contourLayerRef.current);
        contourLayerRef.current = null;
      }
      if (boundaryLayerRef.current) {
        mapInstanceRef.current.removeLayer(boundaryLayerRef.current);
        boundaryLayerRef.current = null;
      }
      if (legendControlRef.current) {
        mapInstanceRef.current.removeControl(legendControlRef.current);
        legendControlRef.current = null;
      }

      // Add contour layer
      const contours = window.L.geoJSON(contourData.geojson, {
        style: function (feature) {
          // Use the color directly from the feature if available
          if (feature.properties && feature.properties.color) {
            return {
              color: feature.properties.color,
              weight: 3,
              opacity: 0.8
            };
          }

          // Fallback to using a generic color
          return {
            color: '#ff0000', // Bright red as fallback
            weight: 3,
            opacity: 0.8
          };
        },
        onEachFeature: (feature, layer) => {
          if (feature.properties && feature.properties.value !== undefined) {
            const value = parseFloat(feature.properties.value).toFixed(2);
            layer.bindTooltip(`${contourData.parameter}: ${value}`, { sticky: true });
          }
        }
      });

      // Don't use getLayers() which might be returning incorrect information
      console.log('Adding contour with features:', contourData.geojson.features.length);

      // Force add to map and store reference
      contours.addTo(mapInstanceRef.current);
      contourLayerRef.current = contours;

      // Zoom to contour bounds
      let combinedBounds;
      try {
        const contourBounds = contours.getBounds();
        if (contourBounds.isValid()) {
          console.log('Zooming to contour bounds');
          combinedBounds = contourBounds;
        }
      } catch (e) {
        console.error('Error zooming to contour bounds:', e);
      }

      // Force map redraw
      mapInstanceRef.current.invalidateSize();

      showNotification(
        'Contour Added',
        `Added contour lines for ${contourData.parameter} (${contourData.data_type} ${contourData.year})`,
        'success'
      );

      // Add boundary layer
      if (contourData.boundary_geojson) {
        const boundary = window.L.geoJSON(contourData.boundary_geojson, {
          style: {
            color: 'red',
            weight: 2,
            opacity: 0.5,
            fillColor: '#eee',
            fillOpacity: 0.1,
          },
        });

        boundary.addTo(mapInstanceRef.current);
        boundaryLayerRef.current = boundary;

        // Include boundary in combined bounds
        try {
          const boundaryBounds = boundary.getBounds();
          if (boundaryBounds.isValid()) {
            console.log('Boundary bounds valid');
            if (combinedBounds) {
              combinedBounds.extend(boundaryBounds);
            } else {
              combinedBounds = boundaryBounds;
            }
          }
        } catch (e) {
          console.error('Error processing boundary bounds:', e);
        }
      }

      // Zoom to combined bounds
      if (combinedBounds && combinedBounds.isValid()) {
        mapInstanceRef.current.fitBounds(combinedBounds, { padding: [50, 50] });
      }

      // Add legend for contour values
      if (contourData.min_value !== undefined && contourData.max_value !== undefined) {
        const legend = window.L.control({ position: 'bottomleft' });
        legend.onAdd = function () {
          const div = window.L.DomUtil.create('div', 'info legend');
          const grades = Array.from(
            { length: 5 },
            (_, i) =>
              contourData.min_value +
              (i * (contourData.max_value - contourData.min_value)) / 4
          );
          div.innerHTML = `<strong>${contourData.parameter} (${contourData.data_type} ${contourData.year})</strong><br>`;
          grades.forEach((grade, i) => {
            const normalized = i / (grades.length - 1);
            const r = Math.round(255 * (1 - normalized));
            const b = Math.round(255 * normalized);
            const color = `rgb(${r}, 0, ${b})`;
            div.innerHTML += `
              <i style="background:${color}; width: 18px; height: 18px; float: left; margin-right: 8px;"></i>
              ${grade.toFixed(2)}<br>
            `;
          });
          return div;
        };
        legend.addTo(mapInstanceRef.current);
        legendControlRef.current = legend;
      }
    } catch (error) {
      console.error('Error adding contour to map:', error);
      showNotification('Error', `Failed to render contour data on map: ${error.message}`, 'error');
    }
  }, [contourData, showNotification]);

  // Effect to clean up layers when active tab changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    console.log('Active tab changed:', activeTab);

    // When tab is not groundwater, remove contour layers
    if (activeTab !== 'groundwater') {
      if (contourLayerRef.current) {
        console.log('Removing contour layer due to tab change');
        mapInstanceRef.current.removeLayer(contourLayerRef.current);
        contourLayerRef.current = null;
      }

      if (legendControlRef.current) {
        console.log('Removing legend control due to tab change');
        mapInstanceRef.current.removeControl(legendControlRef.current);
        legendControlRef.current = null;
      }
    }

    // When tab is not dataSelection, remove well data layers
    if (activeTab !== 'dataSelection') {
      if (geoJsonLayerRef.current) {
        console.log('Removing geoJson layer due to tab change');
        mapInstanceRef.current.removeLayer(geoJsonLayerRef.current);
        geoJsonLayerRef.current = null;
      }
    }

    // Keep boundary layer until all other layers are removed
    if (activeTab !== 'groundwater' && activeTab !== 'dataSelection') {
      if (boundaryLayerRef.current) {
        console.log('Removing boundary layer due to tab change');
        mapInstanceRef.current.removeLayer(boundaryLayerRef.current);
        boundaryLayerRef.current = null;
      }
    }

    // Force map to recalculate its size when tab changes
    setTimeout(() => {
      mapInstanceRef.current.invalidateSize(true);
    }, 100);
  }, [activeTab]);

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
        // Toggle well data visibility
        if (geoJsonLayerRef.current) {
          if (mapInstanceRef.current.hasLayer(geoJsonLayerRef.current)) {
            geoJsonLayerRef.current.remove();
            showNotification('Layers', 'Well data hidden', 'info');
          } else {
            geoJsonLayerRef.current.addTo(mapInstanceRef.current);
            showNotification('Layers', 'Well data shown', 'info');
          }
        }

        // Toggle contour visibility
        if (contourLayerRef.current) {
          if (mapInstanceRef.current.hasLayer(contourLayerRef.current)) {
            contourLayerRef.current.remove();
            showNotification('Layers', 'Contour data hidden', 'info');
          } else {
            contourLayerRef.current.addTo(mapInstanceRef.current);
            showNotification('Layers', 'Contour data shown', 'info');
          }
        }
      };
      return div;
    };
    toggleDataControl.addTo(map);

    // Toggle compass button
    const toggleCompassControl = window.L.control({ position: 'bottomright' });
    toggleCompassControl.onAdd = function () {
      const div = window.L.DomUtil.create('div', 'toggle-compass-control');
      div.innerHTML = `
        <button style="background-color: white; padding: 5px 10px; border-radius: 5px; box-shadow: 0 0 5px rgba(0,0,0,0.3); cursor: pointer; margin-bottom: 10px;">
          Toggle Compass
        </button>
      `;
      div.onclick = function () {
        const newShowCompass = !showCompass;
        setShowCompass(newShowCompass);
        if (compassRef.current) {
          compassRef.current.style.display = newShowCompass ? 'block' : 'none';
        }
        showNotification(
          'Compass',
          newShowCompass ? 'Compass is now visible' : 'Compass is now hidden',
          'info'
        );
      };
      return div;
    };
    toggleCompassControl.addTo(map);

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

    // If it's a marker, we can't set style but we can update its icon
    if (layer instanceof window.L.Marker) {
      // You could use a different icon for selected markers here
    }
  };

  // Handle compass visibility changes
  useEffect(() => {
    if (compassRef.current) {
      compassRef.current.style.display = showCompass ? 'block' : 'none';
    }
  }, [showCompass]);

  // Function to change basemap
  const changeBasemap = (basemapId: string) => {
    if (!mapInstanceRef.current || !baseLayers) return;

    // Remove all current base layers
    Object.values(baseLayers).forEach((layer: any) => {
      if (mapInstanceRef.current.hasLayer(layer)) {
        mapInstanceRef.current.removeLayer(layer);
      }
    });

    // Add selected layer
    if (basemapId !== 'none' && baseLayers[basemapId]) {
      mapInstanceRef.current.addLayer(baseLayers[basemapId]);
    }

    // Show notification
    const basemapName = basemapId.charAt(0).toUpperCase() + basemapId.slice(1);
    showNotification('Basemap Changed', `Switched to ${basemapName} basemap`, 'info');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="mb-3 flex space-x-2">
        {/* Basemap buttons can go here if needed */}
      </div>

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
        {contourData && (
          <p className="text-sm font-medium mt-1 text-green-600">
            Contour: {contourData.parameter} {contourData.data_type} {contourData.year}
          </p>
        )}
      </div>
    </div>
  );
};

export default LeafletMapPreview;