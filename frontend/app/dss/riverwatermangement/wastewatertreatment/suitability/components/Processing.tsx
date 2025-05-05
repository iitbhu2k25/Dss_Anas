'use client';

import { useState, useRef } from 'react';
import InterpolationStep from './InterpolationStep';
import ProjectionStep from './ProjectionStep';
import ResamplingStep from './ResamplingStep';
import ReclassificationStep from './ReclassificationStep';
import NormalizationStep from './NormalizationStep';

// Shared interfaces
export interface Dataset {
  id: string;
  name: string;
  fileType?: string;
  format?: string;
  coordinateSystem?: string;
  resolution?: string;
  type: string;
  isUserUploaded?: boolean;
}

export interface ProcessingProps {
  selectedDatasets: Dataset[];
  selectedConstraints: string[];
  savedInterpolationData?: SavedInterpolationData[];
}

export interface SavedInterpolationData {
  fileName: string;
  dataset: Dataset | null;
  interpolationMethod: string;
  parameter: string;
  projection?: string;
}

export interface ProcessedData {
  fileName: string;
  dataset: Dataset | null;
  process: string;
  projection: string;
}

interface ProcessingPartProps {
  selectedDatasets: Dataset[];
  selectedConstraints: string[];
}

export default function ProcessingPart({ selectedDatasets, selectedConstraints }: ProcessingPartProps) {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [stepProcessedData, setStepProcessedData] = useState<{ [key: number]: ProcessedData[] }>({});
  const [currentSelectedDataset, setCurrentSelectedDataset] = useState<Dataset | null>(null);
  const [interpolatedData, setInterpolatedData] = useState<ProcessedData[]>([]);

  // References for each step section
  const step1Ref = useRef<HTMLDivElement>(null);
  const step2Ref = useRef<HTMLDivElement>(null);
  const step3Ref = useRef<HTMLDivElement>(null);
  const step4Ref = useRef<HTMLDivElement>(null);
  const step5Ref = useRef<HTMLDivElement>(null);

  // Define steps for navigation
  const steps = [
    { id: 1, name: 'Interpolation', ref: step1Ref },
    { id: 2, name: 'Projection', ref: step2Ref },
    { id: 3, name: 'Resampling', ref: step3Ref },
    { id: 4, name: 'Reclassification', ref: step4Ref },
    { id: 5, name: 'Normalization', ref: step5Ref },
  ];

  // Helper functions for the selected datasets table
  const getFileIcon = (fileType?: string) => {
    switch (fileType?.toLowerCase()) {
      case 'shp':
        return '📊';
      case 'tif':
      case 'tiff':
        return '🗺️';
      default:
        return '📄';
    }
  };

  const getFormatDisplay = (file: Dataset) => {
    if (file.format) return file.format;
    if (file.fileType === 'shp') return 'Vector';
    if (['tif', 'tiff'].includes(file.fileType || '')) return 'Raster';
    return 'Other';
  };

  const getCoordinateDisplay = (file: Dataset) => {
    return file.coordinateSystem || 'Not specified';
  };

  const getResolutionDisplay = (file: Dataset) => {
    if (file.format === 'Vector' || file.fileType === 'shp') return 'N/A';
    return file.resolution || 'Not specified';
  };

  const getCategoryDisplay = (type: string) => {
    switch (type) {
      case 'constraints_factors':
        return 'Constraint';
      case 'conditioning_factors':
        return 'Conditioning';
      case 'stp_files':
        return 'STP File';
      default:
        return 'Other';
    }
  };

  // Handle step navigation click
  const handleStepClick = (stepId: number) => {
    setCurrentStep(stepId);
    const stepRef = steps.find((step) => step.id === stepId)?.ref;
    if (stepRef?.current) {
      stepRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Handle Proceed button for each step
  const handleProceed = (currentStep: number, nextStep: number, newProcessedData: ProcessedData[]) => {
    // Update step-specific processed data
    setStepProcessedData((prev) => ({
      ...prev,
      [currentStep]: newProcessedData,
    }));

    // Mark step as completed
    setCompletedSteps((prev) => new Set(prev).add(currentStep));

    // Move to next step
    setCurrentStep(nextStep);

    // Scroll to the next step
    const nextStepRef = steps.find((step) => step.id === nextStep)?.ref;
    if (nextStepRef?.current) {
      nextStepRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Render the current step component
  const renderStepComponent = () => {
    switch (currentStep) {
      case 1:
        return (
          <InterpolationStep
            stepRef={step1Ref}
            selectedDatasets={selectedDatasets}
            interpolatedData={interpolatedData}
            setInterpolatedData={setInterpolatedData}
            handleProceed={handleProceed}
            stepProcessedData={stepProcessedData[1] || []}
            currentSelectedDataset={currentSelectedDataset}
          />
        );
      case 2:
        return (
          <ProjectionStep
            stepRef={step2Ref}
            selectedDatasets={selectedDatasets}
            interpolatedData={interpolatedData}
            handleProceed={handleProceed}
            stepProcessedData={stepProcessedData[2] || []}
            currentSelectedDataset={currentSelectedDataset}
          />
        );
      case 3:
        return (
          <ResamplingStep
            stepRef={step3Ref}
            selectedDatasets={selectedDatasets}
            interpolatedData={interpolatedData}
            handleProceed={handleProceed}
            stepProcessedData={stepProcessedData[3] || []}
            currentSelectedDataset={currentSelectedDataset}
          />
        );
      case 4:
        return (
          <ReclassificationStep
            stepRef={step4Ref}
            selectedDatasets={selectedDatasets}
            interpolatedData={interpolatedData}
            handleProceed={handleProceed}
            stepProcessedData={stepProcessedData[4] || []}
            currentSelectedDataset={currentSelectedDataset}
          />
        );
      case 5:
        return (
          <NormalizationStep
            stepRef={step5Ref}
            selectedDatasets={selectedDatasets}
            interpolatedData={interpolatedData}
            handleProceed={handleProceed}
            stepProcessedData={stepProcessedData[5] || []}
            currentSelectedDataset={currentSelectedDataset}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h2 className="text-lg font-semibold mb-4 text-green-600">Processing Tools</h2>

      {selectedDatasets.length === 0 ? (
        <div className="p-4 bg-yellow-50 text-yellow-700 rounded-md">
          Please go back and select datasets first
        </div>
      ) : (
        <>
          {/* Selected Datasets Section */}
          <div className="mb-4">
            <h3 className="font-medium mb-2 text-gray-700">Selected Datasets</h3>
            <div className="overflow-x-auto max-h-60 overflow-y-auto border rounded-md">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      File
                    </th>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Format
                    </th>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Coordinate
                    </th>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Resolution
                    </th>
                    <th scope="col" className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Resampling
                    </th>
                    <th scope="col" className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reclassify
                    </th>
                    <th scope="col" className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Normalization
                    </th>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Remarks
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {selectedDatasets.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-3 py-3 text-gray-500 text-sm text-center">
                        No datasets selected
                      </td>
                    </tr>
                  ) : (
                    selectedDatasets.map((dataset) => (
                      <tr key={dataset.id} className="hover:bg-gray-100">
                        <td className="px-3 py-3 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className="mr-2">{getFileIcon(dataset.fileType)}</span>
                            <span className="font-medium text-gray-700">{dataset.name}</span>
                            {dataset.isUserUploaded && (
                              <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">Uploaded</span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-sm">
                          <span
                            className={
                              dataset.type === 'constraints_factors'
                                ? 'text-red-600'
                                : dataset.type === 'conditioning_factors'
                                ? 'text-purple-600'
                                : 'text-blue-600'
                            }
                          >
                            {getCategoryDisplay(dataset.type)}
                          </span>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-700">
                          {getFormatDisplay(dataset)}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-700">
                          {getCoordinateDisplay(dataset)}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-700">
                          {getResolutionDisplay(dataset)}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-sm text-center">
                          {completedSteps.has(3) && stepProcessedData[3]?.some((data) => data.dataset?.id === dataset.id) ? (
                            <span className="text-green-600 text-lg">✓</span>
                          ) : (
                            <span className="text-gray-400 text-lg">✗</span>
                          )}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-sm text-center">
                          {completedSteps.has(4) && stepProcessedData[4]?.some((data) => data.dataset?.id === dataset.id) ? (
                            <span className="text-green-600 text-lg">✓</span>
                          ) : (
                            <span className="text-gray-400 text-lg">✗</span>
                          )}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-sm text-center">
                          {completedSteps.has(5) && stepProcessedData[5]?.some((data) => data.dataset?.id === dataset.id) ? (
                            <span className="text-green-600 text-lg">✓</span>
                          ) : (
                            <span className="text-gray-400 text-lg">✗</span>
                          )}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-700">
                          {dataset.format === 'Vector' || dataset.fileType === 'shp' ? (
                            <span className="text-amber-600 font-medium">
                                {[
                                  "1. First interpolate the Shapefiles.",
                                  "2. Project all the Raster's into desirable coordinate system.",
                                  "3. Resample all the Raster's at same grid size (eg:30m).",
                                  "4. Reclassify all the Raster's according to their importance.",
                                  "5. Normalization all the Raster's (eg: 0-1) to bring them at same interval.",
                                  "6. Proceed for Weighted overlay Analysis."
                                ].map((step, index, arr) => (
                                  <span key={index}>
                                    {step}
                                    {index !== arr.length - 1 && <br />}
                                  </span>
                                ))}
                              </span>
                       
                          ) : (
                            <span className="text-green-600 font-medium">
                            
                            
                              {[
                                "1. Project all the Raster's into desirable coordinate system.",
                                "2. Resample all the Raster's at same grid size (eg:30m).",
                                "3. Reclassify all the Raster's according to their importance.",
                                "4. Normalization all the Raster's (eg: 0-1) to bring them at same interval.",
                                "5. Proceed for Weighted overlay Analysis."
                              ].map((step, index) => (
                                <span key={index}>
                                  {step}
                                  <br />
                                </span>
                              ))}
                            </span>

                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Step Navigation */}
          <div className="mb-6">
            <h3 className="text-md font-semibold mb-2 text-gray-700">Processing Steps</h3>
            <div className="flex justify-between items-center bg-gray-50 p-3 rounded-md border border-gray-300">
              {steps.map((step) => (
                <div
                  key={step.id}
                  className={`flex-1 text-center py-2 rounded-md cursor-pointer ${
                    step.id === currentStep
                      ? 'bg-green-500 text-white'
                      : step.id < currentStep
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                  onClick={() => handleStepClick(step.id)}
                >
                  <span className="text-sm font-medium">
                    Step {step.id}: {step.name}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Current Step: {currentStep} of {steps.length}
            </p>
          </div>

          {/* Render Current Step */}
          {renderStepComponent()}
        </>
      )}
    </div>
  );
}