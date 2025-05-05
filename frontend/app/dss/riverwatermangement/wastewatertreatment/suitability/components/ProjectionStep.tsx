'use client';

import { useState, RefObject } from 'react';
import { Dataset, ProcessedData } from './ProcessingPart';

interface ProjectionStepProps {
  stepRef: RefObject<HTMLDivElement>;
  selectedDatasets: Dataset[];
  interpolatedData: ProcessedData[];
  handleProceed: (currentStep: number, nextStep: number, newProcessedData: ProcessedData[]) => void;
  stepProcessedData: ProcessedData[];
  currentSelectedDataset: Dataset | null;
}

export default function ProjectionStep({
  stepRef,
  selectedDatasets,
  interpolatedData,
  handleProceed,
  stepProcessedData,
  currentSelectedDataset,
}: ProjectionStepProps) {
  const [projectionSystem, setProjectionSystem] = useState<string>('');
  const [gridSizeX, setGridSizeX] = useState<number | undefined>(undefined);
  const [gridSizeY, setGridSizeY] = useState<number | undefined>(undefined);

  const handleProceedClick = () => {
    if (!projectionSystem) {
      alert('Please select a coordinate system.');
      return;
    }
    if (gridSizeX === undefined || gridSizeY === undefined) {
      alert('Please enter grid sizes for X and Y.');
      return;
    }

    const newProcessedData = [
      ...selectedDatasets.map((dataset) => ({
        fileName: dataset.name,
        dataset,
        process: 'Projection Completed',
        projection: projectionSystem || 'EPSG:4326',
      })),
      ...interpolatedData.map((data) => ({
        ...data,
        process: 'Projection Completed',
        projection: data.projection || projectionSystem || 'EPSG:4326',
      })),
    ];

    handleProceed(2, 3, newProcessedData);
  };

  return (
    <div ref={stepRef} className="mb-4">
      <h3 className="font-medium mb-2 text-gray-700">Step 2: Projection</h3>
      <div className="bg-gray-50 p-4 rounded-md border border-gray-300">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Coordinate System</label>
          <select
            value={projectionSystem}
            onChange={(e) => setProjectionSystem(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">Select...</option>
            <option value="EPSG:4326">WGS 84 (EPSG:4326)</option>
            <option value="EPSG:3857">Web Mercator (EPSG:3857)</option>
            <option value="EPSG:3395">World Mercator (EPSG:3395)</option>
            <option value="EPSG:32633">UTM Zone 33N (EPSG:32633)</option>
          </select>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Grid Size X (meters)</label>
          <input
            type="number"
            value={gridSizeX ?? ''}
            onChange={(e) => setGridSizeX(e.target.value ? parseInt(e.target.value) : undefined)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
            min="10"
            step="10"
            placeholder="Enter grid size X"
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Grid Size Y (meters)</label>
          <input
            type="number"
            value={gridSizeY ?? ''}
            onChange={(e) => setGridSizeY(e.target.value ? parseInt(e.target.value) : undefined)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
            min="10"
            step="10"
            placeholder="Enter grid size Y"
          />
        </div>
        <button
          className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          onClick={handleProceedClick}
        >
          Proceed
        </button>
      </div>
      {stepProcessedData.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-semibold mb-2 text-gray-700">Projection Completed</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-700 border border-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 border">File Name</th>
                  <th className="px-4 py-2 border">Dataset</th>
                  <th className="px-4 py-2 border">Process</th>
                  <th className="px-4 py-2 border">Projection</th>
                </tr>
              </thead>
              <tbody>
                {stepProcessedData
                  .filter((data) => !currentSelectedDataset || data.dataset?.id !== currentSelectedDataset.id)
                  .map((data, index) => (
                    <tr key={`processed-2-${index}`} className="hover:bg-gray-100">
                      <td className="px-4 py-2 border">{data.fileName}</td>
                      <td className="px-4 py-2 border">{data.dataset?.name || 'None'}</td>
                      <td className="px-4 py-2 border">{data.process}</td>
                      <td className="px-4 py-2 border">{data.projection}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}