'use client';

import { useState, useEffect, RefObject } from 'react';
import { Dataset, ProcessedData } from './Processing';

interface InterpolationStepProps {
  stepRef: RefObject<HTMLDivElement>;
  selectedDatasets: Dataset[];
  interpolatedData: ProcessedData[];
  setInterpolatedData: (data: ProcessedData[]) => void;
  handleProceed: (currentStep: number, nextStep: number, newProcessedData: ProcessedData[]) => void;
  stepProcessedData: ProcessedData[];
  currentSelectedDataset: Dataset | null;
}

export default function InterpolationStep({ 
  stepRef,
  selectedDatasets,
  interpolatedData,
  setInterpolatedData,
  handleProceed,
  stepProcessedData,
  currentSelectedDataset,
}: InterpolationStepProps) {
  const [interpolationMethod, setInterpolationMethod] = useState('');
  const [selectedShapefiles, setSelectedShapefiles] = useState<string[]>([]);
  const [shapefileAttributes, setShapefileAttributes] = useState<{ [key: string]: string[] }>({});
  const [selectedAttributes, setSelectedAttributes] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState<{ [key: string]: boolean }>({});
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedTiffs, setProcessedTiffs] = useState<ProcessedData[]>([]);
  const [showDisplay, setShowDisplay] = useState(false);

  // Enhanced function to find related DBF file for a shapefile
  const findRelatedDbfFile = (shapefile: Dataset, allDatasets: Dataset[]) => {
    const baseNameParts = shapefile.name.split('.');
    baseNameParts.pop();
    const baseName = baseNameParts.join('.');
    
    return allDatasets.find(dataset => {
      const lowerFileName = dataset.name.toLowerCase();
      return lowerFileName.endsWith('.dbf') && 
             lowerFileName.startsWith(baseName.toLowerCase());
    });
  };

  useEffect(() => {
    const fetchAttributes = async () => {
      const newLoadingStates = { ...isLoading };
      const newErrors = { ...errors };
  
      selectedShapefiles.forEach(id => {
        newErrors[id] = '';
      });
  
      const newlySelectedIds = selectedShapefiles.filter(id => !Object.keys(shapefileAttributes).includes(id));
  
      newlySelectedIds.forEach(id => {
        newLoadingStates[id] = true;
      });
      setIsLoading(newLoadingStates);
      setErrors(newErrors);
  
      if (newlySelectedIds.length === 0) return;
  
      const shapefilesToSend = selectedDatasets.filter((d) => newlySelectedIds.includes(d.id));
  
      if (shapefilesToSend.length === 0) {
        console.error('No files selected to send');
        return;
      }
  
      // Prepare file paths for conditioningFactors and constraintsFactors
      const conditioningPaths: string[] = [];
      const constraintsPaths: string[] = [];
  
      shapefilesToSend.forEach(shapefile => {
        const fileName = shapefile.name;
        conditioningPaths.push(`stp_suitability/conditioningFactors/${fileName}`);
        constraintsPaths.push(`stp_suitability/constraintsFactors/${fileName}`);
  
        const dbfFile = findRelatedDbfFile(shapefile, selectedDatasets);
        if (dbfFile) {
          conditioningPaths.push(`stp_suitability/conditioningFactors/${dbfFile.name}`);
          constraintsPaths.push(`stp_suitability/constraintsFactors/${dbfFile.name}`);
        }
      });
  
      try {
        // Fetch attributes from both subfolders concurrently
        const [conditioningResponse, constraintsResponse] = await Promise.all([
          conditioningPaths.length > 0
            ? fetch('http://localhost:9000/api/stp_suitability/get-multiple-attributes/', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ file_paths: conditioningPaths }),
              }).then(res => res.json())
            : Promise.resolve({ attributes: {} }),
          constraintsPaths.length > 0
            ? fetch('http://localhost:9000/api/stp_suitability/get-multiple-attributes/', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ file_paths: constraintsPaths }),
              }).then(res => res.json())
            : Promise.resolve({ attributes: {} }),
        ]);
  
        // Check for errors in responses
        if (conditioningResponse.error || constraintsResponse.error) {
          throw new Error(
            conditioningResponse.error || constraintsResponse.error || 'Failed to fetch attributes'
          );
        }
  
        // Combine attributes from both responses
        const results: { [key: string]: string[] } = {};
  
        // Process conditioningFactors attributes
        if (conditioningResponse.attributes) {
          Object.entries(conditioningResponse.attributes).forEach(([fileName, attrs]) => {
            if (Array.isArray(attrs)) {
              results[fileName] = [...(results[fileName] || []), ...attrs];
            }
          });
        }
  
        // Process constraintsFactors attributes
        if (constraintsResponse.attributes) {
          Object.entries(constraintsResponse.attributes).forEach(([fileName, attrs]) => {
            if (Array.isArray(attrs)) {
              results[fileName] = [...new Set([...(results[fileName] || []), ...attrs])];
            }
          });
        }
  
        // Map attributes to dataset IDs
        const newAttributes = { ...shapefileAttributes };
  
        shapefilesToSend.forEach(dataset => {
          const fileName = dataset.name;
          const baseName = fileName.split('.')[0].toLowerCase();
          const matchedAttributes = Object.entries(results).reduce((acc, [key, attrs]) => {
            const keyBaseName = key.split('.')[0].toLowerCase();
            if (keyBaseName === baseName) {
              return [...acc, ...attrs];
            }
            return acc;
          }, [] as string[]);
  
          newAttributes[dataset.id] = [...new Set(matchedAttributes)];
          newLoadingStates[dataset.id] = false;
  
          if (newAttributes[dataset.id].length === 0) {
            newErrors[dataset.id] = 'No attributes found in the shapefile or its DBF file.';
          }
        });
  
        setShapefileAttributes(newAttributes);
        setIsLoading(newLoadingStates);
        setErrors(newErrors);
      } catch (error) {
        console.error('Error fetching attributes:', error);
  
        newlySelectedIds.forEach(id => {
          newLoadingStates[id] = false;
          newErrors[id] = error instanceof Error
            ? `Error: ${error.message}`
            : 'Failed to fetch attributes. Please try again.';
        });
  
        setIsLoading(newLoadingStates);
        setErrors(newErrors);
      }
    };
  
    fetchAttributes();
  }, [selectedShapefiles, selectedDatasets]);

  const getFileIcon = (fileType?: string) => {
    switch (fileType?.toLowerCase()) {
      case 'shp': return '📊';
      case 'tif':
      case 'tiff': return '🗺️';
      default: return '📄';
    }
  };

  const getFormatDisplay = (file: Dataset) => {
    if (file.format) return file.format;
    if (file.fileType === 'shp') return 'Vector';
    if (['tif', 'tiff'].includes(file.fileType || '')) return 'Raster';
    return 'Other';
  };

  const handleShapefileSelection = (datasetId: string) => {
    setSelectedShapefiles((prev) =>
      prev.includes(datasetId)
        ? prev.filter((id) => id !== datasetId)
        : [...prev, datasetId]
    );
    
    if (errors[datasetId]) {
      setErrors(prev => ({ ...prev, [datasetId]: '' }));
    }
  };

  const handleAttributeSelection = (datasetId: string, attribute: string) => {
    setSelectedAttributes((prev) => ({
      ...prev,
      [datasetId]: attribute,
    }));
  };

  const handleApplyInterpolation = async () => {
    if (!interpolationMethod) {
      alert('Please select an interpolation method.');
      return;
    }

    if (selectedShapefiles.length === 0) {
      alert('Please select at least one shapefile.');
      return;
    }

    const missingAttributes = selectedShapefiles.filter(id => !selectedAttributes[id]);
    if (missingAttributes.length > 0) {
      const missingFileNames = missingAttributes
        .map(id => selectedDatasets.find(d => d.id === id)?.name || id)
        .join(', ');
      
      alert(`Please select an attribute for each selected shapefile: ${missingFileNames}`);
      return;
    }

    setIsProcessing(true);

    try {
      // Prepare the request payload
      const interpolationRequests = selectedShapefiles.map(id => {
        const dataset = selectedDatasets.find(d => d.id === id);
        const attribute = selectedAttributes[id];
        
        // Find related DBF file
        const dbfFile = dataset ? findRelatedDbfFile(dataset, selectedDatasets) : undefined;
        
        return {
          shapefile_path: dataset?.name,
          dbf_path: dbfFile?.name,
          attribute: attribute,
          method: interpolationMethod
        };
      });

      // Simulate server response with mock data
      // This would normally be replaced with actual API call
      
      // Create mock TIFF files based on the selected shapefiles and attributes
      const mockTiffFiles: ProcessedData[] = selectedShapefiles.map(id => {
        const dataset = selectedDatasets.find(d => d.id === id);
        const attribute = selectedAttributes[id];
        
        // Create a file name for the interpolated TIFF
        const baseName = dataset?.name.split('.')[0] || 'interpolated';
        const tiffFileName = `${baseName}_${attribute}_${interpolationMethod}.tif`;
        
        // Create a new dataset object for the TIFF
        const tiffDataset: Dataset = {
          id: `tiff-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: tiffFileName,
          fileType: 'tif',
          format: 'Raster',
          path: `stp_suitability/interpolation_results/${tiffFileName}`,
          size: 0,
          lastModified: new Date().toISOString(),
        };

        return {
          fileName: tiffFileName,
          dataset: tiffDataset,
          process: `Interpolation (${interpolationMethod}) on ${dataset?.name} - ${attribute}`,
          projection: 'EPSG:4326',
          interpolationMethod,
          sourceAttribute: attribute,
          originalDataset: dataset,
          metadata: {
            resolution: '30m x 30m',
            bounds: [100.0, 20.0, 105.0, 25.0],
            pixelType: 'Float32',
            noDataValue: -9999
          }
        };
      });

      setProcessedTiffs(mockTiffFiles);
      setInterpolatedData([...interpolatedData, ...mockTiffFiles]);
      
    } catch (error) {
      console.error('Interpolation error:', error);
      alert(`Error during interpolation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDisplayClick = () => {
    setShowDisplay(true);
    // Here you would typically trigger a map display with the selected data
    console.log("Display clicked with processed files:", processedTiffs);
  };

  const handleProceedClick = () => {
    const newProcessedData = [
      ...selectedDatasets.map((dataset) => ({
        fileName: dataset.name,
        dataset,
        process: 'Interpolation Completed',
        projection: 'EPSG:4326',
      })),
      ...interpolatedData,
    ];

    handleProceed(1, 2, newProcessedData);
  };

  return (
    <div ref={stepRef} className="mb-4">
      <h3 className="font-medium mb-2 text-gray-700">Step 1: Interpolation</h3>
      <div className="bg-gray-50 p-4 rounded-md border border-gray-300">
        <div className="mb-4">
          <h4 className="text-sm font-semibold mb-2 text-gray-700">Select Shapefiles</h4>
          <table className="w-full border">
            <thead className="bg-gray-100 text-sm text-gray-600">
              <tr>
                <th className="px-2 py-1 text-left">Select</th>
                <th className="px-2 py-1 text-left">File</th>
                <th className="px-2 py-1 text-left">Format</th>
              </tr>
            </thead>
            <tbody>
              {selectedDatasets.filter((d) => d.fileType === 'shp').map((dataset) => (
                <tr key={dataset.id}>
                  <td className="px-2 py-2">
                    <input
                      type="checkbox"
                      checked={selectedShapefiles.includes(dataset.id)}
                      onChange={() => handleShapefileSelection(dataset.id)}
                    />
                  </td>
                  <td className="px-2 py-2 flex items-center">
                    <span className="mr-2">{getFileIcon(dataset.fileType)}</span>
                    {dataset.name}
                  </td>
                  <td className="px-2 py-2">{getFormatDisplay(dataset)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mb-4">
          <label className="block text-sm mb-1 font-medium">Interpolation Method</label>
          <select
            value={interpolationMethod}
            onChange={(e) => setInterpolationMethod(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
          >
            <option value="">Select...</option>
            <option value="idw">IDW</option>
            <option value="kriging">Kriging</option>
            <option value="spline">Spline</option>
          </select>
        </div>

        {selectedShapefiles.length > 0 && (
          <div className="mb-4">
            {selectedShapefiles.map((id) => {
              const dataset = selectedDatasets.find((d) => d.id === id);
              return (
                <div key={id} className="mb-2">
                  <label className="block text-sm mb-1 font-medium">
                    Attributes for {dataset?.name}
                  </label>
                  <select
                    value={selectedAttributes[id] || ''}
                    onChange={(e) => handleAttributeSelection(id, e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                    disabled={isLoading[id]}
                  >
                    <option value="">
                      {isLoading[id] ? 'Loading attributes...' : 'Select...'}
                    </option>
                    {shapefileAttributes[id]?.map((attr) => (
                      <option key={attr} value={attr}>{attr}</option>
                    ))}
                  </select>
                  
                  {isLoading[id] && (
                    <div className="mt-1 text-sm text-blue-500">
                      Loading attributes...
                    </div>
                  )}
                  
                  {!isLoading[id] && errors[id] && (
                    <div className="mt-1 text-sm text-red-500">
                      {errors[id]}
                    </div>
                  )}
                  
                  {!isLoading[id] && !errors[id] && shapefileAttributes[id]?.length === 0 && (
                    <div className="mt-1 text-sm text-red-500">
                      No attributes found. Please check the shapefile and its DBF file.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="flex gap-2 mb-4">
          <button 
            className={`${isProcessing ? 'bg-gray-400' : 'bg-green-500'} text-white px-4 py-2 rounded`}
            onClick={handleApplyInterpolation}
            disabled={isProcessing}
          >
            {isProcessing ? 'Processing...' : 'Apply'}
          </button>
          <button 
            className="bg-blue-500 text-white px-4 py-2 rounded"
            onClick={handleDisplayClick}
            disabled={processedTiffs.length === 0}
          >
            Display
          </button>
          <button 
            className="bg-gray-600 text-white px-4 py-2 rounded" 
            onClick={handleProceedClick}
            disabled={isProcessing}
          >
            Proceed
          </button>
        </div>
        
        {/* Display processed TIFF files */}
        {processedTiffs.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-semibold mb-2 text-gray-700">Interpolated TIFF Files</h4>
            <table className="w-full border">
              <thead className="bg-gray-100 text-sm text-gray-600">
                <tr>
                  <th className="px-2 py-1 text-left">File</th>
                  <th className="px-2 py-1 text-left">Format</th>
                  <th className="px-2 py-1 text-left">Interpolation</th>
                  <th className="px-2 py-1 text-left">Source</th>
                </tr>
              </thead>
              <tbody>
                {processedTiffs.map((tiff, index) => (
                  <tr key={index} className="border-t border-gray-200">
                    <td className="px-2 py-2 flex items-center">
                      <span className="mr-2">🗺️</span>
                      {tiff.fileName}
                    </td>
                    <td className="px-2 py-2">
                      {tiff.dataset.fileType?.toUpperCase() || 'TIF'}
                    </td>
                    <td className="px-2 py-2">{tiff.interpolationMethod}</td>
                    <td className="px-2 py-2">
                      {tiff.originalDataset?.name} - {tiff.sourceAttribute}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Status message for display action */}
        {showDisplay && processedTiffs.length > 0 && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-blue-700 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              Displaying {processedTiffs.length} interpolated layers on the map
            </p>
          </div>
        )}
      </div>
    </div>
  );
}