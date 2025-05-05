'use client';

import { useState, RefObject } from 'react';
import { Dataset, ProcessedData } from './ProcessingPart';

interface NormalizationStepProps {
  stepRef: RefObject<HTMLDivElement>;
  selectedDatasets: Dataset[];
  interpolatedData: ProcessedData[];
  handleProceed: (currentStep: number, nextStep: number, newProcessedData: ProcessedData[]) => void;
  stepProcessedData: ProcessedData[];
  currentSelectedDataset: Dataset | null;
}

export default function NormalizationStep({
  stepRef,
  selectedDatasets,
  interpolatedData,
  handleProceed,
  stepProcessedData,
  currentSelectedDataset,
}: NormalizationStepProps) {
  const [normalizationMethod, setNormalizationMethod] = useState<string>('');

  const handleProceedClick = () => {
    if (!normalizationMethod) {
      alert('Please select a normalization method.');
      return;
    }

    const newProcessedData = [
      ...selectedDatasets.map((dataset) => ({
        fileName: dataset.name,
        dataset,
        process: 'Normalization Completed',
        projection: 'EPSG:4326',
      })),
      ...interpolatedData.map((data) => ({
        ...data,
        process: 'Normalization Completed',
        projection: data.projection || 'EPSG:4326',
      })),
    ];

    // Note: Since this is the last step, we stay on step 5
    handleProceed(5, 5, newProcessedData);
  };

  return (
    <div ref={stepRef} className="mb-4">
      <h3 className="font-medium mb-2 text-gray-700">Step 5: Normalization</h3>
      <div className="bg-gray-50 p-4 rounded-md border border-gray-300">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Normalization Method</label>
          <select
            value={normalizationMethod}
            onChange={(e) => setNormalizationMethod(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">Select...</option>
            <option value="minmax">Min-Max</option>
            <option value="zscore">Z-Score</option>
            <option value="log">Logarithmic</option>
          </select>
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
          <h4 className="text-sm font-semibold mb-2 text-gray-700">Normalization Completed</h4>
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
                    <tr key={`processed-5-${index}`} className="hover:bg-gray-100">
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