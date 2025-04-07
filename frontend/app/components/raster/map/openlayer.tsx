// 'use client';
// import { useEffect, useRef, useState } from 'react';
// import { useMapContext } from '@/app/contexts/MapContext';
// import L from 'leaflet';
// import 'leaflet/dist/leaflet.css';
// // Import GeoRaster and GeoRasterLayer packages for handling GeoTIFFs directly in browser
// import parseGeoraster from 'georaster';
// import GeoRasterLayer from 'georaster-layer-for-leaflet';

// // Define interfaces for the raster layer and pixel info
// interface RasterLayerProps {
//   id: string;
//   visible: boolean;
//   url?: string;
//   opacity?: number;
//   name?: string;
//   extent?: [number, number, number, number]; // [minX, minY, maxX, maxY] in lon/lat
// }

// interface PixelInfoValue {
//   coords: [number, number];
//   value: number | null;
//   loading: boolean;
//   error?: string;
// }

// const MapComponent = () => {
//   const {
//     selectedRasterLayers,
//     pixelInfo,
//     setPixelInfo
//   } = useMapContext() as {
//     selectedRasterLayers: RasterLayerProps[];
//     pixelInfo: Record<string, PixelInfoValue>;
//     setPixelInfo: (info: Record<string, PixelInfoValue>) => void;
//   };
  
//   const mapRef = useRef<HTMLDivElement>(null);
//   const [map, setMap] = useState<L.Map | null>(null);
//   const leafletLayersRef = useRef<Record<string, L.Layer>>({});
//   const georastersRef = useRef<Record<string, any>>({});
  
//   // Fix Leaflet icon issues in Next.js
//   useEffect(() => {
//     // Only run on the client side
//     if (typeof window !== 'undefined') {
//       // Fix Leaflet's icon paths
//       delete L.Icon.Default.prototype._getIconUrl;
//       L.Icon.Default.mergeOptions({
//         iconRetinaUrl: '/images/marker-icon-2x.png',
//         iconUrl: '/images/marker-icon.png',
//         shadowUrl: '/images/marker-shadow.png',
//       });
//     }
//   }, []);
  
//   // Initialize map
//   useEffect(() => {
//     if (!mapRef.current || map) return;
    
//     // Initialize the Leaflet map
//     const initialMap = L.map(mapRef.current).setView([20.5937, 78.9629], 5); // Center on India
    
//     // Add OpenStreetMap base layer
//     L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
//       attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
//     }).addTo(initialMap);
    
//     setMap(initialMap);
    
//     // Handle map clicks to get pixel info
//     initialMap.on('click', async (event) => {
//       const { lat, lng } = event.latlng;
      
//       // Process each visible georaster to get pixel information
//       for (const [id, georaster] of Object.entries(georastersRef.current)) {
//         if (map?.hasLayer(leafletLayersRef.current[id])) {
//           try {
//             setPixelInfo(prev => ({
//               ...prev,
//               [id]: {
//                 coords: [lng, lat],
//                 value: null,
//                 loading: true
//               }
//             }));
            
//             // Use the georaster to get the value at this point
//             // Depending on the georaster implementation, this might look different
//             // This is a simple example that assumes the georaster has a method to get values at lat/lng
//             if (georaster && typeof georaster.valueAtLatLng === 'function') {
//               const value = await georaster.valueAtLatLng(lat, lng);
              
//               setPixelInfo(prev => ({
//                 ...prev,
//                 [id]: {
//                   coords: [lng, lat],
//                   value: Array.isArray(value) ? value[0] : value, // Some georasters return arrays for multi-band data
//                   loading: false
//                 }
//               }));
//             } else {
//               // If no direct method, just log the coordinates
//               console.log(`Clicked at coordinates [${lng}, ${lat}] for layer ${id}`);
              
//               setPixelInfo(prev => ({
//                 ...prev,
//                 [id]: {
//                   coords: [lng, lat],
//                   value: null,
//                   loading: false,
//                   error: 'Value extraction not supported for this layer'
//                 }
//               }));
//             }
//           } catch (error) {
//             console.error(`Error getting value for layer ${id}:`, error);
//             setPixelInfo(prev => ({
//               ...prev,
//               [id]: {
//                 coords: [lng, lat],
//                 value: null,
//                 loading: false,
//                 error: error instanceof Error ? error.message : 'Unknown error'
//               }
//             }));
//           }
//         }
//       }
//     });
    
//     return () => {
//       initialMap.remove();
//     };
//   }, [setPixelInfo]);
  
//   // Handle raster layers changes
//   useEffect(() => {
//     if (!map) return;
    
//     // Remove layers that are no longer in the selected list
//     Object.entries(leafletLayersRef.current).forEach(([id, layer]) => {
//       if (!selectedRasterLayers.some(rasterLayer => rasterLayer.id === id)) {
//         if (map.hasLayer(layer)) {
//           map.removeLayer(layer);
//         }
//         delete leafletLayersRef.current[id];
//         delete georastersRef.current[id];
//       }
//     });
    
