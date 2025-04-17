import React, { useState, useRef, useEffect } from 'react';

interface GroundwaterContourProps {
  activeTab: string;
  onGeoJsonData?: (data: any) => void; // This callback passes contour data to parent/map
}

const GroundwaterContour: React.FC<GroundwaterContourProps> = ({ 
  activeTab,
  onGeoJsonData = () => {}
}) => {
  const [geoJsonData, setGeoJsonData] = useState<any>(null);
  // State for groundwater contour
  const [interpolationMethod, setInterpolationMethod] = useState('');
  const [parameter, setParameter] = useState('');
  const [dataType, setDataType] = useState(''); // 'PRE' or 'POST'
  const [selectedYear, setSelectedYear] = useState('');
  const [contourInterval, setContourInterval] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Effect to handle parameter change
  useEffect(() => {
    if (parameter === 'Rainfall') {
      // For Rainfall, always use POST and 2011
      setDataType('POST');
      setSelectedYear('2011');
    } else if (parameter === 'gwl') {
      // Reset data type when switching to gwl
      setDataType('');
    }
  }, [parameter]);

  const handleApply = async () => {
    // Validate required fields
    if (!interpolationMethod || !parameter || !contourInterval) {
      alert('Please fill out all required fields: Method, Parameter, and Interval.');
      return;
    }

    // For gwl parameter, data type and year are also required
    if (parameter === 'gwl' && (!dataType || !selectedYear)) {
      alert('Please select both Data Type (PRE/POST) and Year for groundwater level contour.');
      return;
    }

    const payload = {
      method: interpolationMethod,
      parameter: parameter,
      interval: parseFloat(contourInterval)
    };

    // Add data_type and year to payload based on parameter
    if (parameter === 'gwl') {
      payload['data_type'] = dataType;
      payload['year'] = parseInt(selectedYear);
    } else if (parameter === 'Rainfall') {
      // For Rainfall, automatically use POST_2011
      payload['data_type'] = 'POST';
      payload['year'] = 2011;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Sending contour request with payload:', payload);
      
      // Updated URL to the new endpoint
      const response = await fetch('http://localhost:9000/api/gwa/contour/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        // Try to get detailed error if available
        let errorMessage = `Failed to generate contour: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          console.error('Error response:', errorData);
          if (errorData && errorData.error) {
            errorMessage = `Server error: ${errorData.error}`;
          }
        } catch (parseError) {
          console.error('Could not parse error response as JSON');
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('Contour data received successfully:', data);
      
      setGeoJsonData(data);
      
      // IMPORTANT: Pass the contour data to parent component (Dashboard)
      // This will be used to update contourData in Dashboard which is passed to MapPreview
      onGeoJsonData(data);
    } catch (error) {
      console.error('Error generating contour:', error);
      setError(error instanceof Error ? error.message : 'Unknown error generating contour');
      setGeoJsonData(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Clear the data when tab changes
  useEffect(() => {
    if (activeTab !== 'groundwater-contour') {
      setGeoJsonData(null);
      // Optionally reset form values
      // setInterpolationMethod('');
      // setParameter('');
      // setDataType('');
      // setSelectedYear('');
      // setContourInterval('');
      setError(null);
    }
  }, [activeTab]);

  return (
    <div className="h-full overflow-auto flex flex-col">
      <h3 className="font-medium text-blue-600 mb-4">Groundwater Contour</h3>

      {error && (
        <div className="mb-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* Interpolation Method */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Method of Interpolation</label>
        <select
          className="w-full p-2 border rounded-md text-sm"
          value={interpolationMethod}
          onChange={(e) => setInterpolationMethod(e.target.value)}
        >
          <option value="">Select Method...</option>
          <option value="idw">Inverse Distance Weighted</option>
          <option value="kriging">Kriging</option>
          <option value="spline">Spline</option>
        </select>
      </div>

      {/* Parameter */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Choose Parameter</label>
        <select
          className="w-full p-2 border rounded-md text-sm"
          value={parameter}
          onChange={(e) => setParameter(e.target.value)}
        >
          <option value="">Select Parameter...</option>
          <option value="gwl">Groundwater Level</option>
          <option value="Rainfall">Rainfall</option>
        </select>
      </div>

      {/* Data Type (PRE/POST) - Only show when parameter is gwl */}
      <div className={`mb-4 ${parameter !== 'gwl' ? 'hidden' : ''}`}>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Data Type
        </label>
        <select
          className="w-full p-2 border rounded-md text-sm"
          value={dataType}
          onChange={(e) => setDataType(e.target.value)}
          disabled={parameter === 'Rainfall'}
        >
          <option value="">Select Data Type...</option>
          <option value="PRE">PRE (Pre-monsoon)</option>
          <option value="POST">POST (Post-monsoon)</option>
        </select>
      </div>

      {/* Fixed Data Type info for Rainfall */}
      {parameter === 'Rainfall' && (
        <div className="mb-4 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
          <p className="text-blue-700">
            For Rainfall, data type is fixed to POST and year is fixed to 2011.
          </p>
        </div>
      )}

      {/* Year - Show conditionally based on parameter */}
      <div className={`mb-4 ${parameter === '' ? 'hidden' : ''}`}>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Select Year
        </label>
        <select
          className="w-full p-2 border rounded-md text-sm"
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
          disabled={parameter === 'Rainfall'}
        >
          <option value="">Select Year...</option>
          <option value="2011">2011</option>
          <option value="2012">2012</option>
          <option value="2013">2013</option>
          <option value="2014">2014</option>
          <option value="2015">2015</option>
          <option value="2016">2016</option>
          <option value="2017">2017</option>
          <option value="2018">2018</option>
          <option value="2019">2019</option>
          <option value="2020">2020</option>
        </select>
      </div>

      {/* Contour Interval */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Contour Interval (meters)</label>
        <input
          type="number"
          className="w-full p-2 border rounded-md text-sm"
          placeholder="Enter interval (e.g., 5)"
          value={contourInterval}
          onChange={(e) => setContourInterval(e.target.value)}
          min="0.1"
          step="0.1"
        />
      </div>

      <button
        onClick={handleApply}
        disabled={isLoading}
        className={`w-full ${isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'} text-white font-medium py-2 px-4 rounded-md flex items-center justify-center`}
      >
        {isLoading ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Processing...
          </>
        ) : (
          <span>Apply</span>
        )}
      </button>

      {geoJsonData && !error && !isLoading && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-700 font-medium">
            Contour data generated successfully!
          </p>
          <p className="text-xs text-green-600 mt-1">
            The map has been updated with the new contour layer.
          </p>
          <div className="mt-2 text-xs text-gray-600 border-t border-green-100 pt-2">
            <div className="grid grid-cols-2 gap-1">
              <p><span className="font-medium">Parameter:</span> {geoJsonData.parameter}</p>
              <p><span className="font-medium">Data Type:</span> {geoJsonData.data_type}</p>
              <p><span className="font-medium">Year:</span> {geoJsonData.year}</p>
              <p><span className="font-medium">Method:</span> {geoJsonData.method}</p>
              <p><span className="font-medium">Points:</span> {geoJsonData.point_count}</p>
              <p><span className="font-medium">Column:</span> {geoJsonData.selected_column}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroundwaterContour;