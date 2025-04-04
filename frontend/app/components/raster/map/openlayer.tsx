import { useRef, useEffect, useState } from 'react';
import { Map as OLMap, View } from 'ol';
import { Tile as TileLayer, Image as ImageLayer } from 'ol/layer';
import { OSM } from 'ol/source';
import { fromLonLat, toLonLat } from 'ol/proj';
import { defaults as defaultControls } from 'ol/control';
import GeoTIFF from 'ol/source/GeoTIFF';
import 'ol/ol.css';
import { RasterLayerProps } from '@/app/types/raster';

interface OpenLayersMapProps {
  selectedRasters: RasterLayerProps[];
  center?: [number, number];
  zoom?: number;
  onMapClick?: (coords: [number, number]) => void;
}

const OpenLayersMap: React.FC<OpenLayersMapProps> = ({
  selectedRasters,
  center = [-122.25, 37.75], // Default center
  zoom = 10, // Default zoom
  onMapClick
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<OLMap | null>(null);
  // Use the fully qualified global.Map to avoid the naming conflict
  const [layers, setLayers] = useState<globalThis.Map<string, ImageLayer>>(new globalThis.Map());

  // Initialize map on first render
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Create the OpenLayers map
    const map = new OLMap({
      target: mapContainerRef.current,
      layers: [
        // Base layer (OpenStreetMap)
        new TileLayer({
          source: new OSM(),
        }),
      ],
      view: new View({
        center: fromLonLat(center),
        zoom: zoom,
      }),
      controls: defaultControls(),
    });

    // Set up click handler
    if (onMapClick) {
      map.on('click', (event) => {
        // Get clicked coordinate in map projection
        const clickedCoord = event.coordinate;
        
        // Convert to lon/lat (WGS84)
        const lonLatCoord = toLonLat(clickedCoord);
        
        // Call the callback with [lon, lat]
        onMapClick([lonLatCoord[0], lonLatCoord[1]]);
      });
    }

    mapRef.current = map;

    return () => {
      // Clean up on unmount
      map.setTarget(undefined);
    };
  }, [center, zoom, onMapClick]);

  // Update layers when selected rasters change
  useEffect(() => {
    if (!mapRef.current) return;
    
    const map = mapRef.current;
    const currentLayerIds = new Set(selectedRasters.map(r => r.raster.id));
    const newLayers = new globalThis.Map(layers);
    
    // Remove layers that are no longer selected
    layers.forEach((layer, id) => {
      if (!currentLayerIds.has(id)) {
        map.removeLayer(layer);
        newLayers.delete(id);
      }
    });
    
    // Add or update layers for selected rasters
    selectedRasters.forEach(({ raster, visible, opacity }) => {
      let layer = newLayers.get(raster.id);
      
      if (!layer) {
        // Create new layer for this raster
        try {
          // Create GeoTIFF layer
          layer = new ImageLayer({
            source: new GeoTIFF({
              sources: [{
                url: raster.source,
              }]
            }),
            visible: visible,
            opacity: opacity,
          });
          
          map.addLayer(layer);
          newLayers.set(raster.id, layer);
        } catch (error) {
          console.error(`Error creating layer for raster ${raster.id}:`, error);
        }
      } else {
        // Update existing layer
        layer.setVisible(visible);
        layer.setOpacity(opacity);
      }
    });
    
    setLayers(newLayers);
  }, [selectedRasters, layers]);

  return (
    <div ref={mapContainerRef} className="w-full h-full" />
  );
};

export default OpenLayersMap;