'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';

export default function LeafletMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const compassRef = useRef<HTMLDivElement>(null);
  const [showCompass, setShowCompass] = useState(true);

  useEffect(() => {
    const map = L.map(mapRef.current!).setView([0, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    const toggleCompassControl = L.control({ position: 'bottomright' });
    toggleCompassControl.onAdd = function () {
      const div = L.DomUtil.create('div', 'toggle-compass-control');
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
        showNotification("Compass", newShowCompass ? "Compass is now visible" : "Compass is now hidden", "info");
      };
      return div;
    };
    toggleCompassControl.addTo(map);

    // Ensure compass is visible on first load
    if (compassRef.current) {
      compassRef.current.style.display = 'block';
    }
  }, [showCompass]);

  const showNotification = (title: string, message: string, type: string) => {
    alert(`${title}: ${message}`); // Replace with your custom toast or snackbar if desired
  };

  return (
    <div style={{ position: 'relative', height: '100vh' }}>
      <div ref={mapRef} style={{ height: '100%' }} />
      <div
        ref={compassRef}
        style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          width: '80px',
          height: '80px',
          backgroundColor: 'white',
          border: '2px solid black',
          borderRadius: '50%',
          textAlign: 'center',
          lineHeight: '80px',
          zIndex: 1000,
          display: showCompass ? 'block' : 'none',
        }}
      >
        🧭
      </div>
    </div>
  );
}