//     // Add or update layers based on the selected list
//     selectedRasterLayers.forEach(rasterLayer => {
//       // Update existing layer properties if it exists
//       if (leafletLayersRef.current[rasterLayer.id]) {
//         const layer = leafletLayersRef.current[rasterLayer.id];
        
//         // Update visibility
//         if (rasterLayer.visible) {
//           if (!map.hasLayer(layer)) {
//             map.addLayer(layer);
//           }
//         } else {
//           if (map.hasLayer(layer)) {
//             map.removeLayer(layer);
//           }
//         }
        
//         // Update opacity if layer has the setOpacity method
//         if ('setOpacity' in layer && typeof (layer as any).setOpacity === 'function') {
//           (layer as any).setOpacity(rasterLayer.opacity ?? 1.0);
//         }
//       } 
//       // Create new layer if it doesn't exist yet
//       else if (rasterLayer.url) {
//         // Create a loading marker to show while the GeoTIFF is loading
//         const loadingMarker = L.marker(map.getCenter(), {
//           icon: L.divIcon({
//             html: `<div style="background-color: rgba(255,255,255,0.8); padding: 5px; border-radius: 4px; font-weight: bold;">Loading ${rasterLayer.name || rasterLayer.id}...</div>`,
//             className: ''
//           })
//         }).addTo(map);
        
//         // Direct fetch and display of GeoTIFF using georaster and georaster-layer-for-leaflet
//         fetch(rasterLayer.url)
//           .then(response => {
//             if (!response.ok) {
//               throw new Error(`Failed to fetch GeoTIFF: ${response.status}`);
//             }
//             return response.arrayBuffer();
//           })
//           .then(arrayBuffer => {
//             // Parse the GeoTIFF using georaster
//             return parseGeoraster(arrayBuffer);
//           })
//           .then(georaster => {
//             // Store the georaster reference for pixel queries
//             georastersRef.current[rasterLayer.id] = georaster;
            
//             // Create a GeoRasterLayer from the parsed georaster
//             const geoRasterLayer = new GeoRasterLayer({
//               georaster,
//               opacity: rasterLayer.opacity ?? 1.0,
//               resolution: 256 // Optional: control the resolution
//             });
            
//             // Store the layer reference
//             leafletLayersRef.current[rasterLayer.id] = geoRasterLayer;
            
//             // Remove loading marker
//             map.removeLayer(loadingMarker);
            
//             // Add layer to map if it should be visible
//             if (rasterLayer.visible) {
//               geoRasterLayer.addTo(map);
//             }
            
//             // If this is the first layer added, fit the map to its bounds
//             if (Object.keys(leafletLayersRef.current).length === 1) {
//               try {
//                 const bounds = geoRasterLayer.getBounds();
//                 if (bounds) {
//                   map.fitBounds(bounds);
//                 }
//               } catch (e) {
//                 console.warn('Could not fit to layer bounds:', e);
//               }
//             }
            
//             console.log(`Successfully added GeoTIFF layer: ${rasterLayer.id}`);
//           })
//           .catch(error => {
//             console.error(`Error loading GeoTIFF for ${rasterLayer.id}:`, error);
//             map.removeLayer(loadingMarker);
            
//             // If we have extent information, create a fallback rectangle
//             if (rasterLayer.extent) {
//               const bounds = L.latLngBounds(
//                 [rasterLayer.extent[1], rasterLayer.extent[0]], // SW corner
//                 [rasterLayer.extent[3], rasterLayer.extent[2]]  // NE corner
//               );
              
//               const fallbackLayer = L.rectangle(bounds, {
//                 color: '#ff7800',
//                 weight: 1,
//                 opacity: 0.8,
//                 fillOpacity: 0.3,
//                 fillColor: '#ffcc33'
//               });
              
//               fallbackLayer.bindTooltip(`${rasterLayer.name || rasterLayer.id} (failed to load)`);
              
//               // Store the layer reference
//               leafletLayersRef.current[rasterLayer.id] = fallbackLayer;
              
//               // Add to map if it should be visible
//               if (rasterLayer.visible) {
//                 fallbackLayer.addTo(map);
//               }
//             } else {
//               // If no extent info, just show an error marker at the center
//               const errorMarker = L.marker(map.getCenter(), {
//                 icon: L.divIcon({
//                   html: `<div style="background-color: rgba(255,0,0,0.7); color: white; padding: 5px; border-radius: 4px;">Failed to load ${rasterLayer.name || rasterLayer.id}</div>`,
//                   className: ''
//                 })
//               });
              
//               // Store the marker as the layer reference
//               leafletLayersRef.current[rasterLayer.id] = errorMarker;
              
//               // Add to map if it should be visible
//               if (rasterLayer.visible) {
//                 errorMarker.addTo(map);
//               }
//             }
//           });
//       }
//     });
//   }, [map, selectedRasterLayers]);
  
//   return (
//     <div 
//       ref={mapRef} 
//       className="w-full h-full border rounded-lg shadow-sm"
//       style={{ minHeight: '500px' }}
//     />
//   );
// };

// export default MapComponent;