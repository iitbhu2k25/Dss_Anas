'use client'
import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

import { RasterLayerProps } from '@/app/types/raster';


let L: any;
if (typeof window !== 'undefined') {
  L = require('leaflet');
}

interface LeafletMapProps {
  selectedRasters: RasterLayerProps[];
  center?: [number, number];
  zoom?: number;
  onMapClick?: (coords: [number, number]) => void;
}

// Component to manage raster layers
const RasterLayersManager: React.FC<{ selectedRasters: RasterLayerProps[] }> = ({ selectedRasters }) => {
  const map = useMap();
  const [rasterLayers, setRasterLayers] = useState<Map<string, any>>(new Map());

  useEffect(() => {
    const currentLayerIds = new Set(selectedRasters.map(r => r.raster.id));
    const newRasterLayers = new Map(rasterLayers);
    
    // Remove layers that are no longer selected
    rasterLayers.forEach((layer, id) => {
      if (!currentLayerIds.has(id)) {
        map.removeLayer(layer);
        newRasterLayers.delete(id);
      }
    });
    
    // Add or update layers for selected rasters
    selectedRasters.forEach(({ raster, visible, opacity }) => {
      let layer = newRasterLayers.get(raster.id);
      
      if (!layer) {
        try {
          // In a real app, you would use georaster-layer-for-leaflet
          // For now, we'll simulate it with a simple rectangle representing the raster bounds
          const bounds = raster.bounds;
          const rectangleBounds = L.latLngBounds(
            [bounds[1], bounds[0]],
            [bounds[3], bounds[2]]
          );
          
          // Create a simple colored rectangle as a placeholder for the raster
          layer = L.rectangle(rectangleBounds, {
            color: '#3388ff',
            weight: 1,
            fillOpacity: opacity,
            fillColor: getColorForRaster(raster.id),
          });
          
          if (visible) {
            layer.addTo(map);
          }
          newRasterLayers.set(raster.id, layer);
        } catch (error) {
          console.error(`Error creating layer for raster ${raster.id}:`, error);
        }
      } else {
        // Update existing layer visibility and opacity
        if (visible) {
          if (!map.hasLayer(layer)) {
            layer.addTo(map);
          }
          // Update opacity
          if (layer instanceof L.Rectangle) {
            layer.setStyle({ fillOpacity: opacity });
          }
        } else {
          if (map.hasLayer(layer)) {
            map.removeLayer(layer);
          }
        }
      }
    });
    
    setRasterLayers(newRasterLayers);
    
    // Clean up on unmount
    return () => {
      rasterLayers.forEach(layer => {
        map.removeLayer(layer);
      });
    };
  }, [map, selectedRasters, rasterLayers]);

  return null;
};

// Simple function to generate different colors for different rasters
const getColorForRaster = (id: string): string => {
  const colors = ['#ff3300', '#33cc33', '#3366ff', '#ffcc00', '#cc33ff'];
  const hashCode = id.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  return colors[Math.abs(hashCode) % colors.length];
};

// Map click handler
const MapClickHandler: React.FC<{ onClick: (coords: [number, number]) => void }> = ({ onClick }) => {
  const map = useMap();
  
  useEffect(() => {
    if (!L) return; // Skip if Leaflet isn't loaded yet
    
    const handleClick = (e: any) => {
      onClick([e.latlng.lng, e.latlng.lat]);
    };
    
    map.on('click', handleClick);
    
    return () => {
      map.off('click', handleClick);
    };
  }, [map, onClick]);
  
  return null;
};

const LeafletMap: React.FC<LeafletMapProps> = ({
  selectedRasters,
  center = [37.75, -122.25], // Note: Leaflet uses [lat, lng] format
  zoom = 10,
  onMapClick
}) => {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ width: '100%', height: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <RasterLayersManager selectedRasters={selectedRasters} />
      {onMapClick && <MapClickHandler onClick={onMapClick} />}
    </MapContainer>
  );
};

export default LeafletMap;