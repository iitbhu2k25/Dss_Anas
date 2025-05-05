'use client';

import React, { useState, useEffect, useRef } from 'react';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import XYZ from 'ol/source/XYZ';
import { fromLonLat } from 'ol/proj';
import 'ol/ol.css';
import GeoJSON from 'ol/format/GeoJSON';

interface MapProps {
  onExportPng?: () => void;
  onExportLayer?: () => void;
}

export default function MapPart({ onExportPng, onExportLayer }: MapProps) {
  const [baseMap, setBaseMap] = useState<string>('traffic');
  const [zoom, setZoom] = useState<number>(5);
  const [mapLoaded, setMapLoaded] = useState<boolean>(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const [coordinates, setCoordinates] = useState<string>('20.5937, 78.9629');
  const [scale, setScale] = useState<string>('1:10,000,000');

  // Layer sources configuration
  const layerSources = {
    osm: new OSM(),
    traffic: new XYZ({
      url: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
      attributions: '© Google Maps'
    }),
    satellite: new XYZ({
      url: 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
      attributions: '© Google Maps'
    }),
    terrain: new XYZ({
      url: 'https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}',
      attributions: '© Google Maps'
    }),
    hybrid: new XYZ({
      url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
      attributions: '© Google Maps'
    })
  };

  // Initialize map
  useEffect(() => {
    if (mapRef.current && !mapInstanceRef.current) {
      // Center coordinates for India
      const indiaCoordinates = fromLonLat([78.9629, 20.5937]);
      
      mapInstanceRef.current = new Map({
        target: mapRef.current,
        layers: [
          new TileLayer({
            source: layerSources[baseMap as keyof typeof layerSources]
          })
        ],
        view: new View({
          center: indiaCoordinates,
          zoom: zoom,
          maxZoom: 18,
          minZoom: 3
        })
      });

      // Update coordinates on pointer move
      mapInstanceRef.current.on('pointermove', (event) => {
        const [lon, lat] = event.coordinate;
        setCoordinates(`${lat.toFixed(5)}, ${lon.toFixed(5)}`);
      });

      // Update scale on zoom change
      mapInstanceRef.current.getView().on('change:resolution', () => {
        const currentZoom = mapInstanceRef.current?.getView().getZoom() || 5;
        const scale = Math.round(559082264.028 / Math.pow(2, currentZoom));
        setScale(`1:${scale.toLocaleString()}`);
      });
      
      // Add right-click context menu for saving map
      mapRef.current.addEventListener('contextmenu', (e) => {
        e.preventDefault(); // Prevent default context menu
        
        // Create a canvas to generate the map image
        const mapSize = mapInstanceRef.current?.getSize() || [800, 600];
        const canvas = document.createElement('canvas');
        canvas.width = mapSize[0];
        canvas.height = mapSize[1];
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          // Get map canvas
          const mapCanvas = mapRef.current?.querySelector('canvas');
          if (mapCanvas) {
            try {
              // Try to draw the map to our canvas (might fail due to CORS)
              ctx.drawImage(mapCanvas as HTMLCanvasElement, 0, 0);
            } catch (error) {
              console.error('Unable to copy map canvas due to CORS restrictions');
              
              // Fallback: Create a simplified map representation
              // Fill with background color
              ctx.fillStyle = '#f3f4f6';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              
              // Draw grid lines
              ctx.strokeStyle = '#e5e7eb';
              ctx.lineWidth = 1;
              const gridSize = 50;
              
              for (let x = 0; x < canvas.width; x += gridSize) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, canvas.height);
                ctx.stroke();
              }
              
              for (let y = 0; y < canvas.height; y += gridSize) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(width, y);
                ctx.stroke();
              }
            }
            
            // Add map info overlay
            // Semi-transparent white background for text
            ctx.fillStyle = 'rgba(255,255,255,0.8)';
            ctx.fillRect(10, 10, 300, 130);
            
            // Add map details
            ctx.fillStyle = '#000000';
            ctx.font = 'bold 16px Arial';
            ctx.fillText(`India Map (${baseMap})`, 20, 30);
            
            ctx.font = '12px Arial';
            ctx.fillText(`Zoom Level: ${mapInstanceRef.current?.getView().getZoom()}`, 20, 50);
            ctx.fillText(`Map Type: ${baseMap}`, 20, 70);
            ctx.fillText(`Scale: ${scale}`, 20, 90);
            ctx.fillText(`Coordinates: ${coordinates}`, 20, 110);
            
            // Add export date at bottom right
            ctx.fillStyle = '#666666';
            ctx.font = '10px Arial';
            ctx.fillText(`Exported: ${new Date().toLocaleDateString()}`, canvas.width - 200, canvas.height - 10);
            
            // Create download link from canvas
            try {
              const dataUrl = canvas.toDataURL('image/png');
              const link = document.createElement('a');
              link.download = `india-map-${baseMap}-${new Date().toISOString().slice(0,10)}.png`;
              link.href = dataUrl;
              link.click();
            } catch (error) {
              console.error('Failed to generate image:', error);
              alert('Unable to save map as PNG due to security restrictions. Please use screenshot instead.');
            }
          }
        }
      });
      
      // Set map as loaded
      setMapLoaded(true);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setTarget(undefined);
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update map layer when baseMap changes
  useEffect(() => {
    if (mapInstanceRef.current) {
      const layers = mapInstanceRef.current.getLayers();
      layers.getArray().forEach(layer => {
        mapInstanceRef.current?.removeLayer(layer);
      });

      mapInstanceRef.current.addLayer(
        new TileLayer({
          source: layerSources[baseMap as keyof typeof layerSources]
        })
      );
    }
  }, [baseMap]);

  // Update zoom level
  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.getView().setZoom(zoom);
    }
  }, [zoom]);

  // Handle PNG export
  const handleExportPng = () => {
    if (mapInstanceRef.current && mapRef.current) {
      // Show loading indicator
      const notification = document.createElement('div');
      notification.textContent = 'Preparing map for export...';
      notification.style.position = 'absolute';
      notification.style.top = '10px';
      notification.style.left = '50%';
      notification.style.transform = 'translateX(-50%)';
      notification.style.backgroundColor = 'rgba(0,0,0,0.7)';
      notification.style.color = 'white';
      notification.style.padding = '8px 12px';
      notification.style.borderRadius = '4px';
      notification.style.zIndex = '1000';
      mapRef.current.appendChild(notification);
      
      try {
        // Create modal overlay with map preview for right-click save
        const modal = document.createElement('div');
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.backgroundColor = 'rgba(0,0,0,0.8)';
        modal.style.zIndex = '9999';
        modal.style.display = 'flex';
        modal.style.justifyContent = 'center';
        modal.style.alignItems = 'center';
        modal.style.flexDirection = 'column';
        
        // Create preview container
        const previewContainer = document.createElement('div');
        previewContainer.style.position = 'relative';
        previewContainer.style.width = '80%';
        previewContainer.style.maxWidth = '1200px';
        previewContainer.style.backgroundColor = 'white';
        previewContainer.style.padding = '20px';
        previewContainer.style.borderRadius = '8px';
        previewContainer.style.boxShadow = '0 0 20px rgba(0,0,0,0.3)';
        
        // Header with instructions
        const header = document.createElement('div');
        header.style.marginBottom = '15px';
        header.style.borderBottom = '1px solid #eee';
        header.style.paddingBottom = '10px';
        header.innerHTML = `
          <h3 style="margin: 0 0 10px 0; font-size: 20px; font-weight: bold;">Save Map as PNG</h3>
          <p style="margin: 0; color: #444;">Right-click on the map image below and select "Save image as..." to download</p>
        `;
        
        // Create map image (static representation)
        const mapImage = document.createElement('div');
        mapImage.style.width = '100%';
        mapImage.style.height = '600px';
        mapImage.style.position = 'relative';
        mapImage.style.border = '1px solid #ddd';
        mapImage.style.marginBottom = '15px';
        mapImage.style.overflow = 'hidden';
        mapImage.style.backgroundColor = '#f0f0f0';
        
        // Add a simple map representation (we can't use actual map tiles due to CORS)
        // Create a canvas with map info
        const canvas = document.createElement('canvas');
        canvas.width = previewContainer.offsetWidth || 1000;
        canvas.height = 600;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          // Background
          ctx.fillStyle = '#f3f4f6';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          // Map grid
          ctx.strokeStyle = '#e5e7eb';
          ctx.lineWidth = 1;
          const gridSize = 50;
          
          for (let x = 0; x < canvas.width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
          }
          
          for (let y = 0; y < canvas.height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
          }
          
          // Map info overlay
          ctx.fillStyle = 'rgba(255,255,255,0.9)';
          ctx.fillRect(20, 20, 300, 150);
          ctx.strokeStyle = '#ddd';
          ctx.strokeRect(20, 20, 300, 150);
          
          // Add map details
          ctx.fillStyle = '#000';
          ctx.font = 'bold 24px Arial';
          ctx.fillText(`India Map (${baseMap})`, 40, 60);
          
          ctx.font = '14px Arial';
          ctx.fillText(`Zoom Level: ${mapInstanceRef.current.getView().getZoom()}`, 40, 90);
          ctx.fillText(`Map Type: ${baseMap}`, 40, 110);
          ctx.fillText(`Scale: ${scale}`, 40, 130);
          ctx.fillText(`Coordinates: ${coordinates}`, 40, 150);
          
          // Footer with export date
          ctx.fillStyle = '#666';
          ctx.font = '12px Arial';
          ctx.fillText(`Generated: ${new Date().toLocaleString()}`, canvas.width - 250, canvas.height - 20);
          
          // Convert canvas to image
          const mapImageElement = document.createElement('img');
          mapImageElement.src = canvas.toDataURL('image/png');
          mapImageElement.style.width = '100%';
          mapImageElement.style.height = '100%';
          mapImageElement.style.objectFit = 'contain';
          mapImageElement.alt = 'India Map Export';
          
          // Set filename suggestion
          const suggestedFilename = `india-map-${baseMap}-${new Date().toISOString().slice(0,10)}.png`;
          mapImageElement.setAttribute('data-filename', suggestedFilename);
          
          // Add right-click context menu suggestion
          mapImageElement.oncontextmenu = (e) => {
            // This doesn't actually set the filename but might help remind the user
            mapImageElement.setAttribute('download', suggestedFilename);
          };
          
          mapImage.appendChild(mapImageElement);
        }
        
        // Footer with buttons
        const footer = document.createElement('div');
        footer.style.display = 'flex';
        footer.style.justifyContent = 'space-between';
        footer.style.alignItems = 'center';
        
        // Close button
        const closeButton = document.createElement('button');
        closeButton.textContent = 'Close';
        closeButton.style.padding = '8px 16px';
        closeButton.style.backgroundColor = '#f3f4f6';
        closeButton.style.border = '1px solid #ddd';
        closeButton.style.borderRadius = '4px';
        closeButton.style.cursor = 'pointer';
        closeButton.onclick = () => {
          document.body.removeChild(modal);
        };
        
        // Info text
        const infoText = document.createElement('div');
        infoText.style.color = '#666';
        infoText.style.fontSize = '12px';
        infoText.textContent = 'Due to browser security restrictions, this is a simplified map view for exporting.';
        
        footer.appendChild(closeButton);
        footer.appendChild(infoText);
        
        // Assemble modal
        previewContainer.appendChild(header);
        previewContainer.appendChild(mapImage);
        previewContainer.appendChild(footer);
        modal.appendChild(previewContainer);
        
        // Allow clicking outside to close
        modal.onclick = (e) => {
          if (e.target === modal) {
            document.body.removeChild(modal);
          }
        };
        
        // Add to document
        document.body.appendChild(modal);
        
        // Update notification
        notification.textContent = 'Right-click on the map to save as PNG';
        notification.style.backgroundColor = 'rgba(0,128,0,0.7)';
        setTimeout(() => {
          if (mapRef.current?.contains(notification)) {
            mapRef.current.removeChild(notification);
          }
        }, 3000);
      } catch (error) {
        console.error('PNG export failed:', error);
        notification.textContent = 'PNG Export Failed';
        notification.style.backgroundColor = 'rgba(220,0,0,0.7)';
        setTimeout(() => {
          if (mapRef.current?.contains(notification)) {
            mapRef.current.removeChild(notification);
          }
        }, 3000);
        
        alert('Unable to export map. Please try taking a screenshot instead.');
      }
      
      // Call the optional callback if provided
      if (onExportPng) onExportPng();
    }
  };

  // Handle layer export
  const handleExportLayer = () => {
    if (mapInstanceRef.current) {
      // Get current view extent as GeoJSON
      const view = mapInstanceRef.current.getView();
      const extent = view.calculateExtent(mapInstanceRef.current.getSize());
      
      // Create a simple GeoJSON object representing the current view
      const geojson = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: {
              name: `India Map - ${baseMap}`,
              zoom: view.getZoom(),
              baseLayer: baseMap,
              exportDate: new Date().toISOString()
            },
            geometry: {
              type: 'Polygon',
              coordinates: [[
                [extent[0], extent[1]],
                [extent[2], extent[1]],
                [extent[2], extent[3]],
                [extent[0], extent[3]],
                [extent[0], extent[1]]
              ]]
            }
          }
        ]
      };
      
      // Convert to a string
      const geojsonStr = JSON.stringify(geojson, null, 2);
      
      // Create a blob and download link
      const blob = new Blob([geojsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const downloadLink = document.createElement('a');
      const mapName = `india-map-${baseMap}-${new Date().toISOString().slice(0,10)}`;
      downloadLink.download = `${mapName}.geojson`;
      downloadLink.href = url;
      
      // Trigger download
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(url);
      
      // Call the optional callback if provided
      if (onExportLayer) onExportLayer();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow h-full">
      {/* Map Header */}
      <div className="flex justify-between items-center p-3 border-b">
        <div className="text-lg font-medium text-gray-700">Map View</div>
        <div className="flex space-x-2">
          <select 
            value={baseMap}
            onChange={(e) => setBaseMap(e.target.value)}
            className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="traffic">Traffic</option>
            <option value="osm">OpenStreetMap</option>
            <option value="satellite">Satellite</option>
            <option value="terrain">Terrain</option>
            <option value="hybrid">Hybrid</option>
          </select>
        </div>
      </div>
      
      {/* Map Container */}
      <div className="relative h-screen" style={{ height: '800px' }}>
        <div ref={mapRef} className="absolute inset-0"></div>
        {!mapLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="text-gray-400 flex flex-col items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              <span className="text-sm">Loading map of India...</span>
            </div>
          </div>
        )}
        
        {/* Zoom Controls */}
        <div className="absolute right-3 top-3 bg-white rounded shadow-md">
          <button 
            className="block p-2 border-b hover:bg-gray-100"
            onClick={() => setZoom(zoom + 1)}
            disabled={zoom >= 18}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>
          <button 
            className="block p-2 hover:bg-gray-100"
            onClick={() => setZoom(zoom - 1)}
            disabled={zoom <= 3}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Map Footer */}
      <div className="p-3 border-t">
        <div className="flex justify-between">
          <div className="flex space-x-2">
            <button 
              onClick={handleExportLayer}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
            >
              Export as Layer
            </button>
          </div>
          <div className="text-xs text-gray-500 self-center">
            Scale: {scale} | Coordinates: {coordinates}
          </div>
        </div>
      </div>
    </div>
  );
}