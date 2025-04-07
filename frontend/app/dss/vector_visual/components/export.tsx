import React, { useState, useRef, useEffect } from 'react';

const ExportModal = ({ isOpen, onClose, mapInstanceRef, drawnItemsRef, geoJsonLayer, showNotification }) => {
  const [exportFormat, setExportFormat] = useState('pdf');
  const [mapTitle, setMapTitle] = useState('Enter Map Title');
  const [dpi, setDpi] = useState(300);
  const modalRef = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Position the modal at the top center when it opens
  useEffect(() => {
    if (isOpen && window) {
      setPosition({
        x: (window.innerWidth - 400) / 2, // Adjust width as needed
        y: 200 // Position from top of screen
      });
    }
  }, [isOpen]);

  // Custom dragging implementation
  const handleMouseDown = (e) => {
    if (e.target.closest('.modal-header')) {
      setIsDragging(true);
      const rect = modalRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
      e.preventDefault();
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
      e.preventDefault();
    }
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
    }
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Function to export all vector layers to a single GeoJSON
  const exportAllLayersToGeoJSON = () => {
    if (!mapInstanceRef.current || !drawnItemsRef.current) return null;
    
    const allFeatures = [];
    const L = require('leaflet');
    
    // Process drawn items with special handling for circles
    drawnItemsRef.current.eachLayer(function (layer) {
      // Special handling for circle
      if (layer instanceof L.Circle) {
        // Circles need special handling as they're not directly supported in GeoJSON
        const center = layer.getLatLng();
        const radius = layer.getRadius();
        
        // Create a GeoJSON feature for the circle
        const circleFeature = {
          type: "Feature",
          properties: {
            type: "Circle",
            radius: radius // Store radius in properties
          },
          geometry: {
            type: "Point",
            coordinates: [center.lng, center.lat]
          }
        };
        
        // Add pop-up content to properties if available
        if (layer.getPopup()) {
          circleFeature.properties.popupContent = layer.getPopup().getContent();
        }
        
        allFeatures.push(circleFeature);
      } 
      // Handle all other geometry types (including lines and polylines)
      else if (layer.toGeoJSON) {
        const geojson = layer.toGeoJSON();
        
        // Preserve any popup content
        if (layer.getPopup()) {
          if (geojson.properties === undefined) {
            geojson.properties = {};
          }
          geojson.properties.popupContent = layer.getPopup().getContent();
        }
        
        // For LineString, make sure it's properly formatted
        if (geojson.geometry && geojson.geometry.type === "LineString") {
          // Ensure coordinates are properly formatted
          if (!Array.isArray(geojson.geometry.coordinates) || geojson.geometry.coordinates.length < 2) {
            console.warn("Invalid LineString detected, skipping");
            return; // Skip this feature
          }
        }
        
        // Handle Feature or FeatureCollection
        if (geojson.type === "FeatureCollection") {
          geojson.features.forEach(feature => {
            if (feature.geometry) {
              allFeatures.push(feature);
            }
          });
        } else if (geojson.type === "Feature" && geojson.geometry) {
          allFeatures.push(geojson);
        }
      }
    });
    
    // Add features from loaded GeoJSON layer if it exists
    if (geoJsonLayer) {
      geoJsonLayer.eachLayer(function (layer) {
        if (layer.toGeoJSON) {
          const geojson = layer.toGeoJSON();
          
          // Add popup content to properties if available
          if (layer.getPopup()) {
            if (geojson.properties === undefined) {
              geojson.properties = {};
            }
            geojson.properties.popupContent = layer.getPopup().getContent();
          }
          
          if (geojson.type === "FeatureCollection") {
            geojson.features.forEach(feature => {
              if (feature.geometry) {
                allFeatures.push(feature);
              }
            });
          } else if (geojson.type === "Feature" && geojson.geometry) {
            allFeatures.push(geojson);
          }
        }
      });
    }

    // Final GeoJSON FeatureCollection
    const exportedGeoJSON = {
      type: "FeatureCollection",
      features: allFeatures,
      metadata: {
        title: mapTitle,
        exportedAt: new Date().toISOString(),
        exportedFrom: "MapComponent",
        version: "1.0"
      }
    };

    return exportedGeoJSON;
  };

  // Handler for GeoJSON export
  const handleExportGeoJSON = () => {
    try {
      const geojsonData = exportAllLayersToGeoJSON();
      
      if (!geojsonData || geojsonData.features.length === 0) {
        showNotification(
          "Export Error",
          "No vector data available to export",
          "error"
        );
        return;
      }
      
      // Convert to string
      const geojsonString = JSON.stringify(geojsonData, null, 2);
      
      // Create a blob and download link
      const blob = new Blob([geojsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${mapTitle.replace(/\s+/g, '_')}.geojson`;
      
      // Append to body, trigger click and clean up
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      showNotification(
        "Export Successful",
        `Exported ${geojsonData.features.length} features successfully`,
        "success"
      );
    } catch (error) {
      console.error("Export error:", error);
      showNotification(
        "Export Error",
        `Failed to export GeoJSON: ${error.message}`,
        "error"
      );
    }
  };

  // Handler for PDF export
  const handleExportPDF = () => {
    try {
      if (!mapInstanceRef.current) {
        showNotification("Export Error", "Map instance not found", "error");
        return;
      }

      import('html2canvas').then(({ default: html2canvas }) => {
        import('jspdf').then(({ default: jsPDF }) => {
          // Add title to the map (temporarily)
          const titleElement = document.createElement('div');
          titleElement.style.position = 'absolute';
          titleElement.style.top = '10px';
          titleElement.style.left = '50%';
          titleElement.style.transform = 'translateX(-50%)';
          titleElement.style.zIndex = '1000';
          titleElement.style.backgroundColor = 'rgba(255, 255, 255, 0.7)';
          titleElement.style.padding = '5px 10px';
          titleElement.style.borderRadius = '4px';
          titleElement.style.fontWeight = 'bold';
          titleElement.style.fontSize = '16px';
          titleElement.innerText = mapTitle;
          
          const mapContainer = mapInstanceRef.current.getContainer();
          mapContainer.appendChild(titleElement);
          
          // Calculate dimensions based on DPI
          const scaleFactor = dpi / 96; // Standard screen is typically 96 DPI
          
          html2canvas(mapContainer, {
            useCORS: true,
            scale: scaleFactor,
            logging: false,
            allowTaint: true,
          }).then((canvas) => {
            // Remove the temporary title
            mapContainer.removeChild(titleElement);
            
            const imgData = canvas.toDataURL('image/jpeg', 1.0);
            const pdf = new jsPDF({
              orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
              unit: 'mm',
            });
            
            // Calculate PDF dimensions to fit the canvas
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const ratio = Math.min(pdfWidth / canvas.width, pdfHeight / canvas.height);
            const imgWidth = canvas.width * ratio;
            const imgHeight = canvas.height * ratio;
            const x = (pdfWidth - imgWidth) / 2;
            const y = (pdfHeight - imgHeight) / 2;
            
            pdf.addImage(imgData, 'JPEG', x, y, imgWidth, imgHeight);
            pdf.save(`${mapTitle.replace(/\s+/g, '_')}.pdf`);
            
            showNotification(
              "Export Successful",
              "Map exported to PDF successfully",
              "success"
            );
          }).catch(err => {
            console.error("Canvas rendering error:", err);
            showNotification(
              "Export Error",
              `Failed to render map: ${err.message}`,
              "error"
            );
          });
        }).catch(err => {
          console.error("jsPDF loading error:", err);
          showNotification(
            "Export Error",
            "Failed to load PDF library",
            "error"
          );
        });
      }).catch(err => {
        console.error("html2canvas loading error:", err);
        showNotification(
          "Export Error",
          "Failed to load canvas conversion library",
          "error"
        );
      });
    } catch (error) {
      console.error("PDF export error:", error);
      showNotification(
        "Export Error",
        `Failed to export PDF: ${error.message}`,
        "error"
      );
    }
  };

  // Handler for JPG export
  const handleExportJPG = () => {
    try {
      if (!mapInstanceRef.current) {
        showNotification("Export Error", "Map instance not found", "error");
        return;
      }

      import('html2canvas').then(({ default: html2canvas }) => {
        // Add title to the map (temporarily)
        const titleElement = document.createElement('div');
        titleElement.style.position = 'absolute';
        titleElement.style.top = '10px';
        titleElement.style.left = '50%';
        titleElement.style.transform = 'translateX(-50%)';
        titleElement.style.zIndex = '1000';
        titleElement.style.backgroundColor = 'rgba(255, 255, 255, 0.7)';
        titleElement.style.padding = '5px 10px';
        titleElement.style.borderRadius = '4px';
        titleElement.style.fontWeight = 'bold';
        titleElement.style.fontSize = '16px';
        titleElement.innerText = mapTitle;
        
        const mapContainer = mapInstanceRef.current.getContainer();
        mapContainer.appendChild(titleElement);
        
        // Calculate dimensions based on DPI
        const scaleFactor = dpi / 96; // Standard screen is typically 96 DPI
        
        html2canvas(mapContainer, {
          useCORS: true,
          scale: scaleFactor,
          logging: false,
          allowTaint: true,
        }).then((canvas) => {
          // Remove the temporary title
          mapContainer.removeChild(titleElement);
          
          // Convert to JPG and download
          canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${mapTitle.replace(/\s+/g, '_')}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            showNotification(
              "Export Successful",
              "Map exported to JPG successfully",
              "success"
            );
          }, 'image/jpeg', 0.9);
        }).catch(err => {
          console.error("Canvas rendering error:", err);
          showNotification(
            "Export Error",
            `Failed to render map: ${err.message}`,
            "error"
          );
        });
      }).catch(err => {
        console.error("html2canvas loading error:", err);
        showNotification(
          "Export Error",
          "Failed to load canvas conversion library",
          "error"
        );
      });
    } catch (error) {
      console.error("JPG export error:", error);
      showNotification(
        "Export Error",
        `Failed to export JPG: ${error.message}`,
        "error"
      );
    }
  };

  // Handler for SVG export
  const handleExportSVG = () => {
    try {
      if (!mapInstanceRef.current) {
        showNotification("Export Error", "Map instance not found", "error");
        return;
      }

      import('html-to-image').then(({ toSvg }) => {
        // Add title to the map (temporarily)
        const titleElement = document.createElement('div');
        titleElement.style.position = 'absolute';
        titleElement.style.top = '10px';
        titleElement.style.left = '50%';
        titleElement.style.transform = 'translateX(-50%)';
        titleElement.style.zIndex = '1000';
        titleElement.style.backgroundColor = 'rgba(255, 255, 255, 0.7)';
        titleElement.style.padding = '5px 10px';
        titleElement.style.borderRadius = '4px';
        titleElement.style.fontWeight = 'bold';
        titleElement.style.fontSize = '16px';
        titleElement.innerText = mapTitle;
        
        const mapContainer = mapInstanceRef.current.getContainer();
        mapContainer.appendChild(titleElement);
        
        toSvg(mapContainer, { 
          quality: 1.0,
          width: mapContainer.offsetWidth * (dpi / 96),
          height: mapContainer.offsetHeight * (dpi / 96)
        })
          .then((dataUrl) => {
            // Remove the temporary title
            mapContainer.removeChild(titleElement);
            
            // Create a download link
            const link = document.createElement('a');
            link.download = `${mapTitle.replace(/\s+/g, '_')}.svg`;
            link.href = dataUrl;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            showNotification(
              "Export Successful",
              "Map exported to SVG successfully",
              "success"
            );
          })
          .catch((error) => {
            // Remove the temporary title if there was an error
            if (mapContainer.contains(titleElement)) {
              mapContainer.removeChild(titleElement);
            }
            
            console.error("SVG export error:", error);
            showNotification(
              "Export Error",
              `Failed to export SVG: ${error.message}`,
              "error"
            );
          });
      }).catch(err => {
        console.error("html-to-image loading error:", err);
        showNotification(
          "Export Error",
          "Failed to load SVG conversion library",
          "error"
        );
      });
    } catch (error) {
      console.error("SVG export error:", error);
      showNotification(
        "Export Error",
        `Failed to export SVG: ${error.message}`,
        "error"
      );
    }
  };

  // Main export handler
  const handleExport = () => {
    switch (exportFormat) {
      case 'pdf':
        handleExportPDF();
        break;
      case 'jpg':
        handleExportJPG();
        break;
      case 'svg':
        handleExportSVG();
        break;
      case 'geojson':
        handleExportGeoJSON();
        break;
      default:
        showNotification(
          "Export Error",
          "Unknown export format selected",
          "error"
        );
    }
    // Don't close the modal after export
    // onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      ref={modalRef}
      onMouseDown={handleMouseDown}
      className="bg-white rounded-md shadow-lg border border-gray-300 fixed z-50"
      style={{ 
        left: `${position.x}px`, 
        top: `${position.y}px`,
        width: '400px',
        cursor: isDragging ? 'grabbing' : 'auto'
      }}
    >
      {/* Draggable Header */}
      <div className="modal-header bg-blue-600 text-white px-4 py-2 flex justify-between items-center cursor-grab rounded-t-md">
        <h3 className="font-semibold text-sm">Export Map</h3>
        <button 
          onClick={onClose} 
          className="text-white hover:text-gray-200"
        >
          <i className="fas fa-times"></i>
        </button>
      </div>

      {/* Modal Body */}
      <div className="p-4">
        {/* Format Selection */}
        <div className="mb-3">
          <label className="block text-gray-700 text-sm font-medium mb-1">Export Format:</label>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex items-center">
              <input
                type="radio"
                name="exportFormat"
                value="pdf"
                checked={exportFormat === 'pdf'}
                onChange={() => setExportFormat('pdf')}
                className="form-radio h-3 w-3 text-blue-600"
              />
              <span className="ml-2 text-sm">PDF</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="exportFormat"
                value="jpg"
                checked={exportFormat === 'jpg'}
                onChange={() => setExportFormat('jpg')}
                className="form-radio h-3 w-3 text-blue-600"
              />
              <span className="ml-2 text-sm">JPG</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="exportFormat"
                value="svg"
                checked={exportFormat === 'svg'}
                onChange={() => setExportFormat('svg')}
                className="form-radio h-3 w-3 text-blue-600"
              />
              <span className="ml-2 text-sm">SVG</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="exportFormat"
                value="geojson"
                checked={exportFormat === 'geojson'}
                onChange={() => setExportFormat('geojson')}
                className="form-radio h-3 w-3 text-blue-600"
              />
              <span className="ml-2 text-sm">GeoJSON</span>
            </label>
          </div>
        </div>

        {/* Map Title */}
        <div className="mb-3">
          <label htmlFor="mapTitle" className="block text-gray-700 text-sm font-medium mb-1">
            Map Title:
          </label>
          <input
            type="text"
            id="mapTitle"
            value={mapTitle}
            onChange={(e) => setMapTitle(e.target.value)}
            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Enter map title"
          />
        </div>

        {/* DPI Setting (not needed for GeoJSON) */}
        {exportFormat !== 'geojson' && (
          <div className="mb-3">
            <label htmlFor="dpi" className="block text-gray-700 text-sm font-medium mb-1">
              Resolution (DPI):
            </label>
            <input
              type="number"
              id="dpi"
              value={dpi}
              onChange={(e) => setDpi(Math.max(72, parseInt(e.target.value) || 300))}
              min="72"
              max="600"
              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Recommended: 150 (web), 300 (print)
            </p>
          </div>
        )}
      </div>

      {/* Modal Footer */}
      <div className="bg-gray-50 px-4 py-2 flex justify-end rounded-b-md">
        <button
          onClick={handleExport}
          className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          Export
        </button>
      </div>
    </div>
  );
};

export default ExportModal;