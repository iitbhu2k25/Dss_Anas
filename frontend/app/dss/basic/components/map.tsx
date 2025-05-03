'use client';

import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect } from 'react';

export default function Map() {
  useEffect(() => {
    const loadGoogleTrafficLayer = () => {
      if (window.google && window.google.maps) {
        const map = document.querySelector('.leaflet-container')._leaflet_map;
        const trafficLayer = new window.google.maps.TrafficLayer();
        trafficLayer.setMap(map);
      } 
    };

    loadGoogleTrafficLayer();
  }, []);

  return (
    <MapContainer
      center={[22.9734, 78.6569]} // India center coordinates
      zoom={4}
      className="map-container border-4 border-blue-500 rounded-xl shadow-lg p-4 overflow-hidden hover:border-green-500 hover:shadow-2xl transition-all duration-300 w-[30vw] h-[48vh] mx-auto"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
    </MapContainer>
  );
}
