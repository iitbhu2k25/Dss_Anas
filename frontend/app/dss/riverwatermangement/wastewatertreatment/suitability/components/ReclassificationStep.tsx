'use client';

import { useState, useEffect, RefObject } from 'react';
import { Dataset, ProcessedData } from './ProcessingPart';

interface ReclassificationStepProps {
  stepRef: RefObject<HTMLDivElement>;
  selectedDatasets: Dataset[];
  interpolatedData: ProcessedData[];
  handleProceed: (currentStep: number, nextStep: number, newProcessedData: ProcessedData[]) => void;
  stepProcessedData: ProcessedData[];
  currentSelectedDataset: Dataset | null;
}

export default function ReclassificationStep({
  stepRef,
  selectedDatasets,
  interpolatedData,
  handleProceed,
  stepProcessedData,
  currentSelectedDataset,
}: ReclassificationStepProps) {
  const [classificationClasses, setClassificationClasses] = useState<number | undefined>(undefined);
  const [reclassificationTable, setReclassificationTable] = useState<{ oldValue: string; newValue: string }[]>([]);

  // Update reclassification table based on classificationClasses
  useEffect(() => {
    if (classificationClasses !== undefined && classificationClasses >= 2 && classificationClasses <= 10) {
      const newTable = Array.from({ length: classificationClasses }, () => ({
        oldValue: '',
        newValue: '',
      }));
      setReclassificationTable(newTable);
    } else {
      setReclassificationTable([]);
    }
  }, [classificationClasses]);

  // Handle reclassification table updates
  const updateReclassificationTable = (index: number, field: 'oldValue' | 'newValue', value: string) => {
    const updatedTable = [...reclassificationTable];
    updatedTable[index][field] = value;
    setReclassificationTable(updatedTable);
  };

  // Handle Display button for Reclassification
  const handleDisplay = () => {
    alert('Display functionality to be implemented.');
    // Placeholder for actual display logic
  };

  const handleProceedClick = () => {
    if (classificationClasses === undefined || classificationClasses < 2) {
      alert('Please enter a valid number of classes (minimum 2).');
      return;
    }
    if (reclassificationTable.some((row) => !row.oldValue || !row.newValue)) {
      alert('Please fill all old and new values in the reclassification table.');
      return;
    }

    const newProcessedData = [
      ...selectedDatasets.map((dataset) => ({
        fileName: dataset.name,
        dataset,
        process: 'Reclassification Completed',
        projection: 'EPSG:4326',
      })),
      ...interpolatedData.map((data) => ({
        ...data,
        process: 'Reclassification Completed',
        projection: data.projection || 'EPSG:4326',
      })),
    ];

    handleProceed(4, 5, newProcessedData);
  };

  return (
    <div ref={stepRef} className="mb-4">
      <h3 className="font-medium mb-2 text-gray-700">Step 4: Reclassification</h3>
      <div className="bg-gray-50 p-4 rounded-md border border-gray-300">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Number of Classes</label>
          <input
            type="number"
            value={classificationClasses ?? ''}
            onChange={(e) => setClassificationClasses(e.target.value ? parseInt(e.target.value) : undefined)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
            min="2"
            max="10"
            placeholder="Enter number of classes"
          />
        </div>
        {reclassificationTable.length > 0 && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Reclassification Table</label>
            <div className="border border-gray-300 rounded-md p-2">
              <div className="grid grid-cols-2 gap-2 mb-2">
                <span className="text-sm font-medium text-gray-600">Old Value</span>
                <span className="text-sm font-medium text-gray-600">New Value</span>
              </div>
              {reclassificationTable.map((row, index) => (
                <div key={index} className="grid grid-cols-2 gap-2 mb-2">
                  <input
                    type="text"
                    value={row.oldValue}
                    onChange={(e) => updateReclassificationTable(index, 'oldValue', e.target.value)}
                    className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Old Value"
                  />
                  <input
                    type="text"
                    value={row.newValue}
                    onChange={(e) => updateReclassificationTable(index, 'newValue', e.target.value)}
                    className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="New Value"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="flex gap-2">
          <button
            className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            onClick={handleProceedClick}
          >
            Proceed
          </button>
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            onClick={handleDisplay}
          >
            Display
          </button>
        </div>
      </div>
      {stepProcessedData.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-semibold mb-2 text-gray-700">Reclassification Completed</h4>
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
                    <tr key={`processed-4-${index}`} className="hover:bg-gray-100">
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